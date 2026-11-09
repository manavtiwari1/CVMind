import express from 'express';
import mongoose from 'mongoose';
import { optionalUser, requireUser } from '../services/authToken.js';
import { getSettings } from '../admin/settings.js';
import { dbReady } from '../admin/auth.js';
import { handle, httpError } from '../admin/util.js';
import { hitLimit, clientIp, DAY_MS } from '../services/limiter.js';
import { findUserById, isUserPaid } from '../db.js';
import { LeoConversation, LeoMission, LeoTurn } from '../leo/models.js';
import { openConversation, runTurn, MAX_MESSAGE_CHARS, MAX_RESUME_CHARS } from '../leo/service.js';
import { applyAction, logFlowEvent, normalizeFlow, publicFlow } from '../leo/flows/index.js';
import { approveStep, continueMission, getMission, publicMission, startMission, stopMission } from '../leo/missions/index.js';
import { launchMission, listenToMission } from '../leo/missions/worker.js';
import { deleteProfile, getProfile, publicProfile, replaceProfile, saveMasterResume } from '../leo/careerProfile.js';
import { looksLikeLinkedInExport } from '../leo/careerTools.js';
import { cancelReminder } from '../leo/reminders.js';
import { connect, connectorsView, disconnect, getConnected, isConnectorId, setConnected } from '../leo/connectors.js';

// Leo chat, the ChatGPT-style home of app.cvmind.in. Mounted at /api/leo-chat; the 'leo-chat'
// feature switch turns it off (admin/settings.js). Signed-out visitors get a few messages a day
// (counted per IP, nothing saved); signed-in chats are saved and listed in the sidebar.

const clip = (value, max) => String(value ?? '').trim().slice(0, max);

// { name, text } from the request body, or null
const readResume = (value) => {
  const text = clip(value?.text, MAX_RESUME_CHARS);
  return text.length >= 50 ? { name: clip(value?.name, 120), text } : null;
};

