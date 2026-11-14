import crypto from 'crypto';
import { AdminUser, AppSetting } from '../admin/models.js';
import { ROLES } from '../admin/permissions.js';
import { httpError } from '../admin/util.js';
import { istDay } from '../admin/team/notify.js';
import { ErpLetterTemplate, ErpPayLine, ErpProfile, LETTER_TYPES } from './models.js';
import { COLORS, footer, letterhead, longDate, MARGIN, startDocument } from './pdf.js';
import { monthLabel } from './payroll.js';
import { getSettings } from './settings.js';

// Letters & certificates: built-in templates, placeholders filled from the HR file, numbering and the PDF.

export const LETTER_LABELS = {
  offer: 'Offer letter',
  appointment: 'Appointment / internship letter',
  completion: 'Internship completion certificate',
  experience: 'Experience letter',
  relieving: 'Relieving letter',
  pay_certificate: 'Stipend / salary certificate',
  recommendation: 'Letter of recommendation'
};

// {placeholders} people can use in a template
export const PLACEHOLDERS = ['name', 'firstName', 'idNumber', 'designation', 'department', 'employmentType', 'joiningDate', 'endDate', 'lastWorkingDay', 'pay', 'payType', 'payLastMonths', 'today', 'company', 'signatoryName', 'signatoryTitle', 'details'];

export const DEFAULT_TEMPLATES = {
  offer: {
    title: 'Offer Letter',
    body: `Dear {firstName},

We are pleased to offer you the position of {designation} at {company}. Your start date will be {joiningDate}{endDate}.

You will receive a {payType} of {pay} per month. You will report to your manager in the CVMind Team workspace, where you will also receive your tasks, check-ins and meetings.

{details}

Please confirm your acceptance by replying to this letter. We look forward to working with you.`
  },
  appointment: {
    title: 'Appointment Letter',
    body: `Dear {firstName},

This letter confirms your appointment as {designation} at {company} with effect from {joiningDate}{endDate}. Your employee ID is {idNumber}.

You will receive a {payType} of {pay} per month, paid at the end of each month.

{details}

We wish you a rewarding time at {company}.`
  },
  completion: {
    title: 'Certificate of Internship Completion',
    body: `This is to certify that {name} (ID {idNumber}) has successfully completed an internship at {company} as {designation} from {joiningDate} to {lastWorkingDay}.

{details}

During the internship, {firstName} showed dedication, a willingness to learn and a professional attitude. We wish {firstName} every success in the future.`
  },
  experience: {
    title: 'Experience Letter',
    body: `This is to certify that {name} (ID {idNumber}) worked with {company} as {designation} from {joiningDate} to {lastWorkingDay}.

{details}

We found {firstName} sincere, hardworking and a valued member of the team, and wish {firstName} the very best in all future endeavours.`
  },
  relieving: {
    title: 'Relieving Letter',
    body: `Dear {firstName},

This is to confirm that you have been relieved from your duties as {designation} at {company} with effect from the close of business on {lastWorkingDay}. You joined us on {joiningDate}.

{details}

All dues have been settled. We thank you for your contributions and wish you success ahead.`
  },
  pay_certificate: {
    title: '{payTypeTitle} Certificate',
    body: `This is to certify that {name} (ID {idNumber}) has been working with {company} as {designation} since {joiningDate}, with a monthly {payType} of {pay}.

{payLastMonths}

{details}

This certificate is issued at the request of {firstName} for whatever purpose it may serve.`
  },
  recommendation: {
    title: 'Letter of Recommendation',
    body: `To whom it may concern,

It is my pleasure to recommend {name}, who worked with {company} as {designation} from {joiningDate} to {lastWorkingDay}.

{details}

I am confident {firstName} will be a valuable addition to any team, and I recommend {firstName} without reservation.`
  }
};

const TYPE_WORDS = { intern: 'Intern', full_time: 'Full-time', part_time: 'Part-time', contractor: 'Contractor' };
const inrWords = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export async function templateFor(type) {
  if (!LETTER_TYPES.includes(type)) throw httpError(400, 'Pick a letter type.');
  const saved = await ErpLetterTemplate.findOne({ type }).lean();
  return saved ? { title: saved.title, body: saved.body, custom: true } : { ...DEFAULT_TEMPLATES[type], custom: false };
}

