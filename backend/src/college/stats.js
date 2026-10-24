import { model } from '../admin/util.js';
import { scoped } from './access.js';
import { ResumeReview } from './models.js';

export const COLLEGE_TEMPLATE_PREFIX = 'college:';
export const isCollegeTemplate = (templateId, collegeTemplateIds) =>
  String(templateId || '').startsWith(COLLEGE_TEMPLATE_PREFIX) && collegeTemplateIds.has(String(templateId).slice(COLLEGE_TEMPLATE_PREFIX.length));

const latestByUser = async (Model, userIds) => {
  if (!userIds.length) return new Map();
  const rows = await Model.aggregate([
    { $match: { userId: { $in: userIds } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$userId', score: { $first: '$score' }, at: { $first: '$createdAt' } } }
  ]);
  return new Map(rows.map((r) => [r._id, { score: r.score, at: r.at }]));
};

// A review is stale when the resume was edited after it, or the resume is gone
export function reviewState(review, work) {
  if (!review) return 'not_reviewed';
  if (!work) return 'stale';
  if (new Date(work.updatedAt || work.createdAt).getTime() > new Date(review.workUpdatedAt).getTime()) return 'stale';
  return review.status;
}

// Scores, resumes and review state for this college's joined students (rows from joinedStudents()).
// Returns Map(studentId → stats). Only userIds from the roster rows are queried.
export async function studentStats(req, students, { collegeTemplateIds = new Set() } = {}) {
  const userIds = students.map((s) => s.userId).filter(Boolean);
  const Work = model('Work');
  const [ats, linkedin, works, reviews] = await Promise.all([
    latestByUser(model('Scan'), userIds),
    latestByUser(model('LinkedinLog'), userIds),
    userIds.length ? Work.find({ userId: { $in: userIds }, type: 'resume' }, { userId: 1, title: 1, templateId: 1, createdAt: 1, updatedAt: 1 }).lean() : [],
    students.length ? ResumeReview.find(scoped(req, { studentId: { $in: students.map((s) => s._id) } })).lean() : []
  ]);

  const worksByUser = new Map();
  for (const w of works) {
    if (!worksByUser.has(w.userId)) worksByUser.set(w.userId, []);
    worksByUser.get(w.userId).push(w);
  }
  const reviewsByStudent = new Map();
  for (const r of reviews) {
    const key = String(r.studentId);
    if (!reviewsByStudent.has(key)) reviewsByStudent.set(key, []);
    reviewsByStudent.get(key).push(r);
  }

  const settings = req.college?.settings || {};
  const result = new Map();
  for (const s of students) {
    const mine = worksByUser.get(s.userId) || [];
    const byId = new Map(mine.map((w) => [String(w._id), w]));
    const states = (reviewsByStudent.get(String(s._id)) || []).map((r) => ({ review: r, work: byId.get(r.workId), state: reviewState(r, byId.get(r.workId)) }));
    const approved = states.filter((x) => x.state === 'approved' && (!settings.requireCollegeFormat || isCollegeTemplate(x.work?.templateId, collegeTemplateIds)));
    const reviewStatus = approved.length ? 'approved'
      : states.some((x) => x.state === 'changes_requested') ? 'changes_requested'
        : states.some((x) => x.state === 'stale') ? 'stale'
          : 'not_reviewed';
    const atsScore = ats.get(s.userId)?.score ?? null;
    const linkedinScore = linkedin.get(s.userId)?.score ?? null;
    const scoreOk = (atsScore ?? -1) >= (settings.minAtsScore || 0)
      && (!settings.minLinkedinScore || (linkedinScore ?? -1) >= settings.minLinkedinScore);
    const latestApproved = approved.sort((a, b) => new Date(b.work.updatedAt) - new Date(a.work.updatedAt))[0];
    result.set(String(s._id), {
      atsScore,
      linkedinScore,
      resumeCount: mine.length,
      reviewStatus,
      approvedWorkId: latestApproved ? String(latestApproved.work._id) : null,
      eligible: atsScore !== null && scoreOk && !!latestApproved
    });
  }
  return result;
}
