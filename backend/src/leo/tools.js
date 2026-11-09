// Leo's tools: each one runs a real CVMind feature and returns
//   card    — what the chat shows under Leo's message (rendered by frontend/src/chat/cards)
//   summary — a short text the model reads to write its follow-up
// Paid limits match the feature's own route (billing/gate.js requireFreeUse), so chatting never
// gets around them.

import {
  analyzeResumeWithGemini,
  tailorResumeWithGemini,
  generateCoverLetterWithAI,
  generateInterviewPlan,
  generateCareerRoadmapWithGemini
} from '../services/gemini.js';
import { searchJobs } from '../services/jobSearch.js';
import { FREE_WEEKLY } from '../billing/plans.js';
import { isPro, featureAllowance, recordFeatureUse } from '../billing/service.js';
import { getSettings } from '../admin/settings.js';
import { hasProductAccess } from '../services/productGate.js';
import { PORTFOLIO_THEMES, HIDEABLE_DETAILS, CUSTOM_LOOK, lookLabel, buildPortfolioSite, savePortfolio } from '../portfolio/generate.js';
import { editPortfolioSiteWithClaude } from '../services/gemini.js';
import { getLatestUserWork } from '../db.js';
import { LeoTurn } from './models.js';
import crypto from 'node:crypto';

// Tests swap the AI build for a fixed page
let buildSite = buildPortfolioSite;
let editSite = editPortfolioSiteWithClaude;
export function setPortfolioBuilder(fn, editor) {
  buildSite = fn || buildPortfolioSite;
  editSite = editor || editPortfolioSiteWithClaude;
}

const clip = (value, max) => String(value ?? '').trim().slice(0, max);
const list = (value, max = 8, chars = 300) => (Array.isArray(value) ? value : []).map((v) => clip(v, chars)).filter(Boolean).slice(0, max);

// Pages open_tool may link to, with the button label the chat shows
export const TOOL_PAGES = {
  'resume-builder': 'Open Resume Builder',
  'my-documents': 'Open My Documents',
  tailor: 'Open Resume Tailor',
  proofreading: 'Open AI Proofreading',
  'cover-letter-start': 'Open Cover Letter Builder',
  prep: 'Open Interview Prep',
  'voice-prep': 'Start a voice mock interview',
  'job-finder': 'Open Job Finder',
  linkedin: 'Open LinkedIn Profile Audit',
  'linkedin-bio': 'Open LinkedIn Bio Writer',
  'linkedin-outreach': 'Open LinkedIn Outreach Writer',
  'linkedin-post': 'Open LinkedIn Post Writer',
  'career-courses': 'Open Skill Gaps & Courses',
  'elevator-pitch': 'Open Elevator Pitch Builder',
  'career-roadmap': 'Open Career Roadmap',
  'portfolio-gen': 'Open Portfolio Generator',
  'offer-negotiation': 'Open Offer Negotiation',
  code: 'Open CVMind Code',
  pricing: 'See CVMind Pro plans'
};

// Words that don't narrow a job search on their own
const JOB_GENERIC = new Set(['jobs', 'job', 'role', 'roles', 'in', 'at', 'for', 'and', 'or', 'the', 'a', 'an', 'of', 'developer', 'developers', 'engineer', 'engineers', 'engineering', 'intern', 'internship', 'internships', 'fresher', 'freshers', 'entry', 'level', 'junior', 'senior', 'sr', 'jr', 'lead', 'remote', 'hybrid', 'onsite', 'full', 'time', 'part', 'openings', 'opening', 'position', 'positions', 'near', 'me', 'india', 'software', 'specialist', 'associate', 'executive']);
const JOB_PLACES = new Set(['bangalore', 'bengaluru', 'mumbai', 'delhi', 'ncr', 'new', 'pune', 'hyderabad', 'chennai', 'noida', 'gurgaon', 'gurugram', 'kolkata', 'ahmedabad', 'jaipur', 'kochi', 'indore', 'chandigarh', 'coimbatore', 'usa', 'uk', 'london', 'singapore', 'dubai', 'berlin', 'york', 'san', 'francisco']);

