// Cover letter designs (2026 set). Each one lays out a LetterData as editable HTML.
//
// Every design follows the editor's template rules (see data/cvTemplates.ts):
// - one root <div> that fills the page, with inline styles and font sizes in px
// - the accent colour written as a hex, so Design & Font can recolour it
// - decoration is position:absolute and contenteditable="false", so typing never breaks it
// - the locked CVMind footer is the root's last child
// - a profile photo is <img alt="Profile photo"> (click it in the editor to change it)
import type { LetterData, LetterDesign } from '../lib/coverLetter';
import { CVMIND_MARK } from './brand';

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const svgUri = (svg: string) => `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}')`;

const SCRIPT = "'Great Vibes',cursive";
const SANS = "'Montserrat','Inter',Arial,sans-serif";

/** Contact details that are filled in, in a fixed order. */
const contacts = (d: LetterData, keys: (keyof LetterData)[] = ['email', 'phone', 'location', 'linkedin']) =>
  keys.map(k => String(d[k] || '').trim()).filter(Boolean).map(esc);

const paras = (d: LetterData, style: string) => d.paragraphs
  .map(p => p.trim()).filter(Boolean)
  .map(p => `<p style="${style}">${esc(p)}</p>`).join('\n');

const lines = (parts: (string | undefined)[]) => parts.map(s => (s || '').trim()).filter(Boolean).map(esc).join('<br>');

/** A block that only appears when it has content. */
const block = (style: string, html: string) => (html ? `<div style="${style}">${html}</div>` : '');

const subject = (d: LetterData, style: string) => (d.subject?.trim() ? `<div style="${style}">Subject: ${esc(d.subject.trim())}</div>` : '');

/** Locked CVMind footer; must stay the root's last child. */
const footer = ({ left = '56px', right = '56px', bottom = '22px', color = '#6b7280', strong = '#111827' } = {}) => `
<div contenteditable="false" spellcheck="false" style="position:absolute;z-index:3;left:${left};right:${right};bottom:${bottom};display:flex;justify-content:space-between;align-items:center;font-family:'Inter',Arial,sans-serif;font-size:10.5px;color:${color};user-select:none;-webkit-user-select:none;">
<a href="https://cvmind.in" target="_blank" rel="noopener" style="color:${color};text-decoration:none;">cvmind.in</a>
<span style="display:inline-flex;align-items:center;gap:6px;">Powered by <span style="display:inline-flex;align-items:center;gap:4px;font-weight:800;color:${strong};"><img src="${CVMIND_MARK}" alt="" width="14" height="14" draggable="false" style="display:block;border-radius:3px;pointer-events:none;" />CVMind</span></span>
</div>`;

/** Page root: fills one A4 page; the bottom padding keeps the text clear of the footer. */
const page = (style: string, inner: string, foot: string) =>
  `<div style="position:relative;box-sizing:border-box;width:100%;min-height:calc(var(--rs-h, 1123px) - 4px);overflow:hidden;${style}">
${inner}
${foot}
</div>`;

/** Non-editable decoration layer. */
const deco = (style: string, inner = '') => `<div contenteditable="false" aria-hidden="true" style="position:absolute;pointer-events:none;${style}">${inner}</div>`;

const AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#e5e7eb"/><circle cx="60" cy="46" r="20" fill="none" stroke="#8a8f99" stroke-width="7"/><path d="M24 104c6-20 20-30 36-30s30 10 36 30" fill="none" stroke="#8a8f99" stroke-width="7" stroke-linecap="round"/></svg>')}`;
const photo = (size: number, extra = '') =>
  `<img src="${AVATAR}" alt="Profile photo" width="${size}" height="${size}" style="display:block;width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex:none;${extra}" />`;

const signature = (d: LetterData, color: string, size = 34) =>
  `<div style="font-family:${SCRIPT};font-size:${size}px;line-height:1.1;color:${color};margin:6px 0 2px;">${esc(d.name)}</div>`;

/* ───────────────────────────── designs ───────────────────────────── */

