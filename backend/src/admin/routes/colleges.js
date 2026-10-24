import express from 'express';
import bcrypt from 'bcryptjs';
import { requireAdmin, requireDb } from '../auth.js';
import { audit } from '../audit.js';
import { clean, escapeRegex, handle, httpError, isEmail, isId, paging } from '../util.js';
import { collegeAudit, generatePassword, oid, publicCollege, publicStaff } from '../../college/access.js';
import { sendStaffCredentials } from '../../college/emails.js';
import { ACTIVE_STUDENT_STATUSES, College, CollegeAuditLog, CollegeStaff, CollegeStudent, CollegeTemplate } from '../../college/models.js';

// Colleges on the placements portal (placements.cvmind.in). CVMind adds them here; each college
// then manages its own staff and students from the portal.
const router = express.Router();
router.use(requireDb);
const view = requireAdmin('colleges.view');
const manage = requireAdmin('colleges.manage');

const MAX_TEMPLATE_BYTES = 200 * 1024;

const slugify = (name) => clean(name, 80).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'college';
async function uniqueSlug(name) {
  const base = slugify(name);
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!(await College.exists({ slug }))) return slug;
  }
}

const date = (v, field) => {
  const d = new Date(v);
  if (!v || isNaN(d)) throw httpError(400, `Enter a valid ${field}.`);
  return d;
};

// Admin-supplied logos are https URLs or small data URLs only
function cleanLogo(v) {
  const logo = String(v ?? '').trim();
  if (!logo) return '';
  if (/^https:\/\/\S+$/i.test(logo) && logo.length <= 500) return logo;
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo) && logo.length <= 300 * 1024) return logo;
  throw httpError(400, 'The logo must be an https link or a PNG, JPG or WebP image under 200 KB.');
}

function contractFields(body, current = {}) {
  const seats = body.seats !== undefined ? Number(body.seats) : current.seats;
  if (!Number.isInteger(seats) || seats < 0 || seats > 100000) throw httpError(400, 'Seats must be a whole number.');
  const startsAt = body.startsAt !== undefined ? date(body.startsAt, 'start date') : (current.startsAt || new Date());
  const endsAt = body.endsAt !== undefined ? date(body.endsAt, 'end date') : current.endsAt;
  if (!endsAt) throw httpError(400, 'Enter a valid end date.');
  // The contract runs to the end of its last day
  endsAt.setUTCHours(23, 59, 59, 999);
  if (endsAt <= startsAt) throw httpError(400, 'The contract must end after it starts.');
  return { seats, startsAt, endsAt };
}

async function counts(collegeIds) {
  const rows = await CollegeStudent.aggregate([
    { $match: { collegeId: { $in: collegeIds } } },
    { $group: { _id: { c: '$collegeId', s: '$status' }, n: { $sum: 1 } } }
  ]);
  const map = new Map();
  for (const r of rows) {
    const key = String(r._id.c);
    const c = map.get(key) || { joined: 0, invited: 0 };
    if (r._id.s === 'joined') c.joined += r.n;
    if (r._id.s === 'invited') c.invited += r.n;
    map.set(key, c);
  }
  return map;
}

// Creates the college admin login and emails it. Returns { staff, emailSent, emailError }.
async function createCollegeAdmin(req, college, { email, name }) {
  if (!isEmail(email)) throw httpError(400, "Enter the college admin's email.");
  if (await CollegeStaff.exists({ email })) throw httpError(409, 'This email already has a placements login.');
  const password = generatePassword();
  const staff = await CollegeStaff.create({ collegeId: college._id, email, name, role: 'admin', passwordHash: await bcrypt.hash(password, 10), createdBy: req.admin.id });
  let emailError = '';
  try {
    await sendStaffCredentials({ staff, college, password, invitedBy: 'CVMind' });
  } catch (err) {
    emailError = err.message || 'The email could not be sent.';
  }
  return { staff, emailSent: !emailError, emailError };
}

async function collegeById(id) {
  if (!isId(id)) throw httpError(404, 'College not found.');
  const college = await College.findById(id);
  if (!college) throw httpError(404, 'College not found.');
  return college;
}

router.get('/', view, handle(async (req, res) => {
  const { page, limit, skip } = paging(req.query);
  const filter = {};
  if (req.query.q) filter.name = new RegExp(escapeRegex(clean(req.query.q, 80)), 'i');
  const [rows, total] = await Promise.all([
    College.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-logo').lean(),
    College.countDocuments(filter)
  ]);
  const c = await counts(rows.map((r) => r._id));
  res.json({ success: true, total, page, limit, data: rows.map((r) => ({ ...publicCollege(r), ...(c.get(String(r._id)) || { joined: 0, invited: 0 }), createdAt: r.createdAt })) });
}));