const fn = (name, description, properties = {}, required = []) => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties, required } }
});
const str = (description) => ({ type: 'string', description });

export const TOOL_DEFINITIONS = [
  fn('check_resume_ats', 'Score the attached resume for ATS and give a full review. Needs an attached resume.'),
  fn('tailor_resume', 'Rewrite the attached resume to match a job description. Needs an attached resume and a pasted job description.', {
    job_description: str('The job description the user pasted, in full.')
  }, ['job_description']),
  fn('write_cover_letter', 'Write a cover letter from the attached resume for a job. Needs an attached resume.', {
    job_description: str('The job description, or the role and company plus anything the user said about the job.'),
    company: str('Hiring company, if known.'),
    tone: { type: 'string', enum: ['professional', 'conversational', 'enthusiastic'] }
  }, ['job_description']),
  fn('interview_questions', 'Likely interview questions for a role, each with what a strong answer covers. Uses the attached resume when there is one.', {
    role: str('Target role, e.g. "Frontend Developer".'),
    job_description: str('Job description, if the user gave one.'),
    level: { type: 'string', enum: ['Intern', 'Entry-level', 'Mid-level', 'Senior'] },
    round: { type: 'string', enum: ['Mixed', 'HR', 'Behavioural', 'Technical'] }
  }, ['role']),
  fn('career_roadmap', 'A 4-phase plan to move from the user\'s current role or studies to a target role.', {
    target_role: str('Where the user wants to get to.'),
    current_role: str('Where they are now, e.g. "3rd-year B.Tech CSE student".'),
    years: str('How much time they have, e.g. "1 year".')
  }, ['target_role']),
  fn('find_jobs', 'Search real open jobs on company career pages.', {
    query: str('Role and optionally place, e.g. "react developer bangalore" or "data analyst remote".')
  }, ['query']),
  fn('build_portfolio', 'Build the user\'s portfolio website here in the chat, with a preview and a Publish button. Call it once they said what they want on it. Leave theme and design out until they have chosen: the tool then shows the looks as buttons.', {
    theme: { type: 'string', enum: [...Object.keys(PORTFOLIO_THEMES), CUSTOM_LOOK], description: `Only the look the user picked. "${CUSTOM_LOOK}" when they let you decide.` },
    design: str('How the user wants it to look, in their words, when they described a style of their own.'),
    wishes: str('What the user wants from the site, in their words: who it is for, what to highlight, what to leave out, the tone. "No preference" if they said so.'),
    details: str('Everything the user told you about themselves in this chat, when there is no attached resume or they added to it: name, role, education, work, projects, skills, links, contact. Their words only.'),
    hide: { type: 'array', items: { type: 'string', enum: HIDEABLE_DETAILS }, description: 'Contact details the user does not want on the public page.' }
  }),
  fn('edit_portfolio', 'Change the portfolio website the user already built: its text, order, sections, colours or contact details. Keeps everything else as it is.', {
    changes: str('The changes the user asked for, in their words.')
  }, ['changes']),
  fn('restore_portfolio', 'Undo the last change to the user\'s portfolio, or bring back an earlier version from this chat.', {
    card_id: str('Leave out to go back one version. Set only by the version buttons.')
  }),
  fn('open_tool', 'Show a button to a CVMind page when the user needs the full tool.', {
    page: { type: 'string', enum: Object.keys(TOOL_PAGES) },
    reason: str('One short line on what the user will do there.')
  }, ['page'])
];

// A card telling the user what's needed instead of a result
const blocked = (action, message) => ({ card: { type: 'locked', action, message }, summary: `Not run: ${message}` });