const boldBar = (d: LetterData) => {
  const [first, ...rest] = d.name.trim().split(/\s+/);
  const c = contacts(d, ['email', 'linkedin', 'phone']);
  return page(`font-family:${SANS};color:#222;font-size:12.5px;line-height:1.6;background:#fff;padding:60px 62px 80px;`, `
${deco('top:0;right:68px;width:42px;height:118px;background:#111111;')}
<div style="font-size:52px;font-weight:800;line-height:1.02;letter-spacing:1px;color:#111111;text-transform:uppercase;margin-bottom:26px;">${esc(first || '')}<br>${esc(rest.join(' '))}</div>
<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:11.5px;color:#333;padding-bottom:8px;border-bottom:3px solid #111111;margin-bottom:34px;">${c.map(x => `<span>${x}</span>`).join('')}</div>
<div style="font-size:13px;font-weight:700;margin-bottom:12px;">${esc(d.date)}</div>
<div style="font-size:21px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;color:#111111;margin-bottom:6px;">${esc(d.recipient)}</div>
<div style="font-size:12.5px;color:#444;margin-bottom:30px;">${lines([d.company, d.recipientAddress])}</div>
<p style="font-size:12.5px;margin:0 0 16px;">${esc(d.greeting)}</p>
${paras(d, 'font-size:12.5px;margin:0 0 16px;text-align:justify;')}
<div style="font-size:12.5px;margin-top:22px;">${esc(d.closing)}<br><br><br><span style="font-size:15px;">${esc(d.name)}</span></div>
`, footer({ left: '62px', right: '62px' }));
};

const tri = (pos: string, w: number, h: number, color: string, clip: string) =>
  deco(`${pos}width:${w}px;height:${h}px;background:${color};clip-path:${clip};`);

const geoNavy = (d: LetterData) => page(`font-family:${SANS};color:#222;font-size:12.5px;line-height:1.6;background:#fff;padding:96px 72px 120px;`, `
${tri('top:0;left:0;', 420, 110, '#d6e6f3', 'polygon(0 0,100% 0,0 100%)')}
${tri('top:0;left:0;', 230, 110, '#13294b', 'polygon(0 0,100% 0,0 100%)')}
${tri('bottom:0;right:0;', 420, 120, '#d6e6f3', 'polygon(100% 0,100% 100%,0 100%)')}
${tri('bottom:0;right:0;', 230, 120, '#13294b', 'polygon(100% 0,100% 100%,0 100%)')}
<div style="text-align:center;font-size:38px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#111;">${esc(d.name)}</div>
<div style="text-align:center;font-size:12.5px;color:#333;margin:8px 0 22px;">${contacts(d).join(' | ')}</div>
<div style="height:2px;background:#13294b;margin:0 14px 30px;"></div>
<div style="display:flex;justify-content:space-between;gap:24px;margin-bottom:26px;">
<div><div style="font-size:12.5px;font-weight:700;margin-bottom:8px;">${esc(d.date)}</div><div style="font-size:24px;color:#111;">${esc(d.recipient)}</div></div>
<div style="font-size:12.5px;color:#333;max-width:180px;">${lines([d.company, d.recipientAddress])}</div>
</div>
<p style="font-size:12.5px;margin:0 0 14px;">${esc(d.greeting)}</p>
${paras(d, 'font-size:12.5px;margin:0 0 14px;text-align:justify;')}
<div style="font-size:12.5px;margin-top:22px;">${esc(d.closing)}<br><br><b style="font-size:13.5px;">${esc(d.name)}</b></div>
`, footer({ left: '72px', right: '260px' }));

const geoPhoto = (d: LetterData) => page(`font-family:'Poppins',${SANS};color:#222;font-size:12px;line-height:1.65;background:#fff;padding:84px 64px 130px;`, `
${tri('top:0;left:0;', 150, 140, '#a9d3e0', 'polygon(0 0,100% 0,0 100%)')}
${tri('top:0;left:0;', 210, 80, '#2b2a7d', 'polygon(0 0,100% 0,0 100%)')}
${tri('bottom:0;right:0;', 150, 150, '#a9d3e0', 'polygon(100% 0,100% 100%,0 100%)')}
${tri('bottom:0;right:0;', 230, 110, '#2b2a7d', 'polygon(100% 100%,0 100%,100% 0)')}
<div style="text-align:center;font-size:40px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#111;">${esc(d.name)}</div>
<div style="text-align:center;font-size:12px;color:#333;margin:6px 0 30px;">${contacts(d).join(' | ')}</div>
<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:24px;">
<div><div style="font-size:12.5px;font-weight:700;margin-bottom:12px;">${esc(d.date)}</div><div style="font-size:13px;font-weight:700;color:#111;margin-bottom:6px;">${esc(d.recipient)}</div><div style="font-size:12px;color:#444;">${lines([d.company, d.recipientAddress])}</div></div>
${photo(150)}
</div>
<p style="font-size:12px;margin:0 0 14px;">${esc(d.greeting)}</p>
${paras(d, 'font-size:12px;margin:0 0 14px;text-align:justify;')}
<div style="font-size:12px;margin-top:20px;">${esc(d.closing)}</div>
${signature(d, '#111', 32)}
<div style="font-size:13px;font-weight:600;text-transform:lowercase;color:#111;">${esc(d.name)}</div>
`, footer({ left: '64px', right: '250px' }));

