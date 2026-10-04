import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { AppSetting, Ticket } from './models.js';
import { nextTicketNumber } from './tickets.js';
import { SUPPORT_EMAIL } from './mailer.js';

// Pulls the support inbox (cvmindofficial@gmail.com by default) into Support tickets.
// Replies to "[#1234]" emails join that ticket; any other email starts a new ticket.
// The mailbox is opened read-only, so nothing changes in Gmail (no "read" marks, no moves).

const STATE_KEY = 'inbox.state';
// On the very first sync only recent mail is imported, not the whole mailbox history
const FIRST_SYNC_DAYS = 14;
const MAX_PER_SYNC = 200;
const OWN_SENDERS = ['no-reply@manavtiwari.in'];

export function inboxConfig() {
  const user = process.env.SUPPORT_INBOX_USER || SUPPORT_EMAIL;
  const pass = (process.env.SUPPORT_INBOX_APP_PASSWORD || '').replace(/\s+/g, '');
  return {
    configured: !!(user && pass),
    user,
    pass,
    host: process.env.SUPPORT_INBOX_HOST || 'imap.gmail.com',
    port: Number(process.env.SUPPORT_INBOX_PORT || 993)
  };
}

export async function inboxState() {
  const row = await AppSetting.findOne({ key: STATE_KEY }).lean();
  return row?.value || {};
}

async function saveState(patch) {
  const current = await inboxState();
  await AppSetting.findOneAndUpdate({ key: STATE_KEY }, { value: { ...current, ...patch } }, { upsert: true });
}

