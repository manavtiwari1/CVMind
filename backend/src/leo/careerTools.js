// Leo Agent Mode, Phase 2: the CVMind features that used to be only a link, now run in the chat.
// Each one calls the same AI function as its page and honours the same switches and limits.
// Results use one generic 'writing' card: a list of blocks the user can read and copy.

import {
  generateProofreadingWithDeepSeek, analyzeResumeWithGemini, optimizeResumeWithGemini, analyzeLinkedInProfileWithGemini,
  generateLinkedinBioWithGemini, generateLinkedinOutreachWithGemini, generateLinkedinPostsWithAI, generateElevatorPitchWithGemini,
  generateCareerCoursesWithGemini, generateOfferNegotiationWithGemini, generateInterviewPlan, evaluateInterviewAnswer, generateInterviewReport
} from '../services/gemini.js';
import { LeoConversation } from './models.js';
import { allowance, blocked, clip, featureRefused, fn, list, needResume, str } from './toolHelpers.js';

// Tests swap the AI calls for fixed results
const REAL_AI = {
  proofread: generateProofreadingWithDeepSeek,
  analyze: analyzeResumeWithGemini,
  optimize: optimizeResumeWithGemini,
  linkedinAudit: analyzeLinkedInProfileWithGemini,
  bio: generateLinkedinBioWithGemini,
  outreach: generateLinkedinOutreachWithGemini,
  posts: generateLinkedinPostsWithAI,
  pitch: generateElevatorPitchWithGemini,
  courses: generateCareerCoursesWithGemini,
  negotiate: generateOfferNegotiationWithGemini,
  interviewPlan: generateInterviewPlan,
  interviewAnswer: evaluateInterviewAnswer,
  interviewReport: generateInterviewReport
};
let ai = REAL_AI;
export function setCareerAi(fake) {
  ai = fake ? { ...REAL_AI, ...fake } : REAL_AI;
}

// Text of a value that may be a string or a small object such as a banner idea
const textOf = (value) => (typeof value === 'string' ? value : value && typeof value === 'object' ? Object.values(value).filter((v) => typeof v === 'string' && v.trim()).join(' · ') : '');
const lines = (value, max = 8) => (Array.isArray(value) ? value : []).map(textOf).filter(Boolean).slice(0, max);
const bullets = (value, max = 8) => lines(value, max).map((v) => `• ${v}`).join('\n');
const block = (title, text, extra = {}) => ({ title, text: clip(text, 6000), ...extra });
const writing = ({ kicker, title = '', score, blocks }) => ({
  type: 'writing',
  kicker,
  title,
  ...(Number.isFinite(score) ? { score } : {}),
  blocks: blocks.filter((b) => b.text)
});

// Saved like the feature's own page saves it, so it shows up in My Documents
async function saveToDocuments(ctx, { title, type, templateId, payload }) {
  try {
    const { saveWork } = await import('../db.js');
    await saveWork({ userId: ctx.userId, title: clip(title, 120), type, templateId, htmlContent: JSON.stringify(payload) });
  } catch (err) {
    console.error(`[leo] could not save ${type}:`, err.message);
  }
}

// A LinkedIn "Save to PDF" export, which is not a resume and must not replace the saved one
export const looksLikeLinkedInExport = (text) => /linkedin\.com\/in\//i.test(text) && /\bTop Skills\b/i.test(text) && /\bContact\b/i.test(text);

const OPTIONAL_TONE = { type: 'string', description: 'Tone, only if the user asked for one.' };