const CORNER = (rot: number) => svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" fill="none" stroke="#222222" stroke-width="2"><g transform="rotate(${rot} 30 30)"><path d="M14 58V14h44"/><circle cx="20" cy="8" r="5"/><circle cx="8" cy="20" r="5"/><path d="M14 14c-4-2-6-6-6-10M14 14c-2-4-6-6-10-6"/></g></svg>`);
const ornament = (d: LetterData) => page(`font-family:'Cormorant Garamond',Georgia,serif;color:#1f1f1f;font-size:15px;line-height:1.55;background:#fff;padding:96px 92px 120px;`, `
${deco(`top:34px;left:34px;width:64px;height:64px;background:${CORNER(0)} no-repeat center/contain;`)}
${deco(`top:34px;right:34px;width:64px;height:64px;background:${CORNER(90)} no-repeat center/contain;`)}
${deco(`bottom:46px;right:34px;width:64px;height:64px;background:${CORNER(180)} no-repeat center/contain;`)}
${deco(`bottom:46px;left:34px;width:64px;height:64px;background:${CORNER(270)} no-repeat center/contain;`)}
<div style="text-align:center;font-size:32px;letter-spacing:9px;text-transform:uppercase;color:#222222;">${esc(d.name)}</div>
<div style="text-align:center;font-size:21px;font-style:italic;margin:4px 0 22px;">${esc(d.title)}</div>
<div style="text-align:center;font-size:14px;margin-bottom:38px;">${contacts(d, ['email', 'phone', 'location']).join('<br>')}</div>
<div style="font-size:15px;margin-bottom:12px;">${esc(d.date)}</div>
${d.recipient || d.company ? `<div style="font-size:15px;margin-bottom:14px;">${lines([d.recipient, d.company, d.recipientAddress])}</div>` : ''}
${subject(d, 'font-size:15px;font-weight:700;margin-bottom:18px;')}
<p style="font-size:15px;margin:0 0 14px;">${esc(d.greeting)}</p>
${paras(d, 'font-size:15px;margin:0 0 16px;text-align:justify;')}
<div style="font-size:15px;margin-top:18px;">${esc(d.closing)}</div>
${signature(d, '#222', 36)}
<div style="font-size:15px;font-weight:700;">${esc(d.name)}</div>
`, footer({ left: '110px', right: '110px', bottom: '30px' }));

const leftRule = (d: LetterData) => page(`font-family:${SANS};color:#222;font-size:12.5px;line-height:1.6;background:#fff;padding:72px 64px 110px 88px;`, `
${deco('top:44px;bottom:60px;left:56px;width:2px;background:#111111;')}
<div style="font-family:'Playfair Display',Georgia,serif;font-size:32px;letter-spacing:8px;text-transform:uppercase;color:#111;">${esc(d.name)}</div>
<div style="font-family:${SCRIPT};font-size:26px;color:#111;margin:2px 0 20px;">${esc(d.title)}</div>
<div style="font-size:13px;line-height:1.7;margin-bottom:22px;">${contacts(d, ['email', 'phone', 'location']).join('<br>')}</div>
<div style="height:2px;background:#111111;margin:0 0 30px -32px;"></div>
<div style="font-size:12.5px;margin-bottom:14px;">${esc(d.date)}</div>
${d.recipient || d.company ? `<div style="font-size:12.5px;margin-bottom:14px;">${lines([d.recipient, d.company, d.recipientAddress])}</div>` : ''}
${subject(d, 'font-size:12.5px;font-weight:700;margin-bottom:18px;')}
<p style="font-size:12.5px;margin:0 0 14px;">${esc(d.greeting)}</p>
${paras(d, 'font-size:12.5px;margin:0 0 14px;')}
<div style="font-size:12.5px;margin-top:20px;">${esc(d.closing)}</div>
${signature(d, '#111', 36)}
<div style="font-size:12.5px;font-weight:700;">${esc(d.name)}</div>
`, footer({ left: '88px', right: '64px' }));

