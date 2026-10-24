import express from 'express';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { dbReady } from '../../admin/auth.js';
import { clean, handle, httpError, isEmail, isId, paging } from '../../admin/util.js';
import { collegeAudit, collegeAccess, generatePassword, issueCollegeToken, oid, publicCollege, publicStaff, requireCollege, scoped } from '../access.js';
import { sendStaffCredentials } from '../emails.js';
import { College, CollegeAuditLog, CollegeStaff, CollegeTemplate } from '../models.js';

const router = express.Router();
const profile = requireCollege({ allowPasswordChange: true });
const anyone = requireCollege();
const admin = requireCollege({ admin: true });
const adminWrite = requireCollege({ admin: true, write: true });

const SESSION_MS = 12 * 60 * 60 * 1000;
const REMEMBER_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_STAFF = 10;
export const MIN_PASSWORD = 10;

const limiter = (windowMs, limit, error, key) => rateLimit({
  windowMs,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  ...(key ? { keyGenerator: key } : {}),
  handler: (req, res) => res.status(429).json({ success: false, error })
});
const loginLimiter = limiter(15 * 60 * 1000, 10, 'Too many sign-in attempts. Please wait 15 minutes and try again.');
const staffLimiter = limiter(60 * 60 * 1000, 20, 'You have added a lot of staff. Try again in an hour.', (req) => `college-staff:${req.staff?._id}`);

// A wrong email and a wrong password get the same answer, and the bcrypt work is done either way
const DUMMY_HASH = bcrypt.hashSync('cvmind-placements-dummy', 10);

// ── Session ──────────────────────────────────────────────────────────────────
router.post('/login', loginLimiter, handle(async (req, res) => {
  if (!(await dbReady())) return res.status(503).json({ success: false, error: 'The placements portal needs the database. Try again in a minute.' });
  const email = clean(req.body?.email, 200).toLowerCase();
  const password = String(req.body?.password || '');
  const staff = email && password ? await CollegeStaff.findOne({ email }) : null;
  const ok = await bcrypt.compare(password, staff?.passwordHash || DUMMY_HASH);
  if (!staff || !ok || !staff.active) return res.status(401).json({ success: false, error: 'Wrong email or password.' });
  const college = await College.findById(staff.collegeId).lean();
  if (collegeAccess(college) === 'closed') return res.status(403).json({ success: false, code: 'COLLEGE_CLOSED', error: 'This college account is not active. Contact CVMind.' });
  staff.lastLoginAt = new Date();
  await staff.save();
  req.staff = staff;
  req.collegeId = college._id;
  await collegeAudit(req, 'staff.login', { targetId: staff._id, targetLabel: staff.email });
  res.json({ success: true, token: issueCollegeToken(staff, req.body?.remember ? REMEMBER_MS : SESSION_MS), staff: publicStaff(staff), college: publicCollege(college) });
}));

router.get('/me', profile, handle(async (req, res) => {
  await CollegeStaff.updateOne({ _id: req.staff._id }, { lastSeenAt: new Date() });
  res.json({ success: true, staff: publicStaff(req.staff), college: publicCollege(req.college) });
}));

router.patch('/me', profile, handle(async (req, res) => {
  const name = clean(req.body?.name, 80);
  if (!name) throw httpError(400, 'Enter your name.');
  const staff = await CollegeStaff.findByIdAndUpdate(req.staff._id, { name }, { returnDocument: 'after' }).lean();
  res.json({ success: true, staff: publicStaff(staff) });
}));

// Changing the password signs out every other session (tokenVersion) and returns a fresh token
router.post('/me/password', profile, handle(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const staff = await CollegeStaff.findById(req.staff._id);
  if (!(await bcrypt.compare(String(currentPassword || ''), staff.passwordHash))) throw httpError(400, 'Your current password is wrong.');
  const next = String(newPassword || '');
  if (next.length < MIN_PASSWORD) throw httpError(400, `Use at least ${MIN_PASSWORD} characters.`);
  if (next === currentPassword) throw httpError(400, 'Choose a password different from the current one.');
  staff.passwordHash = await bcrypt.hash(next, 10);
  staff.mustChangePassword = false;
  staff.tokenVersion = (staff.tokenVersion || 0) + 1;
  await staff.save();
  await collegeAudit(req, 'staff.password_changed', { targetId: staff._id, targetLabel: staff.email });
  res.json({ success: true, token: issueCollegeToken(staff, SESSION_MS), staff: publicStaff(staff) });
}));

// ── Staff (college admin only) ───────────────────────────────────────────────
router.get('/staff', admin, handle(async (req, res) => {
  const staff = await CollegeStaff.find(scoped(req)).sort({ role: 1, createdAt: 1 }).lean();
  res.json({ success: true, data: staff.map(publicStaff), max: MAX_STAFF });
}));