// The values a member's placeholders take
export async function valuesFor(adminId, { details = '' } = {}) {
  const [person, profile, settings] = await Promise.all([
    AdminUser.findById(adminId).lean(),
    ErpProfile.findOne({ adminId }).lean(),
    getSettings()
  ]);
  if (!person) throw httpError(404, 'Person not found.');
  const p = profile || {};
  const name = p.legalName || person.name || person.username;
  const lastPaid = await ErpPayLine.find({ adminId, paidAt: { $ne: null } }).sort({ month: -1 }).limit(6).lean();
  return {
    name,
    firstName: name.split(/\s+/)[0],
    idNumber: person.idNumber || '—',
    designation: p.designation || ROLES[person.role]?.label || 'Team member',
    department: person.department || '',
    employmentType: TYPE_WORDS[p.employmentType] || '',
    joiningDate: p.joiningDate ? longDate(p.joiningDate) : longDate(person.createdAt),
    endDate: p.endDate ? longDate(p.endDate) : '',
    lastWorkingDay: longDate(p.lastWorkingDay || p.endDate || istDay()),
    pay: p.payAmount ? inrWords(p.payAmount) : '—',
    payType: p.payType === 'salary' ? 'salary' : 'stipend',
    payTypeTitle: p.payType === 'salary' ? 'Salary' : 'Stipend',
    payLastMonths: lastPaid.length ? `Payments in the last ${lastPaid.length} month${lastPaid.length === 1 ? '' : 's'}: ${lastPaid.map((l) => `${monthLabel(l.month)} ${inrWords(l.netPay)}`).join(', ')}.` : '',
    today: longDate(istDay()),
    company: 'CVMind',
    signatoryName: settings.signatoryName || '',
    signatoryTitle: settings.signatoryTitle || '',
    details: String(details || '').trim(),
    email: person.email || ''
  };
}

// Fills {placeholders}; an empty {details} line disappears, and " until {endDate}" only shows with a date
export function fill(text, values) {
  return String(text)
    .replace(/\{endDate\}/g, values.endDate ? ` until ${values.endDate}` : '')
    .replace(/\{(\w+)\}/g, (m, key) => (values[key] !== undefined ? String(values[key]) : m))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// CVM/LTR/2026/0001, a counter per year
export async function nextLetterNumber() {
  const year = istDay().slice(0, 4);
  const row = await AppSetting.findOneAndUpdate({ key: `counter.letter.${year}` }, { $inc: { value: 1 } }, { upsert: true, returnDocument: 'after' }).lean();
  return `CVM/LTR/${year}/${String(row.value).padStart(4, '0')}`;
}
export const newVerifyCode = () => crypto.randomBytes(8).toString('base64url').replace(/[^A-Za-z0-9]/g, '').slice(0, 10).toUpperCase().padEnd(10, 'X');

export const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://www.cvmind.in').replace(/\/$/, '');
export const verifyUrl = (code) => `${SITE_URL}/verify/${code}`;

/** @returns {Promise<Buffer>} the letter on the CVMind letterhead */
export async function renderLetterPdf(letter, settings = {}) {
  const { doc, done } = startDocument(`${letter.title} · ${letter.number}`);
  letterhead(doc, { lines: [`Ref: ${letter.number}`, `Date: ${longDate(letter.issuedOn)}`], address: settings.companyAddress });
  const width = 595.28 - 2 * MARGIN;
  doc.moveDown(1);
  doc.font('bold').fontSize(16).fillColor(COLORS.navy).text(letter.title, MARGIN, doc.y, { width, align: 'center' });
  doc.moveDown(1.2);
  doc.font('regular').fontSize(10.5).fillColor(COLORS.ink).text(letter.body, MARGIN, doc.y, { width, align: 'justify', lineGap: 3, paragraphGap: 6 });
  doc.moveDown(2);
  doc.font('regular').fontSize(10.5).fillColor(COLORS.ink).text('For CVMind,', MARGIN);
  doc.moveDown(2.5);
  if (letter.signatoryName) doc.font('semibold').fontSize(10.5).text(letter.signatoryName, MARGIN);
  if (letter.signatoryTitle) doc.font('regular').fontSize(9.5).fillColor(COLORS.soft).text(letter.signatoryTitle, MARGIN);
  // Verify box near the bottom
  const y = 841.89 - 120;
  doc.roundedRect(MARGIN, y, width, 40, 6).fillAndStroke(COLORS.tint, COLORS.line);
  doc.font('semibold').fontSize(8.5).fillColor(COLORS.navy).text('VERIFY THIS LETTER', MARGIN + 14, y + 9, { lineBreak: false, characterSpacing: 0.4 });
  doc.font('regular').fontSize(9).fillColor(COLORS.ink).text(verifyUrl(letter.code), MARGIN + 14, y + 22, { lineBreak: false, link: verifyUrl(letter.code), underline: false });
  doc.font('regular').fontSize(8.5).fillColor(COLORS.soft).text(`Code ${letter.code}`, MARGIN + 14, y + 22, { width: width - 28, align: 'right', lineBreak: false });
  footer(doc, letter.status === 'revoked' ? 'This letter has been revoked by CVMind.' : 'Issued by CVMind. Check it at the link above.');
  doc.end();
  return done;
}

export const publicLetter = (l) => ({
  id: String(l._id),
  number: l.number,
  code: l.code,
  type: l.type,
  typeLabel: LETTER_LABELS[l.type],
  adminId: l.adminId ? String(l.adminId) : null,
  candidateId: l.candidateId ? String(l.candidateId) : null,
  recipientName: l.recipientName,
  recipientEmail: l.recipientEmail || '',
  title: l.title,
  body: l.body,
  issuedOn: l.issuedOn,
  issuedByName: l.issuedByName || '',
  status: l.status,
  revokedReason: l.revokedReason || '',
  emailedAt: l.emailedAt || null,
  verifyUrl: verifyUrl(l.code),
  createdAt: l.createdAt
});