const needResume = (ctx) => (ctx.resumeText.length < 50
  ? blocked('attach', 'Attach your resume (PDF, DOCX or TXT) with the paperclip button, then ask again.')
  : null);

// Checks a weekly free-use feature. Returns { stop } with a card, or { commit } to call once the tool worked.
async function allowance(ctx, key) {
  if (!ctx.email) return { stop: blocked('signin', `Sign in to use the ${FREE_WEEKLY[key].label.toLowerCase()}. It's free.`) };
  try {
    if (await isPro(ctx.email)) return { commit: async () => {} };
    const used = await featureAllowance(ctx.email, key);
    if (used.used >= used.limit) {
      const { label, limit } = FREE_WEEKLY[key];
      return { stop: blocked('upgrade', `You've used your ${limit} free ${label.toLowerCase()}${limit === 1 ? '' : 's'} this week. CVMind Pro has unlimited use.`) };
    }
  } catch (err) {
    console.error('[leo] free-use check failed, allowing:', err.message);
  }
  return { commit: () => recordFeatureUse(ctx.email, key).catch((err) => console.error('[leo] free-use record failed:', err.message)) };
}

// The looks as tap-to-pick tiles
export const looksCard = () => ({
  type: 'portfolio_looks',
  looks: [
    ...Object.entries(PORTFOLIO_THEMES).map(([id, t]) => ({ id, label: t.label, bg: t.bg, accent: t.accent, text: t.text })),
    { id: CUSTOM_LOOK, label: 'Leo decides', bg: '#e6f4ee', accent: '#12805c', text: '#10231c' }
  ]
});

// Leo wrote the looks out as text and showed no buttons, so the buttons still have to appear
export function looksListedInText(reply, toolLog) {
  if (toolLog.some((t) => ['portfolio', 'portfolio_looks'].includes(t.card?.type))) return false;
  return Object.values(PORTFOLIO_THEMES).filter((t) => new RegExp(`\\b${t.label}\\b`, 'i').test(reply)).length >= 3;
}

// Sends a build's stages and page text to the chat, the text in small batches
function liveBuild(ctx) {
  let pending = '';
  let timer = null;
  const flush = () => {
    clearTimeout(timer);
    timer = null;
    if (pending) ctx.progress?.({ html: pending });
    pending = '';
  };
  return {
    stage: (stage) => { flush(); ctx.progress?.({ stage }); },
    html: (text) => { pending += text; timer ||= setTimeout(flush, 200); },
    reset: () => { flush(); ctx.progress?.({ reset: true }); },
    flush
  };
}

// Sign-in, the admin switch and the product lock, for building and editing alike
async function portfolioRefused(ctx, signIn) {
  if (!ctx.email) return blocked('signin', signIn);
  // The Studio's route is behind these two admin controls; the chat honours them too
  const { features, productAccess } = await getSettings();
  if (features.portfolio === false) return blocked('info', 'The Portfolio Generator is switched off right now. Please try again later.');
  if (productAccess.locked.includes('portfolio') && !(await hasProductAccess(ctx.email, 'portfolio'))) {
    return blocked('info', "Your account doesn't have access to the Portfolio Generator yet. Contact support to get access.");
  }
  return null;
}

// The versions in this chat, oldest first. An edit of a page saved outside this chat carries that
// page on its card, so it can still be undone.
async function portfolioVersions(ctx) {
  const turns = await LeoTurn.find({ conversationId: ctx.conversationId, userId: ctx.userId, deletedAt: null, 'toolCalls.card.type': 'portfolio' })
    .sort({ createdAt: -1 }).limit(20).select('toolCalls').lean();
  return turns.reverse()
    .flatMap((turn) => (turn.toolCalls || []).map((t) => t?.card).filter((c) => c?.type === 'portfolio'))
    .flatMap((c) => (c.previous ? [{ ...c, id: `${c.id}-before`, html: c.previous.html, data: c.previous.data, previous: null }, c] : [c]));
}