router.post('/staff', adminWrite, staffLimiter, handle(async (req, res) => {
  const email = clean(req.body?.email, 200).toLowerCase();
  const name = clean(req.body?.name, 80);
  if (!isEmail(email)) throw httpError(400, 'Enter a valid email.');
  if (await CollegeStaff.countDocuments(scoped(req, { active: true })) >= MAX_STAFF) throw httpError(400, `A college can have up to ${MAX_STAFF} active logins.`);
  // Emails are unique across all colleges; the message doesn't say where the email is used
  if (await CollegeStaff.exists({ email })) throw httpError(409, 'This email already has a placements login.');
  const password = generatePassword();
  const staff = await CollegeStaff.create({ collegeId: req.collegeId, email, name, role: 'staff', passwordHash: await bcrypt.hash(password, 10), createdBy: String(req.staff._id) });
  let emailError = '';
  try {
    await sendStaffCredentials({ staff, college: req.college, password, invitedBy: req.staff.name || req.staff.email });
  } catch (err) {
    emailError = err.message || 'The email could not be sent.';
  }
  await collegeAudit(req, 'staff.added', { targetId: staff._id, targetLabel: email });
  res.status(201).json({ success: true, staff: publicStaff(staff), emailSent: !emailError, emailError });
}));

// The staff row in this college, else 404. The college admin can't change their own login here.
async function otherStaff(req, id) {
  if (!isId(id)) throw httpError(404, 'Staff member not found.');
  const staff = await CollegeStaff.findOne(scoped(req, { _id: oid(id) }));
  if (!staff) throw httpError(404, 'Staff member not found.');
  if (String(staff._id) === String(req.staff._id)) throw httpError(400, 'Use your own profile to change your login.');
  if (staff.role === 'admin') throw httpError(403, 'Only CVMind can change the college admin login.');
  return staff;
}

router.post('/staff/:id/reset', adminWrite, staffLimiter, handle(async (req, res) => {
  const staff = await otherStaff(req, req.params.id);
  const password = generatePassword();
  staff.passwordHash = await bcrypt.hash(password, 10);
  staff.mustChangePassword = true;
  staff.active = true;
  staff.tokenVersion = (staff.tokenVersion || 0) + 1;
  await staff.save();
  let emailError = '';
  try {
    await sendStaffCredentials({ staff, college: req.college, password, invitedBy: req.staff.name || req.staff.email });
  } catch (err) {
    emailError = err.message || 'The email could not be sent.';
  }
  await collegeAudit(req, 'staff.reset', { targetId: staff._id, targetLabel: staff.email });
  res.json({ success: true, staff: publicStaff(staff), emailSent: !emailError, emailError });
}));

router.delete('/staff/:id', adminWrite, handle(async (req, res) => {
  const staff = await otherStaff(req, req.params.id);
  staff.active = false;
  staff.tokenVersion = (staff.tokenVersion || 0) + 1;
  await staff.save();
  await collegeAudit(req, 'staff.removed', { targetId: staff._id, targetLabel: staff.email });
  res.json({ success: true });
}));

// ── Settings, templates, audit ───────────────────────────────────────────────
const score = (v, field) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100) throw httpError(400, `${field} must be between 0 and 100.`);
  return Math.round(n);
};

router.patch('/settings', adminWrite, handle(async (req, res) => {
  const body = req.body || {};
  const update = {};
  if (body.minAtsScore !== undefined) update['settings.minAtsScore'] = score(body.minAtsScore, 'Minimum ATS score');
  if (body.minLinkedinScore !== undefined) update['settings.minLinkedinScore'] = score(body.minLinkedinScore, 'Minimum LinkedIn score');
  if (body.requireCollegeFormat !== undefined) update['settings.requireCollegeFormat'] = !!body.requireCollegeFormat;
  if (!Object.keys(update).length) throw httpError(400, 'Nothing to change.');
  const college = await College.findByIdAndUpdate(req.collegeId, update, { returnDocument: 'after' }).lean();
  await collegeAudit(req, 'settings.updated', { details: body });
  res.json({ success: true, college: publicCollege(college) });
}));

// The college's own resume formats (added by CVMind), for preview
router.get('/templates', anyone, handle(async (req, res) => {
  const rows = await CollegeTemplate.find(scoped(req, { active: true })).sort({ createdAt: 1 }).lean();
  res.json({ success: true, data: rows.map((t) => ({ id: String(t._id), name: t.name, description: t.description, html: t.html })) });
}));

router.get('/audit', admin, handle(async (req, res) => {
  const { page, limit, skip } = paging(req.query, { defaultLimit: 50, maxLimit: 100 });
  const filter = scoped(req);
  const [rows, total] = await Promise.all([
    CollegeAuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    CollegeAuditLog.countDocuments(filter)
  ]);
  res.json({
    success: true,
    data: rows.map((r) => ({ id: String(r._id), actorName: r.actorName, actorType: r.actorType, action: r.action, targetLabel: r.targetLabel, details: r.details, ip: r.ip, createdAt: r.createdAt })),
    total,
    page
  });
}));

export default router;
