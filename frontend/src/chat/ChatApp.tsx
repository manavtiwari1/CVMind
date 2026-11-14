import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowUp, Briefcase, FileSearch, FileText, Globe, Loader2, Mail, Map as MapIcon, Menu, MessageSquare, Paperclip,
  PenSquare, Plug, Square, Target, ThumbsDown, ThumbsUp, Trash2, X, Check, FolderOpen, Copy, RotateCcw
} from 'lucide-react';
import LeoReply from './LeoReply';
import LeoAvatar from './LeoAvatar';
import ResultCard, { type CardActions } from './cards';
import LiveBuild from './LiveBuild';
import LiveText, { LeoStatus } from './LiveText';
import ConnectorsPanel from './ConnectorsPanel';
import {
  attachResume, ChatError, deleteChat, getChat, getConnectors, listChats, saveBuilt, saveLetter, sendFeedback, streamAction, streamChat,
  type ActionRequest, type ChatMessage, type ChatSummary, type DocumentCard, type LeoFlow, type Resume, type StreamHandlers
} from './chatApi';
import type { SavedWork } from '../types/api';
import { readUser } from '../lib/currentUser';
import { siteOrigin } from '../lib/hosts';
import { BLACK_FRIDAY, isBhaiDooj, isBlackFriday } from '../lib/festive';
import './Chat.css';

// Bhai Dooj greeting on the welcome screen, until midnight IST on 11 Nov (lib/festive.ts)
const FESTIVE = isBhaiDooj();
// Black Friday week dressing on the welcome screen, 19–30 Nov 2026 IST (lib/festive.ts)
const BLACK_FRIDAY_ON = isBlackFriday();

// The ChatGPT-style home of app.cvmind.in: the user types what they want and Leo does it, showing
// each tool's result as a card in the thread. Signed-out visitors get a few free messages a day.

interface Props {
  setCurrentPage: (page: string) => void;
  isLoggedIn: boolean;
  onSignIn: () => void;
  // Opens a finished document in the resume editor
  openWork: (work: SavedWork) => void;
}

// A suggestion either sends right away or, ending in ': ', fills the box for the user to finish
const SUGGESTIONS = [
  { icon: FileSearch, title: 'Check my resume', hint: 'ATS score and fixes', prompt: "Check my resume's ATS score and tell me what to fix" },
  { icon: Target, title: 'Tailor to a job', hint: 'Paste a job description', prompt: 'Tailor my resume for this job: ' },
  { icon: Mail, title: 'Write a cover letter', hint: 'For any role', prompt: 'Write a cover letter for this job: ' },
  { icon: MessageSquare, title: 'Interview questions', hint: 'With what to say', prompt: 'Give me interview questions for a Software Engineer intern role' },
  { icon: Briefcase, title: 'Find jobs', hint: 'Real openings', prompt: 'Find React developer jobs in Bangalore' },
  { icon: MapIcon, title: 'Plan my career', hint: 'Step-by-step roadmap', prompt: 'Make me a 1-year roadmap to become a Data Analyst' },
  { icon: Globe, title: 'Build my portfolio website', hint: 'Leo asks what you want, builds it, and you publish your own link', prompt: 'Build my portfolio website', wide: true },
];

const GUEST_KEY = 'cvmind_leo_guest';
const MAX_FILE_BYTES = 5 * 1024 * 1024;
let idSeq = 0;
const newId = () => `m${Date.now().toString(36)}${(idSeq++).toString(36)}`;

function readGuest(): { messages: ChatMessage[]; resume: Resume | null; flow: LeoFlow | null } {
  try {
    const saved = JSON.parse(sessionStorage.getItem(GUEST_KEY) || 'null');
    if (saved && Array.isArray(saved.messages)) return { messages: saved.messages.map((m: ChatMessage) => ({ ...m, streaming: false, fresh: false })), resume: saved.resume || null, flow: saved.flow || null };
  } catch { /* storage blocked or bad JSON */ }
  return { messages: [], resume: null, flow: null };
}

// A guest's chat, resume and flow draft live in this tab only, never on the server
function writeGuest(messages: ChatMessage[], resume: Resume | null, flow: LeoFlow | null) {
  try { sessionStorage.setItem(GUEST_KEY, JSON.stringify({ messages: messages.slice(-30), resume, flow })); } catch { /* storage full or blocked */ }
}

