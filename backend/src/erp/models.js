import mongoose from 'mongoose';

const { Schema } = mongoose;
const Id = Schema.Types.ObjectId;

// ERP collections (admin panel → ERP). Each person on the team (an AdminUser) has at most one HR file.
// Dates a person picks are YYYY-MM-DD strings, like Team leave and Past members.

export const EMPLOYMENT_TYPES = ['intern', 'full_time', 'part_time', 'contractor'];
export const PAY_TYPES = ['stipend', 'salary', 'unpaid'];
export const DOCUMENT_KINDS = ['id_proof', 'pan_card', 'college_letter', 'signed_offer', 'other'];

const hrDocumentSchema = new Schema({
  fileId: { type: Id, required: true },
  kind: { type: String, enum: DOCUMENT_KINDS, default: 'other' },
  verifiedAt: { type: Date, default: null },
  verifiedBy: { type: Id, default: null }
}, { _id: true });

const profileSchema = new Schema({
  adminId: { type: Id, required: true, unique: true },
  // Job
  employmentType: { type: String, enum: EMPLOYMENT_TYPES, default: 'intern' },
  designation: { type: String, default: '' },
  managerId: { type: Id, default: null },
  // Dates
  joiningDate: { type: String, default: '' },
  // Internship or contract end
  endDate: { type: String, default: '' },
  probationEndDate: { type: String, default: '' },
  lastWorkingDay: { type: String, default: '' },
  // Pay: the current rate. Every change is also kept in ErpPayHistory.
  payType: { type: String, enum: PAY_TYPES, default: 'unpaid' },
  payAmount: { type: Number, default: 0 },
  // Personal
  legalName: { type: String, default: '' },
  dateOfBirth: { type: String, default: '' },
  personalEmail: { type: String, default: '' },
  address: { type: String, default: '' },
  emergencyName: { type: String, default: '' },
  emergencyRelation: { type: String, default: '' },
  emergencyPhone: { type: String, default: '' },
  // Bank: the account number and PAN are stored encrypted (erp/secure.js); the last 4 are kept for display
  bankHolder: { type: String, default: '' },
  bankAccountEnc: { type: String, default: '' },
  bankAccountLast4: { type: String, default: '' },
  bankIfsc: { type: String, default: '' },
  upiId: { type: String, default: '' },
  panEnc: { type: String, default: '' },
  panLast4: { type: String, default: '' },
  documents: { type: [hrDocumentSchema], default: [] },
  // Reminders already sent, so the daily job sends each one once: "end:2026-12-31", "probation:2026-12-01"
  remindersSent: { type: [String], default: [] },
  notes: { type: String, default: '' },
  updatedBy: { type: Id, default: null }
}, { timestamps: true });
profileSchema.index({ managerId: 1 });
profileSchema.index({ endDate: 1 });
profileSchema.index({ probationEndDate: 1 });
export const ErpProfile = mongoose.models.ErpProfile || mongoose.model('ErpProfile', profileSchema);

// Every pay change, newest first by effectiveFrom. Payroll reads the rate that applied in a month.
const payHistorySchema = new Schema({
  adminId: { type: Id, required: true },
  payType: { type: String, enum: PAY_TYPES, required: true },
  amount: { type: Number, default: 0 },
  effectiveFrom: { type: String, required: true },
  note: { type: String, default: '' },
  createdBy: { type: Id, default: null },
  createdByName: { type: String, default: '' }
}, { timestamps: true });
payHistorySchema.index({ adminId: 1, effectiveFrom: -1 });
export const ErpPayHistory = mongoose.models.ErpPayHistory || mongoose.model('ErpPayHistory', payHistorySchema);

