import mongoose from 'mongoose';
import { getSettings } from '../admin/settings.js';
import { grantedProducts } from '../services/productGate.js';
import { JobApplyLog } from '../jobFinder/models.js';
import { OnboardingState } from './models.js';

// The "Your plan" checklist on My Documents: the steps from a new account to a first application.
// A step is done when the account has the matching saved result; a step whose product an admin
// locked (and this account has no grant for) is left out.
export const PLAN_STEPS = [
  { id: 'resume', product: 'resume-builder', page: 'resume-builder' },
  { id: 'ats', product: 'resume-check', page: 'home' },
  { id: 'tailor', product: 'tailor', page: 'tailor' },
  { id: 'practise', product: 'interview', page: 'prep' },
  { id: 'apply', product: 'job-finder', page: 'job-finder' }
];

const STEP_WORK_TYPES = {
  resume: ['resume'],
  ats: ['resume-check'],
  tailor: ['resume-tailor'],
  practise: ['prep', 'voice-prep']
};

const Work = () => mongoose.model('Work');
const Scan = () => mongoose.model('Scan');
const TailorLog = () => mongoose.model('TailorLog');

// When each step was first done, or null
async function firstDone(userId, email) {
  const firstWork = (types) => Work().findOne({ userId, type: { $in: types } }, { createdAt: 1 }).sort({ createdAt: 1 }).lean();
  const [resume, check, scan, tailored, tailorLog, practised, applied] = await Promise.all([
    firstWork(STEP_WORK_TYPES.resume),
    firstWork(STEP_WORK_TYPES.ats),
    Scan().findOne({ userId }, { createdAt: 1 }).sort({ createdAt: 1 }).lean(),
    firstWork(STEP_WORK_TYPES.tailor),
    TailorLog().findOne({ userId }, { createdAt: 1 }).sort({ createdAt: 1 }).lean(),
    firstWork(STEP_WORK_TYPES.practise),
    JobApplyLog.findOne({ $or: [{ userId }, { email }] }, { createdAt: 1 }).sort({ createdAt: 1 }).lean()
  ]);
  const earliest = (...rows) => rows.filter(Boolean).map((r) => new Date(r.createdAt)).sort((a, b) => a - b)[0] || null;
  return {
    resume: earliest(resume),
    ats: earliest(check, scan),
    tailor: earliest(tailored, tailorLog),
    practise: earliest(practised),
    apply: earliest(applied)
  };
}

async function availableProducts(email) {
  const { locked } = (await getSettings()).productAccess;
  if (!locked.length) return () => true;
  const granted = await grantedProducts(email, locked);
  return (product) => !locked.includes(product) || granted.includes(product);
}

export async function planProgress(userId, email) {
  const id = String(userId);
  const address = String(email || '').toLowerCase();
  const [done, isOpen, state] = await Promise.all([
    firstDone(id, address),
    availableProducts(address),
    OnboardingState.findOne({ userId: id }).lean()
  ]);
  const steps = PLAN_STEPS.filter((s) => isOpen(s.product)).map((s) => ({
    id: s.id,
    page: s.page,
    done: Boolean(done[s.id]),
    doneAt: done[s.id]
  }));
  const complete = steps.length > 0 && steps.every((s) => s.done);
  let completedAt = state?.completedAt || null;
  if (complete && !completedAt) {
    completedAt = new Date();
    await OnboardingState.updateOne({ userId: id }, { $set: { completedAt } }, { upsert: true });
  }
  return {
    steps,
    doneCount: steps.filter((s) => s.done).length,
    complete,
    completedAt,
    hidden: Boolean(state?.hiddenAt)
  };
}

export function setPlanHidden(userId, hidden) {
  return OnboardingState.updateOne(
    { userId: String(userId) },
    { $set: { hiddenAt: hidden ? new Date() : null } },
    { upsert: true }
  );
}