const goldMonogram = (d: LetterData) => {
  const initials = d.name.trim().split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
  const ICONS: Record<string, string> = {
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.11 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    email: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 6L2 7"/>',
    location: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    linkedin: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
  };
  const item = (k: keyof typeof ICONS, v: string) => v.trim()
    ? `<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b8955a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none;">${ICONS[k]}</svg><span>${esc(v)}</span></div>` : '';
  return page(`font-family:'Lato',Arial,sans-serif;color:#333;font-size:11.5px;line-height:1.6;background:#fff;padding:0 0 100px;`, `
<div style="background:#ececec;text-align:center;padding:30px 40px 22px;margin-bottom:34px;">
<div style="display:inline-grid;place-items:center;width:62px;height:62px;border-radius:50%;border:2px solid #b8955a;background:#fff;font-family:${SCRIPT};font-size:28px;color:#444;margin-bottom:10px;">${esc(initials)}</div>
<div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:36px;letter-spacing:3px;text-transform:uppercase;color:#333;">${esc(d.name)}</div>
<div style="font-size:15px;letter-spacing:3px;color:#555;">${esc(d.title)}</div>
</div>
<div style="display:flex;gap:40px;padding:0 48px;">
<div style="flex:1.75;min-width:0;">
<div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;letter-spacing:2px;text-transform:uppercase;color:#333;margin-bottom:14px;">Cover Letter</div>
<p style="font-size:11.5px;margin:0 0 12px;">${esc(d.greeting)}</p>
${paras(d, 'font-size:11.5px;margin:0 0 12px;text-align:justify;')}
<div style="font-size:12px;font-weight:700;margin-top:20px;">${esc(d.closing)}</div>
${signature(d, '#333', 30)}
<div style="font-size:12px;">${esc(d.name)}</div>
</div>
<div style="flex:1;min-width:0;font-size:12px;">
${item('phone', d.phone)}${item('email', d.email)}${item('location', d.location)}${item('linkedin', d.linkedin)}
<div style="height:1px;background:#cfcfcf;margin:24px 0 40px;"></div>
<div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;letter-spacing:2px;color:#333;margin-bottom:12px;">TO</div>
<div style="font-weight:700;color:#222;">${esc(d.recipient)}</div>
<div style="margin-bottom:18px;">${lines([d.company, d.recipientAddress])}</div>
<div style="font-weight:700;color:#222;">Date</div>
<div>${esc(d.date)}</div>
</div>
</div>
`, footer({ left: '48px', right: '48px', strong: '#333' }));
};

const serifCenter = (d: LetterData) => page(`font-family:'Playfair Display',Georgia,serif;color:#1f1f1f;font-size:13px;line-height:1.6;background:#fff;padding:64px 72px 120px;`, `
<div style="text-align:center;font-size:34px;font-weight:700;letter-spacing:9px;text-transform:uppercase;color:#111111;">${esc(d.name)}</div>
<div style="text-align:center;font-size:18px;font-weight:700;font-style:italic;margin:4px 0 16px;">${esc(d.title)}</div>
<div style="width:200px;height:2px;background:#111111;margin:0 auto 18px;"></div>
<div style="text-align:center;font-size:13.5px;line-height:1.55;margin-bottom:30px;">${contacts(d, ['location', 'email', 'phone']).join('<br>')}</div>
<div style="font-size:13.5px;margin-bottom:12px;">${esc(d.date)}</div>
${d.recipient || d.company ? `<div style="font-size:13px;margin-bottom:14px;">${lines([d.recipient, d.company, d.recipientAddress])}</div>` : ''}
${subject(d, 'font-size:13.5px;font-weight:700;margin-bottom:18px;')}
<p style="font-size:13px;margin:0 0 14px;">${esc(d.greeting)}</p>
${paras(d, 'font-size:13px;margin:0 0 14px;')}
<div style="font-size:13px;margin-top:18px;">${esc(d.closing)}</div>
${signature(d, '#111', 36)}
<div style="font-size:13px;font-weight:700;">${esc(d.name)}</div>
${deco('left:50%;bottom:58px;width:200px;height:2px;margin-left:-100px;background:#111111;')}
`, footer({ left: '72px', right: '72px', bottom: '24px' }));

const WAVE = svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 150"><path d="M120 0c40 60 110 90 180 92V0z" fill="#1f8a7a"/><path d="M175 0c25 40 70 62 125 64V0z" fill="#e7f3ef"/><path d="M210 0c18 28 50 42 90 44V0z" fill="#0e5e57"/></svg>');
const wave = (d: LetterData) => page(`font-family:'Open Sans',Arial,sans-serif;color:#333;font-size:12px;line-height:1.65;background:#fff;padding:0 0 100px;`, `
<div style="position:relative;background:#e9e9e9;padding:34px 60px 30px;margin-bottom:34px;">
${deco(`top:0;right:0;width:330px;height:150px;background:${WAVE} no-repeat right top/contain;`)}
<div style="position:relative;font-size:28px;font-weight:700;color:#4a4a4a;">${esc(d.name)}</div>
<div style="position:relative;font-size:11px;color:#666;margin:4px 0 12px;">${contacts(d, ['email', 'phone']).join(' · ')}</div>
<div style="position:relative;font-size:12px;color:#555;">${esc(d.title)}</div>
</div>
<div style="padding:0 60px;">
<div style="text-align:center;font-size:22px;font-weight:700;color:#1f1f1f;margin-bottom:26px;">${esc(d.subject?.trim() || 'Job Application Letter')}</div>
<div style="font-size:12px;font-weight:700;margin-bottom:16px;">${esc(d.date)}</div>
<div style="font-size:12px;font-weight:700;margin-bottom:20px;">${lines([d.recipient, d.company, d.recipientAddress])}</div>
<p style="font-size:12px;margin:0 0 14px;">${esc(d.greeting)}</p>
${paras(d, 'font-size:12px;margin:0 0 14px;')}
<div style="font-size:12px;margin-top:20px;">${esc(d.closing)}<br><br><b>${esc(d.name)}</b></div>
</div>
`, footer({ left: '60px', right: '60px', strong: '#1f8a7a' }));

