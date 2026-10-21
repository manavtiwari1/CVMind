import express from 'express';
import { requireUser, optionalUser } from '../services/authToken.js';
import { hasLeoAccess, COMING_SOON } from '../learnLeo/access.js';
import { isPro, recordTokens } from '../billing/service.js';
import { runWithAiContext } from '../billing/aiContext.js';
import { LEARN_LEO_DAILY } from '../billing/plans.js';
import { hitLimit, DAY_MS } from '../services/limiter.js';
import {
  LeoError, createPlan, revisePlan, startLesson, streamBeats, answerCheckpoint, fullApproach,
  saveProgress, listLessons, fullLesson, reportBeat, lessonFor, publicLesson
} from '../learnLeo/service.js';

// Learn with Leo: Leo plans a lesson, then streams it beat by beat (narration + board elements).
// Mounted at /api/leo. Every route needs a signed-in account; lessons belong to the user who made them.

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function createLearnLeoRouter() {
  const router = express.Router();

  // Whether this visitor can open Learn with Leo (signed out: no). The site shows "coming soon" otherwise.
  router.get('/access', optionalUser, (req, res) => {
    res.json({ success: true, access: !!req.auth && hasLeoAccess(req.auth.email) });
  });

  router.use(requireUser);
  router.use((req, res, next) => (hasLeoAccess(req.auth.email) ? next() : res.status(403).json(COMING_SOON)));

  router.post('/plan', asyncRoute(async (req, res) => {
    const { lesson, message } = await createPlan(req.auth.sub, req.body || {});
    res.json({ success: true, lesson: publicLesson(lesson), message });
  }));

  router.post('/lessons/:id/plan', asyncRoute(async (req, res) => {
    const lesson = await lessonFor(req.auth.sub, req.params.id);
    const result = await revisePlan(lesson, { shorter: !!req.body?.shorter, edits: req.body?.edits });
    res.json({ success: true, lesson: publicLesson(result.lesson), message: result.message });
  }));

  // Accepting the plan is what counts as a new lesson for the daily limit; replays never do
  router.post('/lessons/:id/start', asyncRoute(async (req, res) => {
    let lesson = await lessonFor(req.auth.sub, req.params.id);
    if (lesson.status === 'planning') {
      const pro = await isPro(req.auth.email);
      const limit = pro ? LEARN_LEO_DAILY.pro : LEARN_LEO_DAILY.free;
      const hit = await hitLimit(`learn-leo:${req.auth.sub}`, limit, DAY_MS);
      if (!hit.ok) {
        return res.status(pro ? 429 : 402).json({
          success: false,
          code: pro ? 'DAILY_LIMIT' : 'UPGRADE_REQUIRED',
          feature: 'learn-leo',
          limit,
          error: pro
            ? `You've started ${limit} new lessons today. Replays are unlimited, and new lessons open again tomorrow.`
            : `Free accounts get ${limit} new Leo lesson a day. Upgrade to CVMind Pro for up to ${LEARN_LEO_DAILY.pro} a day, or replay any saved lesson for free.`
        });
      }
    }
    lesson = await startLesson(lesson);
    res.json({ success: true, lesson: publicLesson(lesson) });
  }));

  // Server-sent events: `meta`, then one `beat` per beat, then `done` (or `error`).
  // ?from=n resumes after a dropped connection; beats already written are sent straight away.
  router.get('/lessons/:id/stream', asyncRoute(async (req, res) => {
    const lesson = await lessonFor(req.auth.sub, req.params.id);
    if (lesson.status === 'planning') throw new LeoError(409, 'NOT_STARTED', 'Start the lesson first.');

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const send = (event, data) => {
      if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    const abort = new AbortController();
    res.on('close', () => abort.abort());
    const ping = setInterval(() => { if (!res.writableEnded) res.write(': ping\n\n'); }, 15000);

    // GET requests skip the global AI budget gate, so the stream charges its own tokens
    const email = req.auth.email;
    const ctx = { email, charge: (tokens) => recordTokens(email, tokens, '/api/leo/stream') };
    try {
      await runWithAiContext(ctx, async () => {
        send('meta', { lesson: publicLesson(lesson) });
        for await (const beat of streamBeats(lesson, { from: Number(req.query.from) || 0, signal: abort.signal })) {
          send('beat', beat);
        }
        if (!abort.signal.aborted) {
          const { lesson: done } = await fullLesson(await lessonFor(req.auth.sub, req.params.id));
          send('done', { lesson: done });
        }
      });
    } catch (err) {
      if (!(err instanceof LeoError)) console.error('[learn-leo] stream failed:', err);
      send('error', { code: err.code || 'STREAM_FAILED', error: err instanceof LeoError ? err.message : 'Leo lost the thread. Try again.' });
    } finally {
      clearInterval(ping);
      res.end();
    }
  }));

  router.post('/lessons/:id/checkpoint', asyncRoute(async (req, res) => {
    const lesson = await lessonFor(req.auth.sub, req.params.id);
    res.json({ success: true, ...(await answerCheckpoint(lesson, req.body || {})) });
  }));

  router.post('/lessons/:id/full-approach', asyncRoute(async (req, res) => {
    const lesson = await lessonFor(req.auth.sub, req.params.id);
    res.json({ success: true, beat: await fullApproach(lesson) });
  }));

  router.post('/lessons/:id/progress', asyncRoute(async (req, res) => {
    const lesson = await lessonFor(req.auth.sub, req.params.id);
    res.json({ success: true, progress: await saveProgress(lesson, req.body || {}) });
  }));

  router.post('/lessons/:id/beats/:n/report', asyncRoute(async (req, res) => {
    const lesson = await lessonFor(req.auth.sub, req.params.id);
    res.json({ success: true, ...(await reportBeat(lesson, req.params.n, { userId: req.auth.sub, note: req.body?.note })) });
  }));

  router.get('/lessons', asyncRoute(async (req, res) => {
    res.json({ success: true, lessons: await listLessons(req.auth.sub) });
  }));

  router.get('/lessons/:id', asyncRoute(async (req, res) => {
    const lesson = await lessonFor(req.auth.sub, req.params.id);
    res.json({ success: true, ...(await fullLesson(lesson)) });
  }));

  router.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err instanceof LeoError) return res.status(err.status).json({ success: false, code: err.code, error: err.message });
    console.error('[learn-leo]', err);
    return res.status(500).json({ success: false, error: 'Something went wrong with Learn with Leo. Please try again.' });
  });

  return router;
}

export default createLearnLeoRouter();
