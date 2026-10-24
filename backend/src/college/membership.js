import mongoose from 'mongoose';
import { contractLive } from './access.js';
import { ACTIVE_STUDENT_STATUSES, College, CollegeStudent, ResumeReview } from './models.js';

const norm = (email) => String(email || '').trim().toLowerCase();

// The student's joined roster row and its college, or null
export async function membershipFor(email) {
  const clean = norm(email);
  if (!clean || mongoose.connection.readyState !== 1) return null;
  const student = await CollegeStudent.findOne({ email: clean, status: 'joined' }).lean();
  if (!student) return null;
  const college = await College.findById(student.collegeId).lean();
  return college ? { student, college } : null;
}

// When an account is deleted: every college link (joined or a pending invite) ends and the
// colleges' reviews of that student are removed
export async function endCollegeLinks({ userId, email }) {
  const or = [userId && { userId: String(userId) }, email && { email: norm(email) }].filter(Boolean);
  if (!or.length) return;
  const rows = await CollegeStudent.find({ $or: or, status: { $in: ACTIVE_STUDENT_STATUSES } }, { _id: 1 }).lean();
  if (!rows.length) return;
  const ids = rows.map((r) => r._id);
  await CollegeStudent.updateMany({ _id: { $in: ids } }, { status: 'left', userId: '', inviteTokenHash: '', endedAt: new Date() });
  await ResumeReview.deleteMany({ studentId: { $in: ids } });
}

// Students of a college with a live contract get CVMind Pro (billing/service.js isPro, db.js isUserPaid)
export async function collegeProActive(email) {
  try {
    const found = await membershipFor(email);
    return !!found && contractLive(found.college);
  } catch (err) {
    console.error('[college] membership check failed:', err.message);
    return false;
  }
}