// ── Payroll ────────────────────────────────────────────────────────────────
// One run per month ("2026-11"). Draft → approved (numbers locked) → each line marked paid.
export const RUN_STATUSES = ['draft', 'approved', 'paid'];
const payRunSchema = new Schema({
  month: { type: String, required: true, unique: true },
  status: { type: String, enum: RUN_STATUSES, default: 'draft' },
  createdBy: { type: Id, default: null },
  createdByName: { type: String, default: '' },
  approvedBy: { type: Id, default: null },
  approvedByName: { type: String, default: '' },
  approvedAt: { type: Date, default: null },
  calculatedAt: { type: Date, default: null }
}, { timestamps: true });
export const ErpPayRun = mongoose.models.ErpPayRun || mongoose.model('ErpPayRun', payRunSchema);

export const PAYMENT_MODES = ['bank', 'upi', 'cash', 'other'];
const payLineSchema = new Schema({
  runId: { type: Id, required: true },
  month: { type: String, required: true },
  adminId: { type: Id, required: true },
  // A copy of who they were this month, so the payslip never changes later
  name: { type: String, default: '' },
  idNumber: { type: String, default: '' },
  designation: { type: String, default: '' },
  department: { type: String, default: '' },
  employmentType: { type: String, default: '' },
  payType: { type: String, default: 'stipend' },
  monthlyAmount: { type: Number, default: 0 },
  // Days (working days only: Mon–Sat by default, minus company holidays)
  monthWorkingDays: { type: Number, default: 0 },
  workingDays: { type: Number, default: 0 },
  presentDays: { type: Number, default: 0 },
  wfhDays: { type: Number, default: 0 },
  paidLeaveDays: { type: Number, default: 0 },
  unpaidLeaveDays: { type: Number, default: 0 },
  absentDays: { type: Number, default: 0 },
  unpaidDays: { type: Number, default: 0 },
  // Money (INR)
  basePay: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  reimbursements: { type: Number, default: 0 },
  netPay: { type: Number, default: 0 },
  note: { type: String, default: '' },
  // Payment
  paidAt: { type: Date, default: null },
  paidOn: { type: String, default: '' },
  paidMode: { type: String, default: '' },
  paidRef: { type: String, default: '' },
  paidByName: { type: String, default: '' },
  payslipNumber: { type: String, default: '' },
  bankAccountLast4: { type: String, default: '' },
  upiId: { type: String, default: '' }
}, { timestamps: true });
payLineSchema.index({ runId: 1, adminId: 1 }, { unique: true });
payLineSchema.index({ adminId: 1, month: -1 });
export const ErpPayLine = mongoose.models.ErpPayLine || mongoose.model('ErpPayLine', payLineSchema);

// ── Letters & certificates ─────────────────────────────────────────────────
export const LETTER_TYPES = ['offer', 'appointment', 'completion', 'experience', 'relieving', 'pay_certificate', 'recommendation'];
const letterSchema = new Schema({
  // CVM/LTR/2026/0001
  number: { type: String, required: true, unique: true },
  // The code in the public verify link (cvmind.in/verify/<code>); random, so links can't be guessed
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: LETTER_TYPES, required: true },
  adminId: { type: Id, default: null },
  // Hiring: an offer to someone who isn't on the team yet
  candidateId: { type: Id, default: null },
  recipientName: { type: String, required: true },
  recipientEmail: { type: String, default: '' },
  title: { type: String, required: true },
  body: { type: String, required: true },
  issuedOn: { type: String, required: true },
  issuedBy: { type: Id, default: null },
  issuedByName: { type: String, default: '' },
  signatoryName: { type: String, default: '' },
  signatoryTitle: { type: String, default: '' },
  status: { type: String, enum: ['valid', 'revoked'], default: 'valid' },
  revokedAt: { type: Date, default: null },
  revokedReason: { type: String, default: '' },
  emailedAt: { type: Date, default: null }
}, { timestamps: true });
letterSchema.index({ adminId: 1, createdAt: -1 });
letterSchema.index({ candidateId: 1 });
export const ErpLetter = mongoose.models.ErpLetter || mongoose.model('ErpLetter', letterSchema);

