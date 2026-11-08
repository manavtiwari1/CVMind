import express from 'express';
import mongoose from 'mongoose';
import { optionalUser, requireUser } from '../services/authToken.js';
import { getSettings } from '../admin/settings.js';
import { dbReady } from '../admin/auth.js';
import { handle, httpError } from '../admin/util.js';
import { hitLimit, clientIp, DAY_MS } from '../services/limiter.js';
import { findUserById, isUserPaid } from '../db.js';
import { LeoConversation, LeoTurn } from '../leo/models.js';
import { openConversation, runTurn, MAX_MESSAGE_CHARS, MAX_RESUME_CHARS } from '../leo/service.js';
import { applyAction, logFlowEvent, normalizeFlow, publicFlow } from '../leo/flows/index.js';

// Leo chat, the ChatGPT-style home of app.cvmind.in. Mounted at /api/leo-chat; the 'leo-chat'
// feature switch turns it off (admin/settings.js). Signed-out visitors get a few messages a day
// (counted per IP, nothing saved); signed-in chats are saved and listed in the sidebar.

const clip = (value, max) => String(value ?? '').trim().slice(0, max);

// { name, text } from the request body, or null
const readResume = (value) => {
  const text = clip(value?.text, MAX_RESUME_CHARS);
  return text.length >= 50 ? { name: clip(value?.name, 120), text } : null;
};

