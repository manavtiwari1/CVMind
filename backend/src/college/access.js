import crypto from 'crypto';
import mongoose from 'mongoose';
import { dbReady } from '../admin/auth.js';
import { httpError, isId } from '../admin/util.js';
import { signToken, verifyToken } from '../services/authToken.js';
import { College, CollegeAuditLog, CollegeStaff, CollegeStudent } from './models.js';

// The isolation layer of the placements portal. Rules every college route follows:
// 1. req.collegeId comes from the signed-in staff row in the database, never from the request.
// 2. College records are read with scoped(req, filter), which always pins collegeId.
// 3. A student's resumes and scores are reached only through studentFor(), which needs a joined
//    roster row of this college. Ids from another college get a 404, so they can't be probed.

export const COLLEGE_APP_URL = process.env.COLLEGE_APP_URL || 'https://placements.cvmind.in';
export const USER_APP_URL = process.env.USER_APP_URL || 'https://app.cvmind.in';
// After the contract ends the college can still read (not change) its data for this long
export const READ_ONLY_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;
export const oid = (id) => new mongoose.Types.ObjectId(String(id));

// 'active' | 'readonly' (contract ended, within the grace period) | 'closed'
export function collegeAccess(college, now = Date.now()) {
  if (!college || college.status !== 'active') return 'closed';
  const ends = new Date(college.contract?.endsAt || 0).getTime();
  if (now <= ends) return 'active';
  return now <= ends + READ_ONLY_GRACE_MS ? 'readonly' : 'closed';
}

// Students keep Pro until the end of the contract's last day
export const contractLive = (college, now = Date.now()) =>
  !!college && college.status === 'active' && now <= new Date(college.contract?.endsAt || 0).getTime() + DAY_MS;

// Same alphabet as the team workspace's temporary passwords (no look-alike characters)
export const generatePassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from(crypto.randomBytes(14), (b) => alphabet[b % alphabet.length]).join('');
};

export const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

export function issueCollegeToken(staff, ttlMs) {
  return signToken({ sub: String(staff._id), kind: 'college', email: staff.email, ttlMs, jti: `v${staff.tokenVersion || 0}` });
}

export function publicStaff(staff) {
  return {
    id: String(staff._id),
    email: staff.email,
    name: staff.name || staff.email,
    role: staff.role,
    active: staff.active !== false,
    mustChangePassword: !!staff.mustChangePassword,
    lastLoginAt: staff.lastLoginAt || null,
    createdAt: staff.createdAt || null
  };
}

export function publicCollege(college) {
  return {
    id: String(college._id),
    name: college.name,
    slug: college.slug,
    logo: college.logo || '',
    status: college.status,
    access: collegeAccess(college),
    contract: {
      seats: college.contract?.seats ?? 0,
      startsAt: college.contract?.startsAt || null,
      endsAt: college.contract?.endsAt || null
    },
    settings: {
      minAtsScore: college.settings?.minAtsScore ?? 0,
      minLinkedinScore: college.settings?.minLinkedinScore ?? 0,
      requireCollegeFormat: !!college.settings?.requireCollegeFormat
    }
  };
}

// { staff, college } for a raw college token, or null. Each request re-reads both rows, so a
// removed staff member, a revoked token or a suspended college stops working at once.
export async function staffFromToken(token) {
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.kind !== 'college' || !isId(payload.sub)) return null;
  if (!(await dbReady())) return null;
  const staff = await CollegeStaff.findById(payload.sub).lean();
  if (!staff || !staff.active || payload.jti !== `v${staff.tokenVersion || 0}`) return null;
  const college = await College.findById(staff.collegeId).lean();
  if (!college) return null;
  return { staff, college };
}

const bearer = (req) => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
};

// Guard for every placements-portal route.
// admin: only the college admin (TPO). write: refused while the contract is in read-only grace.
// allowPasswordChange: works before the first-sign-in password change.
export function requireCollege({ admin = false, write = false, allowPasswordChange = false } = {}) {
  return async (req, res, next) => {
    try {
      if (!(await dbReady())) return res.status(503).json({ success: false, error: 'The placements portal needs the database. Try again in a minute.' });
      const found = await staffFromToken(bearer(req));
      if (!found) return res.status(401).json({ success: false, code: 'COLLEGE_AUTH', error: 'Your session has ended. Please sign in again.' });
      const { staff, college } = found;
      const access = collegeAccess(college);
      if (access === 'closed') return res.status(403).json({ success: false, code: 'COLLEGE_CLOSED', error: 'This college account is not active. Contact CVMind.' });
      if (staff.mustChangePassword && !allowPasswordChange) return res.status(403).json({ success: false, code: 'COLLEGE_SET_PASSWORD', error: 'Set your own password to continue.' });
      if (admin && staff.role !== 'admin') return res.status(403).json({ success: false, code: 'COLLEGE_FORBIDDEN', error: 'Only the college admin can do this.' });
      if (write && access !== 'active') return res.status(403).json({ success: false, code: 'COLLEGE_READ_ONLY', error: 'Your contract has ended, so the portal is read-only. Contact CVMind to renew.' });
      req.staff = staff;
      req.college = college;
      req.collegeId = college._id;
      next();
    } catch (err) {
      next(err);
    }
  };
}

// A Mongo filter pinned to the signed-in college. collegeId is set last so a filter can't override it.
export function scoped(req, filter = {}) {
  if (!req.collegeId) throw new Error('scoped() called outside a college request');
  return { ...filter, collegeId: req.collegeId };
}

// This college's roster row, else a 404. joined: also require an accepted invite (data access).
export async function studentFor(req, studentId, { joined = true } = {}) {
  if (!isId(studentId)) throw httpError(404, 'Student not found.');
  const filter = scoped(req, { _id: oid(studentId) });
  filter.status = joined ? 'joined' : { $ne: 'removed' };
  const student = await CollegeStudent.findOne(filter);
  if (!student || (joined && !student.userId)) throw httpError(404, 'Student not found.');
  return student;
}

// userIds of this college's joined students, optionally narrowed by a roster filter
export async function joinedStudents(req, filter = {}, projection = null) {
  return CollegeStudent.find(scoped(req, { ...filter, status: 'joined', userId: { $gt: '' } }), projection).lean();
}

// Records a portal action in the college's own audit log. Never throws.
export async function collegeAudit(req, action, { targetId = '', targetLabel = '', details = null, collegeId, actorType = 'staff', actor } = {}) {
  const who = actor || (req.staff ? { id: String(req.staff._id), name: req.staff.name || req.staff.email } : { id: req.admin?.id || '', name: req.admin?.name || req.admin?.username || '' });
  try {
    await CollegeAuditLog.create({
      collegeId: collegeId || req.collegeId,
      actorId: who.id,
      actorName: who.name,
      actorType,
      action,
      targetId: String(targetId || ''),
      targetLabel: String(targetLabel || '').slice(0, 200),
      details,
      ip: req.ip || ''
    });
  } catch (err) {
    console.error('[college audit] write failed:', err.message);
  }
}
