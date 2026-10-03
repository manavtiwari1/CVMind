import { Resend } from 'resend';

const FROM = 'CV Mind <no-reply@manavtiwari.in>';
// Where customers' replies go, since FROM is a no-reply address
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'cvmindofficial@gmail.com';
let client = null;

export function emailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

function getClient() {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Plain text from the admin panel → simple branded HTML. Paragraphs split on blank lines.
export function renderEmail({ greetingName = '', body, ctaLabel = '', ctaUrl = '' }) {
  const paragraphs = String(body || '')
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
  const cta = ctaLabel && /^https:\/\//i.test(ctaUrl)
    ? `<p style="margin:22px 0"><a href="${escapeHtml(ctaUrl)}" style="background:#2563eb;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${escapeHtml(ctaLabel)}</a></p>`
    : '';
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:28px;border:1px solid #e5e7eb;border-radius:12px;color:#1f2937;font-size:15px;line-height:1.6">
<p style="margin:0 0 18px;font-size:20px;font-weight:800;color:#2563eb">CV Mind</p>
${greetingName ? `<p style="margin:0 0 14px">Hi ${escapeHtml(greetingName)},</p>` : ''}
${paragraphs}${cta}
<p style="margin:22px 0 0;color:#6b7280;font-size:13px">The CV Mind team</p>
</div>`;
}

export async function sendEmail({ to, subject, html, replyTo = SUPPORT_EMAIL }) {
  if (!emailConfigured()) throw Object.assign(new Error('Email is not configured on this server (RESEND_API_KEY).'), { status: 503 });
  const { data, error } = await getClient().emails.send({
    from: FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    ...(replyTo ? { replyTo } : {})
  });
  if (error) throw new Error(error.message || 'Email provider error');
  return data;
}