// Drops the quoted thread under "On … wrote:" and ">" lines, so a ticket shows only what's new
export function stripQuotedReply(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = `${line} ${lines[i + 1] || ''}`;
    // Gmail/Outlook headers: "On Mon, 3 Oct 2026 at 10:00, Name <x@y.com> wrote:" (sometimes wrapped over two lines)
    if (/^On .*\d.* wrote:\s*$/.test(line) || /^On .*\d.* wrote:\s*$/.test(next.trim())) break;
    if (/^-{2,}\s*Original Message\s*-{2,}/i.test(line)) break;
    if (/^From: .+/.test(line) && out.length && /^(Sent|Date): /i.test(lines[i + 1] || '')) break;
    if (/^>/.test(line)) continue;
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

const ticketNumberIn = (subject) => {
  const m = /\[#(\d{3,})\]/.exec(String(subject || ''));
  return m ? Number(m[1]) : null;
};

const cleanSubject = (subject) => String(subject || '').replace(/^\s*((re|fwd?|aw)\s*:\s*)+/i, '').replace(/\s*\[#\d+\]\s*/g, ' ').trim();

// Adds one email to the right ticket. Returns 'added' | 'created' | 'skipped'.
export async function ingestEmail({ messageId, fromEmail, fromName, subject, text, date, attachments = 0 }) {
  const email = String(fromEmail || '').trim().toLowerCase();
  if (!email) return 'skipped';
  // Our own outgoing mail (and copies of it) never becomes a ticket message
  if (OWN_SENDERS.includes(email) || email === String(inboxConfig().user).toLowerCase()) return 'skipped';
  if (messageId && await Ticket.exists({ 'messages.messageId': messageId })) return 'skipped';

  const body = stripQuotedReply(text) || '(No text in this email)';
  const message = { kind: 'customer', authorName: fromName || email, body: body.slice(0, 20000), messageId: messageId || '', attachments, createdAt: date || new Date() };

  // 1. A reply to one of our emails carries the ticket number in the subject
  const number = ticketNumberIn(subject);
  let ticket = number ? await Ticket.findOne({ number }) : null;
  // Only thread it if the sender matches, so a forwarded email can't land in someone else's ticket
  if (ticket && ticket.email !== email) ticket = null;

  // 2. Otherwise, an unresolved ticket from the same person with the same subject
  if (!ticket) {
    const subjectKey = cleanSubject(subject).toLowerCase();
    if (subjectKey) {
      const candidates = await Ticket.find({ email, status: { $ne: 'resolved' } }).sort({ updatedAt: -1 }).limit(10);
      ticket = candidates.find((t) => cleanSubject(t.subject).toLowerCase() === subjectKey) || null;
    }
  }

  if (ticket) {
    ticket.messages.push(message);
    // The customer answered, so it needs attention again
    if (ticket.status !== 'open') {
      ticket.status = 'open';
      ticket.resolvedAt = null;
    }
    await ticket.save();
    return 'added';
  }

  await Ticket.create({
    number: await nextTicketNumber(),
    name: fromName || '',
    email,
    subject: cleanSubject(subject) || 'No subject',
    source: 'email',
    messages: [message],
    createdAt: date || new Date()
  });
  return 'created';
}

let running = null;

// Fetches new inbox mail. Safe to call often: one sync runs at a time, and each email is added once.
export function syncInbox({ reason = 'manual' } = {}) {
  if (running) return running;
  running = (async () => {
    const config = inboxConfig();
    if (!config.configured) return { ok: false, configured: false, error: 'The support inbox is not connected.' };

    const state = await inboxState();
    const client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: true,
      auth: { user: config.user, pass: config.pass },
      logger: false,
      socketTimeout: 60000
    });
    const counts = { created: 0, added: 0, skipped: 0 };
    let lastUid = state.lastUid || 0;

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX', { readOnly: true });
      try {
        const box = client.mailbox;
        // Gmail resets UIDs when UIDVALIDITY changes; fall back to a date search then
        const sameMailbox = state.uidValidity && String(state.uidValidity) === String(box.uidValidity);
        const query = sameMailbox && lastUid
          ? { uid: `${lastUid + 1}:*` }
          : { since: new Date(Date.now() - FIRST_SYNC_DAYS * 24 * 60 * 60 * 1000) };
        const uids = ((await client.search(query, { uid: true })) || []).filter((uid) => uid > (sameMailbox ? lastUid : 0)).sort((a, b) => a - b).slice(0, MAX_PER_SYNC);

        for (const uid of uids) {
          const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
          if (msg?.source) {
            const mail = await simpleParser(msg.source);
            const from = mail.from?.value?.[0] || {};
            const result = await ingestEmail({
              messageId: mail.messageId || `uid-${box.uidValidity}-${uid}`,
              fromEmail: from.address,
              fromName: from.name,
              subject: mail.subject,
              text: mail.text || (mail.html ? String(mail.html).replace(/<[^>]+>/g, ' ') : ''),
              date: mail.date,
              attachments: (mail.attachments || []).length
            });
            counts[result]++;
          }
          lastUid = uid;
        }
        await saveState({ uidValidity: String(box.uidValidity), lastUid, lastSyncAt: new Date(), lastError: '', lastReason: reason, lastCounts: counts });
      } finally {
        lock.release();
      }
      await client.logout();
      return { ok: true, configured: true, ...counts };
    } catch (err) {
      const message = /auth|credentials|login/i.test(err?.responseText || err?.message || '')
        ? 'Gmail rejected the login. Check SUPPORT_INBOX_APP_PASSWORD (it must be a Google App Password).'
        : (err?.message || 'Could not read the support inbox.');
      await saveState({ lastUid, lastError: message, lastErrorAt: new Date() }).catch(() => {});
      try { client.close(); } catch { /* already closed */ }
      return { ok: false, configured: true, error: message, ...counts };
    }
  })().finally(() => { running = null; });
  return running;
}

// Long-running servers check every 2 minutes. Serverless hosts rely on the Support page's sync instead.
export function startInboxPolling(intervalMs = 2 * 60 * 1000) {
  if (!inboxConfig().configured) return null;
  const tick = () => syncInbox({ reason: 'schedule' }).catch((err) => console.error('[inbox] sync failed:', err.message));
  setTimeout(tick, 10000);
  return setInterval(tick, intervalMs);
}
