import express from 'express';
import { requireAdmin, requireDb } from '../auth.js';
import { audit } from '../audit.js';
import { AdminUser, Ticket, TICKET_STATUSES, TICKET_PRIORITIES } from '../models.js';
import { importLegacyContacts } from '../tickets.js';
import { inboxConfig, inboxState, syncInbox } from '../inbox.js';
import { renderEmail, sendEmail, emailConfigured, SUPPORT_EMAIL } from '../mailer.js';
import { model, clean, handle, httpError, isId, paging, escapeRegex, dateRange } from '../util.js';

const router = express.Router();
router.use(requireDb);

export function ticketFilter(query, admin) {
  const filter = { ...dateRange(query) };
  if (query.status === 'unresolved') filter.status = { $ne: 'resolved' };
  else if (TICKET_STATUSES.includes(query.status)) filter.status = query.status;
  if (TICKET_PRIORITIES.includes(query.priority)) filter.priority = query.priority;
  if (query.assignee === 'me' && admin) filter.assigneeId = admin.id;
  else if (query.assignee === 'none') filter.assigneeId = '';
  else if (query.assignee) filter.assigneeId = clean(query.assignee, 40);
  if (query.q) {
    const q = clean(query.q, 80);
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ email: rx }, { name: rx }, { subject: rx }, { 'messages.body': rx }];
    if (/^#?\d+$/.test(q)) filter.$or.push({ number: Number(q.replace('#', '')) });
  }
  return filter;
}

// senderVerified: the ticket's email belongs to an account with a verified address.
// Inbox tickets can come from anyone, so the admin panel tags the rest as unverified senders.
const summary = (t, verifiedEmails = new Set()) => ({
  id: String(t._id),
  number: t.number,
  name: t.name,
  email: t.email,
  subject: t.subject,
  status: t.status,
  priority: t.priority,
  source: t.source || 'form',
  senderVerified: verifiedEmails.has(String(t.email || '').toLowerCase()),
  assigneeId: t.assigneeId,
  assigneeName: t.assigneeName,
  messageCount: (t.messages || []).length,
  preview: String([...(t.messages || [])].reverse().find((m) => m.kind === 'customer')?.body || '').slice(0, 160),
  lastActivityAt: t.updatedAt,
  createdAt: t.createdAt
});

// Opening Support pulls new inbox mail first (at most once a minute), so serverless hosts stay current too
const INBOX_FRESH_MS = 60 * 1000;
async function refreshInbox() {
  if (!inboxConfig().configured) return;
  const state = await inboxState();
  if (state.lastSyncAt && Date.now() - new Date(state.lastSyncAt).getTime() < INBOX_FRESH_MS) return;
  // Don't hold the list for a slow mailbox; the sync finishes in the background
  await Promise.race([syncInbox({ reason: 'support-page' }), new Promise((resolve) => setTimeout(resolve, 8000))]);
}

async function inboxStatus() {
  const config = inboxConfig();
  const state = config.configured ? await inboxState() : {};
  return {
    configured: config.configured,
    address: config.user,
    lastSyncAt: state.lastSyncAt || null,
    lastError: state.lastError || '',
    lastErrorAt: state.lastErrorAt || null,
    lastCounts: state.lastCounts || null
  };
}

router.get('/inbox', requireAdmin('tickets.view'), handle(async (req, res) => {
  res.json({ success: true, data: await inboxStatus() });
}));

router.post('/inbox/sync', requireAdmin('tickets.manage'), handle(async (req, res) => {
  const result = await syncInbox({ reason: 'manual' });
  if (result.ok) await audit(req, 'inbox.synced', { targetType: 'inbox', targetId: inboxConfig().user, targetLabel: inboxConfig().user, details: { created: result.created, added: result.added } });
  res.status(result.ok || !result.configured ? 200 : 502).json({ success: result.ok, data: { ...result, status: await inboxStatus() }, error: result.error });
}));

router.get('/', requireAdmin('tickets.view'), handle(async (req, res) => {
  await importLegacyContacts();
  await refreshInbox().catch((err) => console.error('[inbox] refresh failed:', err.message));
  const { page, limit, skip } = paging(req.query);
  const filter = ticketFilter(req.query, req.admin);
  const [rows, total, counts] = await Promise.all([
    Ticket.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Ticket.countDocuments(filter),
    Ticket.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
  ]);
  const verified = await model('User').find({ email: { $in: rows.map((t) => t.email) }, emailVerified: true }).select('email').lean();
  const verifiedEmails = new Set(verified.map((u) => u.email));
  res.json({ success: true, total, page, limit, data: rows.map((t) => summary(t, verifiedEmails)), counts: Object.fromEntries(counts.map((c) => [c._id, c.count])) });
}));

