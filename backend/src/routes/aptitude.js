import express from 'express';
import { requireUser, optionalUser } from '../services/authToken.js';
import { hasAptitudeAccess, COMING_SOON } from '../aptitude/access.js';
import { TOPICS, MINUTES_PER_QUESTION, pickQuestions, publicQuestion, questionById } from '../aptitude/questions.js';

// Aptitude Tests (coming soon). Mounted at /api/aptitude.
// Grading happens here: the site only ever gets questions, never the answers, until it submits.

const MAX_ANSWERS = 50;

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

  // Grades a submitted test. choice is the option index, or null for a skipped question.
  router.post('/check', (req, res) => {
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
    res.json({ success: true, score: correct, total: results.length, skipped, wrong: results.length - correct - skipped, sections, results });
  });

  return router;
}

export default createAptitudeRouter();
