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