router.post('/', manage, handle(async (req, res) => {
  const body = req.body || {};
  const name = clean(body.name, 120);
  if (!name) throw httpError(400, 'Enter the college name.');
  const adminEmail = clean(body.adminEmail, 200).toLowerCase();
  if (!isEmail(adminEmail)) throw httpError(400, "Enter the college admin's email.");
  if (await CollegeStaff.exists({ email: adminEmail })) throw httpError(409, 'This email already has a placements login.');
  const college = await College.create({ name, slug: await uniqueSlug(name), logo: cleanLogo(body.logo), contract: contractFields(body, { seats: 100 }), createdBy: req.admin.id });
  const result = await createCollegeAdmin(req, college, { email: adminEmail, name: clean(body.adminName, 80) });
  await audit(req, 'college.created', { targetType: 'college', targetId: college._id, targetLabel: name, details: { adminEmail, seats: college.contract.seats } });
  await collegeAudit(req, 'college.created', { collegeId: college._id, actorType: 'cvmind', targetLabel: name });
  res.status(201).json({ success: true, college: publicCollege(college), admin: publicStaff(result.staff), emailSent: result.emailSent, emailError: result.emailError });
}));

router.get('/:id', view, handle(async (req, res) => {
  const college = await collegeById(req.params.id);
  const [staff, templates, c, seatsUsed] = await Promise.all([
    CollegeStaff.find({ collegeId: college._id }).sort({ role: 1, createdAt: 1 }).lean(),
    CollegeTemplate.find({ collegeId: college._id }).sort({ createdAt: 1 }).lean(),
    counts([college._id]),
    CollegeStudent.countDocuments({ collegeId: college._id, status: { $in: ACTIVE_STUDENT_STATUSES } })
  ]);
  res.json({
    success: true,
    college: { ...publicCollege(college), ...(c.get(String(college._id)) || { joined: 0, invited: 0 }), seatsUsed, createdAt: college.createdAt },
    staff: staff.map(publicStaff),
    templates: templates.map((t) => ({ id: String(t._id), name: t.name, description: t.description, html: t.html, active: t.active, updatedAt: t.updatedAt }))
  });
}));

router.patch('/:id', manage, handle(async (req, res) => {
  const college = await collegeById(req.params.id);
  const body = req.body || {};
  if (body.name !== undefined) {
    const name = clean(body.name, 120);
    if (!name) throw httpError(400, 'Enter the college name.');
    college.name = name;
  }
  if (body.logo !== undefined) college.logo = cleanLogo(body.logo);
  if (body.status !== undefined) {
    if (!['active', 'suspended'].includes(body.status)) throw httpError(400, 'Unknown status.');
    college.status = body.status;
  }
  if (['seats', 'startsAt', 'endsAt'].some((k) => body[k] !== undefined)) college.contract = contractFields(body, college.contract);
  await college.save();
  await audit(req, 'college.updated', { targetType: 'college', targetId: college._id, targetLabel: college.name, details: { ...body, logo: body.logo !== undefined ? '(changed)' : undefined } });
  await collegeAudit(req, 'college.updated', { collegeId: college._id, actorType: 'cvmind', targetLabel: college.name });
  res.json({ success: true, college: publicCollege(college) });
}));

// Sends the college admin a new temporary password, or replaces the college admin with a new email
router.post('/:id/admin', manage, handle(async (req, res) => {
  const college = await collegeById(req.params.id);
  const email = clean(req.body?.email, 200).toLowerCase();
  const current = await CollegeStaff.findOne({ collegeId: college._id, role: 'admin', active: true });
  if (!email || email === current?.email) {
    if (!current) throw httpError(400, "Enter the new college admin's email.");
    const password = generatePassword();
    current.passwordHash = await bcrypt.hash(password, 10);
    current.mustChangePassword = true;
    current.tokenVersion = (current.tokenVersion || 0) + 1;
    await current.save();
    let emailError = '';
    try {
      await sendStaffCredentials({ staff: current, college, password, invitedBy: 'CVMind' });
    } catch (err) {
      emailError = err.message || 'The email could not be sent.';
    }
    await audit(req, 'college.admin_reset', { targetType: 'college', targetId: college._id, targetLabel: `${college.name} · ${current.email}` });
    await collegeAudit(req, 'staff.reset', { collegeId: college._id, actorType: 'cvmind', targetId: current._id, targetLabel: current.email });
    return res.json({ success: true, admin: publicStaff(current), emailSent: !emailError, emailError });
  }
  const result = await createCollegeAdmin(req, college, { email, name: clean(req.body?.name, 80) });
  if (current) {
    current.active = false;
    current.tokenVersion = (current.tokenVersion || 0) + 1;
    await current.save();
  }
  await audit(req, 'college.admin_replaced', { targetType: 'college', targetId: college._id, targetLabel: college.name, details: { from: current?.email || '', to: email } });
  await collegeAudit(req, 'staff.admin_replaced', { collegeId: college._id, actorType: 'cvmind', targetId: result.staff._id, targetLabel: email });
  res.json({ success: true, admin: publicStaff(result.staff), emailSent: result.emailSent, emailError: result.emailError });
}));