// Opens a server-sent event stream. abort fires when the browser goes away.
function openStream(res) {
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
  const abort = new AbortController();
  res.on('close', () => { if (!res.writableEnded) abort.abort(); });
  // Keeps proxies from closing a quiet connection while a tool runs
  const heartbeat = setInterval(() => { if (!res.writableEnded) res.write(': ping\n\n'); }, 15000);
  return { send, signal: abort.signal, close: () => { clearInterval(heartbeat); res.end(); } };
}

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
      // A cover letter sends its edited words too, and has no html until a design is chosen
      const letter = value.letter && typeof value.letter === 'object' ? value.letter : null;
      if ((!html && !letter) || html.length > 300000) throw httpError(400, 'The resume is missing or too large.');
      const cardId = clip(value.cardId, 20);
      const conversationId = clip(req.body?.conversationId, 40);
      const update = { 'toolCalls.$.card.html': html, 'toolCalls.$.card.workId': clip(value.workId, 40), ...(value.templateId ? { 'toolCalls.$.card.templateId': clip(value.templateId, 60) } : {}) };
      if (letter) {
        Object.assign(update, {
          'toolCalls.$.card.name': clip(letter.name, 120),
          'toolCalls.$.card.greeting': clip(letter.greeting, 120),
          'toolCalls.$.card.paragraphs': (Array.isArray(letter.paragraphs) ? letter.paragraphs : []).map((p) => clip(p, 1500)).filter(Boolean).slice(0, 8),
          'toolCalls.$.card.closing': clip(letter.closing, 60),
          'toolCalls.$.card.designId': clip(value.designId, 40)
        });
      }
      // The turn is saved when the reply ends, which can be a moment after the card arrived
      for (let attempt = 0; attempt < 3; attempt++) {
        const result = await LeoTurn.updateOne({ conversationId, userId: req.auth.sub, deletedAt: null, 'toolCalls.card.id': cardId }, { $set: update });
        if (result.matchedCount) return res.json({ success: true });
        await new Promise((r) => setTimeout(r, 1000));
      }
      throw httpError(404, 'Reply not found.');
    }

    // Undo or a version button on a portfolio card; no model is needed to work out what was asked
    if (action === 'restore') {
      const cardId = clip(value.cardId, 30);
      return streamTurn(req, res, async () => ({
        message: cardId ? 'Go back to this version' : 'Undo the last change',
        preCalls: [{ name: 'restore_portfolio', arguments: { card_id: cardId } }]
      }), { viaButton: true });
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

    // Agent Mode: a newly attached resume becomes the master resume. Memory failing must never stop the chat.
    const agent = signedIn && features['leo-agent'] !== false;
    let profile = null;
    const notes = [];
    let connected = null;
    if (agent) {
      // Leaving this null (nothing enforced) beats losing the chat if the lookup fails
      connected = await getConnected(req.auth.sub).catch((err) => { console.error('[leo] connectors lookup failed:', err.message); return null; });
      try {
        const attached = readResume(req.body?.resume);
        // A LinkedIn PDF goes to the audit, and must not replace their resume
        if (attached && !looksLikeLinkedInExport(attached.text) && await saveMasterResume(req.auth.sub, attached)) {
          notes.push({ type: 'profile_note', message: `Saved ${attached.name || 'your resume'} to your Career Profile, so you won't need to attach it again.` });
        }
        profile = await getProfile(req.auth.sub);
      } catch (err) {
        console.error('[leo] career profile failed:', err.message);
      }
    }
    // Card taps are applied before anything streams, so a bad tap is a plain 400
    const ctx = { userId: conversation?.userId || 'guest', conversationId: conversation ? String(conversation._id) : 'guest', email: signedIn ? req.auth.email : null };
    const flowBefore = JSON.stringify(flow);
    const { message, preCalls } = await prepare(flow, ctx);

    // The signal stops paying for a reply nobody is reading
    const { send, signal, close } = openStream(res);

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
        signal,
        send,
        flows,
        flow,
        flowBefore,
        preCalls,
        viaButton,
        agent,
        profile,
        notes,
        connected
      });
    } finally {
      close();
    }
  }

  // Everything below is the signed-in sidebar: saved chats, feedback and deleting
  router.use(requireUser);
  router.use(async (req, res, next) => {
    if (await dbReady(2000)) return next();
    res.status(503).json({ success: false, code: 'LEO_UNAVAILABLE', error: 'Leo is not available right now.' });
  });

  // ── Agent Mode: missions and the Career Profile ───────────────────────────
  const missionId = (req) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, 'Mission not found.');
    return req.params.id;
  };

  // Runs a mission that claim() has just taken, and streams it to this browser. Leaving doesn't
  // stop a run, except on serverless hosts, which can't work after the response ends.
  const streamMission = (claim) => handle(async (req, res) => {
    const { leo } = await getSettings();
    const mission = await claim(req, leo);
    const { send, signal, close } = openStream(res);
    send('mission', { mission: publicMission(mission) });
    const stopListening = listenToMission(mission._id, send);
    const run = launchMission(mission, { signal: process.env.VERCEL ? signal : undefined });
    run.catch((err) => console.error('[leo] mission failed:', err.message));
    try {
      await Promise.race([run.catch(() => {}), new Promise((resolve) => { signal.addEventListener('abort', resolve, { once: true }); })]);
    } finally {
      stopListening();
      close();
    }
  });

  router.post('/missions/:id/start', streamMission((req, leo) => startMission({ id: missionId(req), userId: req.auth.sub, email: req.auth.email, leo, removeSteps: req.body?.removeSteps })));
  router.post('/missions/:id/continue', streamMission((req) => continueMission({ id: missionId(req), userId: req.auth.sub })));
  router.post('/missions/:id/approve', streamMission((req) => approveStep({ id: missionId(req), userId: req.auth.sub, stepId: req.body?.stepId, picks: req.body?.picks })));

  router.post('/missions/:id/stop', handle(async (req, res) => {
    res.json({ success: true, data: await stopMission({ id: missionId(req), userId: req.auth.sub }) });
  }));

  router.get('/missions/:id', handle(async (req, res) => {
    res.json({ success: true, data: await getMission(missionId(req), req.auth.sub) });
  }));

  // Reconnects to a mission that is running, e.g. after the chat was closed and opened again
  router.get('/missions/:id/stream', handle(async (req, res) => {
    const mission = await getMission(missionId(req), req.auth.sub);
    const { send, signal, close } = openStream(res);
    send('mission', { mission });
    if (mission.status !== 'running') {
      send('done', { status: mission.status });
      close();
      return;
    }
    await new Promise((resolve) => {
      const stopListening = listenToMission(req.params.id, (event, data) => {
        send(event, data);
        if (event === 'done') { stopListening(); resolve(); }
      });
      signal.addEventListener('abort', () => { stopListening(); resolve(); }, { once: true });
    });
    close();
  }));

  router.post('/reminders/:id/cancel', handle(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id) || !(await cancelReminder(req.auth.sub, req.params.id))) throw httpError(404, 'Reminder not found.');
    res.json({ success: true });
  }));

  // Makes a corrected or improved version the saved resume
  router.put('/profile/resume', handle(async (req, res) => {
    const resume = readResume(req.body?.resume);
    if (!resume) throw httpError(400, 'There is no resume text to save.');
    await saveMasterResume(req.auth.sub, resume);
    res.json({ success: true, data: publicProfile(await getProfile(req.auth.sub)) });
  }));

  router.get('/connectors', handle(async (req, res) => {
    res.json({ success: true, data: connectorsView(await getConnected(req.auth.sub)) });
  }));

  // Connect all
  router.put('/connectors', handle(async (req, res) => {
    const ids = Array.isArray(req.body?.connected) ? req.body.connected : [];
    if (!ids.every(isConnectorId)) throw httpError(400, 'Unknown connector.');
    res.json({ success: true, data: connectorsView(await setConnected(req.auth.sub, ids)) });
  }));

  router.post('/connectors/:id', handle(async (req, res) => {
    if (!isConnectorId(req.params.id)) throw httpError(400, 'Unknown connector.');
    res.json({ success: true, data: connectorsView(await connect(req.auth.sub, req.params.id)) });
  }));

  router.delete('/connectors/:id', handle(async (req, res) => {
    if (!isConnectorId(req.params.id)) throw httpError(400, 'Unknown connector.');
    res.json({ success: true, data: connectorsView(await disconnect(req.auth.sub, req.params.id)) });
  }));

  router.get('/profile', handle(async (req, res) => {
    res.json({ success: true, data: publicProfile(await getProfile(req.auth.sub)) });
  }));

  router.put('/profile', handle(async (req, res) => {
    res.json({ success: true, data: publicProfile(await replaceProfile(req.auth.sub, req.body?.data)) });
  }));

  router.delete('/profile', handle(async (req, res) => {
    await deleteProfile(req.auth.sub);
    res.json({ success: true });
  }));

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
    const missions = await LeoMission.find({ conversationId: req.params.id, userId: req.auth.sub }).select('_id').lean();
    await Promise.all([
      LeoConversation.updateOne({ _id: req.params.id }, { $set: { deletedAt: now, resumeText: '', resumeName: '', flow: null, mock: null } }),
      LeoTurn.updateMany({ conversationId: { $in: [req.params.id, ...missions.map((m) => `mission:${m._id}`)] }, deletedAt: null }, { $set: { deletedAt: now, prompt: '', reply: '', toolCalls: [] } }),
      LeoMission.deleteMany({ conversationId: req.params.id, userId: req.auth.sub })
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
      LeoConversation.updateMany({ userId: req.auth.sub, deletedAt: null }, { $set: { deletedAt: now, resumeText: '', resumeName: '', flow: null, mock: null } }),
      LeoTurn.updateMany({ userId: req.auth.sub, deletedAt: null }, { $set: { deletedAt: now, prompt: '', reply: '', toolCalls: [] } }),
      LeoMission.deleteMany({ userId: req.auth.sub })
    ]);
    res.json({ success: true, deleted: conversations.modifiedCount });
  }));

  return router;
}
