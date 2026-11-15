import crypto from 'crypto';
import mongoose from 'mongoose';
import { AdminUser } from '../admin/models.js';
import { clean, httpError, isEmail } from '../admin/util.js';
import { TeamFile } from '../admin/team/models.js';
import { EMPLOYMENT_TYPES, ErpCandidate, ErpOpening, PAY_TYPES } from './models.js';
import { longDate } from './pdf.js';
import { SITE_URL } from './letters.js';

// Hiring: openings, candidates and offers.

// Resumes uploaded by candidates (who have no account) are owned by this id
export const CANDIDATE_UPLOADER = new mongoose.Types.ObjectId('000000000000000000000001');
// Candidates who didn't join are deleted this long after their opening closes (privacy policy)
export const CANDIDATE_RETENTION_DAYS = 180;

export const STAGE_LABELS = { applied: 'Applied', screening: 'Screening', task: 'Task / test', interview: 'Interview', offer: 'Offer', joined: 'Joined', rejected: 'Rejected' };
const TYPE_LABELS = { intern: 'Internship', full_time: 'Full-time', part_time: 'Part-time', contractor: 'Contract' };

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'role';

export function readOpening(body = {}) {
  const title = clean(body.title, 100);
  if (!title) throw httpError(400, 'Give the opening a title.');
  if (body.employmentType !== undefined && !EMPLOYMENT_TYPES.includes(body.employmentType)) throw httpError(400, 'Pick the type of job.');
  if (body.payType !== undefined && !PAY_TYPES.includes(body.payType)) throw httpError(400, 'Pick stipend, salary or unpaid.');
  const payMin = Math.max(0, Math.round(Number(body.payMin) || 0));
  const payMax = Math.max(0, Math.round(Number(body.payMax) || 0));
  if (payMax && payMin > payMax) throw httpError(400, 'The lowest pay is above the highest.');
  const questions = (Array.isArray(body.questions) ? body.questions : []).map((q) => clean(q, 200)).filter(Boolean).slice(0, 5);
  return {
    title,
    employmentType: body.employmentType || 'intern',
    department: clean(body.department, 60),
    location: clean(body.location, 80) || 'Remote',
    payType: body.payType || 'stipend',
    payMin,
    payMax,
    duration: clean(body.duration, 40),
    description: clean(body.description, 6000),
    questions
  };
}

export async function uniqueSlug(title) {
  const base = slugify(title);
  for (let i = 0; i < 5; i++) {
    const slug = i === 0 ? base : `${base}-${crypto.randomBytes(2).toString('hex')}`;
    if (!(await ErpOpening.exists({ slug }))) return slug;
  }
  return `${base}-${crypto.randomBytes(4).toString('hex')}`;
}

export const payRange = (o) => (o.payType === 'unpaid' ? 'Unpaid' : o.payMin && o.payMax && o.payMin !== o.payMax
  ? `₹${o.payMin.toLocaleString('en-IN')}–₹${o.payMax.toLocaleString('en-IN')} a month`
  : o.payMax || o.payMin ? `₹${(o.payMax || o.payMin).toLocaleString('en-IN')} a month` : '');

export const publicOpening = (o, { internal = false, counts = null } = {}) => ({
  id: String(o._id),
  slug: o.slug,
  title: o.title,
  employmentType: o.employmentType,
  typeLabel: TYPE_LABELS[o.employmentType],
  department: o.department,
  location: o.location,
  payType: o.payType,
  payMin: o.payMin,
  payMax: o.payMax,
  pay: payRange(o),
  duration: o.duration,
  description: o.description,
  questions: o.questions,
  url: `${SITE_URL}/careers/${o.slug}`,
  ...(internal ? { status: o.status, ownerId: o.ownerId ? String(o.ownerId) : null, closedAt: o.closedAt, createdAt: o.createdAt, counts } : {})
});

export function readApplication(body = {}, opening) {
  const name = clean(body.name, 80);
  const email = clean(body.email, 120).toLowerCase();
  if (!name) throw httpError(400, 'Enter your name.');
  if (!isEmail(email)) throw httpError(400, 'Enter a valid email address.');
  const phone = clean(body.phone, 20);
  if (!/^[+\d][\d\s-]{6,18}$/.test(phone)) throw httpError(400, 'Enter a valid phone number.');
  const links = (Array.isArray(body.links) ? body.links : []).map((l) => clean(l, 200)).filter((l) => /^https?:\/\/\S+$/i.test(l)).slice(0, 3);
  const answers = opening.questions.map((question, i) => ({ question, answer: clean(body.answers?.[i], 2000) }));
  if (answers.some((a) => !a.answer)) throw httpError(400, 'Answer every question.');
  return { name, email, phone, college: clean(body.college, 120), links, answers };
}