const clean = (d: LetterData) => page(`font-family:'Rubik',Arial,sans-serif;color:#333;font-size:12.5px;line-height:1.45;background:#fff;padding:44px 48px 100px;`, `
<div style="font-size:34px;font-weight:600;text-transform:uppercase;color:#111;line-height:1.1;">${esc(d.name)}</div>
<div style="font-size:17px;font-weight:500;color:#0ea5c6;margin:6px 0 8px;">${esc(d.title)}</div>
<div style="display:flex;flex-wrap:wrap;gap:4px 14px;font-size:11px;font-weight:600;color:#333;margin-bottom:44px;">${contacts(d).map(x => `<span><span style="color:#0ea5c6;">●</span> ${x}</span>`).join('')}</div>
<div style="margin-bottom:22px;">${esc(d.date)}</div>
<div style="margin-bottom:36px;">${lines([d.recipient, d.company, d.recipientAddress])}</div>
<p style="margin:0 0 26px;">${esc(d.greeting)}</p>
${paras(d, 'margin:0 0 14px;')}
<div style="margin-top:28px;">${esc(d.closing)}<br>${esc(d.name)}</div>
`, footer({ left: '48px', right: '48px', strong: '#0ea5c6' }));

const HEX = svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="74" viewBox="0 0 64 74"><path d="M32 2 62 19v36L32 72 2 55V19z" fill="none" stroke="#e3e5ea" stroke-width="1.6"/></svg>');
const hexDesign = (accent: string, nameColor: string) => (d: LetterData) => page(`font-family:'Rubik',Arial,sans-serif;color:#333;font-size:12px;line-height:1.5;background:#fff;padding:52px 56px 100px;`, `
${deco(`top:0;right:0;width:360px;height:420px;background:${HEX} repeat;-webkit-mask-image:radial-gradient(circle at 80% 15%,#000 30%,transparent 72%);mask-image:radial-gradient(circle at 80% 15%,#000 30%,transparent 72%);`)}
${deco(`left:0;bottom:120px;width:120px;height:440px;background:${HEX} repeat;-webkit-mask-image:linear-gradient(90deg,#000,transparent);mask-image:linear-gradient(90deg,#000,transparent);`)}
<div style="position:relative;display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:24px;">
<div><div style="font-size:28px;font-weight:600;color:${nameColor};line-height:1.15;">${esc(d.name)}</div>
<div style="font-size:14px;color:#333;margin:2px 0 4px;">${esc(d.title)}</div>
<div style="display:flex;flex-wrap:wrap;gap:4px 12px;font-size:10.5px;color:${accent};">${contacts(d).map(x => `<span>${x}</span>`).join('')}</div></div>
${photo(66)}
</div>
<div style="position:relative;font-size:12px;font-weight:600;letter-spacing:.3px;text-transform:uppercase;color:#555;margin-bottom:6px;">Cover Letter</div>
${block('position:relative;font-size:11.5px;margin-bottom:14px;', lines([d.date, d.recipient, d.company]))}
${d.greeting.trim() ? `<p style="position:relative;margin:0 0 12px;">${esc(d.greeting)}</p>` : ''}
${paras(d, 'position:relative;margin:0 0 12px;')}
${d.closing.trim() ? `<div style="position:relative;margin-top:18px;">${esc(d.closing)}<br><b>${esc(d.name)}</b></div>` : ''}
`, footer({ left: '56px', right: '56px', strong: nameColor }));

const dots = (d: LetterData) => page(`font-family:'Inter',Arial,sans-serif;color:#333;font-size:12px;line-height:1.55;background:#fff;padding:48px 56px 100px;`, `
${deco('top:-60px;right:-60px;width:520px;height:520px;background-image:radial-gradient(#d4d8de 1.3px,transparent 1.5px);background-size:11px 11px;-webkit-mask-image:radial-gradient(circle at 70% 30%,#000 20%,transparent 68%);mask-image:radial-gradient(circle at 70% 30%,#000 20%,transparent 68%);')}
<div style="position:relative;display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:34px;">
<div><div style="font-size:24px;color:#111;line-height:1.2;">${esc(d.name)}</div>
<div style="font-size:15px;color:#1e88e5;margin:2px 0 4px;">${esc(d.title)}</div>
<div style="display:flex;flex-wrap:wrap;gap:4px 12px;font-size:10.5px;color:#444;">${contacts(d).map(x => `<span>${x}</span>`).join('')}</div></div>
${photo(80)}
</div>
<div style="position:relative;font-size:9.5px;letter-spacing:.3px;text-transform:uppercase;color:#555;margin-bottom:8px;">Cover Letter</div>
${block('position:relative;font-size:12px;margin-bottom:14px;', lines([d.date, d.recipient, d.company]))}
${d.greeting.trim() ? `<p style="position:relative;margin:0 0 12px;">${esc(d.greeting)}</p>` : ''}
${paras(d, 'position:relative;margin:0 0 12px;')}
${d.closing.trim() ? `<div style="position:relative;margin-top:18px;">${esc(d.closing)}<br><b>${esc(d.name)}</b></div>` : ''}
`, footer({ left: '56px', right: '56px', strong: '#1e88e5' }));

const navyTan = (d: LetterData) => page(`font-family:'Open Sans',Arial,sans-serif;color:#333;font-size:12px;line-height:1.6;background:#fff;padding:52px 52px 100px;`, `
<div style="display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:28px;">
<div><div style="font-family:${SANS};font-size:31px;font-weight:700;text-transform:uppercase;color:#1f3b5a;line-height:1.1;">${esc(d.name)}</div>
<div style="font-family:${SANS};font-size:15px;font-weight:700;color:#b08a62;margin:4px 0 8px;">${esc(d.title)}</div>
<div style="display:flex;flex-wrap:wrap;gap:4px 14px;font-size:10.5px;font-weight:700;color:#333;">${contacts(d, ['phone', 'email', 'linkedin', 'location']).map(x => `<span><span style="color:#b08a62;">●</span> ${x}</span>`).join('')}</div></div>
${photo(100)}
</div>
${block('font-size:12px;margin-bottom:14px;', lines([d.date, d.recipient, d.company]))}
${d.greeting.trim() ? `<p style="margin:0 0 12px;">${esc(d.greeting)}</p>` : ''}
${paras(d, 'margin:0 0 12px;')}
${d.closing.trim() ? `<div style="margin-top:18px;">${esc(d.closing)}<br><b style="color:#1f3b5a;">${esc(d.name)}</b></div>` : ''}
`, footer({ left: '52px', right: '52px', strong: '#1f3b5a' }));

/* ───────────────────────────── sample letters ───────────────────────────── */
// Each design opens with its own sample, so a user sees how that layout is meant to be filled in.

const S = (d: Partial<LetterData>): LetterData => ({
  name: '', title: '', email: '', phone: '', location: '', linkedin: '', date: '', recipient: '', company: '',
  jobTitle: '', greeting: '', paragraphs: [], closing: '', subject: '', recipientAddress: '', ...d,
});

const ADMIN = [
  'I am writing to express my interest in the Administration Manager position. With over 8 years of experience in administrative leadership, I have built a strong foundation in operations support, compliance and team coordination. My background includes managing confidential financial records, streamlining internal processes and supporting senior leadership, with a careful eye for detail and discretion.',
  'I am confident that my organised approach, integrity and ability to stay calm under pressure would make me a valuable addition to your business. I take pride in running smooth, well-organised offices that let teams do their best work, and I would welcome the opportunity to bring these skills to your team.',
];

const PLACEHOLDER = S({
  name: 'Your Name',
  title: 'The role you are applying for?',
  phone: 'Phone',
  email: 'Email',
  location: 'Location',
  paragraphs: ['This is your opportunity to introduce yourself to the organization! Share why you want this role and what you bring to it, so the reader wants to meet you for an interview.'],
});

const SAMPLES: Record<string, LetterData> = {
  'cl-bold-bar': S({
    name: 'Daniel Brooks', email: 'hello@danielbrooks.com', linkedin: '@danielbrooks', phone: 'www.danielbrooks.com',
    date: 'April 27, 2026', recipient: 'Maya Fernandes', company: 'Founder, Brightline Studio', recipientAddress: '123 Anywhere St., Any City, ST 12345',
    greeting: 'Dear Ms. Fernandes,',
    paragraphs: [
      'I am writing to apply for the Brand Designer role at Brightline Studio. Your work for independent food brands is the kind of design I most enjoy, and I would love to contribute to it.',
      'Over the last five years I have led identity projects from first sketch to final print files: logos, packaging systems and social templates. My most recent packaging refresh launched in 400 stores and gave the client one consistent look across every product line.',
      "I work quickly in Figma and Illustrator, present ideas clearly to clients, and take feedback well. I would be glad to walk you through my portfolio and talk about the projects on your team's list this year.",
    ],
    closing: 'Best Regards,',
  }),
  'cl-geo-navy': S({
    name: 'Arjun Malhotra', email: 'hello@arjunmalhotra.com', phone: '123-456-7890',
    date: 'April 27, 2026', recipient: 'Sophie Laurent', company: 'Founder, Northwind Labs', recipientAddress: '123 Anywhere St., Any City, ST 12345',
    greeting: 'Dear Ms. Laurent,',
    paragraphs: [
      'I am excited to apply for the Operations Lead position at Northwind Labs. Your focus on building calm, well-run teams is exactly what drew me to this role.',
      'In my current role I run day-to-day operations for a 60-person company: vendor contracts, budgets, hiring logistics and office systems. Last year I moved our tools onto one shared workspace, which cut the time the team spent hunting for documents and approvals. I enjoy fixing the small processes that slow people down, and I communicate changes clearly so they stick.',
    ],
    closing: 'Best Regards,',
  }),
  'cl-geo-photo': S({
    name: 'Kwame Mensah', email: 'hello@kwamemensah.com', phone: '123-456-7890',
    date: 'April 27, 2026', recipient: 'Daniel Ortega', company: 'Founder, Rimberio & Co.', recipientAddress: '123 Anywhere St., Any City, ST 12345',
    greeting: 'Dear Mr. Ortega,',
    paragraphs: [
      "I am applying for the Marketing Coordinator role at Rimberio & Co. I have followed your brand's growth for a while and would love to help tell its story.",
      'For the past three years I have planned and run campaigns for a lifestyle brand, from the content calendar to the final report. I write clear copy, brief designers well, and keep projects on schedule.',
      'I also manage our social channels and newsletter. A series I started on customer stories became our most-read email of the year and brought in a steady flow of repeat orders.',
      'I would welcome the chance to discuss how I can support your marketing plans. Thank you for your time and consideration.',
    ],
    closing: 'Best Regards,',
  }),
  'cl-ornament': S({
    name: 'Emma Clarke', title: 'Administration Manager', email: 'hello@emmaclarke.com', phone: '+123-456-7890',
    date: '21st September', subject: 'Job application', greeting: 'Dear Hiring Manager,', paragraphs: ADMIN, closing: 'Kind regards,',
  }),
  'cl-left-rule': S({
    name: 'Nora Bennett', title: 'Office Manager', email: 'hello@norabennett.com', phone: '+123-456-7890',
    date: '21st September', subject: 'Job application', greeting: 'Dear Hiring Manager,',
    paragraphs: [
      'I am writing to express my interest in the Office Manager position. With over 6 years of experience running busy offices, I have a strong foundation in scheduling, vendor management and supporting leadership teams.',
      'I am confident that my organised approach and calm manner under pressure would make me a valuable asset to your business. I take pride in creating smooth, well-run workplaces, and I would welcome the opportunity to bring my skills and experience to your team.',
    ],
    closing: 'Kind regards,',
  }),
  'cl-gold-monogram': S({
    name: 'Lena Alvarez', title: 'Sales Representative', phone: '123-456-7890', email: 'hello@lenaalvarez.com', location: '123 Anywhere St., Any City', linkedin: 'lenaalvarez.com',
    date: '21 September 2026', recipient: 'Mr. Daniel Okafor', company: 'HR Manager, Arrowline Industries', recipientAddress: '123 Anywhere St., Any City',
    greeting: 'Dear Mr. Okafor,',
    paragraphs: [
      'I am writing to express my interest in the Sales Representative position at Arrowline Industries, as advertised. With six years of experience in sales, I am confident in my ability to contribute to your team and drive the growth of your business.',
      "In my previous role at Westfield Supplies, I managed a varied portfolio of clients, including several regional distributors. By focusing on each client's needs and offering tailored solutions, I grew sales in my territory by 25% in my first year.",
      'Arrowline Industries has always been at the forefront of industrial supply, and I am impressed by the recent launch of your online ordering platform. My experience in selling to technical buyers would let me contribute to its adoption from day one.',
      'I am eager to bring my track record in sales, deep product knowledge and passion for building relationships to your team. I would appreciate the opportunity to discuss how I can help Arrowline reach its sales goals.',
      'Thank you for considering my application. I look forward to the possibility of joining your team.',
    ],
    closing: 'Sincerely,',
  }),
  'cl-serif-center': S({
    name: 'Grace Morgan', title: 'Administration Manager', location: '123 Anywhere St., Any City', email: 'hello@gracemorgan.com', phone: '+123-456-7890',
    date: '21st September', subject: 'Job application', greeting: 'Dear Hiring Manager,', paragraphs: ADMIN, closing: 'Kind regards,',
  }),
  'cl-wave': S({
    name: 'Lucas Romero', email: 'lucas@you.mail', title: 'Marketing Director',
    subject: 'Job Application Letter', date: 'November 13, 2026', recipient: 'Jade Warren', company: 'Brightwave Media', recipientAddress: 'Phoenix, AZ 85001',
    greeting: 'Dear Ms. Warren,',
    paragraphs: [
      'I am writing to express my interest in the Marketing Manager position at Brightwave Media, as advertised on your website. With over five years of experience in the field, I have developed a strong skill set that aligns well with the needs of your company.',
      'I am confident that my expertise in digital marketing, along with my ability to lead diverse teams and manage complex campaigns, will contribute to the continued success of Brightwave Media.',
      'Throughout my career I have increased brand visibility and improved customer engagement. In my previous role as a Senior Marketing Strategist at Northgate Solutions, I oversaw campaigns that grew online traffic by 20% and sales by 15% over one year.',
      'I believe these results reflect my ability to adapt to changing markets and deliver measurable outcomes. I am excited about the chance to bring my approach to your team.',
    ],
    closing: 'Sincerely,',
  }),
  'cl-clean': S({
    name: 'Riya Kapoor', title: 'Intern | Digital Marketing | Data Analytics', phone: '+1-(234)-555-1234', email: 'Email', linkedin: 'LinkedIn', location: 'Austin, Texas',
    date: '03/19/2026', recipient: 'Ms. Rebecca Shah', company: 'Campus Recruiting Manager, Brightpath Digital', recipientAddress: '25 First Street, Cambridge, MA 02141',
    greeting: 'Dear Ms. Shah,',
    paragraphs: [
      'I am excited to apply for the Digital Marketing Intern position at Brightpath Digital. As a student with hands-on experience in social media, content and analytics, I am eager to bring my skills to your team and learn from it.',
      'During an internship at a local agency, I ran a social campaign that grew engagement by 25% and added over 1,000 new followers. I also analysed website traffic in Google Analytics and suggested changes that increased average session time.',
      'Outside of work, I manage social media for a student volunteering group, where I learned to plan content around clear goals and measure what works.',
      "I admire Brightpath's focus on data-driven, customer-first marketing. Thank you for your time and consideration; I look forward to discussing how I can contribute to your team.",
    ],
    closing: 'Best regards,',
  }),
  'cl-hex': PLACEHOLDER,
  'cl-hex-violet': PLACEHOLDER,
  'cl-dots': S({ ...PLACEHOLDER, linkedin: 'LinkedIn/Portfolio' }),
  'cl-navy-tan': S({ ...PLACEHOLDER, name: 'YOUR NAME', email: '', linkedin: 'LinkedIn/Portfolio' }),
};

export const LETTER_TEMPLATES: LetterDesign[] = [
  { id: 'cl-bold-bar', name: 'Bold Bar', color: '#111111', render: boldBar, sample: SAMPLES['cl-bold-bar'] },
  { id: 'cl-geo-navy', name: 'Navy Angles', color: '#13294b', render: geoNavy, sample: SAMPLES['cl-geo-navy'] },
  { id: 'cl-geo-photo', name: 'Indigo Photo', color: '#2b2a7d', render: geoPhoto, sample: SAMPLES['cl-geo-photo'] },
  { id: 'cl-ornament', name: 'Ornate Serif', color: '#222222', render: ornament, sample: SAMPLES['cl-ornament'] },
  { id: 'cl-left-rule', name: 'Left Rule', color: '#111111', render: leftRule, sample: SAMPLES['cl-left-rule'] },
  { id: 'cl-gold-monogram', name: 'Gold Monogram', color: '#b8955a', render: goldMonogram, sample: SAMPLES['cl-gold-monogram'] },
  { id: 'cl-serif-center', name: 'Classic Serif', color: '#111111', render: serifCenter, sample: SAMPLES['cl-serif-center'] },
  { id: 'cl-wave', name: 'Teal Wave', color: '#1f8a7a', render: wave, sample: SAMPLES['cl-wave'] },
  { id: 'cl-clean', name: 'Clean Modern', color: '#0ea5c6', render: clean, sample: SAMPLES['cl-clean'] },
  { id: 'cl-hex', name: 'Hexagon', color: '#1d4ed8', render: hexDesign('#1d4ed8', '#111111'), sample: SAMPLES['cl-hex'] },
  { id: 'cl-hex-violet', name: 'Hexagon Violet', color: '#5b3fd6', render: hexDesign('#5b3fd6', '#111111'), sample: SAMPLES['cl-hex-violet'] },
  { id: 'cl-dots', name: 'Dot Pattern', color: '#1e88e5', render: dots, sample: SAMPLES['cl-dots'] },
  { id: 'cl-navy-tan', name: 'Navy & Tan', color: '#1f3b5a', render: navyTan, sample: SAMPLES['cl-navy-tan'] },
];
