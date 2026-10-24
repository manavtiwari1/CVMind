import express from 'express';
import crypto from 'crypto';
import { rateLimit } from 'express-rate-limit';
import { sendEmailBatch } from '../../admin/mailer.js';
import { clean, handle, httpError, isEmail, isId } from '../../admin/util.js';
import { collegeAudit, hashToken, oid, requireCollege, scoped } from '../access.js';
import { inviteMessage } from '../emails.js';
import { ACTIVE_STUDENT_STATUSES, CollegeStudent } from '../models.js';

const router = express.Router();
const write = requireCollege({ write: true });

export const MAX_IMPORT_ROWS = 2000;
export const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_INVITES = 5;

const inviteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) => `college-invite:${req.collegeId}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ success: false, error: 'Too many invitation batches this hour. Try again later.' })
});

const cleanRow = (row = {}) => ({
  email: clean(row.email, 200).toLowerCase(),
  name: clean(row.name, 120),
  rollNo: clean(row.rollNo, 60),
  branch: clean(row.branch, 80),
  batch: clean(row.batch, 20)
});

const ANOTHER_COLLEGE = 'Already linked to another institution.';

export const seatsUsed = (req) => CollegeStudent.countDocuments(scoped(req, { status: { $in: ACTIVE_STUDENT_STATUSES } }));

// Splits uploaded rows into ones that can be invited and ones with a problem.
// Another college's roster is checked only for the email, and is never named in the result.
async function checkRows(req, rawRows) {
  if (!Array.isArray(rawRows) || !rawRows.length) throw httpError(400, 'Add at least one student.');
  if (rawRows.length > MAX_IMPORT_ROWS) throw httpError(400, `Upload up to ${MAX_IMPORT_ROWS} students at a time.`);
  const rows = rawRows.map(cleanRow);
  const emails = [...new Set(rows.map((r) => r.email).filter(isEmail))];
  const active = emails.length ? await CollegeStudent.find({ email: { $in: emails }, status: { $in: ACTIVE_STUDENT_STATUSES } }, { email: 1, collegeId: 1 }).lean() : [];
  const activeHere = new Set();
  const activeElsewhere = new Set();
  for (const s of active) (String(s.collegeId) === String(req.collegeId) ? activeHere : activeElsewhere).add(s.email);

  const seen = new Set();
  const valid = [];
  const errors = [];
  rows.forEach((row, i) => {
    let error = '';
    if (!isEmail(row.email)) error = 'Not a valid email.';
    else if (seen.has(row.email)) error = 'Listed twice in this upload.';
    else if (activeHere.has(row.email)) error = 'Already on your list.';
    else if (activeElsewhere.has(row.email)) error = ANOTHER_COLLEGE;
    seen.add(row.email);
    if (error) errors.push({ row: i + 1, email: row.email, error });
    else valid.push({ ...row, row: i + 1 });
  });

  const free = Math.max(0, (req.college.contract?.seats || 0) - await seatsUsed(req));
  for (const extra of valid.splice(free)) errors.push({ row: extra.row, email: extra.email, error: 'No seats left on your plan.' });
  return { valid, errors, seatsFree: free };
}

// Creates or re-opens roster rows and emails each one a fresh invite link
async function inviteRows(req, rows) {
  const invited = [];
  const errors = [];
  const messages = [];
  for (const row of rows) {
    const token = crypto.randomBytes(24).toString('base64url');
    const fields = {
      name: row.name, rollNo: row.rollNo, branch: row.branch, batch: row.batch,
      status: 'invited', userId: '', inviteTokenHash: hashToken(token), inviteExpiresAt: new Date(Date.now() + INVITE_TTL_MS),
      invitedAt: new Date(), inviteError: '', joinedAt: null, consentAt: null, endedAt: null
    };
    try {
      // A student who declined, left or was removed from this college gets their old row back
      const student = await CollegeStudent.findOneAndUpdate(
        scoped(req, { email: row.email, status: { $nin: ACTIVE_STUDENT_STATUSES } }),
        { $set: fields, $inc: { inviteCount: 1 } },
        { returnDocument: 'after', sort: { updatedAt: -1 } }
      ) || await CollegeStudent.create({ ...fields, collegeId: req.collegeId, email: row.email, inviteCount: 1 });
      invited.push(student);
      messages.push(inviteMessage({ student, college: req.college, token }));
    } catch (err) {
      if (err.code !== 11000) throw err;
      errors.push({ row: row.row, email: row.email, error: ANOTHER_COLLEGE });
    }
  }
  if (messages.length) {
    let failedTo = new Set();
    try {
      const result = await sendEmailBatch(messages);
      failedTo = new Set(result.errors.flatMap((e) => e.to));
    } catch (err) {
      failedTo = new Set(messages.map((m) => m.to));
    }
    if (failedTo.size) {
      await CollegeStudent.updateMany(scoped(req, { email: { $in: [...failedTo] }, status: 'invited' }), { inviteError: 'The invitation email could not be sent.' });
    }
  }
  return { invited, errors };
}

router.post('/students/preview', write, handle(async (req, res) => {
  const { valid, errors, seatsFree } = await checkRows(req, req.body?.rows);
  res.json({ success: true, valid: valid.length, errors, seatsFree });
}));

router.post('/students/import', write, inviteLimiter, handle(async (req, res) => {
  const checked = await checkRows(req, req.body?.rows);
  const { invited, errors } = await inviteRows(req, checked.valid);
  await collegeAudit(req, 'roster.imported', { details: { invited: invited.length, skipped: checked.errors.length + errors.length } });
  res.json({ success: true, invited: invited.length, errors: [...checked.errors, ...errors].sort((a, b) => a.row - b.row) });
}));

// One roster row of this college that isn't removed, else 404
async function rosterRow(req, id) {
  if (!isId(id)) throw httpError(404, 'Student not found.');
  const student = await CollegeStudent.findOne(scoped(req, { _id: oid(id), status: { $ne: 'removed' } }));
  if (!student) throw httpError(404, 'Student not found.');
  return student;
}

router.patch('/students/:id', write, handle(async (req, res) => {
  const student = await rosterRow(req, req.params.id);
  const row = cleanRow({ ...student.toObject(), ...req.body, email: student.email });
  Object.assign(student, { name: row.name, rollNo: row.rollNo, branch: row.branch, batch: row.batch });
  await student.save();
  await collegeAudit(req, 'roster.edited', { targetId: student._id, targetLabel: student.email });
  res.json({ success: true });
}));

router.post('/students/:id/resend', write, inviteLimiter, handle(async (req, res) => {
  const student = await rosterRow(req, req.params.id);
  if (student.status === 'joined') throw httpError(400, 'This student has already joined.');
  if (student.status === 'invited' && student.inviteCount >= MAX_INVITES) throw httpError(400, 'This invitation has been sent the most times allowed.');
  if (student.status !== 'invited') {
    // Re-inviting a declined or departed student takes a seat again
    if (await seatsUsed(req) >= (req.college.contract?.seats || 0)) throw httpError(400, 'No seats left on your plan.');
  }
  const row = { ...cleanRow(student.toObject()), row: 1 };
  if (student.status === 'invited') student.status = 'declined'; // let inviteRows reuse the row
  await student.save();
  const { invited, errors } = await inviteRows(req, [row]);
  if (!invited.length) throw httpError(409, errors[0]?.error || ANOTHER_COLLEGE);
  await collegeAudit(req, 'roster.reinvited', { targetId: student._id, targetLabel: student.email });
  res.json({ success: true });
}));

// Removing a student ends the college's access to their data at once and frees the seat
router.delete('/students/:id', write, handle(async (req, res) => {
  const student = await rosterRow(req, req.params.id);
  student.status = 'removed';
  student.inviteTokenHash = '';
  student.endedAt = new Date();
  await student.save();
  await collegeAudit(req, 'roster.removed', { targetId: student._id, targetLabel: student.email });
  res.json({ success: true });
}));

export default router;