export const CAREER_TOOL_DEFINITIONS = [
  fn('proofread_resume', 'Proofread the user\'s resume, or text they pasted: grammar, spelling, weak verbs. Lists the corrections and gives the corrected version.', {
    text: str('Text the user pasted to proofread. Leave out to proofread their resume.')
  }),
  fn('improve_resume', 'Rewrite the user\'s resume with the fixes from its ATS review, keeping their facts. Use it when they want the fixes done for them.'),
  fn('audit_linkedin', 'Audit a LinkedIn profile from the PDF the user attached (LinkedIn profile > More > Save to PDF).', {
    target_role: str('The role they want the profile to attract, if known.')
  }),
  fn('write_linkedin_bio', 'Write LinkedIn headlines, an About section and banner ideas.', {
    job_title: str('The role they want to be seen as.'),
    skills: str('Skills to feature, if they named any.'),
    tone: OPTIONAL_TONE
  }, ['job_title']),
  fn('write_linkedin_outreach', 'Write a LinkedIn connection note, referral request and recruiter message.', {
    job_title: str('The role they are after.'),
    company: str('The company.'),
    target_name: str('The person\'s name, if known.'),
    context: str('How they know the person, or why they are writing.'),
    tone: OPTIONAL_TONE
  }, ['job_title']),
  fn('write_linkedin_post', 'Write three LinkedIn post options about a topic or achievement.', {
    topic: str('What the post is about, in the user\'s words.'),
    job_title: str('Their role or field.'),
    tone: OPTIONAL_TONE
  }, ['topic', 'job_title']),
  fn('elevator_pitch', 'Write a 60-second elevator pitch in three styles.', {
    job_title: str('The role the pitch is for.'),
    details: str('Anything they want it to mention, in their words.'),
    setting: str('Where they will use it, e.g. career fair.')
  }, ['job_title']),
  fn('skill_gaps', 'Compare the user with a target job: strengths, gaps, courses and projects.', {
    target_job: str('The job they want.'),
    skills: str('Their skills, if there is no resume.'),
    level: str('Their level, if known.')
  }, ['target_job']),
  fn('negotiate_offer', 'Write an offer negotiation plan: an email, a call script and talking points.', {
    company: str('Company that made the offer.'),
    role: str('Role offered.'),
    fixed: str('Fixed pay offered, e.g. "18 LPA fixed".'),
    variable: str('Variable pay or bonus, if any.'),
    location: str('Job location, if known.'),
    current: str('Their current pay, if they shared it.'),
    competing: str('Any competing offer.'),
    target: str('What they want to reach.'),
    notes: str('Anything else that matters.'),
    tone: OPTIONAL_TONE
  }, ['company', 'role', 'fixed']),
  fn('start_mock_interview', 'Start a 5-question text mock interview here in the chat, with feedback on each answer and a report at the end.', {
    role: str('Role to interview for.'),
    job_description: str('Job description, if given.'),
    level: { type: 'string', enum: ['Intern', 'Entry-level', 'Mid-level', 'Senior'] },
    round: { type: 'string', enum: ['Mixed', 'HR', 'Behavioural', 'Technical'] }
  }, ['role']),
  fn('answer_mock_interview', 'Send the user\'s answer to the open mock interview question, word for word. Set stop when they want to end it.', {
    answer: str('Their answer, word for word.'),
    stop: { type: 'boolean', description: 'True when they want to stop the interview.' }
  })
];

export const CAREER_TOOL_STATUS = {
  proofread_resume: 'Proofreading',
  improve_resume: 'Fixing your resume',
  audit_linkedin: 'Auditing your LinkedIn profile',
  write_linkedin_bio: 'Writing your LinkedIn bio',
  write_linkedin_outreach: 'Writing your messages',
  write_linkedin_post: 'Writing your posts',
  elevator_pitch: 'Writing your pitch',
  skill_gaps: 'Finding your skill gaps',
  negotiate_offer: 'Planning your negotiation',
  start_mock_interview: 'Preparing your interview',
  answer_mock_interview: 'Reading your answer'
};

// What a mission may run. The mock interview takes turns with the user, so it stays out.
export const CAREER_TOOL_META = {
  proofread_resume: { risk: 'create' },
  improve_resume: { risk: 'create', needsResume: true },
  write_linkedin_bio: { risk: 'create' },
  write_linkedin_outreach: { risk: 'create' },
  write_linkedin_post: { risk: 'create' },
  elevator_pitch: { risk: 'create' },
  skill_gaps: { risk: 'read' },
  negotiate_offer: { risk: 'create', limit: 'negotiation' }
};

