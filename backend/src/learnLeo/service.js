import mongoose from 'mongoose';
import { callDeepSeek } from '../services/gemini.js';
import { aiContext } from '../billing/aiContext.js';
import { runJudgeSubmission, judgeMeta } from '../services/codeJudge.js';
import { CURATED_PROBLEMS } from '../data/curatedProblems.js';
import { LeoLesson, LeoBeat, LeoProgress, LeoCache } from './models.js';
import { catalogueMatch, slugify } from './catalogue.js';
import { planPrompt, beatPrompt, reexplainPrompt, approachPrompt, summaryOf } from './prompts.js';
import { validateBeat, validatePlan, estimateDurationMs } from './validate.js';

// Learn with Leo lessons: plan → accept → beats generated one at a time (each saved before it is
// sent) → checkpoints → saved for replay. Every AI call goes through `model`, which tests replace.

export class LeoError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// model({ system, prompt, maxTokens, temperature }) → parsed JSON object
const deepSeekModel = ({ system, prompt, maxTokens = 1400, temperature = 0.4 }) =>
  callDeepSeek({ systemInstruction: system, prompt, jsonMode: true, plainStyle: false, maxTokens, temperature });

let model = deepSeekModel;
export function setLessonModel(fn) {
  model = fn || deepSeekModel;
}

const LANGUAGES = ['hinglish', 'english'];
// Hinglish is "coming soon": lessons are English until LEO_HINGLISH=true (the prompts already support it)
export const hinglishEnabled = () => process.env.LEO_HINGLISH === 'true';
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const SOURCES = ['skill_gap', 'manual'];
const LEASE_MS = 90 * 1000;
const clip = (v, max) => String(v ?? '').trim().slice(0, max);

// Obvious non-learning requests are refused before any AI call; the plan prompt refuses the rest
const BLOCKED_TOPIC = /\b(porn|sex|nude|nsfw|bomb|explosive|weapon|suicide|self[- ]harm|kill|drugs?|hack into|crack (a |the )?password|phishing|malware|ddos)\b/i;

// Calls the model and adds the tokens it spent to the lesson's cost
async function ask(lessonId, args) {
  const ctx = aiContext();
  const before = ctx?.tokens || 0;
  try {
    return await model(args);
  } finally {
    const used = (ctx?.tokens || 0) - before;
    if (lessonId && used > 0) LeoLesson.updateOne({ _id: lessonId }, { $inc: { costTokens: used } }).catch(() => {});
  }
}

// Asks once, and again with the validator's complaints if the reply doesn't pass. The retry is lenient.
async function askValid(lessonId, args, check) {
  let errors = [];
  for (const lenient of [false, true]) {
    const prompt = errors.length
      ? `${args.prompt}\n\nYour previous reply was rejected: ${errors.join('; ')}. Fix these and reply with the JSON object only.`
      : args.prompt;
    try {
      const result = check(await ask(lessonId, { ...args, prompt }), lenient);
      if (result.ok) return result;
      errors = result.errors;
    } catch (err) {
      errors = [err.message?.slice(0, 200) || 'the reply could not be read'];
    }
  }
  const err = new LeoError(502, 'GENERATION_FAILED', 'Leo could not write this part of the lesson.');
  err.details = errors;
  throw err;
}

// ── Lesson shape ──────────────────────────────────────────────────────────────

const isDsa = (lesson) => lesson.source === 'dsa_problem';
// Concept lessons end with a recap beat; DSA lessons are just their 3–5 steps
export const totalBeats = (lesson) => (isDsa(lesson) ? lesson.plan.length : lesson.plan.length + 1);

// 1–2 checkpoints, never in the recap beat
export function checkpointBeats(total) {
  if (total >= 6) return [Math.floor(total / 2) - 1, total - 2];
  return [Math.max(1, total - 2)];
}

const findProblem = (id) => CURATED_PROBLEMS.find((p) => p.id === id || p.slug === id) || null;

// Beats as sent to the browser: checkpoint answers stay on the server until answered
function publicBeat(beat) {
  return {
    order: beat.order,
    kind: beat.kind,
    title: beat.title,
    narration: beat.narration,
    elements: (beat.elements || []).map((el) => (el.type === 'checkpoint'
      ? { type: 'checkpoint', format: el.format, question: el.question, options: el.options }
      : el)),
    audioUrl: beat.audioUrl || null,
    wordTimings: beat.wordTimings || null,
    durationMs: beat.durationMs
  };
}