// A template edited by leadership; letter types without one use the built-in text (erp/letters.js)
const letterTemplateSchema = new Schema({
  type: { type: String, enum: LETTER_TYPES, required: true, unique: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  updatedByName: { type: String, default: '' }
}, { timestamps: true });
export const ErpLetterTemplate = mongoose.models.ErpLetterTemplate || mongoose.model('ErpLetterTemplate', letterTemplateSchema);

// A member asks HR for a letter from CVMind Team
const letterRequestSchema = new Schema({
  adminId: { type: Id, required: true },
  type: { type: String, enum: LETTER_TYPES, required: true },
  note: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'issued', 'declined'], default: 'pending' },
  letterId: { type: Id, default: null },
  reply: { type: String, default: '' },
  decidedByName: { type: String, default: '' },
  decidedAt: { type: Date, default: null }
}, { timestamps: true });
letterRequestSchema.index({ status: 1, createdAt: -1 });
letterRequestSchema.index({ adminId: 1, createdAt: -1 });
export const ErpLetterRequest = mongoose.models.ErpLetterRequest || mongoose.model('ErpLetterRequest', letterRequestSchema);

// ── Expenses ───────────────────────────────────────────────────────────────
// Company spending entered by HR, and claims members raise for money they paid themselves.
export const EXPENSE_CATEGORIES = ['servers', 'ai_apis', 'marketing', 'software', 'domains', 'office_travel', 'salaries', 'other'];
// Claims: pending_manager → (pending_leadership when above the limit) → approved → reimbursed. No manager: pending_hr.
export const EXPENSE_STATUSES = ['draft', 'recorded', 'pending_manager', 'pending_hr', 'pending_leadership', 'approved', 'reimbursed', 'declined'];
const expenseSchema = new Schema({
  kind: { type: String, enum: ['company', 'claim'], required: true },
  date: { type: String, required: true },
  amount: { type: Number, required: true },
  paidTo: { type: String, default: '' },
  category: { type: String, enum: EXPENSE_CATEGORIES, default: 'other' },
  description: { type: String, default: '' },
  paymentMode: { type: String, default: '' },
  reference: { type: String, default: '' },
  receiptFileId: { type: Id, default: null },
  status: { type: String, enum: EXPENSE_STATUSES, default: 'recorded' },
  // Claims
  submittedBy: { type: Id, default: null },
  managerId: { type: Id, default: null },
  approvals: { type: [{ _id: false, stage: String, byId: Id, byName: String, at: Date }], default: [] },
  declinedReason: { type: String, default: '' },
  declinedByName: { type: String, default: '' },
  reimbursedVia: { type: String, default: '' },
  reimbursedOn: { type: String, default: '' },
  payLineId: { type: Id, default: null },
  // Repeats: the next one is created as a draft on nextDueOn
  recurring: { type: String, enum: ['none', 'monthly', 'yearly'], default: 'none' },
  nextDueOn: { type: String, default: '' },
  assetId: { type: Id, default: null },
  createdBy: { type: Id, default: null },
  createdByName: { type: String, default: '' }
}, { timestamps: true });
expenseSchema.index({ date: -1 });
expenseSchema.index({ status: 1, date: -1 });
expenseSchema.index({ submittedBy: 1, createdAt: -1 });
expenseSchema.index({ managerId: 1, status: 1 });
expenseSchema.index({ recurring: 1, nextDueOn: 1 });
export const ErpExpense = mongoose.models.ErpExpense || mongoose.model('ErpExpense', expenseSchema);

// ── Hiring ─────────────────────────────────────────────────────────────────
const openingSchema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  employmentType: { type: String, enum: EMPLOYMENT_TYPES, default: 'intern' },
  department: { type: String, default: '' },
  location: { type: String, default: 'Remote' },
  payType: { type: String, enum: PAY_TYPES, default: 'stipend' },
  payMin: { type: Number, default: 0 },
  payMax: { type: Number, default: 0 },
  duration: { type: String, default: '' },
  description: { type: String, default: '' },
  questions: { type: [String], default: [] },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  ownerId: { type: Id, default: null },
  closedAt: { type: Date, default: null },
  createdByName: { type: String, default: '' }
}, { timestamps: true });
openingSchema.index({ status: 1, createdAt: -1 });
export const ErpOpening = mongoose.models.ErpOpening || mongoose.model('ErpOpening', openingSchema);