export const addEvent = (candidate, text, byName = 'CVMind') => candidate.events.push({ at: new Date(), text, byName });

export async function publicCandidates(rows) {
  const openings = new Map((await ErpOpening.find({ _id: { $in: rows.map((c) => c.openingId) } }, { title: 1 }).lean()).map((o) => [String(o._id), o.title]));
  const interviewerIds = [...new Set(rows.flatMap((c) => (c.interviewerIds || []).map(String)))];
  const names = new Map((await AdminUser.find({ _id: { $in: interviewerIds } }, { name: 1, username: 1 }).lean()).map((a) => [String(a._id), a.name || a.username]));
  const others = await ErpCandidate.aggregate([{ $match: { email: { $in: rows.map((c) => c.email) } } }, { $group: { _id: '$email', count: { $sum: 1 } } }]);
  const appliedCount = new Map(others.map((o) => [o._id, o.count]));
  return rows.map((c) => ({
    id: String(c._id),
    openingId: String(c.openingId),
    openingTitle: openings.get(String(c.openingId)) || 'Closed opening',
    name: c.name,
    email: c.email,
    phone: c.phone,
    college: c.college,
    links: c.links,
    answers: c.answers,
    hasResume: !!c.resumeFileId,
    stage: c.stage,
    stageLabel: STAGE_LABELS[c.stage],
    rating: c.rating,
    notes: c.notes,
    events: c.events,
    taskLink: c.taskLink,
    interviewAt: c.interviewAt,
    interviewLink: c.interviewLink,
    interviewers: (c.interviewerIds || []).map((id) => ({ id: String(id), name: names.get(String(id)) || '' })),
    rejectedReason: c.rejectedReason,
    offerStatus: c.offerStatus,
    offerTerms: c.offerTerms,
    offerLetterId: c.offerLetterId ? String(c.offerLetterId) : null,
    adminId: c.adminId ? String(c.adminId) : null,
    otherApplications: (appliedCount.get(c.email) || 1) - 1,
    createdAt: c.createdAt
  }));
}

// The offer letter text for a candidate, from the offer template
export function offerValues(candidate, opening, terms, settings) {
  const pay = terms.payType === 'unpaid' ? 'no stipend' : `₹${Number(terms.amount || 0).toLocaleString('en-IN')}`;
  return {
    name: candidate.name,
    firstName: candidate.name.split(/\s+/)[0],
    idNumber: '—',
    designation: terms.designation || opening.title,
    department: opening.department,
    employmentType: TYPE_LABELS[opening.employmentType] || '',
    joiningDate: longDate(terms.joiningDate),
    endDate: terms.endDate ? longDate(terms.endDate) : '',
    lastWorkingDay: terms.endDate ? longDate(terms.endDate) : '',
    pay,
    payType: terms.payType === 'salary' ? 'salary' : 'stipend',
    payTypeTitle: terms.payType === 'salary' ? 'Salary' : 'Stipend',
    payLastMonths: '',
    today: longDate(new Date().toISOString().slice(0, 10)),
    company: 'CVMind',
    signatoryName: settings.signatoryName || '',
    signatoryTitle: settings.signatoryTitle || '',
    details: clean(terms.details, 3000)
  };
}

export const offerUrl = (token) => `${SITE_URL}/offer/${token}`;
export const newOfferToken = () => crypto.randomBytes(24).toString('base64url');

export const rejectionEmail = (candidate, openingTitle) => ({
  preheader: `About your application for ${openingTitle}`,
  title: 'About your application',
  greetingName: candidate.name.split(/\s+/)[0],
  body: `Thank you for applying for ${openingTitle} at CVMind and for the time you put into it. After careful thought, we won't be moving ahead with your application this time.

We'd be glad to see you apply again for future openings.`
});

// Daily: candidates who didn't join are deleted 180 days after their opening closed
export async function deleteOldCandidates(now = new Date()) {
  const cutoff = new Date(+now - CANDIDATE_RETENTION_DAYS * 864e5);
  const closed = await ErpOpening.find({ status: 'closed', closedAt: { $lte: cutoff } }, { _id: 1 }).lean();
  if (!closed.length) return { deleted: 0 };
  const old = await ErpCandidate.find({ openingId: { $in: closed.map((o) => o._id) }, stage: { $ne: 'joined' } }, { _id: 1, resumeFileId: 1 }).lean();
  const files = old.map((c) => c.resumeFileId).filter(Boolean);
  if (files.length) await TeamFile.updateMany({ _id: { $in: files } }, { status: 'deleted', deletedAt: now });
  await ErpCandidate.deleteMany({ _id: { $in: old.map((c) => c._id) } });
  return { deleted: old.length };
}