export function publicLesson(lesson) {
  return {
    id: String(lesson._id),
    topic: lesson.topic,
    language: lesson.language,
    level: lesson.level,
    role: lesson.role,
    plan: lesson.plan,
    planEdited: lesson.planEdited,
    status: lesson.status,
    source: lesson.source,
    problemId: lesson.problemId || null,
    summary: lesson.summary,
    beatCount: lesson.beatCount || totalBeats(lesson),
    checkpointBeats: checkpointBeats(lesson.beatCount || totalBeats(lesson)),
    cached: !!lesson.copiedFrom,
    failReason: lesson.failReason || '',
    createdAt: lesson.createdAt,
    startedAt: lesson.startedAt
  };
}

export async function lessonFor(userId, id) {
  if (!mongoose.isValidObjectId(id)) throw new LeoError(404, 'NOT_FOUND', 'Lesson not found.');
  const lesson = await LeoLesson.findOne({ _id: id, userId: String(userId) });
  if (!lesson) throw new LeoError(404, 'NOT_FOUND', 'Lesson not found.');
  return lesson;
}

// ── Plan ──────────────────────────────────────────────────────────────────────

function readContext(body) {
  return {
    language: hinglishEnabled() && LANGUAGES.includes(body.language) ? body.language : 'english',
    level: LEVELS.includes(body.level) ? body.level : 'beginner',
    role: clip(body.role, 80),
    skills: (Array.isArray(body.skills) ? body.skills : []).map((s) => clip(s, 40)).filter(Boolean).slice(0, 15)
  };
}

function readFailingTest(test) {
  if (!test || typeof test !== 'object') return null;
  const pick = (v) => (JSON.stringify(v ?? null).length > 2000 ? String(JSON.stringify(v)).slice(0, 2000) : v ?? null);
  return { input: pick(test.input), expected: pick(test.expected), actual: pick(test.actual), error: clip(test.error, 500) || null };
}

export async function createPlan(userId, body = {}) {
  const ctx = readContext(body);
  let fields;
  let problem = null;

  if (body.problemId) {
    problem = findProblem(String(body.problemId));
    if (!problem) throw new LeoError(404, 'PROBLEM_NOT_FOUND', 'That problem was not found.');
    fields = {
      topic: problem.title,
      topicSlug: `problem-${problem.id}`,
      source: 'dsa_problem',
      problemId: problem.id,
      problemContext: { language: clip(body.codeLanguage || 'javascript', 20).toLowerCase(), code: clip(body.code, 6000), failingTest: readFailingTest(body.failingTest) }
    };
  } else {
    const topic = clip(body.topic, 120);
    if (topic.length < 2) throw new LeoError(400, 'TOPIC_REQUIRED', 'Tell Leo what you want to learn.');
    if (BLOCKED_TOPIC.test(topic)) throw new LeoError(422, 'TOPIC_NOT_ALLOWED', 'Leo only teaches technical and career topics.');
    const entry = catalogueMatch(topic);
    fields = {
      topic: entry ? entry.title : topic,
      topicSlug: entry ? entry.slug : slugify(topic),
      catalogue: !!entry,
      source: SOURCES.includes(body.source) ? body.source : 'manual',
      skillGapId: clip(body.skillGapId, 80)
    };
  }

  // A catalogue topic someone already learned at this language + level reuses that lesson
  if (fields.catalogue) {
    const hit = await LeoCache.findOne({ topicSlug: fields.topicSlug, language: ctx.language, level: ctx.level }).lean();
    const cached = hit && await LeoLesson.findOne({ _id: hit.lessonId, status: 'ready' }).lean();
    if (cached) {
      const lesson = await LeoLesson.create({ userId: String(userId), ...fields, ...ctx, plan: cached.plan, copiedFrom: cached._id });
      return { lesson, message: cached.language === 'english' ? `Here is the plan for ${fields.topic}.` : `${fields.topic} ka plan ready hai.` };
    }
  }

  const dsa = !!problem;
  const plan = await askValid(null, planPrompt({ topic: fields.topic, ...ctx, problem, problemContext: fields.problemContext }),
    (raw) => validatePlan(raw, dsa ? { minSteps: 3, maxSteps: 5 } : {}));
  if (plan.refused) throw new LeoError(422, 'TOPIC_NOT_ALLOWED', plan.message);
  const lesson = await LeoLesson.create({ userId: String(userId), ...fields, ...ctx, plan: plan.steps });
  return { lesson, message: plan.message };
}

