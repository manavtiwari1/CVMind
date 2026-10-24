import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { dbReady } from '../admin/auth.js';
import { handle, httpError, model } from '../admin/util.js';
import { requireUser } from '../services/authToken.js';
import { collegeAudit, contractLive, hashToken } from '../college/access.js';
import { membershipFor } from '../college/membership.js';
import { College, CollegeStudent, CollegeTemplate, ResumeReview } from '../college/models.js';
import { reviewState } from '../college/stats.js';

// The student side of the placements portal, on app.cvmind.in: accept or decline a college
// invitation, see the college's reviews, leave the college, and use the college's resume formats.
const router = express.Router();

const needDb = async (req, res, next) => ((await dbReady()) ? next() : res.status(503).json({ success: false, error: 'Please try again in a minute.' }));
const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ success: false, error: 'Too many attempts. Please wait a few minutes.' })
});

const maskEmail = (email) => {
  const [user, domain] = String(email).split('@');
  return `${user.slice(0, 2)}${'*'.repeat(Math.max(1, user.length - 2))}@${domain}`;
};

// The invited roster row for a link token, if it is still open
async function invitation(token) {
  if (!token || String(token).length > 100) return null;
  const student = await CollegeStudent.findOne({ inviteTokenHash: hashToken(token), status: 'invited' });
  if (!student || !student.inviteExpiresAt || student.inviteExpiresAt < new Date()) return null;
  const college = await College.findById(student.collegeId).lean();
  return college && contractLive(college) ? { student, college } : null;
}

const actorOf = (student) => ({ id: student.userId || student.email, name: student.name || student.email });

router.get('/api/college-invite/:token', needDb, inviteLimiter, handle(async (req, res) => {
  const found = await invitation(req.params.token);
  if (!found) return res.status(404).json({ success: false, error: 'This invitation has expired or was already used. Ask your placement team to send a new one.' });
  res.json({ success: true, college: { name: found.college.name, logo: found.college.logo || '' }, email: maskEmail(found.student.email) });
}));

router.post('/api/college-invite/:token/accept', needDb, inviteLimiter, requireUser, handle(async (req, res) => {
  const found = await invitation(req.params.token);
  if (!found) throw httpError(404, 'This invitation has expired or was already used. Ask your placement team to send a new one.');
  const { student, college } = found;
  // The invitation is for one email; the student signs in with that account
  if (String(req.auth.email).toLowerCase() !== student.email) {
    throw Object.assign(httpError(403, `This invitation is for ${maskEmail(student.email)}. Sign in with that email to accept it.`), { code: 'WRONG_ACCOUNT' });
  }
  if (req.body?.consent !== true) throw httpError(400, 'Agree to share your resumes and scores with your college to join.');
  Object.assign(student, { status: 'joined', userId: String(req.auth.sub), joinedAt: new Date(), consentAt: new Date(), inviteTokenHash: '', inviteError: '' });
  await student.save();
  // Opening the emailed link proves the student owns the address
  await model('User').updateOne({ _id: req.auth.sub, email: student.email, emailVerified: { $ne: true } }, { emailVerified: true, emailVerifiedAt: new Date() }).catch(() => {});
  await collegeAudit(req, 'student.joined', { collegeId: college._id, actorType: 'student', actor: actorOf(student), targetId: student._id, targetLabel: student.email });
  res.json({ success: true, college: { name: college.name } });
}));

// Declining needs only the link, which proves the email reached the student
router.post('/api/college-invite/:token/decline', needDb, inviteLimiter, handle(async (req, res) => {
  const found = await invitation(req.params.token);
  if (!found) throw httpError(404, 'This invitation has expired or was already used.');
  const { student, college } = found;
  Object.assign(student, { status: 'declined', inviteTokenHash: '', endedAt: new Date() });
  await student.save();
  await collegeAudit(req, 'student.declined', { collegeId: college._id, actorType: 'student', actor: actorOf(student), targetId: student._id, targetLabel: student.email });
  res.json({ success: true });
}));

// The student's college and the reviews of their resumes
router.get('/api/user/college', needDb, requireUser, handle(async (req, res) => {
  const found = await membershipFor(req.auth.email);
  if (!found || found.student.userId !== String(req.auth.sub)) return res.json({ success: true, college: null });
  const { student, college } = found;
  const reviews = await ResumeReview.find({ collegeId: college._id, studentId: student._id }).sort({ updatedAt: -1 }).lean();
  const works = reviews.length ? await model('Work').find({ _id: { $in: reviews.map((r) => r.workId) }, userId: student.userId }, { title: 1, updatedAt: 1, createdAt: 1 }).lean() : [];
  const workById = new Map(works.map((w) => [String(w._id), w]));
  res.json({
    success: true,
    college: { name: college.name, logo: college.logo || '', proActive: contractLive(college), endsAt: college.contract?.endsAt || null, joinedAt: student.joinedAt },
    reviews: reviews.filter((r) => workById.has(r.workId)).map((r) => ({
      workId: r.workId,
      title: workById.get(r.workId).title,
      state: reviewState(r, workById.get(r.workId)),
      reviewerName: r.reviewerName,
      reviewedAt: r.updatedAt,
      comments: (r.comments || []).map((c) => ({ byName: c.byName, text: c.text, at: c.at }))
    }))
  });
}));

// Leaving ends the college's access to the student's data at once
router.post('/api/user/college/leave', needDb, requireUser, handle(async (req, res) => {
  const found = await membershipFor(req.auth.email);
  if (!found || found.student.userId !== String(req.auth.sub)) throw httpError(404, 'You are not linked to a college.');
  await CollegeStudent.updateOne({ _id: found.student._id, status: 'joined' }, { status: 'left', endedAt: new Date() });
  await collegeAudit(req, 'student.left', { collegeId: found.college._id, actorType: 'student', actor: actorOf(found.student), targetId: found.student._id, targetLabel: found.student.email });
  res.json({ success: true });
}));

// The resume formats of the student's own college. Kept after the contract ends so saved resumes still render.
router.get('/api/user/college/templates', needDb, requireUser, handle(async (req, res) => {
  const found = await membershipFor(req.auth.email);
  if (!found || found.student.userId !== String(req.auth.sub)) return res.json({ success: true, data: [] });
  const rows = await CollegeTemplate.find({ collegeId: found.college._id, active: true }).sort({ createdAt: 1 }).lean();
  res.json({ success: true, college: found.college.name, data: rows.map((t) => ({ id: `college:${t._id}`, name: t.name, description: t.description, html: t.html })) });
}));

export default router;
