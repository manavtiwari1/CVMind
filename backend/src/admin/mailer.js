import { Resend } from 'resend';

// Sender for every email the app sends. The domain must be verified in Resend.
// Set EMAIL_FROM in .env to change it, e.g. EMAIL_FROM="CVMind <support@cvmind.in>"
export const EMAIL_FROM = process.env.EMAIL_FROM || 'CVMind <no-reply@manavtiwari.in>';
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

// ── Email layout ─────────────────────────────────────────────────────────────
// Table-based with inline styles so it renders the same in Gmail, Outlook and phone mail apps.
const SITE_URL = 'https://www.cvmind.in';
const LOGO_URL = `${SITE_URL}/apple-touch-icon.png`;
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const C = {
  page: '#f3f5f9',
  card: '#ffffff',
  border: '#e4e8ef',
  ink: '#0f172a',
  text: '#334155',
  muted: '#64748b',
  brand: '#1d4ed8',
  noteBg: '#f1f5ff',
  noteBorder: '#c7d6fe'
};

// Buttons only link to our own https pages; plain http is allowed outside production for local testing
const linkable = (url) => /^https:\/\//i.test(url) || (process.env.NODE_ENV !== 'production' && /^http:\/\//i.test(url));

const paragraphsHtml = (text) => String(text || '')
  .split(/\n{2,}/)
  .filter((p) => p.trim())
  .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${C.text}">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
  .join('');

function buttonHtml(label, url) {
  const safe = escapeHtml(url);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px">
<tr><td align="center" bgcolor="${C.brand}" style="border-radius:10px;background:${C.brand}">
<a href="${safe}" target="_blank" style="display:inline-block;padding:13px 28px;font-family:${FONT};font-size:15px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;border-radius:10px">${escapeHtml(label)}</a>
</td></tr></table>
<p style="margin:0 0 18px;font-size:12px;line-height:1.6;color:${C.muted}">Button not working? Paste this link into your browser:<br><a href="${safe}" style="color:${C.brand};word-break:break-all">${safe}</a></p>`;
}

/**
 * One layout for every CVMind email. Text fields are plain text (escaped here); body paragraphs split on blank lines.
 * @param {object} o
 * @param {string} [o.preheader]  inbox preview line
 * @param {string} [o.eyebrow]    small label above the title, e.g. "Password reset"
 * @param {string} [o.title]      headline
 * @param {string} [o.greetingName]
 * @param {string} o.body
 * @param {string[]} [o.bullets]
 * @param {string} [o.ctaLabel]
 * @param {string} [o.ctaUrl]
 * @param {string} [o.note]       highlighted line, e.g. how long a link works
 * @param {string} [o.afterword]  text after the button, e.g. "If you didn't ask for this…"
 * @param {string} [o.footerReason] why the reader got this email
 */
export function renderEmail({ preheader = '', eyebrow = '', title = '', greetingName = '', body = '', bullets = [], ctaLabel = '', ctaUrl = '', note = '', afterword = '', footerReason = '' }) {
  const bulletRows = bullets.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px">${bullets.map((b) => `
<tr><td valign="top" width="22" style="padding:3px 0 7px;font-size:15px;line-height:1.5;color:${C.brand};font-weight:700">&#10003;</td>
<td style="padding:3px 0 7px;font-size:15px;line-height:1.5;color:${C.text}">${escapeHtml(b)}</td></tr>`).join('')}</table>`
    : '';
  const noteBox = note
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px"><tr>
<td style="padding:12px 14px;background:${C.noteBg};border:1px solid ${C.noteBorder};border-radius:8px;font-size:13px;line-height:1.55;color:${C.ink}">${escapeHtml(note)}</td></tr></table>`
    : '';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>${escapeHtml(title || 'CVMind')}</title></head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>` : ''}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C.page}" style="background:${C.page}">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;font-family:${FONT}">

<tr><td style="padding:0 4px 18px">
<a href="${SITE_URL}" target="_blank" style="text-decoration:none">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:10px"><img src="${LOGO_URL}" width="36" height="36" alt="" style="display:block;border:0;border-radius:8px"></td>
<td style="font-size:20px;font-weight:800;letter-spacing:-0.3px;color:${C.ink}">CV<span style="color:${C.brand}">Mind</span></td>
</tr></table></a>
</td></tr>

<tr><td bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.border};border-radius:14px;padding:32px 30px 26px">
${eyebrow ? `<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${C.brand}">${escapeHtml(eyebrow)}</p>` : ''}
${title ? `<h1 style="margin:0 0 18px;font-size:23px;line-height:1.3;font-weight:800;color:${C.ink}">${escapeHtml(title)}</h1>` : ''}
${greetingName ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${C.text}">Hi ${escapeHtml(greetingName)},</p>` : ''}
${paragraphsHtml(body)}
${bulletRows}
${ctaLabel && linkable(ctaUrl) ? buttonHtml(ctaLabel, ctaUrl) : ''}
${noteBox}
${paragraphsHtml(afterword)}
<p style="margin:6px 0 0;font-size:15px;line-height:1.6;color:${C.text}">Regards,<br><strong style="color:${C.ink}">CVMind Team</strong></p>
</td></tr>

<tr><td style="padding:22px 8px 0;text-align:center;font-size:12px;line-height:1.7;color:${C.muted}">
${footerReason ? `${escapeHtml(footerReason)}<br>` : ''}
Questions? Just reply to this email or write to <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:${C.muted}">${escapeHtml(SUPPORT_EMAIL)}</a>.<br>
<a href="${SITE_URL}" target="_blank" style="color:${C.muted};font-weight:600;text-decoration:none">cvmind.in</a>
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

export async function sendEmail({ to, subject, html, replyTo = SUPPORT_EMAIL, attachments }) {
  if (!emailConfigured()) throw Object.assign(new Error('Email is not configured on this server (RESEND_API_KEY).'), { status: 503 });
  const { data, error } = await getClient().emails.send({
    from: EMAIL_FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    ...(replyTo ? { replyTo } : {}),
    ...(attachments ? { attachments } : {})
  });
  if (error) throw new Error(error.message || 'Email provider error');
  return data;
}
