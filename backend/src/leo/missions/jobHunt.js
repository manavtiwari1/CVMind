// Leo Agent Mode, Phase 3: the job hunt mission. Leo finds and ranks real jobs, the user picks, and
// each pick gets an apply pack: a tailored resume, a cover letter, a referral message and the link.
// Nothing here applies: the user applies on the company's site and confirms it afterwards.

import crypto from 'node:crypto';
import { normalizeJobUrl } from '@cvmind/auto-apply-agent/jobs/urlNormalize.js';
import { buildFeed } from '../../jobFinder/feed.js';
import { FinderJob } from '../../jobFinder/models.js';
import { boardDescription, BOARD_SOURCES } from '../../jobFinder/sources/boards.js';
import { planFor, canSearchEverywhere, recordSearch } from '../../jobFinder/allowance.js';
import { tailorResumeWithGemini, generateCoverLetterWithAI, generateLinkedinOutreachWithGemini } from '../../services/gemini.js';
import { matchingFor } from '../careerProfile.js';
import { allowance, blocked, clip, featureRefused, list, needResume } from '../toolHelpers.js';
import { coverLetterCardFrom, tailorCardFrom } from '../tools.js';

// How many jobs one mission can fully prepare (PRD: free matches its 1 cover letter a week)
export const PACKS_PER_MISSION = { free: 1, pro: 3 };
const JOBS_SHOWN = 10;
const nothing = async () => ({ jobs: [] });

// Tests swap the job sources and AI calls
const REAL = { tailor: tailorResumeWithGemini, letter: generateCoverLetterWithAI, referral: generateLinkedinOutreachWithGemini, sources: {} };
let deps = REAL;
export function setJobHuntDeps(fake) {
  deps = fake ? { ...REAL, ...fake } : REAL;
}

/** The first step of a job hunt: real jobs ranked for this user, then a pause while they pick. */
export async function rankJobs(args, ctx) {
  const refused = await featureRefused(ctx, 'job-finder', 'AI Job Finder');
  if (refused) return refused;
  const [{ profile, preferences }, plan] = await Promise.all([matchingFor(ctx.userId), planFor(ctx.email)]);
  const everywhere = canSearchEverywhere(plan);
  const role = clip(args.role, 100);
  const feed = await buildFeed({
    profile,
    preferences,
    filters: { q: role, location: clip(args.location, 80), company: clip(args.company, 60), remote: args.remote === true, mode: 'role' },
    email: ctx.email,
    sources: everywhere ? deps.sources : { ...deps.sources, jsearch: nothing, adzuna: nothing }
  });
  if (!plan.pro && everywhere && !feed.needsRole) await recordSearch(ctx.email);
  if (feed.needsRole) return blocked('info', 'Which role should I search for?');

  const jobs = feed.jobs.filter((j) => !j.appliedAt && j.applyUrl).slice(0, JOBS_SHOWN).map((j) => ({
    jobKey: j.jobKey,
    title: clip(j.title, 140),
    company: clip(j.company, 80),
    location: clip(j.location, 100),
    remote: j.remote,
    source: j.source,
    postedAt: j.postedAt,
    score: j.match?.score ?? null,
    matched: list(j.match?.matchedSkills, 6, 40),
    missing: list(j.match?.missingSkills, 6, 40),
    applyUrl: /^https:\/\//i.test(j.applyUrl) ? j.applyUrl : ''
  }));
  const maxPicks = plan.pro ? PACKS_PER_MISSION.pro : PACKS_PER_MISSION.free;
  const card = { type: 'job_pick', query: feed.query, location: feed.location || '', maxPicks, jobs };
  if (!jobs.length) return { card, review: false, summary: `No open jobs matched "${feed.query}".` };
  return { card, summary: `${jobs.length} real jobs ranked for ${feed.query}. Waiting for the user to pick.` };
}

/** Steps to add once the user has picked. Throws when the picks aren't jobs from this list. */
export function packStepsFor(step, picks) {
  const { jobs = [], maxPicks = 1 } = step.card || {};
  const wanted = [...new Set(Array.isArray(picks) ? picks.map(String) : [])];
  const chosen = jobs.filter((j) => wanted.includes(j.jobKey));
  if (!wanted.length || chosen.length !== wanted.length) throw Object.assign(new Error('Pick at least one job from the list.'), { status: 400 });
  if (chosen.length > maxPicks) throw Object.assign(new Error(`You can prepare ${maxPicks} job${maxPicks === 1 ? '' : 's'} in one mission.`), { status: 400 });
  return chosen.map((job) => ({
    id: crypto.randomUUID().slice(0, 12),
    tool: 'prepare_apply_pack',
    title: `Apply pack: ${job.title} at ${job.company}`.slice(0, 100),
    detail: '',
    args: { jobKey: job.jobKey, score: job.score },
    risk: 'create',
    review: false,
    status: 'pending',
    card: null,
    summary: ''
  }));
}

const plainText = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** One apply pack. Both free-use limits are checked first, so a pack is never left half made. */
export async function prepareApplyPack(args, ctx) {
  const missing = needResume(ctx);
  if (missing) return missing;
  const job = await FinderJob.findOne({ jobKey: clip(args.jobKey, 200) }).lean();
  if (!job) return blocked('info', 'This job is no longer listed. Search again for fresh jobs.');
  const description = BOARD_SOURCES.includes(job.source) ? await boardDescription(job) : job.description;
  const jobDescription = [`${job.title} at ${job.company}${job.location ? ` (${job.location})` : ''}`, plainText(description)].filter(Boolean).join('\n\n').slice(0, 10000);

  const tailorGate = await allowance(ctx, 'tailor');
  if (tailorGate.stop) return tailorGate.stop;
  const letterGate = await allowance(ctx, 'cover-letter');
  if (letterGate.stop) return letterGate.stop;

  const tailored = await deps.tailor(ctx.resumeText, jobDescription);
  await tailorGate.commit();
  const letter = await deps.letter({ resumeText: ctx.resumeText, jobDescription, tone: 'professional', company: job.company });
  await letterGate.commit();
  // The pack is still useful without the referral message
  const referral = await deps.referral({ jobTitle: job.title, companyName: job.company, targetName: '', context: 'The candidate does not know them yet and wants a referral for this job.', tone: '', resumeText: ctx.resumeText })
    .catch((err) => { console.error('[leo] referral draft failed:', err.message); return null; });

  const tailorCard = tailorCardFrom(tailored);
  const applyUrl = /^https:\/\//i.test(job.applyUrl || '') ? job.applyUrl : '';
  return {
    card: {
      type: 'apply_pack',
      id: crypto.randomUUID().slice(0, 12),
      job: { jobKey: job.jobKey, title: clip(job.title, 140), company: clip(job.company, 80), location: clip(job.location, 100), applyUrl, score: Number.isFinite(args.score) ? args.score : null, inCvmind: job.source === 'cvmind' },
      // The extension finds this pack from the page it is on
      applyKey: normalizeJobUrl(applyUrl) || '',
      // What Leo changed, shown before the user applies
      changes: tailorCard.insights,
      tailor: tailorCard,
      letter: coverLetterCardFrom(letter),
      referral: referral ? { connectionRequest: clip(referral.connectionRequest, 400), referralPitch: clip(referral.referralPitch, 1500) } : null
    },
    summary: `Apply pack ready for ${job.title} at ${job.company}.`
  };
}

export { packForUrl, packLetterText } from './applyPack.js';