const SAVED = 'The card shows the result. In at most two sentences, name the one thing to look at first and one next step. Don\'t repeat the card.';

const questionBlock = (mock) => {
  const q = mock.questions[mock.at];
  return block(`Question ${mock.at + 1} of ${mock.questions.length}`, q.question);
};

const saveMock = (ctx, mock) => LeoConversation.updateOne({ _id: ctx.conversationId, userId: ctx.userId }, { $set: { mock } });
const openMock = async (ctx) => (await LeoConversation.findOne({ _id: ctx.conversationId, userId: ctx.userId }).select('mock').lean())?.mock || null;

async function finishMock(ctx, mock) {
  await saveMock(ctx, null);
  if (!mock.turns.length) return { card: { type: 'profile_note', message: 'Interview stopped. Nothing was scored.', page: 'prep' }, summary: 'The interview is stopped. Say so in one sentence.' };
  const report = await ai.interviewReport({ role: mock.role, level: mock.level, mode: 'text', turns: mock.turns });
  const score = Math.round((mock.turns.reduce((sum, t) => sum + t.score, 0) / mock.turns.length) * 10);
  return {
    card: writing({
      kicker: `Mock interview report · ${mock.role}`,
      title: `${mock.turns.length} answer${mock.turns.length === 1 ? '' : 's'} scored`,
      score,
      blocks: [
        block('Summary', report.summary),
        block('Strengths', bullets(report.strengths)),
        block('Work on', bullets(report.weakAreas)),
        block('Practise next', bullets(report.practiceNext))
      ]
    }),
    summary: `Interview finished, overall ${score}/100. In one or two sentences, name the biggest thing to practise. Don't repeat the card.`
  };
}