// Once per lesson, before it starts: a shorter plan or the user's own change
export async function revisePlan(lesson, { shorter = false, edits = '' } = {}) {
  if (lesson.status !== 'planning') throw new LeoError(409, 'ALREADY_STARTED', 'This lesson has already started.');
  if (lesson.planEdited) throw new LeoError(409, 'PLAN_EDITED', 'The plan can only be changed once.');
  if (!shorter && !clip(edits, 500)) throw new LeoError(400, 'EDIT_REQUIRED', 'Say what to change in the plan.');
  const problem = isDsa(lesson) ? findProblem(lesson.problemId) : null;
  const previous = lesson.plan.map((s) => s.title);
  const plan = await askValid(lesson._id, planPrompt({ ...lesson.toObject(), problem, shorter, edits, previous }),
    (raw) => validatePlan(raw, isDsa(lesson) ? { minSteps: 3, maxSteps: 5 } : {}));
  if (plan.refused) throw new LeoError(422, 'TOPIC_NOT_ALLOWED', plan.message);
  lesson.plan = plan.steps;
  lesson.planEdited = true;
  lesson.copiedFrom = null;
  await lesson.save();
  return { lesson, message: plan.message };
}

// ── Start ─────────────────────────────────────────────────────────────────────

export async function startLesson(lesson) {
  if (lesson.status !== 'planning') return lesson;
  lesson.startedAt = new Date();
  if (lesson.copiedFrom) {
    const beats = await LeoBeat.find({ lessonId: lesson.copiedFrom, kind: 'main' }).sort({ order: 1 }).lean();
    const source = await LeoLesson.findById(lesson.copiedFrom).lean();
    if (source?.status === 'ready' && beats.length === source.beatCount) {
      await LeoBeat.insertMany(beats.map(({ _id, createdAt, updatedAt, reports, ...b }) => ({ ...b, lessonId: lesson._id })));
      lesson.beatCount = beats.length;
      lesson.summary = source.summary;
      lesson.status = 'ready';
      await lesson.save();
      await LeoCache.updateOne({ lessonId: lesson.copiedFrom }, { $inc: { hits: 1 } });
      return lesson;
    }
    lesson.copiedFrom = null; // the cached lesson is gone: generate this one fresh
  }
  lesson.beatCount = totalBeats(lesson);
  lesson.status = 'streaming';
  await lesson.save();
  return lesson;
}

// ── Beats ─────────────────────────────────────────────────────────────────────

async function generateBeat(lesson, index, previous) {
  const total = lesson.beatCount;
  const checkpoint = checkpointBeats(total).includes(index);
  const problem = isDsa(lesson) ? findProblem(lesson.problemId) : null;
  const { beat } = await askValid(lesson._id, beatPrompt({ lesson, index, total, previous, checkpoint, problem }),
    (raw, lenient) => validateBeat(raw, { checkpoint: checkpoint ? 'required' : 'forbidden', lenient }));
  return LeoBeat.create({ lessonId: lesson._id, order: index, kind: 'main', ...beat });
}

const acquireLease = (lessonId) => LeoLesson.findOneAndUpdate(
  { _id: lessonId, $or: [{ genLockUntil: null }, { genLockUntil: { $lt: new Date() } }] },
  { $set: { genLockUntil: new Date(Date.now() + LEASE_MS) } },
  { returnDocument: 'after' }
);