router.get('/assignees', requireAdmin('tickets.view'), handle(async (req, res) => {
  const admins = await AdminUser.find({ active: true }).select('username name role').lean();
  res.json({ success: true, data: admins.map((a) => ({ id: String(a._id), name: a.name || a.username, role: a.role })) });
}));

async function loadTicket(id) {
  if (!isId(id)) throw httpError(404, 'Ticket not found.');
  const ticket = await Ticket.findById(id);
  if (!ticket) throw httpError(404, 'Ticket not found.');
  return ticket;
}

const detail = async (t) => {
  const user = await model('User').findOne({ email: t.email }).select('name status createdAt emailVerified riskScore riskFlags').lean();
  return {
    ...summary(t, new Set(user?.emailVerified ? [String(t.email).toLowerCase()] : [])),
    messages: t.messages.map((m) => ({ id: String(m._id), kind: m.kind, authorName: m.authorName, body: m.body, emailed: m.emailed, attachments: m.attachments || 0, viaEmail: !!m.messageId, createdAt: m.createdAt })),
    resolvedAt: t.resolvedAt,
    user: user ? { id: String(user._id), name: user.name, status: user.status || 'active', createdAt: user.createdAt, emailVerified: !!user.emailVerified, riskScore: user.riskScore || 0, riskFlags: user.riskFlags || [] } : null,
    emailConfigured: emailConfigured(),
    supportEmail: SUPPORT_EMAIL
  };
};

router.get('/:id', requireAdmin('tickets.view'), handle(async (req, res) => {
  const ticket = await loadTicket(req.params.id);
  res.json({ success: true, data: await detail(ticket.toObject()) });
}));

router.patch('/:id', requireAdmin('tickets.manage'), handle(async (req, res) => {
  const ticket = await loadTicket(req.params.id);
  const changes = {};
  const { status, priority, assigneeId } = req.body || {};
  if (status !== undefined && status !== ticket.status) {
    if (!TICKET_STATUSES.includes(status)) throw httpError(400, 'Invalid status.');
    changes.status = { from: ticket.status, to: status };
    ticket.status = status;
    ticket.resolvedAt = status === 'resolved' ? new Date() : null;
  }
  if (priority !== undefined && priority !== ticket.priority) {
    if (!TICKET_PRIORITIES.includes(priority)) throw httpError(400, 'Invalid priority.');
    changes.priority = { from: ticket.priority, to: priority };
    ticket.priority = priority;
  }
  if (assigneeId !== undefined && assigneeId !== ticket.assigneeId) {
    if (assigneeId) {
      const admin = isId(assigneeId) ? await AdminUser.findById(assigneeId).lean() : null;
      if (!admin || !admin.active) throw httpError(400, 'Pick an active team member.');
      ticket.assigneeId = String(admin._id);
      ticket.assigneeName = admin.name || admin.username;
    } else {
      ticket.assigneeId = '';
      ticket.assigneeName = '';
    }
    changes.assignee = ticket.assigneeName || 'unassigned';
  }
  await ticket.save();
  if (Object.keys(changes).length) {
    await audit(req, 'ticket.updated', { targetType: 'ticket', targetId: ticket._id, targetLabel: `#${ticket.number} ${ticket.subject}`, details: changes });
  }
  res.json({ success: true, data: await detail(ticket.toObject()) });
}));

// kind 'reply' emails the customer; kind 'note' stays internal
router.post('/:id/messages', requireAdmin('tickets.manage'), handle(async (req, res) => {
  const ticket = await loadTicket(req.params.id);
  const kind = req.body?.kind === 'note' ? 'note' : 'reply';
  const body = String(req.body?.body || '').trim().slice(0, 5000);
  if (!body) throw httpError(400, 'Write a message first.');

  let emailed = false;
  if (kind === 'reply') {
    await sendEmail({
      to: ticket.email,
      subject: `Re: ${ticket.subject} [#${ticket.number}]`,
      html: renderEmail({ greetingName: ticket.name, body })
    });
    emailed = true;
  }
  ticket.messages.push({ kind, authorName: req.admin.name, body, emailed });
  // Replying moves a new/open ticket to "waiting on customer"
  if (kind === 'reply' && ['new', 'open'].includes(ticket.status)) ticket.status = 'pending';
  if (kind === 'note' && ticket.status === 'new') ticket.status = 'open';
  await ticket.save();
  await audit(req, kind === 'reply' ? 'ticket.replied' : 'ticket.note_added', { targetType: 'ticket', targetId: ticket._id, targetLabel: `#${ticket.number} ${ticket.subject}` });
  res.json({ success: true, data: await detail(ticket.toObject()) });
}));

export default router;