export const CAREER_RUNNERS = {
  async proofread_resume(args, ctx) {
    const refused = await featureRefused(ctx, 'proofread', 'AI Proofreading');
    if (refused) return refused;
    const pasted = clip(args.text, 15000);
    const text = pasted || ctx.resumeText;
    if (text.length < 20) return blocked('attach', 'Attach your resume, or paste the text you want proofread.');
    const r = await ai.proofread({ text, industry: 'General', documentType: pasted ? '' : 'resume' });
    const changes = (Array.isArray(r.changes) ? r.changes : []).slice(0, 12);
    return {
      card: writing({
        kicker: 'Proofreading',
        title: `${(Array.isArray(r.changes) ? r.changes : []).length} corrections`,
        score: Number(r.score),
        blocks: [
          block('Summary', r.summary),
          block('Corrections', changes.map((c) => `${clip(c.original, 200)} → ${clip(c.corrected, 200)}`).join('\n')),
          block('Corrected version', r.correctedText, { copy: true, saveAsResume: !pasted })
        ]
      }),
      summary: `Proofread: ${changes.length} corrections shown. ${SAVED} They can tap "Use as my saved resume" to apply them.`
    };
  },

  async improve_resume(args, ctx) {
    const refused = await featureRefused(ctx, 'resume-check', 'the resume checker');
    if (refused) return refused;
    const missing = needResume(ctx);
    if (missing) return missing;
    const analysis = await ai.analyze(ctx.resumeText);
    const text = await ai.optimize(ctx.resumeText, analysis);
    return {
      card: writing({
        kicker: 'Improved resume',
        title: 'Your facts, stronger wording',
        blocks: [block('New version', text, { copy: true, saveAsResume: true })]
      }),
      summary: `Rewritten. Ask them to check every fact, then tap "Use as my saved resume" if they want it. ${SAVED}`
    };
  },

  async audit_linkedin(args, ctx) {
    const refused = await featureRefused(ctx, 'linkedin', 'the LinkedIn audit');
    if (refused) return refused;
    if (ctx.usingSavedResume || !looksLikeLinkedInExport(ctx.resumeText)) {
      return blocked('attach', 'Attach your LinkedIn PDF: open your profile, tap More, then Save to PDF.');
    }
    const profileText = ctx.resumeText;
    const targetRole = clip(args.target_role, 120);
    const r = await ai.linkedinAudit(profileText, null, targetRole);
    await saveToDocuments(ctx, { title: `LinkedIn Audit - ${targetRole || 'Profile'}`, type: 'linkedin', templateId: 'linkedin-opt', payload: { profileText, targetRole, evaluation: r } });
    return {
      card: writing({
        kicker: 'LinkedIn audit',
        title: targetRole ? `For ${targetRole}` : 'Your profile',
        score: Number(r.score),
        blocks: [
          block('Summary', r.summary),
          block('Headline ideas', bullets(r.headline?.suggestions), { copy: true }),
          block('Rewritten About', r.about?.improvedText, { copy: true }),
          block('Experience tips', bullets(r.experience?.tips)),
          block('Missing keywords', lines(r.skillsAndKeywords?.missing, 15).join(', ')),
          block('Next steps', bullets(r.generalTips))
        ]
      }),
      summary: `Audit done, ${Number(r.score) || 0}/100. ${SAVED}`
    };
  },

  async write_linkedin_bio(args, ctx) {
    const refused = await featureRefused(ctx, 'linkedin', 'the LinkedIn bio writer');
    if (refused) return refused;
    const jobTitle = clip(args.job_title, 120);
    if (!jobTitle) return blocked('info', 'Which role do you want your profile to show?');
    const skills = clip(args.skills, 600);
    const tone = clip(args.tone, 40);
    const r = await ai.bio({ skills, jobTitle, resumeText: ctx.resumeText, tone });
    await saveToDocuments(ctx, { title: `LinkedIn Bio - ${jobTitle}`, type: 'linkedin-bio', templateId: 'linkedin-bio-gen', payload: { skills, jobTitle, tone, resumeText: ctx.resumeText, result: r } });
    return {
      card: writing({
        kicker: 'LinkedIn bio',
        title: jobTitle,
        blocks: [
          block('Headlines', lines(r.headlines).join('\n'), { copy: true }),
          ...lines(r.aboutSummaries, 3).map((text, i) => block(`About, option ${i + 1}`, text, { copy: true })),
          block('Banner ideas', bullets(r.bannerIdeas)),
          block('Hashtags', lines(r.hashtags, 15).join(' '), { copy: true })
        ]
      }),
      summary: `Bio written. ${SAVED}`
    };
  },

  async write_linkedin_outreach(args, ctx) {
    const refused = await featureRefused(ctx, 'linkedin', 'the outreach writer');
    if (refused) return refused;
    const jobTitle = clip(args.job_title, 120);
    if (!jobTitle) return blocked('info', 'Which role are you reaching out about?');
    const input = { jobTitle, companyName: clip(args.company, 120), context: clip(args.context, 1000), targetName: clip(args.target_name, 80), tone: clip(args.tone, 40) };
    const r = await ai.outreach({ ...input, resumeText: ctx.resumeText });
    await saveToDocuments(ctx, { title: `LinkedIn Outreach - ${jobTitle} (${input.companyName || 'General'})`, type: 'linkedin-outreach', templateId: 'linkedin-outreach-gen', payload: { ...input, result: r } });
    return {
      card: writing({
        kicker: 'LinkedIn outreach',
        title: [jobTitle, input.companyName].filter(Boolean).join(' at '),
        blocks: [
          block('Connection note', r.connectionRequest, { copy: true }),
          block('Referral request', r.referralPitch, { copy: true }),
          block('Message to a recruiter', [r.inMailSubject && `Subject: ${r.inMailSubject}`, r.recruiterDM].filter(Boolean).join('\n\n'), { copy: true }),
          block('Follow-up', r.followUp, { copy: true })
        ]
      }),
      summary: `Messages written; nothing was sent. ${SAVED}`
    };
  },

  async write_linkedin_post(args, ctx) {
    const refused = await featureRefused(ctx, 'linkedin', 'the post writer');
    if (refused) return refused;
    const topic = clip(args.topic, 600);
    const jobTitle = clip(args.job_title, 120);
    if (!topic || !jobTitle) return blocked('info', 'Tell me what the post is about and your role.');
    const tone = clip(args.tone, 40);
    const r = await ai.posts({ topic, jobTitle, tone, resumeText: ctx.resumeText });
    await saveToDocuments(ctx, { title: `LinkedIn Post - ${topic.slice(0, 40)}`, type: 'linkedin-post', templateId: 'linkedin-post-gen', payload: { topic, jobTitle, tone, result: r } });
    return {
      card: writing({
        kicker: 'LinkedIn posts',
        title: topic.slice(0, 80),
        blocks: [
          ...(Array.isArray(r.posts) ? r.posts : []).slice(0, 3).map((p) => block(clip(p.style, 60) || 'Post', [p.content, lines(p.hashtags, 8).join(' ')].filter(Boolean).join('\n\n'), { copy: true })),
          block('Best time to post', r.bestTimeToPost),
          block('Tip', r.engagementTip)
        ]
      }),
      summary: `Posts written; nothing was posted. ${SAVED}`
    };
  },

  async elevator_pitch(args, ctx) {
    const refused = await featureRefused(ctx, 'career', 'the elevator pitch builder');
    if (refused) return refused;
    const jobTitle = clip(args.job_title, 120);
    if (!jobTitle) return blocked('info', 'Which role is the pitch for?');
    const details = clip(args.details, 1500);
    const setting = clip(args.setting, 60);
    const r = await ai.pitch({ jobTitle, details, resumeText: ctx.resumeText, setting });
    await saveToDocuments(ctx, { title: `Elevator Pitch - ${jobTitle}`, type: 'elevator-pitch', templateId: 'elevator-pitch-gen', payload: { jobTitle, details, setting, resumeText: ctx.resumeText, result: r } });
    return {
      card: writing({
        kicker: 'Elevator pitch',
        title: jobTitle,
        blocks: [
          block('One line', r.oneLiner, { copy: true }),
          block('Corporate', r.corporate, { copy: true }),
          block('Startup', r.startup, { copy: true }),
          block('Creative', r.creative, { copy: true }),
          block('Tips', bullets(r.tips))
        ]
      }),
      summary: `Pitch written. ${SAVED}`
    };
  },

  async skill_gaps(args, ctx) {
    const refused = await featureRefused(ctx, 'career', 'the skill gap check');
    if (refused) return refused;
    const targetJob = clip(args.target_job, 120);
    if (!targetJob) return blocked('info', 'Which job do you want to compare yourself with?');
    const skills = clip(args.skills, 600);
    const level = clip(args.level, 40);
    const r = await ai.courses({ targetJob, skills, resumeText: ctx.resumeText, level });
    await saveToDocuments(ctx, { title: `Skill Gaps - ${targetJob}`, type: 'career-courses', templateId: 'career-courses-gen', payload: { targetJob, skills, level, resumeText: ctx.resumeText, result: r } });
    return {
      card: writing({
        kicker: 'Skill gaps',
        title: targetJob,
        score: Number(r.readiness),
        blocks: [
          block('Where you stand', r.summary),
          block('Strengths', bullets(r.strengths)),
          block('Gaps', bullets(r.gaps)),
          block('Courses', bullets(r.courses)),
          block('Projects to build', bullets(r.projects))
        ]
      }),
      summary: `Gaps listed: ${lines(r.gaps, 6).join('; ')}. ${SAVED}`
    };
  },

  async negotiate_offer(args, ctx) {
    const refused = await featureRefused(ctx, 'negotiation', 'Offer Negotiation');
    if (refused) return refused;
    const offer = { company: clip(args.company, 120), role: clip(args.role, 120), location: clip(args.location, 80), fixed: clip(args.fixed, 80), variable: clip(args.variable, 80) };
    if (!offer.company || !offer.role || !offer.fixed) return blocked('info', 'Tell me the company, the role and the pay you were offered.');
    const gate = await allowance(ctx, 'negotiation');
    if (gate.stop) return gate.stop;
    const position = { current: clip(args.current, 80), competing: clip(args.competing, 300), target: clip(args.target, 200), priorities: [], notes: clip(args.notes, 600) };
    const tone = clip(args.tone, 40);
    const r = await ai.negotiate({ offer, position, tone, resumeText: ctx.resumeText });
    await gate.commit();
    await saveToDocuments(ctx, { title: `Offer Negotiation - ${offer.company}`, type: 'offer-negotiation', templateId: 'offer-negotiation', payload: { offer, position, tone, result: r } });
    return {
      card: writing({
        kicker: 'Offer negotiation',
        title: `${offer.role} at ${offer.company}`,
        blocks: [
          block('Email', [r.email?.subject && `Subject: ${r.email.subject}`, r.email?.body].filter(Boolean).join('\n\n'), { copy: true }),
          block('Call script', r.callScript, { copy: true }),
          block('Talking points', bullets(r.talkingPoints)),
          block('Avoid', bullets(r.avoid)),
          block('Watch out', bullets(r.warnings))
        ]
      }),
      summary: `Plan written; nothing was sent. ${SAVED}`
    };
  },

  async start_mock_interview(args, ctx) {
    const refused = await featureRefused(ctx, 'interview', 'the mock interview');
    if (refused) return refused;
    const role = clip(args.role, 100);
    if (!role) return blocked('info', 'Which role are you interviewing for?');
    const gate = await allowance(ctx, 'interview-text');
    if (gate.stop) return gate.stop;
    const level = ['Intern', 'Entry-level', 'Mid-level', 'Senior'].includes(args.level) ? args.level : 'Entry-level';
    const round = ['Mixed', 'HR', 'Behavioural', 'Technical'].includes(args.round) ? args.round : 'Mixed';
    const jobDescription = clip(args.job_description, 6000);
    const plan = await ai.interviewPlan({ resumeText: ctx.resumeText, role, jobDescription, level, round, count: 5 });
    const questions = (plan.questions || []).slice(0, 5).map((q) => ({ question: clip(q.question, 600), keyPoints: list(q.keyPoints, 5, 200) })).filter((q) => q.question);
    if (!questions.length) throw new Error('The AI returned no questions.');
    await gate.commit();
    const mock = { role, level, jobDescription, questions, at: 0, turns: [] };
    await saveMock(ctx, mock);
    return {
      card: writing({ kicker: `Mock interview · ${role}`, blocks: [questionBlock(mock)] }),
      summary: 'The first question is on the card. In one short sentence, ask them to type their answer. Don\'t repeat the question.'
    };
  },

  async answer_mock_interview(args, ctx) {
    const mock = await openMock(ctx);
    if (!mock) return { card: null, summary: 'No mock interview is open. Offer to start one.' };
    if (args.stop === true) return finishMock(ctx, mock);
    const answer = clip(args.answer, 6000);
    if (!answer) return { card: null, summary: 'No answer was given. Ask them to answer the question, or say stop.' };
    const q = mock.questions[mock.at];
    const r = await ai.interviewAnswer({ question: q.question, answer, keyPoints: q.keyPoints, role: mock.role, jobDescription: mock.jobDescription, resumeText: ctx.resumeText, mode: 'text' });
    const score = Math.max(0, Math.min(10, Number(r.score) || 0));
    mock.turns.push({ question: q.question, answer, score, missing: list(r.missing, 3, 200), metrics: null });
    mock.at += 1;
    const feedback = [
      block('Verdict', r.verdict),
      block('What worked', bullets(r.strengths, 3)),
      block('What was missing', bullets(r.missing, 3)),
      block('A stronger answer', r.improvedAnswer, { copy: true })
    ];
    if (mock.at >= mock.questions.length) {
      const done = await finishMock(ctx, mock);
      done.card.blocks = [...feedback, ...done.card.blocks];
      return done;
    }
    await saveMock(ctx, mock);
    return {
      card: writing({ kicker: `Mock interview · answer ${mock.at} scored`, score: score * 10, blocks: [...feedback, questionBlock(mock)] }),
      summary: 'Feedback and the next question are on the card. In one short sentence, ask them to answer it. Don\'t repeat the card.'
    };
  }
};
