import express from 'express';
import mongoose from 'mongoose';
import { requireUser, optionalUser } from '../services/authToken.js';
import { saveWork } from '../db.js';
import { hasAptitudeAccess, COMING_SOON } from '../aptitude/access.js';
import { TOPICS, MINUTES_PER_QUESTION, pickQuestions, publicQuestion, questionById } from '../aptitude/questions.js';

// Aptitude Tests (coming soon). Mounted at /api/aptitude.
// Grading happens here: the site only ever gets questions, never the answers, until it submits.
// Every checked test is saved to the user's My Documents as a work of type 'aptitude'.

const MAX_ANSWERS = 50;
const HISTORY = 10;
export const WORK_TYPE = 'aptitude';

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// The short line My Documents and the history list show for a saved test
const summaryOf = (work) => {
  try {
    const saved = JSON.parse(work.htmlContent);
    return { score: saved.result.score, total: saved.result.total, topic: saved.topic, label: saved.label, seconds: saved.seconds ?? null };
  } catch {
    return null;
  }
};

export function createAptitudeRouter() {
  const router = express.Router();

  // Whether this visitor can use Aptitude Tests (signed out: no). The site shows "coming soon" otherwise.
  router.get('/access', optionalUser, (req, res) => {
    res.json({ success: true, access: !!req.auth && hasAptitudeAccess(req.auth.email) });
  });

  router.use(requireUser);
  router.use((req, res, next) => (hasAptitudeAccess(req.auth.email) ? next() : res.status(403).json(COMING_SOON)));

  router.get('/topics', (req, res) => {
    res.json({
      success: true,
      topics: Object.entries(TOPICS).map(([id, t]) => ({ id, label: t.label, desc: t.desc, questions: t.count, minutes: t.count * MINUTES_PER_QUESTION }))
    });
  });

  // A new test: a random set from the bank, without answers
  router.post('/start', (req, res) => {
    const topic = String(req.body?.topic || '');
    if (!Object.hasOwn(TOPICS, topic)) return res.status(400).json({ success: false, error: 'Pick a test: quant, reasoning, verbal or mixed.' });
    const questions = pickQuestions(topic);
    res.json({ success: true, topic, label: TOPICS[topic].label, minutes: questions.length * MINUTES_PER_QUESTION, questions: questions.map(publicQuestion) });
  });

  // The user's latest saved tests, newest first
  router.get('/history', asyncRoute(async (req, res) => {
    const works = await mongoose.model('Work')
      .find({ userId: String(req.auth.sub), type: WORK_TYPE })
      .sort({ createdAt: -1 })
      .limit(HISTORY)
      .lean();
    const tests = works
      .map((w) => ({ id: String(w._id), title: w.title, createdAt: w.createdAt, ...summaryOf(w) }))
      .filter((t) => Number.isInteger(t.score));
    res.json({ success: true, tests });
  }));

  // One saved test with every answer, for its owner only
  router.get('/history/:id', asyncRoute(async (req, res) => {
    const id = String(req.params.id);
    const work = mongoose.isValidObjectId(id)
      ? await mongoose.model('Work').findOne({ _id: id, userId: String(req.auth.sub), type: WORK_TYPE }).lean()
      : null;
    let saved = null;
    try { saved = work && JSON.parse(work.htmlContent); } catch { /* unreadable: treated as missing */ }
    if (!saved?.result) return res.status(404).json({ success: false, error: 'That test was not found.' });
    res.json({ success: true, id, title: work.title, createdAt: work.createdAt, topic: saved.topic, label: saved.label, seconds: saved.seconds ?? null, result: saved.result });
  }));

  // Grades a submitted test and saves it to My Documents. choice is the option index, or null for a skipped question.
  router.post('/check', asyncRoute(async (req, res) => {
    const answers = Array.isArray(req.body?.answers) ? req.body.answers.slice(0, MAX_ANSWERS) : [];
    const seen = new Set();
    const results = [];
    for (const a of answers) {
      const q = questionById(a?.id);
      if (!q || seen.has(q.id)) continue;
      seen.add(q.id);
      const choice = Number.isInteger(a.choice) && a.choice >= 0 && a.choice < q.options.length ? a.choice : null;
      results.push({ ...publicQuestion(q), choice, answer: q.answer, correct: choice === q.answer, explanation: q.explanation });
    }
    if (!results.length) return res.status(400).json({ success: false, error: 'No answers to check.' });

    const correct = results.filter((r) => r.correct).length;
    const skipped = results.filter((r) => r.choice === null).length;
    // Per-section score, so the result can say where to practise more
    const sections = {};
    for (const r of results) {
      const s = (sections[r.topic] ||= { label: TOPICS[r.topic].label, correct: 0, total: 0 });
      s.total += 1;
      if (r.correct) s.correct += 1;
    }
    const result = { score: correct, total: results.length, skipped, wrong: results.length - correct - skipped, sections, results };

    // Which test this was: the topic the site says, else worked out from the questions
    const topics = new Set(results.map((r) => r.topic));
    const asked = String(req.body?.topic || '');
    const topic = Object.hasOwn(TOPICS, asked) ? asked : topics.size === 1 ? [...topics][0] : 'mixed';
    const label = TOPICS[topic].label;
    const rawSeconds = Number(req.body?.seconds);
    const seconds = Number.isFinite(rawSeconds) && rawSeconds >= 0 ? Math.min(Math.round(rawSeconds), 3 * 60 * 60) : null;

    // A failed save never costs the user their result; it just isn't in My Documents
    let work = null;
    try {
      const saved = await saveWork({
        userId: req.auth.sub,
        title: `${label} - ${correct}/${results.length}`,
        type: WORK_TYPE,
        templateId: topic,
        htmlContent: JSON.stringify({ topic, label, seconds, takenAt: new Date().toISOString(), result })
      });
      work = saved ? { id: String(saved._id || saved.id), title: saved.title } : null;
    } catch (err) {
      console.error('[aptitude] could not save the test:', err.message);
    }
    res.json({ success: true, ...result, topic, work });
  }));

  return router;
}

export default createAptitudeRouter();
