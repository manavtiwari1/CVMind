import mongoose from 'mongoose';
import { contractLive } from './access.js';
import { College, CollegeStudent } from './models.js';

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