export const CANDIDATE_STAGES = ['applied', 'screening', 'task', 'interview', 'offer', 'joined', 'rejected'];
const candidateSchema = new Schema({
  openingId: { type: Id, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, default: '' },
  college: { type: String, default: '' },
  links: { type: [String], default: [] },
  answers: { type: [{ _id: false, question: String, answer: String }], default: [] },
  resumeFileId: { type: Id, default: null },
  stage: { type: String, enum: CANDIDATE_STAGES, default: 'applied' },
  rating: { type: Number, default: 0 },
  notes: { type: [{ _id: false, byName: String, text: String, rating: Number, at: Date }], default: [] },
  events: { type: [{ _id: false, at: Date, text: String, byName: String }], default: [] },
  taskLink: { type: String, default: '' },
  interviewAt: { type: Date, default: null },
  interviewLink: { type: String, default: '' },
  interviewerIds: { type: [Id], default: [] },
  rejectedReason: { type: String, default: '' },
  // Offer: the letter, its accept link and the answer
  offerLetterId: { type: Id, default: null },
  offerToken: { type: String, default: '' },
  offerStatus: { type: String, enum: ['', 'sent', 'accepted', 'declined'], default: '' },
  offerAnsweredAt: { type: Date, default: null },
  offerTerms: { type: Schema.Types.Mixed, default: null },
  adminId: { type: Id, default: null },
  ip: { type: String, default: '' }
}, { timestamps: true });
candidateSchema.index({ openingId: 1, email: 1 }, { unique: true });
candidateSchema.index({ email: 1 });
candidateSchema.index({ stage: 1, createdAt: -1 });
candidateSchema.index({ offerToken: 1 });
export const ErpCandidate = mongoose.models.ErpCandidate || mongoose.model('ErpCandidate', candidateSchema);

// ── Assets & subscriptions ─────────────────────────────────────────────────
// Physical things (laptops, phones) given to people, and digital things paid for on repeat
// (domains, hosting, SaaS). Passwords and keys are never stored here: only who holds the login.
export const ASSET_CATEGORIES = {
  physical: ['laptop', 'phone', 'monitor', 'accessory', 'other'],
  digital: ['domain', 'hosting', 'database', 'ai_api', 'email', 'software', 'other']
};
const assetSchema = new Schema({
  kind: { type: String, enum: ['physical', 'digital'], required: true },
  name: { type: String, required: true },
  category: { type: String, default: 'other' },
  // Physical
  serialNumber: { type: String, default: '' },
  condition: { type: String, default: '' },
  assignedTo: { type: Id, default: null },
  // Digital
  provider: { type: String, default: '' },
  plan: { type: String, default: '' },
  billingCard: { type: String, default: '' },
  loginHolderIds: { type: [Id], default: [] },
  // Money and dates
  cost: { type: Number, default: 0 },
  billing: { type: String, enum: ['once', 'monthly', 'yearly'], default: 'once' },
  purchaseDate: { type: String, default: '' },
  renewalDate: { type: String, default: '' },
  ownerId: { type: Id, default: null },
  status: { type: String, enum: ['active', 'retired'], default: 'active' },
  notes: { type: String, default: '' },
  history: { type: [{ _id: false, at: Date, text: String, byName: String }], default: [] },
  remindersSent: { type: [String], default: [] }
}, { timestamps: true });
assetSchema.index({ kind: 1, status: 1 });
assetSchema.index({ assignedTo: 1 });
assetSchema.index({ loginHolderIds: 1 });
assetSchema.index({ renewalDate: 1 });
export const ErpAsset = mongoose.models.ErpAsset || mongoose.model('ErpAsset', assetSchema);