const FLOW_NAMES: Record<string, string> = { resume: 'resume' };

// Copies a reply's text; shows a tick for a moment
function CopyReply({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  if (!text) return null;
  return (
    <button
      type="button"
      aria-label="Copy reply"
      title="Copy"
      onClick={() => navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1400); }).catch(() => {})}
    >
      {done ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function ChatApp({ setCurrentPage, isLoggedIn, onSignIn, openWork }: Props) {
  const user = isLoggedIn ? readUser() : null;
  const firstName = (user?.name || '').trim().split(/\s+/)[0];

  const [messages, setMessages] = useState<ChatMessage[]>(() => (isLoggedIn ? [] : readGuest().messages));
  const [conversationId, setConversationId] = useState<string | null>(null);
  // text is '' when the resume is saved with a signed-in chat on the server
  const [resume, setResume] = useState<Resume | null>(() => (isLoggedIn ? null : readGuest().resume));
  // Signed-in only: the server should save a new attachment (or forget a removed one) with the next message
  const resumeDirty = useRef(false);
  const [attaching, setAttaching] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [drawer, setDrawer] = useState(false);
  // The guided flow open in this chat (e.g. a resume being built step by step)
  const [flow, setFlow] = useState<LeoFlow | null>(() => (isLoggedIn ? null : readGuest().flow));
  // A guest's draft goes with the first message after signing in, so it isn't lost
  const carryFlow = useRef(false);
  // A reopened chat with an unfinished flow offers to continue it
  const [resumeOffer, setResumeOffer] = useState(false);
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const [connectedCount, setConnectedCount] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const retryRef = useRef<string>('');
  const startedRef = useRef(false);

  const refreshChats = useCallback(() => {
    if (!isLoggedIn) return;
    listChats().then(setChats).catch(() => {});
  }, [isLoggedIn]);

  useEffect(() => { refreshChats(); }, [refreshChats]);

  useEffect(() => {
    if (!isLoggedIn) { setConnectedCount(null); return; }
    getConnectors().then((list) => setConnectedCount(list.filter((c) => c.connected).length)).catch(() => setConnectedCount(null));
  }, [isLoggedIn]);

  // Signing in (or out) starts a fresh chat; an attached resume carries over
  const wasLoggedIn = useRef(isLoggedIn);
  useEffect(() => {
    if (wasLoggedIn.current === isLoggedIn) return;
    wasLoggedIn.current = isLoggedIn;
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setRemaining(null);
    setNotice('');
    if (isLoggedIn) {
      try { sessionStorage.removeItem(GUEST_KEY); } catch { /* blocked */ }
      resumeDirty.current = !!resume?.text;
      // The guest's unfinished draft carries over (offered as "Continue your resume")
      carryFlow.current = !!flow;
    } else {
      setFlow(null);
      carryFlow.current = false;
    }
  }, [isLoggedIn, resume, flow]);

  useEffect(() => {
    if (!isLoggedIn) writeGuest(messages.filter((m) => !m.streaming), resume, flow);
  }, [isLoggedIn, messages, resume, flow]);

  // Keep the newest message in view while Leo writes, unless the user scrolled up to read
  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 160) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Grow the box with its text, up to a limit
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    box.style.height = 'auto';
    box.style.height = `${Math.min(box.scrollHeight, 200)}px`;
  }, [input]);

  const patch = (id: string, fn: (m: ChatMessage) => ChatMessage) =>
    setMessages((list) => list.map((m) => (m.id === id ? fn(m) : m)));

  // Sends a message, or a card tap (action), and streams Leo's reply into the thread. A tap shows
  // its label as the user's message.
  const run = useCallback(async (text: string, opts: { withResume?: Resume | null; action?: ActionRequest['action']; value?: Record<string, string> } = {}) => {
    if (!text || sending) return;
    const current = opts.withResume === undefined ? resume : opts.withResume;
    setInput('');
    setNotice('');
    setSending(true);
    setResumeOffer(false);

    const userMsg: ChatMessage = { id: newId(), role: 'user', text, cards: [], tools: [], attachment: opts.action ? undefined : current?.name || undefined };
    const leoMsg: ChatMessage = { id: newId(), role: 'leo', text: '', cards: [], tools: [], streaming: true, fresh: true };
    const prior = messages;
    setMessages((list) => [...list, userMsg, leoMsg]);
    requestAnimationFrame(() => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; });

    const base = isLoggedIn
      ? {
          conversationId,
          ...(resumeDirty.current ? { resume: current?.text ? current : null } : {}),
          ...(carryFlow.current && flow ? { flow } : {}),
        }
      : {
          history: prior.filter((m) => !m.error && (m.text || m.lead || m.role === 'user')).slice(-16).map((m) => ({
            role: m.role === 'user' ? 'user' as const : 'assistant' as const,
            content: [m.lead, m.text].filter(Boolean).join('\n\n'),
          })),
          ...(current?.text ? { resume: current } : {}),
          ...(flow ? { flow } : {}),
        };

    const controller = new AbortController();
    abortRef.current = controller;
    let newConversation = false;
    try {
      const handlers: StreamHandlers = {
        onMeta: (meta) => {
          if (meta.conversationId && meta.conversationId !== conversationId) {
            newConversation = !conversationId;
            setConversationId(meta.conversationId);
          }
          if (meta.guest) setRemaining(meta.remaining);
        },
        onDelta: (delta) => patch(leoMsg.id, (m) => ({ ...m, text: m.text + delta })),
        // Words written before the first tool move above its card; the follow-up goes below
        onTool: (tool) => patch(leoMsg.id, (m) => ({
          ...m,
          ...(m.tools.length === 0 && m.text ? { lead: m.text, text: '' } : {}),
          tools: [...m.tools, { id: tool.id, name: tool.name, label: tool.label, done: false }],
        })),
        onProgress: ({ id, stage, html, text, reset }) => patch(leoMsg.id, (m) => ({
          ...m,
          tools: m.tools.map((t) => {
            if (t.id !== id) return t;
            const live = t.live || { stage: '', html: '', text: '' };
            return { ...t, live: { stage: stage || live.stage, html: reset ? '' : live.html + (html || ''), text: live.text + (text || '') } };
          }),
        })),
        // The finished card replaces the live view, so the page text can go
        onCard: ({ id, card }) => patch(leoMsg.id, (m) => ({
          ...m,
          tools: m.tools.map((t) => (t.id === id ? { ...t, done: true, live: undefined, finishedLive: !!t.live } : t)),
          cards: [...m.cards, card],
        })),
        onFlow: (next) => {
          setFlow(next);
          carryFlow.current = false;
        },
        onDone: (done) => patch(leoMsg.id, (m) => ({ ...m, turnId: done.turnId, streaming: false, tools: m.tools.map((t) => ({ ...t, done: true })) })),
      };
      if (opts.action) await streamAction({ ...base, action: opts.action, value: opts.value }, handlers, controller.signal);
      else await streamChat({ ...base, message: text }, handlers, controller.signal);
      resumeDirty.current = false;
      if (newConversation) refreshChats();
    } catch (err) {
      const aborted = (err as Error)?.name === 'AbortError';
      const code = err instanceof ChatError ? err.code : '';
      if (code === 'LEO_SIGNIN') setRemaining(0);
      patch(leoMsg.id, (m) => ({
        ...m,
        streaming: false,
        tools: m.tools.map((t) => ({ ...t, done: true })),
        // Out of free messages: the sign-in card below says it, so no second (red) copy of the same text
        error: aborted || code === 'LEO_SIGNIN' ? undefined : (err as Error).message || 'Something went wrong. Please try again.',
        cards: code === 'LEO_SIGNIN' ? [...m.cards, { type: 'locked', action: 'signin', message: 'Sign in to keep chatting with Leo. It\'s free, and your chats are saved.' }] : m.cards,
      }));
    } finally {
      abortRef.current = null;
      setSending(false);
    }
  }, [sending, resume, messages, isLoggedIn, conversationId, refreshChats, flow]);

  const send = useCallback((raw: string, withResume?: Resume | null) => run(raw.trim(), { withResume }), [run]);

  // A prompt handed over from the www home page (?q=...) is sent once on arrival
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (!q) return;
    params.delete('q');
    const rest = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`);
    if (q.trim().endsWith(':')) setInput(`${q.trim()} `);
    else void send(q.slice(0, 4000));
  }, [send]);

  const pickFile = () => fileRef.current?.click();

  const onFile = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setNotice('That file is over 5 MB. Please attach a smaller PDF or DOCX.');
      return;
    }
    setAttaching(true);
    setNotice('');
    try {
      const read = await attachResume(file);
      setResume(read);
      resumeDirty.current = true;
      // The user was asked to attach a resume: ask again now that it's here
      const retry = retryRef.current;
      retryRef.current = '';
      if (retry) void send(retry, read);
    } catch (err) {
      setNotice((err as Error).message || "We couldn't read that file.");
    } finally {
      setAttaching(false);
    }
  };

  const removeResume = () => {
    setResume(null);
    resumeDirty.current = isLoggedIn;
  };

  const newChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setNotice('');
    setFlow(null);
    carryFlow.current = false;
    setResumeOffer(false);
    // A resume saved only on the old chat can't come along; one read in this session can
    if (resume && !resume.text) setResume(null);
    resumeDirty.current = isLoggedIn && !!resume?.text;
    setDrawer(false);
    requestAnimationFrame(() => boxRef.current?.focus());
  };

  const openChat = async (id: string) => {
    if (id === conversationId) { setDrawer(false); return; }
    abortRef.current?.abort();
    setDrawer(false);
    try {
      const chat = await getChat(id);
      setConversationId(chat.id);
      setResume(chat.resumeName ? { name: chat.resumeName, text: '' } : null);
      resumeDirty.current = false;
      setFlow(chat.flow);
      carryFlow.current = false;
      setResumeOffer(!!chat.flow && chat.flow.step !== 'built');
      setMessages(chat.turns.flatMap((t) => [
        { id: `${t.id}u`, role: 'user' as const, text: t.prompt, cards: [], tools: [] },
        { id: t.id, role: 'leo' as const, text: t.reply, cards: t.cards, tools: [], turnId: t.id, feedback: t.feedback },
      ]));
      requestAnimationFrame(() => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; });
    } catch (err) {
      setNotice((err as Error).message);
    }
  };

  const removeChat = async (id: string) => {
    if (!window.confirm('Delete this chat? This can\'t be undone.')) return;
    try {
      await deleteChat(id);
      setChats((list) => list.filter((c) => c.id !== id));
      if (id === conversationId) newChat();
    } catch (err) {
      setNotice((err as Error).message);
    }
  };

  const rate = (m: ChatMessage, value: 'up' | 'down') => {
    if (!m.turnId) return;
    const next = m.feedback === value ? null : value;
    patch(m.id, (x) => ({ ...x, feedback: next }));
    sendFeedback(m.turnId, next).catch(() => patch(m.id, (x) => ({ ...x, feedback: m.feedback })));
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(input);
    }
  };

  const pickSuggestion = (prompt: string) => {
    if (prompt.endsWith(': ')) {
      setInput(prompt);
      requestAnimationFrame(() => {
        const box = boxRef.current;
        if (box) { box.focus(); box.setSelectionRange(prompt.length, prompt.length); }
      });
    } else {
      void send(prompt);
    }
  };

  const lastUserText = () => [...messages].reverse().find((m) => m.role === 'user')?.text || '';

  const actions: CardActions = {
    go: (page) => setCurrentPage(page),
    signIn: onSignIn,
    attach: () => { retryRef.current = lastUserText(); pickFile(); },
    followUp: (prompt) => void send(prompt),
    isLoggedIn,
    tap: (action, value, label) => void run(label, { action, value }),
    compose: (text) => {
      setInput(text);
      requestAnimationFrame(() => {
        const box = boxRef.current;
        if (box) { box.focus(); box.setSelectionRange(text.length, text.length); }
      });
    },
    // "I have an old resume": once attached, Leo fills the draft from it
    attachForFlow: () => { retryRef.current = 'Here is my old resume. Use it to fill my resume.'; pickFile(); },
    openWork,
    built: (card: DocumentCard, html, workId) => {
      setMessages((list) => list.map((m) => (m.cards.some((c) => c.type === 'document' && c.id === card.id)
        ? { ...m, cards: m.cards.map((c) => (c.type === 'document' && c.id === card.id ? { ...c, html, workId } : c)) }
        : m)));
      if (conversationId) saveBuilt(conversationId, card.id, html, workId, card.templateId).catch(() => {});
    },
    // A portfolio saved on the second try: remembered with the card, so a reopened chat can publish it
    portfolioSaved: (card, workId) => {
      if (conversationId) saveBuilt(conversationId, card.id, card.html, workId).catch(() => {});
    },
    connectorsChanged: setConnectedCount,
    retryLast: () => { void Promise.resolve().then(() => send(lastUserText())); },
    letterSaved: (card, text, html, designId, workId) => {
      if (conversationId && card.id) saveLetter(conversationId, card.id, text, html, designId, workId).catch(() => {});
    },
    latestPortfolioId: messages.flatMap((m) => m.cards).reduce<string | undefined>((id, c) => (c.type === 'portfolio' ? c.id : id), undefined),
  };

  const openFlow = flow && flow.step !== 'built' ? flow : null;
  const showContinue = !!openFlow && !sending && (messages.length === 0 || resumeOffer);
  const continueChip = showContinue && openFlow && (
    <button type="button" className="lx-continue" onClick={() => void send(`Continue my ${FLOW_NAMES[openFlow.product] || 'draft'}`)}>
      <FileText size={15} />
      <span>Continue your {FLOW_NAMES[openFlow.product] || 'draft'}{openFlow.missing.length ? ` · ${openFlow.missing.length} detail${openFlow.missing.length === 1 ? '' : 's'} left` : ''}</span>
    </button>
  );

  const lastLeoId = [...messages].reverse().find((m) => m.role === 'leo')?.id;
  const empty = messages.length === 0;
  const outOfFree = !isLoggedIn && remaining === 0;

  const composer = (
    <div className="lx-composer-wrap">
      {continueChip}
      {notice &&<div className="lx-notice" role="alert">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss"><X size={14} /></button></div>}
      <form
        className={`lx-composer ${outOfFree ? 'is-disabled' : ''}`}
        onSubmit={(e) => { e.preventDefault(); void send(input); }}
      >
        {(resume || attaching) && (
          <div className="lx-attachment">
            {attaching ? <Loader2 size={15} className="lx-spin" /> : <FileText size={15} />}
            <span>{attaching ? 'Reading your resume…' : resume?.name || 'Resume'}</span>
            {!attaching && <button type="button" onClick={removeResume} aria-label="Remove attached resume"><X size={14} /></button>}
          </div>
        )}
        <textarea
          ref={boxRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          rows={1}
          maxLength={4000}
          placeholder={outOfFree ? 'Sign in to keep chatting with Leo' : empty ? 'Ask Leo anything about your career…' : 'Reply to Leo…'}
          aria-label="Message Leo"
          disabled={outOfFree}
        />
        <div className="lx-composer-row">
          <button type="button" className="lx-icon-btn" onClick={pickFile} disabled={attaching || outOfFree} aria-label="Attach resume" title="Attach resume (PDF, DOCX or TXT)">
            <Paperclip size={18} />
            <span className="lx-attach-label">{resume ? 'Replace resume' : 'Attach resume'}</span>
          </button>
          {isLoggedIn && connectedCount !== null && (
            <button type="button" className="lx-icon-btn" onClick={() => setConnectorsOpen(true)} aria-label="Connectors" title="Connectors">
              <Plug size={18} />
              <span className="lx-attach-label">{connectedCount ? `${connectedCount} connected` : 'Connect tools'}</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
          {sending ? (
            <button type="button" className="lx-send" onClick={() => abortRef.current?.abort()} aria-label="Stop Leo"><Square size={14} fill="currentColor" /></button>
          ) : outOfFree ? (
            <button type="button" className="lx-send lx-send-wide" onClick={onSignIn}>Sign in free</button>
          ) : (
            <button type="submit" className="lx-send" disabled={!input.trim()} aria-label="Send"><ArrowUp size={18} /></button>
          )}
        </div>
      </form>
      <p className="lx-fineprint">
        {!isLoggedIn && remaining !== null && remaining > 0
          ? `${remaining} free message${remaining === 1 ? '' : 's'} left today. Sign in to save your chats.`
          : 'Leo can make mistakes. Check important details.'}
      </p>
    </div>
  );

  // Rendered straight into .app-container, outside .main-content: that wrapper has a CSS
  // perspective, which would trap this fixed full-screen layer inside the page column. Staying in
  // .app-container keeps it in the same layer as the sign-in modal (z 100), which opens above it.
  return createPortal(
    <div className="lx-app">
      <aside className={`lx-side ${drawer ? 'is-open' : ''}`} aria-label="Chats">
        <div className="lx-side-top">
          {/* Same wordmark as the site header */}
          <a className="lx-brand" href={`${siteOrigin()}/`} aria-label="CVMind home">
            <span className="cv-wordmark" aria-hidden="true">
              <span className="cv-wordmark-cv">CV</span>
              <span className="cv-wordmark-mind">Mind</span>
              <i className="cv-wordmark-dot" />
            </span>
          </a>
          <button type="button" className="lx-icon-btn lx-side-close" onClick={() => setDrawer(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <button type="button" className="lx-new" onClick={newChat}><PenSquare size={16} /> New chat</button>
        <nav className="lx-side-links">
          <button type="button" onClick={() => setCurrentPage(isLoggedIn ? 'my-documents' : 'resume-builder')}><FolderOpen size={16} /> {isLoggedIn ? 'My Documents' : 'Resume Builder'}</button>
          <button type="button" onClick={() => { setDrawer(false); setConnectorsOpen(true); }}><Plug size={16} /> Connectors{connectedCount ? <span className="lk-count">{connectedCount}</span> : null}</button>
        </nav>
        <div className="lx-history">
          {isLoggedIn ? (
            <>
              {chats.length > 0 && <div className="lx-history-label">Recent</div>}
              {chats.map((c) => (
                <div key={c.id} className={`lx-history-item ${c.id === conversationId ? 'is-active' : ''}`}>
                  <button type="button" className="lx-history-open" onClick={() => void openChat(c.id)} title={c.title}>{c.title}</button>
                  <button type="button" className="lx-history-del" onClick={() => void removeChat(c.id)} aria-label={`Delete chat: ${c.title}`}><Trash2 size={14} /></button>
                </div>
              ))}
            </>
          ) : (
            <div className="lx-guest-box">
              <p>Sign in to save your chats and get more messages every day.</p>
              <button type="button" className="lx-new" onClick={onSignIn}>Sign in free</button>
            </div>
          )}
        </div>
        {isLoggedIn && (
          <button type="button" className="lx-me" onClick={() => setCurrentPage('account')}>
            <span className="lx-avatar" aria-hidden="true">{(firstName || user?.email || '?').charAt(0).toUpperCase()}</span>
            <span className="lx-me-name">{user?.name || user?.email}</span>
          </button>
        )}
      </aside>
      {drawer && <button type="button" className="lx-scrim" onClick={() => setDrawer(false)} aria-label="Close menu" />}

      <main className="lx-main">
        <header className="lx-top">
          <button type="button" className="lx-icon-btn lx-menu" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu size={20} /></button>
          <span className="lx-top-title">Leo <small>by CVMind</small></span>
          <span className="lx-top-right">
            {!empty && <button type="button" className="lx-icon-btn" onClick={newChat} aria-label="New chat" title="New chat"><PenSquare size={18} /></button>}
            {!isLoggedIn && <button type="button" className="lx-signin" onClick={onSignIn}>Sign in</button>}
          </span>
        </header>

        {empty ? (
          <div className={`lx-welcome${BLACK_FRIDAY_ON ? ' is-bf' : ''}`}>
            {BLACK_FRIDAY_ON && (
              <a className="lx-bf" href={`${siteOrigin()}/pricing`}>
                <span className="lx-bf-tag">Black Friday</span>
                <span className="lx-bf-text"><b>{BLACK_FRIDAY.percent}% off</b> Pro with code <code>{BLACK_FRIDAY.code}</code></span>
                <span className="lx-bf-go" aria-hidden="true">→</span>
              </a>
            )}
            <div className="lx-hero-leo">
              {BLACK_FRIDAY_ON && <span className="lx-bf-badge" aria-hidden="true">50%<small>OFF</small></span>}
              <LeoAvatar mood={sending ? 'thinking' : 'idle'} size={112} />
            </div>
            <h1>{FESTIVE ? 'Happy Bhai Dooj' : greeting()}{firstName ? `, ${firstName}` : ''}</h1>
            <p className="lx-welcome-sub">{FESTIVE ? 'Bhai Dooj ki shubhkamnayein! What do you want to do today?' : 'What do you want to do today?'}</p>
            {composer}
            <div className="lx-suggest">
              {SUGGESTIONS.map((s) => (
                <button key={s.title} type="button" className={'wide' in s ? 'lx-suggest-wide' : undefined} onClick={() => pickSuggestion(s.prompt)}>
                  <s.icon size={18} />
                  <span><strong>{s.title}</strong><small>{s.hint}</small></span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="lx-thread" ref={threadRef}>
              <div className="lx-thread-inner">
                {messages.map((m) => (m.role === 'user' ? (
                  <div key={m.id} className="lx-msg lx-user">
                    {m.attachment && <div className="lx-msg-file"><FileText size={13} /> {m.attachment}</div>}
                    <div className="lx-bubble">{m.text}</div>
                  </div>
                ) : (
                  <div key={m.id} className="lx-msg lx-leo">
                    <LeoAvatar mood={m.streaming ? (m.text ? 'typing' : 'thinking') : 'still'} size={32} />
                    <div className="lx-leo-body">
                      {m.lead && <div className="lx-reply"><LeoReply text={m.lead} /></div>}
                      {m.tools.map((t) => {
                        // A finished step's result is its card; only a website build keeps a line
                        if (t.done) return t.finishedLive ? <div key={t.id} className="lx-tool is-done"><Check size={14} /> {t.name === 'edit_portfolio' ? 'Changes made' : 'Your website is ready'}</div> : null;
                        if (t.live?.text) return <LiveText key={t.id} label={t.label} text={t.live.text} />;
                        if (t.live) return <LiveBuild key={t.id} live={t.live} edit={t.name === 'edit_portfolio'} />;
                        return <LeoStatus key={t.id} label={t.label} />;
                      })}
                      {m.cards.map((card, i) => (
                        <ResultCard key={i} card={card} actions={actions} live={m.id === lastLeoId} fresh={!!m.fresh} busy={sending || outOfFree} />
                      ))}
                      {m.text && <div className={`lx-reply ${m.streaming ? 'is-streaming' : ''}`}><LeoReply text={m.text} /></div>}
                      {m.streaming && !m.text && !m.tools.some((t) => !t.done) && <LeoStatus label="Leo is thinking" />}
                      {m.error && <div className="lx-error">{m.error}</div>}
                      {!m.streaming && (m.text || m.lead || m.cards.length > 0) && (
                        <div className="lx-msg-tools">
                          <CopyReply text={[m.lead, m.text].filter(Boolean).join('\n\n')} />
                          {m.id === lastLeoId && !sending && !outOfFree && (
                            <button type="button" onClick={() => void send(lastUserText())} aria-label="Ask again" title="Ask again"><RotateCcw size={14} /></button>
                          )}
                          {m.turnId && <>
                          <button type="button" className={m.feedback === 'up' ? 'is-on' : ''} onClick={() => rate(m, 'up')} aria-label="Good reply"><ThumbsUp size={14} /></button>
                          <button type="button" className={m.feedback === 'down' ? 'is-on' : ''} onClick={() => rate(m, 'down')} aria-label="Bad reply"><ThumbsDown size={14} /></button>
                          </>}
                        </div>
                      )}
                    </div>
                  </div>
                )))}
              </div>
            </div>
            {composer}
          </>
        )}
      </main>
      {connectorsOpen && <ConnectorsPanel isLoggedIn={isLoggedIn} onSignIn={() => { setConnectorsOpen(false); onSignIn(); }} onClose={() => setConnectorsOpen(false)} onChange={setConnectedCount} />}
    </div>
  , document.querySelector('.app-container') ?? document.body);
}