async function finishLesson(lesson) {
  const beats = await LeoBeat.find({ lessonId: lesson._id, kind: 'main' }).sort({ order: 1 }).lean();
  await LeoLesson.updateOne({ _id: lesson._id }, { $set: { status: 'ready', summary: summaryOf(lesson, beats), genLockUntil: null } });
  if (lesson.catalogue && !lesson.planEdited && !lesson.copiedFrom && !isDsa(lesson)) {
    await LeoCache.updateOne(
      { topicSlug: lesson.topicSlug, language: lesson.language, level: lesson.level },
      { $setOnInsert: { lessonId: lesson._id, hits: 0 } },
      { upsert: true }
    ).catch(() => {}); // another lesson got there first
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Yields the lesson's main beats from `from`, in order: saved ones straight away, missing ones as
 * they are written. Stops early when `signal` aborts. Throws LeoError when a beat fails twice; the
 * lesson is then marked failed and the beats before it stay saved.
 */
export async function* streamBeats(lessonDoc, { from = 0, signal } = {}) {
  let lesson = lessonDoc;
  if (lesson.status === 'planning') throw new LeoError(409, 'NOT_STARTED', 'Start the lesson first.');
  const total = lesson.beatCount;
  let holding = false;
  try {
    for (let order = Math.max(0, from); order < total; order += 1) {
      if (signal?.aborted) return;
      let beat = await LeoBeat.findOne({ lessonId: lesson._id, order, kind: 'main' }).lean();
      while (!beat) {
        if (signal?.aborted) return;
        lesson = await LeoLesson.findById(lesson._id);
        if (lesson.status === 'failed') throw new LeoError(502, 'LESSON_FAILED', lesson.failReason || 'This lesson could not be finished.');
        const leased = holding
          ? await LeoLesson.findByIdAndUpdate(lesson._id, { $set: { genLockUntil: new Date(Date.now() + LEASE_MS) } }, { returnDocument: 'after' })
          : await acquireLease(lesson._id);
        if (!leased) {
          // another connection is writing this beat: wait for it
          await sleep(800);
          beat = await LeoBeat.findOne({ lessonId: lesson._id, order, kind: 'main' }).lean();
          continue;
        }
        holding = true;
        lesson = leased;
        const previous = await LeoBeat.find({ lessonId: lesson._id, kind: 'main', order: { $lt: order } }).sort({ order: 1 }).select('order title').lean();
        try {
          beat = (await generateBeat(lesson, order, previous)).toObject();
        } catch (err) {
          if (err?.code === 11000) {
            beat = await LeoBeat.findOne({ lessonId: lesson._id, order, kind: 'main' }).lean();
            continue;
          }
          const reason = err instanceof LeoError ? err.message : 'Leo ran into a problem writing this lesson.';
          await LeoLesson.updateOne({ _id: lesson._id }, { $set: { status: 'failed', failReason: reason, genLockUntil: null } });
          holding = false;
          if (!(err instanceof LeoError)) console.error('[learn-leo] beat failed:', err.message);
          throw new LeoError(502, 'BEAT_FAILED', 'Leo could not finish this lesson. Your progress so far is saved.');
        }
      }
      yield publicBeat(beat);
    }
    const fresh = await LeoLesson.findById(lesson._id);
    if (fresh.status === 'streaming') await finishLesson(fresh);
    holding = false;
  } finally {
    if (holding) await LeoLesson.updateOne({ _id: lesson._id }, { $set: { genLockUntil: null } }).catch(() => {});
  }
}

// ── Checkpoints ───────────────────────────────────────────────────────────────

const PRAISE = {
  hinglish: ['Bilkul sahi!', 'Ekdum correct, badhiya!', 'Sahi jawab, chalo aage badhte hain.', 'Perfect, tumne pakad liya!'],
  english: ['Exactly right!', 'Correct, nicely done.', "That's it. Let's keep going.", 'Spot on!']
};
const NOT_QUITE = { hinglish: 'Koi baat nahi, isko ek baar aur dekhte hain.', english: "Not quite. Let's look at it once more." };

const pickPraise = (language, n) => {
  const list = PRAISE[language] || PRAISE.english;
  return list[n % list.length];
};

async function progressFor(lesson) {
  return LeoProgress.findOneAndUpdate(
    { lessonId: lesson._id },
    { $setOnInsert: { lessonId: lesson._id, userId: lesson.userId } },
    { upsert: true, returnDocument: 'after' }
  );
}

export async function answerCheckpoint(lesson, { beatOrder, chosen }) {
  const order = Number(beatOrder);
  const pick = Number(chosen);
  const beat = await LeoBeat.findOne({ lessonId: lesson._id, order, kind: 'main' });
  const checkpoint = beat?.elements?.find((e) => e.type === 'checkpoint');
  if (!checkpoint) throw new LeoError(404, 'NO_CHECKPOINT', 'That beat has no checkpoint.');
  if (!Number.isInteger(pick) || pick < 0 || pick >= checkpoint.options.length) throw new LeoError(400, 'BAD_ANSWER', 'Pick one of the options.');
  const correct = pick === checkpoint.answer;

  // Only the first answer to each checkpoint counts toward progress and accuracy
  const progress = await progressFor(lesson);
  if (!progress.checkpointAnswers.some((a) => a.beatOrder === order)) {
    progress.checkpointAnswers.push({ beatOrder: order, chosen: pick, correct });
    await progress.save();
  }

  const result = { correct, answer: checkpoint.answer, explanation: checkpoint.explanation || '' };
  if (correct) return { ...result, reply: pickPraise(lesson.language, order) };

  let again = await LeoBeat.findOne({ lessonId: lesson._id, order, kind: 'reexplain' }).lean();
  if (!again) {
    try {
      const { beat: fresh } = await askValid(lesson._id, reexplainPrompt({ lesson, beat, checkpoint, chosen: pick }),
        (raw, lenient) => validateBeat(raw, { minWords: 30, maxWords: 70, maxElements: 3, checkpoint: 'forbidden', lenient }));
      again = (await LeoBeat.create({ lessonId: lesson._id, order, kind: 'reexplain', ...fresh })).toObject();
    } catch (err) {
      if (err?.code === 11000) again = await LeoBeat.findOne({ lessonId: lesson._id, order, kind: 'reexplain' }).lean();
      // without a re-explain beat the explanation line still helps; the lesson carries on
      else console.error('[learn-leo] re-explain failed:', err.message);
    }
  }
  return { ...result, reply: NOT_QUITE[lesson.language] || NOT_QUITE.english, reexplain: again ? publicBeat(again) : null };
}

// ── DSA: full approach ────────────────────────────────────────────────────────

// The solution code must pass the problem's tests when it is JavaScript (the judge runs it sandboxed)
async function approachPassesTests(beat, problem) {
  const code = beat.elements.find((e) => e.type === 'code');
  if (!code) return 'the approach beat needs the solution as a code element';
  if (!['js', 'javascript'].includes(code.language)) return null;
  const testCases = [...(problem.sampleTestCases || []), ...(problem.hiddenTestCases || [])];
  if (!testCases.length) return null;
  const result = await runJudgeSubmission({ code: code.content, language: 'javascript', testCases, functionName: problem.functionName, meta: judgeMeta(problem) });
  return result.verdict === 'Accepted' ? null : `the solution code failed the problem's tests (${result.verdict}); write a correct solution named ${problem.functionName}`;
}

export async function fullApproach(lesson) {
  if (!isDsa(lesson)) throw new LeoError(400, 'NOT_A_PROBLEM_LESSON', 'Full approach is only for problem lessons.');
  if (lesson.status !== 'ready') throw new LeoError(409, 'NOT_FINISHED', 'Finish the lesson first.');
  const progress = await LeoProgress.findOne({ lessonId: lesson._id }).lean();
  const answered = new Set((progress?.checkpointAnswers || []).map((a) => a.beatOrder));
  const withCheckpoints = await LeoBeat.find({ lessonId: lesson._id, kind: 'main', 'elements.type': 'checkpoint' }).select('order').lean();
  if (withCheckpoints.some((b) => !answered.has(b.order))) {
    throw new LeoError(409, 'CHECKPOINT_FIRST', 'Answer the last checkpoint to unlock the full approach.');
  }

  const existing = await LeoBeat.findOne({ lessonId: lesson._id, kind: 'approach' }).lean();
  if (existing) return publicBeat(existing);
  const problem = findProblem(lesson.problemId);
  if (!problem) throw new LeoError(404, 'PROBLEM_NOT_FOUND', 'That problem was not found.');

  let errors = [];
  for (const lenient of [false, true]) {
    const base = approachPrompt({ lesson, problem });
    const prompt = errors.length ? `${base.prompt}\n\nYour previous reply was rejected: ${errors.join('; ')}.` : base.prompt;
    let result;
    try {
      result = validateBeat(await ask(lesson._id, { ...base, prompt, maxTokens: 1800 }), { minWords: 50, maxWords: 110, checkpoint: 'forbidden', lenient });
    } catch (err) {
      errors = [err.message?.slice(0, 200)];
      continue;
    }
    if (!result.ok) {
      errors = result.errors;
      continue;
    }
    const failed = await approachPassesTests(result.beat, problem);
    if (failed) {
      errors = [failed];
      continue;
    }
    const saved = await LeoBeat.create({ lessonId: lesson._id, order: lesson.beatCount, kind: 'approach', ...result.beat }).catch(async (err) => {
      if (err?.code === 11000) return LeoBeat.findOne({ lessonId: lesson._id, kind: 'approach' });
      throw err;
    });
    return publicBeat(saved.toObject ? saved.toObject() : saved);
  }
  throw new LeoError(502, 'GENERATION_FAILED', 'Leo could not write a checked solution right now. Try again in a minute.');
}

// ── Progress, history, reports ────────────────────────────────────────────────

export async function saveProgress(lesson, { lastBeat, completed, prepClicked } = {}) {
  const progress = await progressFor(lesson);
  const n = Number(lastBeat);
  if (Number.isInteger(n) && n >= 0) progress.lastBeat = Math.min(Math.max(progress.lastBeat, n), Math.max(0, lesson.beatCount - 1));
  if (completed && !progress.completedAt) progress.completedAt = new Date();
  if (prepClicked && !progress.prepClickedAt) progress.prepClickedAt = new Date();
  await progress.save();
  return progressView(progress);
}

const progressView = (p) => (p
  ? { lastBeat: p.lastBeat, checkpointAnswers: p.checkpointAnswers, completedAt: p.completedAt, prepClickedAt: p.prepClickedAt }
  : { lastBeat: 0, checkpointAnswers: [], completedAt: null, prepClickedAt: null });

export async function listLessons(userId) {
  const lessons = await LeoLesson.find({ userId: String(userId), status: { $ne: 'planning' } }).sort({ createdAt: -1 }).limit(60).lean();
  const progress = await LeoProgress.find({ lessonId: { $in: lessons.map((l) => l._id) } }).lean();
  const byLesson = new Map(progress.map((p) => [String(p.lessonId), p]));
  return lessons.map((l) => ({ ...publicLesson(l), progress: progressView(byLesson.get(String(l._id))) }));
}

export async function fullLesson(lesson) {
  const beats = await LeoBeat.find({ lessonId: lesson._id }).sort({ order: 1 }).lean();
  const progress = await LeoProgress.findOne({ lessonId: lesson._id }).lean();
  // answers the user already gave are shown again on replay
  const answered = new Map((progress?.checkpointAnswers || []).map((a) => [a.beatOrder, a]));
  const view = (b) => {
    const out = publicBeat(b);
    const cp = b.elements.find((e) => e.type === 'checkpoint');
    if (cp && answered.has(b.order)) out.answered = { ...answered.get(b.order), answer: cp.answer, explanation: cp.explanation || '' };
    return out;
  };
  return {
    lesson: publicLesson(lesson),
    beats: beats.filter((b) => b.kind === 'main').map(view),
    reexplains: beats.filter((b) => b.kind === 'reexplain').map(publicBeat),
    approach: beats.filter((b) => b.kind === 'approach').map(publicBeat)[0] || null,
    progress: progressView(progress)
  };
}

export async function reportBeat(lesson, order, { userId, note }) {
  const beat = await LeoBeat.findOne({ lessonId: lesson._id, order: Number(order), kind: 'main' });
  if (!beat) throw new LeoError(404, 'NOT_FOUND', 'Beat not found.');
  if (beat.reports.length < 20 && !beat.reports.some((r) => r.userId === String(userId))) {
    beat.reports.push({ userId: String(userId), note: clip(note, 500) });
    await beat.save();
  }
  return { reported: true };
}

export { estimateDurationMs };
