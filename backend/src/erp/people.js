import { AdminUser } from '../admin/models.js';
import { ROLES } from '../admin/permissions.js';
import { clean, httpError, isEmail, isId } from '../admin/util.js';
import { TeamFile } from '../admin/team/models.js';
import { istDay } from '../admin/team/notify.js';
import { DOCUMENT_KINDS, EMPLOYMENT_TYPES, ErpPayHistory, ErpProfile, PAY_TYPES } from './models.js';
import { encrypt, last4 } from './secure.js';

// HR files: reading, checking and saving the fields. Used by the admin panel (erp/routes/people.js)
// and by the member's own view in CVMind Team (erp/routes/me.js).

export const DAY = /^\d{4}-\d{2}-\d{2}$/;
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const ACCOUNT = /^\d{9,18}$/;
const UPI = /^[\w.-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;
const PHONE = /^[+\d][\d\s-]{6,18}$/;

export const roleLabel = (role) => ROLES[role]?.label || role || '';

// Fields each side may change
const JOB_FIELDS = ['employmentType', 'designation', 'managerId', 'joiningDate', 'endDate', 'probationEndDate', 'lastWorkingDay', 'notes'];
const PERSONAL_FIELDS = ['legalName', 'dateOfBirth', 'personalEmail', 'address', 'emergencyName', 'emergencyRelation', 'emergencyPhone'];
const BANK_FIELDS = ['bankHolder', 'bankAccount', 'bankIfsc', 'upiId', 'pan'];
export const HR_EDITABLE = [...JOB_FIELDS, ...PERSONAL_FIELDS, ...BANK_FIELDS];
export const SELF_EDITABLE = [...PERSONAL_FIELDS, ...BANK_FIELDS];

const date = (body, key, label) => {
  const v = clean(body[key], 10);
  if (v && !DAY.test(v)) throw httpError(400, `Pick a valid ${label}.`);
  return v;
};

// Checks the sent fields. Only keys in `allowed` that were sent are returned; an empty string clears a field.
export async function readProfileFields(body = {}, { allowed, adminId }) {
  const out = {};
  const has = (k) => allowed.includes(k) && body[k] !== undefined && body[k] !== null;

  if (has('employmentType')) {
    if (!EMPLOYMENT_TYPES.includes(body.employmentType)) throw httpError(400, 'Pick the type of job.');
    out.employmentType = body.employmentType;
  }
  if (has('designation')) out.designation = clean(body.designation, 80);
  if (has('managerId')) {
    const id = clean(body.managerId, 24);
    if (id) {
      if (!isId(id) || !(await AdminUser.exists({ _id: id, active: true }))) throw httpError(400, 'Pick a reporting manager from the team.');
      if (String(id) === String(adminId)) throw httpError(400, 'Someone can\'t report to themselves.');
    }
    out.managerId = id || null;
  }
  if (has('joiningDate')) out.joiningDate = date(body, 'joiningDate', 'joining date');
  if (has('endDate')) out.endDate = date(body, 'endDate', 'end date');
  if (has('probationEndDate')) out.probationEndDate = date(body, 'probationEndDate', 'probation end date');
  if (has('lastWorkingDay')) out.lastWorkingDay = date(body, 'lastWorkingDay', 'last working day');
  if (has('notes')) out.notes = clean(body.notes, 2000);

  if (has('legalName')) out.legalName = clean(body.legalName, 100);
  if (has('dateOfBirth')) out.dateOfBirth = date(body, 'dateOfBirth', 'date of birth');
  if (has('personalEmail')) {
    out.personalEmail = clean(body.personalEmail, 120).toLowerCase();
    if (out.personalEmail && !isEmail(out.personalEmail)) throw httpError(400, 'Enter a valid personal email.');
  }
  if (has('address')) out.address = clean(body.address, 400);
  if (has('emergencyName')) out.emergencyName = clean(body.emergencyName, 80);
  if (has('emergencyRelation')) out.emergencyRelation = clean(body.emergencyRelation, 40);
  if (has('emergencyPhone')) {
    out.emergencyPhone = clean(body.emergencyPhone, 20);
    if (out.emergencyPhone && !PHONE.test(out.emergencyPhone)) throw httpError(400, 'Enter a valid emergency contact number.');
  }

  if (has('bankHolder')) out.bankHolder = clean(body.bankHolder, 100);
  if (has('bankAccount')) {
    const v = clean(body.bankAccount, 30).replace(/[\s-]/g, '');
    if (v && !ACCOUNT.test(v)) throw httpError(400, 'Enter a valid bank account number (9 to 18 digits).');
    out.bankAccountEnc = v ? encrypt(v) : '';
    out.bankAccountLast4 = last4(v);
  }
  if (has('bankIfsc')) {
    out.bankIfsc = clean(body.bankIfsc, 11).toUpperCase();
    if (out.bankIfsc && !IFSC.test(out.bankIfsc)) throw httpError(400, 'Enter a valid IFSC code, like SBIN0001234.');
  }
  if (has('upiId')) {
    out.upiId = clean(body.upiId, 100);
    if (out.upiId && !UPI.test(out.upiId)) throw httpError(400, 'Enter a valid UPI ID, like name@okicici.');
  }
  if (has('pan')) {
    const v = clean(body.pan, 10).toUpperCase();
    if (v && !PAN.test(v)) throw httpError(400, 'Enter a valid PAN, like ABCDE1234F.');
    out.panEnc = v ? encrypt(v) : '';
    out.panLast4 = last4(v);
  }

  const dates = { ...body, ...out };
  if (dates.joiningDate && dates.endDate && allowed.includes('endDate') && dates.endDate < dates.joiningDate) throw httpError(400, 'The end date is before the joining date.');
  return out;
}

// The pay that applies on `day`: the newest history row that started on or before it
export async function payOn(adminId, day = istDay()) {
  const row = await ErpPayHistory.findOne({ adminId, effectiveFrom: { $lte: day } }).sort({ effectiveFrom: -1, createdAt: -1 }).lean();
  return row ? { payType: row.payType, amount: row.amount } : { payType: 'unpaid', amount: 0 };
}

// Keeps the profile's current pay in step with the history
export async function syncCurrentPay(adminId) {
  const pay = await payOn(adminId);
  await ErpProfile.updateOne({ adminId }, { $set: { payType: pay.payType, payAmount: pay.amount } }, { upsert: true });
  return pay;
}

export function readPayEntry(body = {}) {
  if (!PAY_TYPES.includes(body.payType)) throw httpError(400, 'Pick stipend, salary or unpaid.');
  const amount = body.payType === 'unpaid' ? 0 : Math.round(Number(body.amount) * 100) / 100;
  if (body.payType !== 'unpaid' && (!Number.isFinite(amount) || amount <= 0 || amount > 10000000)) throw httpError(400, 'Enter the monthly amount in rupees.');
  const effectiveFrom = clean(body.effectiveFrom, 10);
  if (!DAY.test(effectiveFrom)) throw httpError(400, 'Pick the date this pay starts from.');
  return { payType: body.payType, amount, effectiveFrom, note: clean(body.note, 200) };
}

export const loadProfile = async (adminId) => (await ErpProfile.findOne({ adminId }).lean()) || { adminId, documents: [], remindersSent: [] };

// What's missing from a file, for the list's "complete" column
export function missingParts(p) {
  const missing = [];
  if (!p.joiningDate) missing.push('joining date');
  if (!p.designation) missing.push('designation');
  if (!p.legalName) missing.push('legal name');
  if (p.payType && p.payType !== 'unpaid' && !p.bankAccountLast4 && !p.upiId) missing.push('bank or UPI');
  if (!p.emergencyPhone) missing.push('emergency contact');
  return missing;
}

async function documentRows(docs) {
  if (!docs?.length) return [];
  const files = new Map((await TeamFile.find({ _id: { $in: docs.map((d) => d.fileId) } }, { name: 1, mime: 1, size: 1, status: 1 }).lean()).map((f) => [String(f._id), f]));
  return docs.map((d) => {
    const f = files.get(String(d.fileId));
    return {
      id: String(d._id),
      kind: d.kind,
      fileId: String(d.fileId),
      name: f?.name || 'File removed',
      mime: f?.mime || '',
      size: f?.size || 0,
      verified: !!d.verifiedAt,
      verifiedAt: d.verifiedAt || null
    };
  });
}

// The full file as one person sees it. `pay` shows the amount and history; bank numbers stay masked.
export async function publicProfile(p, { pay = true, history = [] } = {}) {
  const manager = p.managerId ? await AdminUser.findById(p.managerId, { name: 1, username: 1 }).lean() : null;
  return {
    adminId: String(p.adminId),
    employmentType: p.employmentType || 'intern',
    designation: p.designation || '',
    managerId: p.managerId ? String(p.managerId) : null,
    managerName: manager ? (manager.name || manager.username) : '',
    joiningDate: p.joiningDate || '',
    endDate: p.endDate || '',
    probationEndDate: p.probationEndDate || '',
    lastWorkingDay: p.lastWorkingDay || '',
    ...(pay ? {
      payType: p.payType || 'unpaid',
      payAmount: p.payAmount || 0,
      payHistory: history.map((h) => ({ id: String(h._id), payType: h.payType, amount: h.amount, effectiveFrom: h.effectiveFrom, note: h.note || '', createdByName: h.createdByName || '', createdAt: h.createdAt }))
    } : {}),
    legalName: p.legalName || '',
    dateOfBirth: p.dateOfBirth || '',
    personalEmail: p.personalEmail || '',
    address: p.address || '',
    emergencyName: p.emergencyName || '',
    emergencyRelation: p.emergencyRelation || '',
    emergencyPhone: p.emergencyPhone || '',
    bankHolder: p.bankHolder || '',
    bankAccountLast4: p.bankAccountLast4 || '',
    bankIfsc: p.bankIfsc || '',
    upiId: p.upiId || '',
    panLast4: p.panLast4 || '',
    documents: await documentRows(p.documents),
    notes: p.notes || '',
    missing: missingParts(p),
    updatedAt: p.updatedAt || null
  };
}

export const isDocumentKind = (k) => DOCUMENT_KINDS.includes(k);