export function createLeoChatRouter({ upload, extractResumeText }) {
  const router = express.Router();
  router.use(optionalUser);

  // Reads an attached resume (PDF, DOCX or TXT) to plain text. The browser keeps the text and sends it with messages.
  router.post('/attach', upload.single('resume'), handle(async (req, res) => {
    if (!req.file) throw httpError(400, 'Choose a PDF, DOCX or TXT file.');
    let text;
    try {
      text = await extractResumeText(req.file);
    } catch (err) {
      throw httpError(err.status || 400, err.message);
    }
    text = clip(text, MAX_RESUME_CHARS);
    if (text.length < 50) throw httpError(400, "We couldn't read text from that file. Try a PDF or DOCX with selectable text.");
    res.json({ success: true, name: clip(req.file.originalname, 120), text });
  }));

  // One chat turn, streamed as server-sent events: meta, then delta / tool / card / flow..., then done or error
  router.post('/chat', handle(async (req, res) => {
    const message = clip(req.body?.message, MAX_MESSAGE_CHARS);
    if (!message) throw httpError(400, 'Type a message for Leo.');
    await streamTurn(req, res, async () => ({ message, preCalls: [] }));
  }));

  // A tap on a guided-flow card (PRD: Leo Guided Flows). The tap changes the draft directly, then the
  // turn continues like a message, so it never depends on the model reading the tap right.
  //   choose { field, label } · confirm · template { templateId, name } — streamed like /chat
  //   built { cardId, html, workId } — the browser filled the template; kept with the card for reloads
  //   track { product, action }       — what the user did with a result (edit, pdf, word)
  router.post('/action', handle(async (req, res) => {
    const action = clip(req.body?.action, 20);
    const value = req.body?.value && typeof req.body.value === 'object' ? req.body.value : {};

    if (action === 'track') {
      const kind = ['edit', 'pdf', 'word'].includes(value.action) ? value.action : null;
      if (!kind) throw httpError(400, 'Unknown result action.');
      logFlowEvent({ userId: req.auth?.sub, email: req.auth?.email }, 'result_action', { product: clip(value.product, 30), value: kind });
      return res.json({ success: true });
    }

    if (action === 'built') {
      if (!req.auth) throw httpError(401, 'Please sign in again.');
      if (!(await dbReady(2000))) throw httpError(503, 'Leo is not available right now.');
      const html = String(value.html ?? '');
      if (!html || html.length > 300000) throw httpError(400, 'The resume is missing or too large.');
      const cardId = clip(value.cardId, 20);
      const conversationId = clip(req.body?.conversationId, 40);
      const update = { 'toolCalls.$.card.html': html, 'toolCalls.$.card.workId': clip(value.workId, 40) };
      // The turn is saved when the reply ends, which can be a moment after the card arrived
      for (let attempt = 0; attempt < 3; attempt++) {
        const result = await LeoTurn.updateOne({ conversationId, userId: req.auth.sub, deletedAt: null, 'toolCalls.card.id': cardId }, { $set: update });
        if (result.matchedCount) return res.json({ success: true });
        await new Promise((r) => setTimeout(r, 1000));
      }
      throw httpError(404, 'Reply not found.');
    }

    if (!['choose', 'confirm', 'template'].includes(action)) throw httpError(400, 'Unknown action.');
    await streamTurn(req, res, (flow, ctx) => applyAction(flow, { action, value }, ctx), { viaButton: true });
  }));

  // Shared by /chat and card taps: limits, conversation, resume and flow, then the streamed turn.
  // prepare(flow, ctx) returns { message, preCalls } and may change the flow.
  async function streamTurn(req, res, prepare, { viaButton = false } = {}) {
    const { leo, features } = await getSettings();
    const flows = features['leo-flows'] !== false;
    const signedIn = !!req.auth;
    if (signedIn && !(await dbReady(2000))) throw httpError(503, 'Leo is not available right now.');

    let user = null;
    let limit;
    let key;
    if (signedIn) {
      user = await findUserById(req.auth.sub);
      if (!user) throw httpError(401, 'Please sign in again.');
      limit = (await isUserPaid(user)) ? leo.proDailyMessages : leo.freeDailyMessages;
      key = `leo-chat:${req.auth.sub}`;
    } else {
      limit = leo.guestDailyMessages;
      key = `leo-chat-guest:${clientIp(req)}`;
    }
    const used = limit > 0 ? await hitLimit(key, limit, DAY_MS) : { ok: false, retryAfter: DAY_MS / 1000 };
    if (!used.ok) {
      return res.status(429).json(signedIn
        ? { success: false, code: 'LEO_LIMIT', retryAfter: used.retryAfter, error: `You've sent Leo ${limit} messages today. Leo will be back for you tomorrow.` }
        : { success: false, code: 'LEO_SIGNIN', error: 'Sign in to keep chatting with Leo. It\'s free, and your chats are saved.' });
    }

    let conversation = null;
    let resume = readResume(req.body?.resume);
    if (signedIn) {
      conversation = await openConversation({ userId: req.auth.sub, conversationId: req.body?.conversationId });
      if (resume) {
        await LeoConversation.updateOne({ _id: conversation._id }, { $set: { resumeName: resume.name, resumeText: resume.text } });
      } else if (req.body?.resume === null) {
        // The user removed the attachment
        await LeoConversation.updateOne({ _id: conversation._id }, { $set: { resumeName: '', resumeText: '' } });
      } else if (conversation.resumeText) {
        resume = { name: conversation.resumeName, text: conversation.resumeText };
      }
    }

    // The open flow: saved with a signed-in chat, kept in the browser by guests. A guest's draft
    // carries over into the first signed-in chat after they sign in.
    let flow = null;
    if (flows) {
      flow = normalizeFlow(conversation?.flow) || normalizeFlow(req.body?.flow);
    }
    // Card taps are applied before anything streams, so a bad tap is a plain 400
    const ctx = { userId: conversation?.userId || 'guest', conversationId: conversation ? String(conversation._id) : 'guest', email: signedIn ? req.auth.email : null };
    const flowBefore = JSON.stringify(flow);
    const { message, preCalls } = await prepare(flow, ctx);

    res.status(200).set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.flushHeaders();
    const send = (event, data) => {
      if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Stop paying for a reply nobody is reading
    const abort = new AbortController();
    res.on('close', () => { if (!res.writableEnded) abort.abort(); });
    // Keeps proxies from closing a quiet connection while a tool runs
    const heartbeat = setInterval(() => { if (!res.writableEnded) res.write(': ping\n\n'); }, 15000);

    send('meta', {
      conversationId: conversation ? String(conversation._id) : null,
      guest: !signedIn,
      remaining: Math.max(0, limit - used.count)
    });
    try {
      await runTurn({
        user,
        email: req.auth?.email || '',
        conversation,
        history: req.body?.history,
        message,
        resume,
        settings: leo,
        signal: abort.signal,
        send,
        flows,
        flow,
        flowBefore,
        preCalls,
        viaButton
      });
    } finally {
      clearInterval(heartbeat);
      res.end();
    }
  }

  // Everything below is the signed-in sidebar: saved chats, feedback and deleting
  router.use(requireUser);
  router.use(async (req, res, next) => {
    if (await dbReady(2000)) return next();
    res.status(503).json({ success: false, code: 'LEO_UNAVAILABLE', error: 'Leo is not available right now.' });
  });

  router.get('/conversations', handle(async (req, res) => {
    const rows = await LeoConversation.find({ userId: req.auth.sub, deletedAt: null, title: { $ne: '' } })
      .sort({ updatedAt: -1 }).limit(50).select('title updatedAt').lean();
    res.json({ success: true, data: rows.map((c) => ({ id: String(c._id), title: c.title, updatedAt: c.updatedAt })) });
  }));

  const ownConversation = async (req) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, 'Chat not found.');
    const conversation = await LeoConversation.findOne({ _id: req.params.id, userId: req.auth.sub, deletedAt: null }).lean();
    if (!conversation) throw httpError(404, 'Chat not found.');
    return conversation;
  };

  router.get('/conversations/:id', handle(async (req, res) => {
    const conversation = await ownConversation(req);
    const turns = await LeoTurn.find({ conversationId: req.params.id, deletedAt: null })
      .sort({ createdAt: 1 }).select('prompt reply toolCalls feedback createdAt').lean();
    res.json({
      success: true,
      data: {
        id: String(conversation._id),
        title: conversation.title,
        resumeName: conversation.resumeName || '',
        // An unfinished guided flow, so the chat can offer to continue it
        flow: publicFlow(normalizeFlow(conversation.flow)),
        turns: turns.map((t) => ({
          id: String(t._id),
          prompt: t.prompt,
          reply: t.reply,
          cards: (t.toolCalls || []).map((c) => c?.card).filter(Boolean),
          feedback: t.feedback,
          createdAt: t.createdAt
        }))
      }
    });
  }));

  router.delete('/conversations/:id', handle(async (req, res) => {
    await ownConversation(req);
    const now = new Date();
    await Promise.all([
      LeoConversation.updateOne({ _id: req.params.id }, { $set: { deletedAt: now, resumeText: '', resumeName: '', flow: null } }),
      LeoTurn.updateMany({ conversationId: req.params.id, deletedAt: null }, { $set: { deletedAt: now, prompt: '', reply: '', toolCalls: [] } })
    ]);
    res.json({ success: true });
  }));

  // Thumbs up or down on a reply; null clears it
  router.post('/turns/:id/feedback', handle(async (req, res) => {
    const value = req.body?.value;
    if (!['up', 'down', null].includes(value)) throw httpError(400, 'Feedback must be up, down or null.');
    if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, 'Reply not found.');
    const result = await LeoTurn.updateOne({ _id: req.params.id, userId: req.auth.sub, deletedAt: null }, { $set: { feedback: value } });
    if (!result.matchedCount) throw httpError(404, 'Reply not found.');
    res.json({ success: true });
  }));

  // Deletes all of the user's Leo chats (kept hidden, without their text, until the retention TTL removes them)
  router.delete('/history', handle(async (req, res) => {
    const now = new Date();
    const [conversations] = await Promise.all([
      LeoConversation.updateMany({ userId: req.auth.sub, deletedAt: null }, { $set: { deletedAt: now, resumeText: '', resumeName: '', flow: null } }),
      LeoTurn.updateMany({ userId: req.auth.sub, deletedAt: null }, { $set: { deletedAt: now, prompt: '', reply: '', toolCalls: [] } })
    ]);
    res.json({ success: true, deleted: conversations.modifiedCount });
  }));

  return router;
}