// ── Resume formats ───────────────────────────────────────────────────────────
function templateFields(body, partial = false) {
  const out = {};
  if (!partial || body.name !== undefined) {
    out.name = clean(body.name, 80);
    if (!out.name) throw httpError(400, 'Name the format.');
  }
  if (!partial || body.html !== undefined) {
    out.html = String(body.html ?? '');
    if (out.html.trim().length < 50) throw httpError(400, 'Paste the format HTML.');
    if (Buffer.byteLength(out.html) > MAX_TEMPLATE_BYTES) throw httpError(400, 'The format HTML must be under 200 KB.');
  }
  if (body.description !== undefined) out.description = clean(body.description, 300);
  if (body.active !== undefined) out.active = !!body.active;
  return out;
}

router.post('/:id/templates', manage, handle(async (req, res) => {
  const college = await collegeById(req.params.id);
  const t = await CollegeTemplate.create({ ...templateFields(req.body || {}), collegeId: college._id, createdBy: req.admin.id });
  await audit(req, 'college.template_added', { targetType: 'college', targetId: college._id, targetLabel: `${college.name} · ${t.name}` });
  res.status(201).json({ success: true, template: { id: String(t._id), name: t.name, description: t.description, html: t.html, active: t.active } });
}));

router.patch('/:id/templates/:templateId', manage, handle(async (req, res) => {
  const college = await collegeById(req.params.id);
  if (!isId(req.params.templateId)) throw httpError(404, 'Format not found.');
  const t = await CollegeTemplate.findOneAndUpdate({ _id: oid(req.params.templateId), collegeId: college._id }, templateFields(req.body || {}, true), { returnDocument: 'after' });
  if (!t) throw httpError(404, 'Format not found.');
  await audit(req, 'college.template_updated', { targetType: 'college', targetId: college._id, targetLabel: `${college.name} · ${t.name}` });
  res.json({ success: true, template: { id: String(t._id), name: t.name, description: t.description, html: t.html, active: t.active } });
}));

// ── Students and audit ───────────────────────────────────────────────────────
router.get('/:id/students', view, handle(async (req, res) => {
  const college = await collegeById(req.params.id);
  const { page, limit, skip } = paging(req.query, { defaultLimit: 50, maxLimit: 200 });
  const filter = { collegeId: college._id };
  if (req.query.status) filter.status = clean(req.query.status, 20);
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(clean(req.query.q, 80)), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { rollNo: rx }];
  }
  const [rows, total] = await Promise.all([
    CollegeStudent.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    CollegeStudent.countDocuments(filter)
  ]);
  res.json({ success: true, total, page, limit, data: rows.map((s) => ({ id: String(s._id), email: s.email, name: s.name, rollNo: s.rollNo, branch: s.branch, batch: s.batch, status: s.status, joinedAt: s.joinedAt, invitedAt: s.invitedAt })) });
}));

// Frees a student so another college can invite them (e.g. they changed college)
router.post('/:id/students/:studentId/unlink', manage, handle(async (req, res) => {
  const college = await collegeById(req.params.id);
  if (!isId(req.params.studentId)) throw httpError(404, 'Student not found.');
  const student = await CollegeStudent.findOneAndUpdate(
    { _id: oid(req.params.studentId), collegeId: college._id, status: { $in: ACTIVE_STUDENT_STATUSES } },
    { status: 'removed', inviteTokenHash: '', endedAt: new Date() },
    { returnDocument: 'after' }
  );
  if (!student) throw httpError(404, 'Student not found.');
  await audit(req, 'college.student_unlinked', { targetType: 'college', targetId: college._id, targetLabel: `${college.name} · ${student.email}` });
  await collegeAudit(req, 'roster.removed', { collegeId: college._id, actorType: 'cvmind', targetId: student._id, targetLabel: student.email });
  res.json({ success: true });
}));

router.get('/:id/audit', view, handle(async (req, res) => {
  const college = await collegeById(req.params.id);
  const { page, limit, skip } = paging(req.query, { defaultLimit: 50, maxLimit: 100 });
  const [rows, total] = await Promise.all([
    CollegeAuditLog.find({ collegeId: college._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    CollegeAuditLog.countDocuments({ collegeId: college._id })
  ]);
  res.json({ success: true, total, page, limit, data: rows.map((r) => ({ id: String(r._id), actorName: r.actorName, actorType: r.actorType, action: r.action, targetLabel: r.targetLabel, ip: r.ip, createdAt: r.createdAt })) });
}));

export default router;