// The page to edit: the newest one in this chat, or else the newest one the user saved
async function currentPortfolio(ctx) {
  const card = (await portfolioVersions(ctx)).at(-1);
  if (card) return { html: card.html, data: card.data || {}, theme: card.theme, workId: card.workId || null, inChat: true };

  const work = await getLatestUserWork(ctx.userId, 'portfolio-gen');
  if (!work) return null;
  try {
    const saved = JSON.parse(work.htmlContent);
    const theme = Object.hasOwn(PORTFOLIO_THEMES, saved.colorTheme) || saved.colorTheme === CUSTOM_LOOK ? saved.colorTheme : 'dark-pro';
    return saved.portfolioHTML ? { html: saved.portfolioHTML, data: saved.portfolioData || {}, theme, workId: String(work._id || work.id), inChat: false } : null;
  } catch {
    return null;
  }
}

const portfolioCard = ({ theme, data, html, work, edited = false, restored = false, previous }) => ({
  type: 'portfolio',
  id: crypto.randomUUID().slice(0, 12),
  theme,
  themeLabel: lookLabel(theme),
  data,
  html,
  workId: work ? String(work._id || work.id) : '',
  saveFailed: !work,
  edited,
  restored,
  ...(previous ? { previous } : {})
});

const RUNNERS = {
  async check_resume_ats(args, ctx) {
    const missing = needResume(ctx);
    if (missing) return missing;
    const r = await analyzeResumeWithGemini(ctx.resumeText);
    const card = {
      type: 'ats',
      score: Number(r.score) || 0,
      summary: clip(r.summary, 1200),
      sections: {
        keywords: Number(r.atsKeywords?.score) || 0,
        impact: Number(r.contentAndImpact?.score) || 0,
        formatting: Number(r.formattingAndStyle?.score) || 0
      },
      matched: list(r.atsKeywords?.matched, 12, 60),
      missing: list(r.atsKeywords?.missing, 12, 60),
      strengths: list(r.strengths, 5),
      weaknesses: list(r.weaknesses, 5),
      recommendations: list(r.recommendations, 5),
      rewrites: (r.contentAndImpact?.suggestions || []).slice(0, 3).map((s) => ({ original: clip(s.original, 400), improved: clip(s.improved, 400) }))
    };
    return { card, summary: `ATS score ${card.score}/100. Weaknesses: ${card.weaknesses.join('; ')}. Missing keywords: ${card.missing.join(', ')}.` };
  },

  async tailor_resume(args, ctx) {
    const missing = needResume(ctx);
    if (missing) return missing;
    const jd = clip(args.job_description, 10000);
    if (jd.length < 40) return blocked('info', 'Paste the full job description so the resume can be matched to it.');
    const gate = await allowance(ctx, 'tailor');
    if (gate.stop) return gate.stop;
    const r = await tailorResumeWithGemini(ctx.resumeText, jd);
    const data = r.tailoredData || {};
    const card = {
      type: 'tailor',
      matchScore: Number(r.matchScore) || 0,
      insights: list(r.keyTailoringInsights, 4),
      matched: list(r.matchedSkills, 12, 60),
      missing: list(r.missingSkillsRecommended, 10, 60),
      summary: clip(data.summary, 1200),
      bullets: (data.workExperiences || []).slice(0, 2).map((w) => ({
        role: clip([w.jobTitle, w.company].filter(Boolean).join(' · '), 120),
        points: list(String(w.description || '').split('\n').map((line) => line.replace(/^\s*[•\-*]\s*/, '')), 4, 400)
      })).filter((w) => w.points.length)
    };
    await gate.commit();
    return { card, summary: `Tailored. Match ${card.matchScore}/100. Missing skills: ${card.missing.join(', ')}. Insights: ${card.insights.join(' ')}` };
  },

  async write_cover_letter(args, ctx) {
    const missing = needResume(ctx);
    if (missing) return missing;
    const jd = clip(args.job_description, 10000);
    if (jd.length < 15) return blocked('info', 'Tell me the role and company, or paste the job description.');
    const gate = await allowance(ctx, 'cover-letter');
    if (gate.stop) return gate.stop;
    const tone = ['professional', 'conversational', 'enthusiastic'].includes(args.tone) ? args.tone : 'professional';
    const r = await generateCoverLetterWithAI({ resumeText: ctx.resumeText, jobDescription: jd, tone, company: clip(args.company, 120) });
    const card = {
      type: 'cover_letter',
      name: clip(r.name, 120),
      jobTitle: clip(r.jobTitle, 120),
      company: clip(r.company, 120),
      greeting: clip(r.greeting, 120) || 'Dear Hiring Manager,',
      paragraphs: list(r.paragraphs, 5, 1500),
      closing: clip(r.closing, 60) || 'Sincerely,'
    };
    await gate.commit();
    return { card, summary: `Cover letter written for ${card.jobTitle || 'the role'}${card.company ? ` at ${card.company}` : ''} (${tone} tone).` };
  },

  async interview_questions(args, ctx) {
    const role = clip(args.role, 100);
    if (!role) return blocked('info', 'Which role are you interviewing for?');
    const level = ['Intern', 'Entry-level', 'Mid-level', 'Senior'].includes(args.level) ? args.level : 'Entry-level';
    const round = ['Mixed', 'HR', 'Behavioural', 'Technical'].includes(args.round) ? args.round : 'Mixed';
    const r = await generateInterviewPlan({ resumeText: ctx.resumeText, role, jobDescription: clip(args.job_description, 6000), level, round, count: 6 });
    const card = {
      type: 'interview',
      role,
      level,
      questions: (r.questions || []).slice(0, 8).map((q) => ({
        question: clip(q.question, 400),
        category: clip(q.category, 30),
        difficulty: clip(q.difficulty, 10),
        wants: clip(q.whatInterviewerWants, 400),
        keyPoints: list(q.keyPoints, 4, 200)
      }))
    };
    return { card, summary: `${card.questions.length} ${round} questions for ${level} ${role}: ${card.questions.map((q) => q.question).join(' | ')}` };
  },

  async career_roadmap(args, ctx) {
    const targetRole = clip(args.target_role, 100);
    if (!targetRole) return blocked('info', 'Which role do you want to reach?');
    const r = await generateCareerRoadmapWithGemini({
      currentRole: clip(args.current_role, 120) || 'Student / early career',
      targetRole,
      years: clip(args.years, 40) || '1 year',
      resumeText: ctx.resumeText
    });
    const card = {
      type: 'roadmap',
      targetRole,
      summary: clip(r.summary, 800),
      skills: list(r.skillsToBuild, 10, 80),
      steps: (r.steps || []).slice(0, 4).map((s) => ({
        name: clip(s.phaseName, 100),
        timeframe: clip(s.timeframe, 60),
        focus: clip(s.focus, 300),
        actions: list(s.actions, 4),
        milestone: clip(s.milestone, 300)
      })),
      risks: list(r.risks, 3)
    };
    return { card, summary: `Roadmap to ${targetRole}: ${card.steps.map((s) => `${s.name} (${s.timeframe})`).join(' → ')}. Skills: ${card.skills.join(', ')}.` };
  },

  async find_jobs(args) {
    const query = clip(args.query, 120);
    if (!query) return blocked('info', 'Which role and city should I search for?');
    const r = await searchJobs(query, { limit: 40 });
    // The search ranks broadly ("developer" alone matches a Salesforce Developer). Keep the jobs
    // whose title has the specific words the user asked for, e.g. "react"; if none do, say the
    // matches are loose rather than claiming hundreds of results.
    const specific = query.toLowerCase().split(/[^a-z0-9+#.]+/).filter((w) => w.length > 1 && !JOB_GENERIC.has(w) && !JOB_PLACES.has(w));
    const all = r.jobs || [];
    const exact = specific.length ? all.filter((j) => specific.some((w) => `${j.title} ${j.team || ''}`.toLowerCase().includes(w))) : all;
    const loose = exact.length === 0 && all.length > 0;
    const shown = (loose ? all : exact).slice(0, 6);
    const card = {
      type: 'jobs',
      query,
      total: loose ? 0 : (specific.length ? exact.length : r.total || 0),
      loose,
      jobs: shown.map((j) => ({
        id: j.id,
        title: clip(j.title, 140),
        company: clip(j.company, 80),
        location: clip(j.location, 100),
        remote: !!j.remote,
        url: /^https:\/\//i.test(j.url || '') ? j.url : '',
        postedAt: j.postedAt || null
      }))
    };
    const listed = card.jobs.map((j) => `${j.title} at ${j.company}`).join('; ');
    return {
      card,
      summary: !card.jobs.length
        ? `No open jobs matched "${query}".`
        : loose
          ? `No exact matches for "${query}"; showed loosely related openings: ${listed}.`
          : `Found ${card.total} matching jobs; showing ${listed}.`
    };
  },

  async build_portfolio(args, ctx) {
    const refused = await portfolioRefused(ctx, 'Sign in free to build your portfolio website. Then ask me again.');
    if (refused) return refused;

    const wishes = clip(args.wishes, 1000);
    if (!wishes) return { card: null, summary: 'Not built yet: ask what they want on the site (who it is for, what to highlight, what to leave out, which contact details to keep private).' };
    const design = clip(args.design, 500);
    const picked = String(args.theme || '').trim().toLowerCase().replace(/\s+/g, '-');
    const theme = design || picked === CUSTOM_LOOK || picked === 'leo-decides' ? CUSTOM_LOOK : picked;
    if (theme !== CUSTOM_LOOK && !Object.hasOwn(PORTFOLIO_THEMES, theme)) return { card: looksCard(), summary: 'The looks are shown as buttons. In one short sentence ask them to tap one or type the style they want. Do not name or list the looks.' };

    const details = clip(args.details, 6000);
    const resumeText = [ctx.resumeText, details && `More details from the candidate:\n${details}`].filter(Boolean).join('\n\n');
    if (resumeText.length < 50) return blocked('attach', 'Attach your resume with the paperclip, or tell me your name, role, education, work or projects, skills and links.');

    const gate = await allowance(ctx, 'portfolio');
    if (gate.stop) return gate.stop;
    const hide = (Array.isArray(args.hide) ? args.hide : []).filter((d) => HIDEABLE_DETAILS.includes(d));
    const live = liveBuild(ctx);
    let built;
    try {
      built = await buildSite({ resumeText, colorTheme: theme, style: theme, wishes, hide, design, live });
    } finally {
      live.flush();
    }
    const { portfolioData, portfolioHTML } = built;
    live.stage('saving');
    const work = await savePortfolio({ userId: ctx.userId, portfolioData, portfolioHTML, colorTheme: theme, style: theme });
    await gate.commit();
    const card = portfolioCard({ theme, data: portfolioData, html: portfolioHTML, work });
    return { card, summary: `Portfolio built (${card.themeLabel}); the card shows the preview and a Publish button. In at most two sentences, ask them to check names, dates and links, and ask if they want anything changed (they can just tell you here), or tap Publish if it looks right.` };
  },

  async edit_portfolio(args, ctx) {
    const refused = await portfolioRefused(ctx, 'Sign in free to edit your portfolio website.');
    if (refused) return refused;
    const changes = clip(args.changes, 2000);
    if (!changes) return { card: null, summary: 'Nothing changed: ask what they want to change.' };
    const current = await currentPortfolio(ctx);
    if (!current) return { card: null, summary: 'There is no portfolio to edit yet. Offer to build one.' };

    const live = liveBuild(ctx);
    live.stage('editing');
    let html;
    try {
      html = await editSite({ html: current.html, changes, onHtml: live.html });
    } finally {
      live.flush();
    }
    live.stage('saving');
    // The Publish dialog lists the contact details on the page, so one taken off must leave the list
    const data = { ...current.data };
    for (const field of ['email', 'phone', 'location']) if (data[field] && !html.includes(data[field])) delete data[field];
    const work = await savePortfolio({ userId: ctx.userId, portfolioData: data, portfolioHTML: html, colorTheme: current.theme, style: current.theme, workId: current.workId });
    const previous = current.inChat ? undefined : { html: current.html, data: current.data };
    return { card: portfolioCard({ theme: current.theme, data, html, work, edited: true, previous }), summary: 'The change is made; the new card shows the updated preview and an Undo button. In at most two sentences, say what changed, ask if there is anything else, and say a site that is already live changes only when they tap Update on this card.' };
  },

  // No AI here: the earlier page is put back exactly as it was
  async restore_portfolio(args, ctx) {
    const refused = await portfolioRefused(ctx, 'Sign in free to manage your portfolio website.');
    if (refused) return refused;
    const versions = await portfolioVersions(ctx);
    const latest = versions.at(-1);
    if (versions.length < 2) return { card: null, summary: 'There is no earlier version in this chat to go back to. Tell them so.' };
    const wanted = clip(args.card_id, 30);
    const target = wanted ? versions.find((v) => v.id === wanted) : versions.at(-2);
    if (!target || target === latest) return { card: null, summary: 'That is already the newest version. Tell them so.' };
    const data = target.data || {};
    const work = await savePortfolio({ userId: ctx.userId, portfolioData: data, portfolioHTML: target.html, colorTheme: target.theme, style: target.theme, workId: latest.workId || target.workId || null });
    return { card: portfolioCard({ theme: target.theme, data, html: target.html, work, edited: true, restored: true }), summary: 'The earlier version is back; the new card shows it. In at most two sentences, confirm it and say a site that is already live changes only when they tap Update on this card.' };
  },

  async open_tool(args) {
    const page = Object.hasOwn(TOOL_PAGES, args.page) ? args.page : null;
    if (!page) return { card: null, summary: 'Unknown page; nothing shown.' };
    return { card: { type: 'link', page, label: TOOL_PAGES[page], reason: clip(args.reason, 200) }, summary: `Showed a button to ${page}.` };
  }
};

// Short label the chat shows while a tool runs
export const TOOL_STATUS = {
  check_resume_ats: 'Checking your resume',
  tailor_resume: 'Tailoring your resume',
  write_cover_letter: 'Writing your cover letter',
  interview_questions: 'Preparing interview questions',
  career_roadmap: 'Planning your roadmap',
  find_jobs: 'Searching open jobs',
  build_portfolio: 'Working on your portfolio website',
  edit_portfolio: 'Updating your portfolio website',
  restore_portfolio: 'Bringing back that version',
  open_tool: 'Finding the right tool'
};

// Runs one tool call. Never throws: failures come back as an error card and summary.
export async function runTool(call, ctx) {
  const runner = Object.hasOwn(RUNNERS, call.name) ? RUNNERS[call.name] : null;
  if (!runner) return { card: null, summary: `Unknown tool ${call.name}.` };
  let args = {};
  try { args = call.arguments ? JSON.parse(call.arguments) : {}; } catch { /* model sent bad JSON: run with defaults */ }
  try {
    return await runner(args || {}, ctx);
  } catch (err) {
    console.error(`[leo] tool ${call.name} failed:`, err.message);
    return { card: { type: 'error', message: "That didn't work just now. Please try again in a moment." }, summary: `The tool failed: ${clip(err.message, 200)}` };
  }
}
