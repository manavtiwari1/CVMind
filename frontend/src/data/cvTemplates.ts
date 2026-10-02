// CVMind resume templates (2026 set).
//
// Every template follows the same rules so the editor features work on all of them:
// - one root <div> that fills the page (min-height uses --rs-h, set by the editor and the PDF renderer)
// - section titles are block lines in UPPERCASE or underlined (Rearrange finds them)
// - each section lives in its own wrapper, and repeated items (jobs, achievements, skills) are identical
//   siblings (so "+ Entry", move and delete work)
// - the locked CVMind footer is the root's last child (the AI never rewrites it; it is re-attached)
import type { Template } from './resumeTemplates';
import { CVMIND_MARK } from './brand';

/* ───────────────────────────── shared pieces ───────────────────────────── */

const PATHS: Record<string, string> = {
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  at: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  headset: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
  user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  briefcase: '<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>',
  cap: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
};
const ACH_ICONS = ['gear', 'headset', 'wrench', 'award'];

const icon = (name: string, color: string, size = 12, stroke = 2.2) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" style="flex:none;">${PATHS[name]}</svg>`;

/** Grey "add your photo" placeholder. It is an <img>, so clicking it in the editor opens the image dialog. */
const AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#e8e8e8"/><circle cx="60" cy="50" r="22" fill="none" stroke="#8a8a8a" stroke-width="9"/><path d="M18 112c6-22 22-34 42-34s36 12 42 34" fill="none" stroke="#8a8a8a" stroke-width="9"/></svg>')}`;
const avatar = (size: number, extra = '') =>
  `<img src="${AVATAR}" alt="Profile photo" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;display:block;flex:none;${extra}" />`;

const T = {
  NAME: 'YOUR NAME',
  Name: 'Your Name',
  ROLE: 'The role you are applying for?',
  SUMMARY: "Briefly explain why you're a great fit for the role - use the AI assistant to tailor this summary for each job posting.",
  BULLET: 'Highlight your accomplishments, using numbers if possible.',
  ACH: 'Your Achievement',
  ACH_D: 'Describe what you did and the impact it had.',
};
const SKILLS = ['Your Skill', 'Another Skill', 'One More Skill'];
const CONTACTS: [string, string][] = [['phone', 'Phone'], ['at', 'Email'], ['link', 'LinkedIn/Portfolio'], ['pin', 'Location']];

const times = (n: number, fn: (i: number) => string) => Array.from({ length: n }, (_, i) => fn(i)).join('\n');

/** Contact line with icons. */
const contactRow = (iconColor: string, style: string, gap = 14) =>
  `<div style="display:flex;flex-wrap:wrap;gap:4px ${gap}px;${style}">${CONTACTS.map(([i, label]) =>
    `<span style="display:inline-flex;align-items:center;gap:5px;">${icon(i, iconColor, 12)}${label}</span>`).join('')}</div>`;

/** Locked CVMind footer; must stay the root's last child. */
const footer = ({ left = '52px', right = '52px', bottom = '24px', color = '#6b7280', strong = '#111827' } = {}) => `
  <!-- FOOTER BRANDING (Powered by CVMind) - locked so it cannot be edited or removed by accident -->
  <div contenteditable="false" spellcheck="false" style="position:absolute;left:${left};right:${right};bottom:${bottom};display:flex;justify-content:space-between;align-items:center;font-family:'Inter',Arial,sans-serif;font-size:10.5px;color:${color};user-select:none;-webkit-user-select:none;">
    <a href="https://cvmind.in" target="_blank" rel="noopener" style="color:${color};text-decoration:none;">cvmind.in</a>
    <span style="display:inline-flex;align-items:center;gap:6px;">Powered by <span style="display:inline-flex;align-items:center;gap:4px;font-weight:800;color:${strong};"><img src="${CVMIND_MARK}" alt="" width="14" height="14" draggable="false" style="display:block;border-radius:3px;pointer-events:none;" />CVMind</span></span>
  </div>`;

/** Page root. min-height fills one page; extra bottom padding keeps content clear of the footer. */
const page = (style: string, inner: string, foot: string) =>
  `<div style="position:relative;box-sizing:border-box;width:100%;min-height:calc(var(--rs-h, 1123px) - 4px);padding-bottom:72px;${style}">
${inner}
${foot}
</div>`;

const meta = (color: string, items: [string, string, string][]) =>
  `<div style="display:flex;flex-wrap:wrap;gap:4px 14px;font-size:11px;">${items.map(([i, label, c]) =>
    `<span style="display:inline-flex;align-items:center;gap:5px;color:${c};">${i ? icon(i, color, 11) : ''}${label}</span>`).join('')}</div>`;

/* ───────────────────────────── templates ───────────────────────────── */

const doubleColumn = (): string => {
  const A = '#1e88e5';
  const H = (t: string) => `<div style="font-size:15px;font-weight:700;text-transform:uppercase;color:#111;border-bottom:3px solid #111;padding-bottom:2px;margin:0 0 6px;">${t}</div>`;
  const sec = (h: string, body: string) => `<div style="margin-bottom:16px;">\n${H(h)}\n${body}\n</div>`;
  const job = `<div style="padding:6px 0;border-bottom:1px dashed #cfd5df;">
<div style="font-size:13px;font-weight:700;color:#111;">Title</div>
<div style="font-size:12.5px;font-weight:700;color:${A};">Company Name</div>
${meta('#6b7280', [['cal', 'Date period', '#9aa3b2'], ['pin', 'Location', '#4b5563']])}
<ul style="margin:3px 0 0;padding-left:16px;"><li>${T.BULLET}</li></ul>
</div>`;
  const ach = `<div style="padding:5px 0;border-bottom:1px dashed #cfd5df;"><div style="font-size:12.5px;font-weight:700;color:#111;">${T.ACH}</div><div style="color:#4b5563;">${T.ACH_D}</div></div>`;
  const chip = (s: string) => `<span style="display:inline-block;font-weight:700;font-size:11.5px;color:#4b5563;border-bottom:1px solid #b8c0cc;padding:3px 8px;margin:0 6px 6px 0;">${s}</span>`;
  return page("font-family:'Rubik',Arial,sans-serif;color:#1f2430;font-size:12px;line-height:1.45;background:#fff;padding:40px 42px 72px;", `
<div style="margin-bottom:18px;">
<div style="font-size:30px;font-weight:700;letter-spacing:.3px;color:#111;line-height:1.1;">${T.NAME}</div>
<div style="font-size:14px;font-weight:600;color:${A};margin:4px 0 8px;">${T.ROLE}</div>
${contactRow(A, 'font-size:11.5px;font-weight:600;color:#374151;')}
</div>
<div style="display:flex;gap:30px;">
<div style="flex:1.45;min-width:0;">
${sec('Summary', `<p style="margin:0;color:#4b5563;">${T.SUMMARY}</p>`)}
${sec('Experience', times(4, () => job))}
</div>
<div style="flex:1;min-width:0;">
${sec('Key Achievements', times(4, () => ach))}
${sec('Skills', `<div>${SKILLS.map(chip).join('')}</div>`)}
${sec('Education', `<div style="padding:4px 0;"><div style="font-size:13px;font-weight:700;color:#111;">Degree and Field of Study</div><div style="font-size:12.5px;font-weight:700;color:${A};">School or University</div>${meta('#6b7280', [['cal', 'Date period', '#9aa3b2'], ['pin', 'Location', '#4b5563']])}</div>`)}
${sec('Training / Courses', `<div style="padding:4px 0;"><div style="font-size:12.5px;font-weight:700;color:#111;">Course Title</div><div style="color:#4b5563;">Which institution provided the course?</div></div>`)}
</div>
</div>`, footer({ left: '42px', right: '42px' }));
};

const ivyLeague = (): string => {
  const serif = "'Merriweather',Georgia,serif";
  const H = (t: string) => `<div style="font-family:${serif};text-align:center;font-size:14px;font-weight:700;color:#111;border-bottom:1px solid #222;padding-bottom:4px;margin:0 0 8px;">${t}</div>`;
  const sec = (h: string, body: string) => `<div style="margin-bottom:16px;">\n${H(h)}\n${body}\n</div>`;
  const row = (l: string, r: string, ls: string, rs: string) => `<div style="display:flex;justify-content:space-between;gap:12px;"><span style="${ls}">${l}</span><span style="${rs}">${r}</span></div>`;
  const job = `<div style="margin-bottom:9px;">
${row('Company Name', 'Location', 'font-size:14px;color:#6b7280;', 'font-size:11.5px;color:#111;')}
${row('Title', 'Date period', 'font-size:12px;color:#111;', 'font-size:11.5px;color:#9ca3af;')}
<ul style="margin:3px 0 0;padding-left:16px;font-size:11.5px;"><li>${T.BULLET}</li></ul>
</div>`;
  const ach = `<div><div style="font-size:12px;color:#111;">${T.ACH}</div><div style="font-size:11px;color:#4b5563;">${T.ACH_D}</div></div>`;
  return page("font-family:'Lato',Arial,sans-serif;color:#222;font-size:11.5px;line-height:1.5;background:#fff;padding:40px 52px 72px;", `
<div style="text-align:center;margin-bottom:12px;">
<div style="font-family:${serif};font-size:19px;font-weight:700;color:#111;">${T.NAME}</div>
<div style="font-size:15px;color:#6b7280;margin:2px 0;">${T.ROLE}</div>
<div style="font-size:11px;color:#374151;">Phone &nbsp;•&nbsp; Email &nbsp;•&nbsp; LinkedIn/Portfolio &nbsp;•&nbsp; Location</div>
</div>
${sec('SUMMARY', `<p style="margin:0 0 6px;">${T.SUMMARY}</p>`)}
${sec('Experience', times(4, () => job))}
${sec('KEY ACHIEVEMENTS', `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px 18px;">${times(4, () => ach)}</div>`)}
${sec('Skills', `<div>${SKILLS.map(s => `<span style="display:inline-block;border-bottom:1px solid #e5e7eb;padding:2px 0;margin-right:14px;">${s}</span>`).join('')}</div>`)}
${sec('Education', `<div>${row('School or University', 'Location', 'font-size:14px;color:#6b7280;', 'font-size:11.5px;color:#111;')}${row('Degree and Field of Study', 'Date period', 'font-size:12px;color:#111;', 'font-size:11.5px;color:#9ca3af;')}</div>`)}
`, footer());
};

const elegant = (): string => {
  const A = '#1a91f0';
  const NAVY = '#22405f';
  const Hm = (t: string) => `<div style="font-size:15px;font-weight:400;text-transform:uppercase;color:#333;border-bottom:1px solid #9ca3af;padding-bottom:4px;margin:0 0 8px;">${t}</div>`;
  const Hs = (t: string) => `<div style="font-size:15px;font-weight:400;text-transform:uppercase;color:#fff;border-bottom:1px solid #fff;padding-bottom:4px;margin:0 0 8px;">${t}</div>`;
  const row = (l: string, r: string, ls: string, rs: string) => `<div style="display:flex;justify-content:space-between;gap:10px;"><span style="${ls}">${l}</span><span style="${rs}">${r}</span></div>`;
  const job = `<div style="margin-bottom:9px;">
${row('Title', 'Date period', 'font-size:13.5px;color:#333;', 'font-size:11px;color:#9ca3af;')}
${row('Company Name', 'Location', `font-size:13px;color:${A};`, 'font-size:11px;color:#333;')}
<ul style="margin:3px 0 0;padding-left:16px;font-size:11px;"><li>${T.BULLET}</li></ul>
</div>`;
  const ach = `<div style="margin-bottom:10px;"><div style="font-size:14px;color:#fff;">${T.ACH}</div><div style="font-size:11px;color:#dbe4ee;">${T.ACH_D}</div></div>`;
  return page(`font-family:'Rubik',Arial,sans-serif;font-size:11.5px;line-height:1.45;color:#333;background:linear-gradient(90deg,#fff 65%,${NAVY} 65%);display:flex;padding:0 0 72px;`, `
<div style="width:65%;box-sizing:border-box;padding:40px 34px 0 40px;">
<div style="font-size:26px;font-weight:700;color:#333;">${T.NAME}</div>
<div style="font-size:15px;color:${A};margin:2px 0 8px;">${T.ROLE}</div>
${contactRow('#9ca3af', 'font-size:12px;color:#333;margin-bottom:22px;', 12)}
<div style="margin-bottom:16px;">
${Hm('Summary')}
<p style="margin:0 0 8px;font-size:11px;">${T.SUMMARY}</p>
</div>
<div style="margin-bottom:16px;">
${Hm('Experience')}
${times(4, () => job)}
</div>
</div>
<div style="width:35%;box-sizing:border-box;padding:118px 30px 0 34px;color:#fff;border-top:16px solid #1b3550;">
<div style="margin-bottom:18px;">
${Hs('Key Achievements')}
${times(4, () => ach)}
</div>
<div style="margin-bottom:18px;">
${Hs('Skills')}
<div>${SKILLS.map(s => `<span style="display:inline-block;border-bottom:1px solid rgba(255,255,255,.35);padding:2px 0;margin:0 12px 6px 0;font-size:11px;">${s}</span>`).join('')}</div>
</div>
<div style="margin-bottom:18px;">
${Hs('Education')}
<div><div style="font-size:13px;font-weight:700;">Degree and Field of Study</div><div style="font-size:11.5px;">School or University</div>${row('Date period', 'Location', 'font-size:11px;color:#9fb3c8;', 'font-size:11px;color:#fff;')}</div>
</div>
</div>`, footer({ left: '40px', right: 'calc(35% + 34px)' }));
};

const crest = (): string => {
  const serif = "'EB Garamond','Cormorant Garamond',Georgia,serif";
  const INK = '#3b2f1e';
  const H = (t: string) => `<div style="font-size:12px;letter-spacing:2.5px;text-transform:uppercase;color:#4a4136;margin:0 0 12px;">${t}</div>`;
  const sec = (h: string, body: string) => `<div style="border-top:1px solid #e7e0d2;padding-top:18px;margin-top:18px;">\n${H(h)}\n${body}\n</div>`;
  const job = `<div style="margin-bottom:14px;">
<div style="display:flex;justify-content:space-between;"><span style="font-size:15.5px;color:${INK};">Title</span><span style="font-size:13px;color:#9a9182;">Date period</span></div>
<div style="font-size:13px;color:#8b8172;">Company Name — Location</div>
<ul style="list-style:none;margin:6px 0 0;padding:0;font-size:13px;"><li>— &nbsp;${T.BULLET}</li></ul>
</div>`;
  const ach = `<div style="margin-bottom:12px;"><div style="font-size:15px;color:${INK};">${T.ACH}</div><div style="font-size:13px;">${T.ACH_D}</div></div>`;
  return page(`font-family:${serif};color:#2f2a22;font-size:13px;line-height:1.55;background:#fffbf3;padding:46px 56px 72px;`, `
<div style="text-align:center;">
<div style="font-size:40px;color:${INK};line-height:1.15;">${T.Name}</div>
<div style="font-size:11.5px;letter-spacing:3px;text-transform:uppercase;color:#8b8172;margin:8px 0 14px;">${T.ROLE}</div>
<div style="border-top:1px solid #e7e0d2;border-bottom:1px solid #e7e0d2;padding:9px 0;font-size:13px;">Phone &nbsp;·&nbsp; Email &nbsp;·&nbsp; LinkedIn/Portfolio &nbsp;·&nbsp; Location</div>
</div>
<div style="text-align:center;padding:18px 40px 0;">
<p style="margin:0 0 14px;font-size:15px;">${T.SUMMARY}</p>
</div>
${sec('Experience', times(4, () => job))}
${sec('Key Achievements', times(2, () => ach))}
${sec('Skills', `<div>${SKILLS.map(s => `<span style="display:inline-block;border-bottom:1px solid #e7e0d2;margin-right:16px;">${s}</span>`).join('')}</div>`)}
${sec('Education', `<div><div style="display:flex;justify-content:space-between;"><span style="font-size:15.5px;color:${INK};">Degree and Field of Study</span><span style="font-size:13px;color:#9a9182;">Date period</span></div><div style="font-size:13px;color:#8b8172;">School or University — Location</div></div>`)}
`, footer({ left: '56px', right: '56px', color: '#8b8172', strong: INK }));
};

const serifMinimal = (): string => {
  const serif = "'Cormorant Garamond','EB Garamond',Georgia,serif";
  const INK = '#2b2b2b';
  const H = (t: string) => `<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#333;font-weight:500;margin:0 0 8px;">${t}</div>`;
  const sec = (h: string, body: string) => `<div style="margin-top:16px;">\n${H(h)}\n${body}\n</div>`;
  const job = `<div style="margin-bottom:10px;">
<div style="display:flex;justify-content:space-between;align-items:baseline;"><span style="font-family:${serif};font-size:18px;color:#777;">Title</span><span style="font-family:${serif};font-size:17px;color:#bbb;">Date period</span></div>
<div style="font-size:12px;color:${INK};">Company Name — Location</div>
<ul style="margin:4px 0 0;padding-left:16px;font-size:12px;"><li>${T.BULLET}</li></ul>
</div>`;
  const ach = (i: number) => `<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:8px;">${icon(ACH_ICONS[i], '#555', 26, 1.4)}<div><div style="font-family:${serif};font-size:17px;color:#555;">${T.ACH}</div><div style="font-size:12px;color:${INK};">${T.ACH_D}</div></div></div>`;
  return page(`font-family:'Inter',Arial,sans-serif;color:${INK};font-size:12px;line-height:1.5;background:#fff;padding:46px 56px 72px;`, `
<div style="font-family:${serif};font-size:48px;font-weight:400;color:${INK};line-height:1.1;">${T.Name}</div>
<div style="font-size:13px;color:#777;margin:10px 0 8px;">${T.ROLE}</div>
<div style="font-size:12.5px;color:#333;padding-bottom:14px;border-bottom:1px solid #ececec;">Phone &nbsp;·&nbsp; Email &nbsp;·&nbsp; LinkedIn/Portfolio &nbsp;·&nbsp; Location</div>
<div style="padding:14px 0;border-bottom:1px solid #ececec;"><p style="margin:0;font-family:${serif};font-style:italic;font-size:18px;color:#777;">${T.SUMMARY}</p></div>
${sec('Experience', times(4, () => job))}
${sec('Key Achievements', times(4, ach))}
${sec('Skills', `<div>${SKILLS.map(s => `<span style="display:inline-block;border-bottom:1px solid #ececec;margin-right:14px;">${s}</span>`).join('')}</div>`)}
${sec('Education', `<div><div style="display:flex;justify-content:space-between;align-items:baseline;"><span style="font-family:${serif};font-size:18px;color:#777;">Degree and Field of Study</span><span style="font-family:${serif};font-size:17px;color:#bbb;">Date period</span></div><div style="font-size:12px;">School or University — Location</div></div>`)}
`, footer({ left: '56px', right: '56px' }));
};

const modern = (): string => {
  const A = '#00b5d8';
  const H = (t: string) => `<div style="font-size:13px;font-weight:400;text-transform:uppercase;color:#555;border-bottom:1px solid #a3a3a3;padding-bottom:3px;margin:0 0 8px;">${t}</div>`;
  const sec = (h: string, body: string) => `<div style="margin-bottom:16px;">\n${H(h)}\n${body}\n</div>`;
  const job = `<div style="margin-bottom:10px;">
<div style="font-size:15px;color:#333;">Title</div>
<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><span style="font-size:13px;color:${A};">Company Name</span>${meta('#777', [['cal', 'Date period', '#9ca3af'], ['pin', 'Location', '#444']])}</div>
<ul style="margin:3px 0 0;padding-left:16px;font-size:11.5px;"><li>${T.BULLET}</li></ul>
</div>`;
  const ach = (i: number) => `<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:10px;"><span style="width:38px;height:38px;border-radius:50%;background:#f1f1f1;display:inline-flex;align-items:center;justify-content:center;flex:none;">${icon(ACH_ICONS[i], A, 15)}</span><div><div style="font-size:14px;color:#333;">${T.ACH}</div><div style="font-size:11.5px;color:#555;">${T.ACH_D}</div></div></div>`;
  return page("font-family:'Rubik',Arial,sans-serif;color:#333;font-size:11.5px;line-height:1.45;background:#fff;padding:40px 44px 72px;", `
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;">
<div>
<div style="font-size:34px;font-weight:700;color:#333;line-height:1.1;">${T.NAME}</div>
<div style="font-size:16px;color:${A};margin:4px 0 10px;">${T.ROLE}</div>
${contactRow('#9ca3af', 'font-size:12px;color:#444;')}
</div>
${avatar(100)}
</div>
<div style="display:flex;gap:46px;">
<div style="flex:1.25;min-width:0;">
${sec('Summary', `<p style="margin:0 0 8px;">${T.SUMMARY}</p>`)}
${sec('Experience', times(4, () => job))}
</div>
<div style="flex:1;min-width:0;">
${sec('Key Achievements', times(4, ach))}
${sec('Skills', `<div>${SKILLS.map(s => `<span style="display:inline-block;font-size:12.5px;color:#333;border-bottom:1px solid #b8b8b8;padding:3px 8px;margin:0 6px 6px 0;">${s}</span>`).join('')}</div>`)}
${sec('Education', `<div><div style="font-size:15px;color:#333;">Degree and Field of Study</div><div style="font-size:13px;color:${A};">School or University</div>${meta('#777', [['cal', 'Date period', '#9ca3af'], ['pin', 'Location', '#444']])}</div>`)}
</div>
</div>`, footer({ left: '44px', right: '44px' }));
};

const tealSidebar = (): string => {
  const TEAL = '#00675f';
  const A = '#16a99e';
  const Hs = (t: string) => `<div style="font-size:18px;font-weight:400;text-transform:uppercase;color:#fff;border-bottom:1px solid rgba(255,255,255,.85);padding-bottom:5px;margin:0 0 10px;">${t}</div>`;
  const Hm = (t: string) => `<div style="font-size:19px;font-weight:400;text-transform:uppercase;color:#444;border-bottom:1px solid #bdbdbd;padding-bottom:5px;margin:0 0 10px;">${t}</div>`;
  const row = (l: string, r: string, ls: string, rs: string) => `<div style="display:flex;justify-content:space-between;gap:10px;"><span style="${ls}">${l}</span><span style="${rs}">${r}</span></div>`;
  const job = `<div style="margin-bottom:10px;">
${row('Title', 'Date period', 'font-size:15px;color:#444;', 'font-size:11.5px;color:#9ca3af;')}
${row('Company Name', 'Location', `font-size:14px;color:${A};`, 'font-size:11.5px;color:#444;')}
<ul style="margin:3px 0 0;padding-left:16px;font-size:11px;"><li>${T.BULLET}</li></ul>
</div>`;
  const ach = (i: number) => `<div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px;">${icon(ACH_ICONS[i], '#fff', 13)}<div><div style="font-size:13.5px;color:#fff;">${T.ACH}</div><div style="font-size:11px;color:#d6efec;">${T.ACH_D}</div></div></div>`;
  return page(`font-family:'Rubik',Arial,sans-serif;font-size:11.5px;line-height:1.45;color:#444;display:flex;background:linear-gradient(90deg,${TEAL} 35%,#fff 35%);padding:0 0 72px;`, `
<div style="width:35%;box-sizing:border-box;padding:40px 28px 0 44px;color:#fff;border-top:16px solid #004d47;">
<div style="font-size:30px;font-weight:300;color:#fff;margin-bottom:26px;">${T.NAME}</div>
<div style="margin-bottom:18px;">
${Hs('Key Achievements')}
${times(4, ach)}
</div>
<div style="margin-bottom:18px;">
${Hs('Skills')}
<div>${SKILLS.map(s => `<span style="display:inline-block;border-bottom:1px solid rgba(255,255,255,.35);padding:2px 0;margin:0 12px 6px 0;font-size:11.5px;">${s}</span>`).join('')}</div>
</div>
<div style="margin-bottom:18px;">
${Hs('Education')}
<div><div style="font-size:14px;font-weight:700;">Degree and Field of Study</div><div style="font-size:12px;margin:2px 0;">School or University</div>${row('Date period', 'Location', 'font-size:11px;color:#9fd3cd;', 'font-size:11px;color:#fff;')}</div>
</div>
</div>
<div style="width:65%;box-sizing:border-box;padding:56px 44px 0 26px;">
<div style="font-size:17px;color:${A};margin-bottom:6px;">${T.ROLE}</div>
${contactRow('#9ca3af', 'font-size:12px;color:#444;margin-bottom:22px;', 12)}
<div style="margin-bottom:16px;">
${Hm('Summary')}
<p style="margin:0 0 8px;font-size:11.5px;">${T.SUMMARY}</p>
</div>
<div style="margin-bottom:16px;">
${Hm('Experience')}
${times(4, () => job)}
</div>
</div>`, footer({ left: 'calc(35% + 26px)', right: '44px' }));
};

const greenFresh = (): string => {
  const G = '#2f9e6e';
  const DARK = '#1f4d3f';
  const H = (ic: string, t: string) => `<div style="display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700;text-transform:uppercase;color:${DARK};margin:0 0 10px;"><span style="width:28px;height:28px;border-radius:5px;background:#cdebdc;display:inline-flex;align-items:center;justify-content:center;flex:none;">${icon(ic, DARK, 15)}</span>${t}</div>`;
  const row = (l: string, r: string, ls: string, rs: string) => `<div style="display:flex;justify-content:space-between;gap:10px;"><span style="${ls}">${l}</span><span style="${rs}">${r}</span></div>`;
  const job = `<div style="margin-bottom:10px;">
${row('Company Name', 'Location', 'font-size:13.5px;font-weight:700;color:#333;', 'font-size:12.5px;color:#444;')}
${row('Title', 'Date period', 'font-size:13.5px;color:#444;', 'font-size:12.5px;color:#b3b3b3;')}
<ul style="margin:2px 0 0;padding-left:16px;font-size:11.5px;"><li>${T.BULLET}</li></ul>
</div>`;
  const ach = `<div style="display:flex;gap:12px;margin-bottom:10px;"><span style="width:7px;height:7px;border-radius:50%;background:${DARK};margin-top:6px;flex:none;"></span><div><div style="font-size:13.5px;font-weight:700;color:#333;">${T.ACH}</div><div style="font-size:11.5px;color:#555;">${T.ACH_D}</div></div></div>`;
  const contact = (i: string, l: string) => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:12px;">${icon(i, G, 13)}${l}</div>`;
  return page("font-family:'Rubik',Arial,sans-serif;color:#444;font-size:11.5px;line-height:1.45;background:#fff;padding:52px 44px 72px;display:flex;gap:40px;", `
<div style="width:32%;flex:none;">
<div contenteditable="false" style="position:relative;width:180px;height:190px;margin-bottom:22px;">
<svg width="190" height="200" viewBox="0 0 190 200" style="position:absolute;left:-10px;top:-12px;" aria-hidden="true"><path d="M40 20c40-22 110-10 130 30s8 110-40 132-110 8-122-40S0 42 40 20z" fill="#cfeedd"/><circle cx="148" cy="44" r="26" fill="#bfe6cf"/><circle cx="26" cy="150" r="17" fill="#5cc28f"/></svg>
${avatar(160, 'position:absolute;left:12px;top:12px;')}
</div>
<div style="margin-bottom:18px;">
${H('mail', 'Contacts')}
${contact('phone', 'Phone')}${contact('at', 'Email')}${contact('link', 'LinkedIn/Portfolio')}${contact('pin', 'Location')}
</div>
<div style="margin-bottom:18px;">
${H('flag', 'Key Achievements')}
${times(4, () => ach)}
</div>
<div style="margin-bottom:18px;">
${H('rocket', 'Skills')}
<div>${SKILLS.map(s => `<span style="display:inline-block;border-bottom:1px solid #d1e7dc;padding:2px 0;margin:0 12px 6px 0;font-size:12px;">${s}</span>`).join('')}</div>
</div>
<div style="margin-bottom:18px;">
${H('cap', 'Education')}
<div><div style="font-size:13.5px;font-weight:700;color:#333;">School or University</div><div style="font-size:13.5px;">Degree and Field of Study</div>${row('Location', 'Date period', 'font-size:12px;', 'font-size:12px;color:#b3b3b3;')}</div>
</div>
</div>
<div style="flex:1;min-width:0;">
<div style="font-size:42px;font-weight:300;color:#444;line-height:1.1;">${T.NAME}</div>
<div style="display:inline-block;background:#a8dfc2;color:#2f4f45;border-radius:22px;padding:6px 18px;font-size:16px;letter-spacing:2px;text-transform:uppercase;margin:12px 0 22px;">${T.ROLE}</div>
<div style="margin-bottom:18px;">
${H('user', 'Summary')}
<p style="margin:0 0 8px;font-size:11.5px;">${T.SUMMARY}</p>
</div>
<div style="margin-bottom:18px;">
${H('briefcase', 'Experience')}
${times(4, () => job)}
</div>
</div>`, footer({ left: '44px', right: '44px', strong: DARK }));
};

const timeline = (): string => {
  const NAVY = '#1d3a8a';
  const OR = '#f68b1e';
  const H = (t: string) => `<div style="font-size:17px;font-weight:800;text-transform:uppercase;color:${NAVY};margin:0 0 10px;">${t}</div>`;
  const sec = (h: string, body: string) => `<div style="margin-bottom:18px;">\n${H(h)}\n${body}\n</div>`;
  const tl = (title: string, sub: string, bullet: boolean) => `<div style="display:flex;">
<div style="width:96px;flex:none;"><div style="font-size:12px;font-weight:700;color:#8ea2c9;">Date period</div><div style="font-size:11.5px;color:#555;margin-top:6px;">Location</div></div>
<div style="position:relative;flex:1;border-left:1px solid #555;padding:0 0 12px 22px;"><span style="position:absolute;left:-4px;top:5px;width:7px;height:7px;border-radius:50%;background:#111;"></span>
<div style="font-size:14px;color:${NAVY};">${title}</div><div style="font-size:13.5px;font-weight:700;color:${OR};">${sub}</div>${bullet ? `<ul style="margin:3px 0 0;padding-left:14px;font-size:11.5px;color:#444;"><li>${T.BULLET}</li></ul>` : ''}</div>
</div>`;
  const ach = (i: number) => `<div style="display:flex;gap:12px;align-items:flex-start;"><span style="padding-top:2px;">${icon(ACH_ICONS[i], OR, 16)}</span><div><div style="font-size:13px;font-weight:700;color:${NAVY};">${T.ACH}</div><div style="font-size:11.5px;color:#444;">${T.ACH_D}</div></div></div>`;
  return page("font-family:'Open Sans',Arial,sans-serif;color:#333;font-size:11.5px;line-height:1.5;background:#fff;padding:40px 48px 72px;", `
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
<div>
<div style="font-size:34px;font-weight:800;color:${NAVY};line-height:1.1;">${T.NAME}</div>
<div style="font-size:15px;font-weight:700;color:${OR};margin:4px 0 12px;">${T.ROLE}</div>
${contactRow(OR, `font-size:12px;font-weight:700;color:#333;`)}
</div>
${avatar(118)}
</div>
${sec('Summary', `<p style="margin:0 0 8px;">${T.SUMMARY}</p>`)}
${sec('Experience', times(4, () => tl('Title', 'Company Name', true)))}
${sec('Key Achievements', `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 30px;">${times(4, ach)}</div>`)}
${sec('Skills', `<div>${SKILLS.map(s => `<span style="display:inline-block;font-weight:700;font-size:12px;border-bottom:1px solid #cfd5df;padding:3px 8px;margin:0 6px 6px 0;">${s}</span>`).join('')}</div>`)}
${sec('Education', tl('Degree and Field of Study', 'School or University', false))}
`, footer({ left: '48px', right: '48px' }));
};

const compact = (): string => {
  const A = '#1a91f0';
  const H = (t: string) => `<div style="font-size:13px;font-weight:400;text-transform:uppercase;color:#555;border-bottom:1px solid #999;padding-bottom:3px;margin:0 0 9px;">${t}</div>`;
  const sec = (h: string, body: string) => `<div style="margin-bottom:16px;">\n${H(h)}\n${body}\n</div>`;
  const job = `<div style="margin-bottom:10px;">
<div style="font-size:16px;color:#222;">Title</div>
<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><span style="font-size:13.5px;color:${A};">Company Name</span>${meta('#555', [['cal', 'Date period', '#aaa'], ['pin', 'Location', '#333']])}</div>
<ul style="margin:3px 0 0;padding-left:16px;font-size:11.5px;"><li>${T.BULLET}</li></ul>
</div>`;
  const ach = (i: number) => `<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:10px;"><span style="width:38px;height:38px;border-radius:50%;background:#f1f1f1;display:inline-flex;align-items:center;justify-content:center;flex:none;">${icon(ACH_ICONS[i], A, 15)}</span><div><div style="font-size:13.5px;color:#222;">${T.ACH}</div><div style="font-size:11.5px;color:#444;">${T.ACH_D}</div></div></div>`;
  return page("font-family:'Rubik',Arial,sans-serif;color:#333;font-size:11.5px;line-height:1.45;background:#fff;padding:40px 46px 72px;", `
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
<div>
<div style="font-size:34px;font-weight:700;color:#111;line-height:1.1;">${T.NAME}</div>
<div style="font-size:16px;color:${A};margin:4px 0 10px;">${T.ROLE}</div>
${contactRow('#9ca3af', 'font-size:12px;color:#333;', 10)}
</div>
${avatar(108)}
</div>
<div style="display:flex;gap:36px;">
<div style="width:34%;flex:none;">
${sec('Key Achievements', times(4, ach))}
${sec('Skills', `<div>${SKILLS.map(s => `<span style="display:inline-block;font-size:12.5px;color:#222;border-bottom:1px solid #b8b8b8;padding:3px 8px;margin:0 6px 6px 0;">${s}</span>`).join('')}</div>`)}
${sec('Education', `<div><div style="font-size:15px;color:#222;">Degree and Field of Study</div><div style="font-size:13.5px;color:${A};">School or University</div>${meta('#555', [['cal', 'Date period', '#aaa'], ['pin', 'Location', '#333']])}</div>`)}
</div>
<div style="flex:1;min-width:0;">
${sec('Summary', `<p style="margin:0 0 8px;">${T.SUMMARY}</p>`)}
${sec('Experience', times(4, () => job))}
</div>
</div>`, footer({ left: '46px', right: '46px' }));
};

const bold = (): string => {
  const A = '#3b6ef5';
  const INK = '#1f2937';
  const H = (t: string) => `<div style="font-size:18px;font-weight:700;text-transform:uppercase;color:${INK};border-bottom:3px solid ${INK};padding-bottom:2px;margin:0 0 8px;">${t}</div>`;
  const sec = (h: string, body: string) => `<div style="margin-bottom:18px;">\n${H(h)}\n${body}\n</div>`;
  const job = `<div style="padding:6px 0;border-bottom:1px dashed #d1d5db;">
<div style="font-size:14px;font-weight:700;color:${INK};">Title</div>
<div style="font-size:13.5px;font-weight:700;color:${A};">Company Name</div>
${meta('#6b7280', [['cal', 'Date period', '#9ca3af'], ['pin', 'Location', '#4b5563']])}
<ul style="margin:2px 0 0;padding-left:16px;font-size:11.5px;"><li>${T.BULLET}</li></ul>
</div>`;
  const ach = (i: number) => `<div style="display:flex;gap:12px;align-items:flex-start;padding:6px 0;border-bottom:1px dashed #d1d5db;">${icon(ACH_ICONS[i], A, 17)}<div><div style="font-size:13.5px;font-weight:700;color:${INK};">${T.ACH}</div><div style="font-size:11.5px;color:#4b5563;">${T.ACH_D}</div></div></div>`;
  return page(`font-family:'Rubik',Arial,sans-serif;color:${INK};font-size:11.5px;line-height:1.45;background:#fff;padding:40px 48px 72px;`, `
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
<div>
<div style="font-size:36px;font-weight:700;color:${INK};line-height:1.1;">${T.Name}</div>
<div style="font-size:17px;font-weight:700;color:${A};margin:4px 0 10px;">${T.ROLE}</div>
${contactRow(A, 'font-size:12px;font-weight:700;color:#374151;', 10)}
</div>
${avatar(118)}
</div>
${sec('Summary', `<p style="margin:0;padding:4px 0;border-bottom:1px dashed #d1d5db;">${T.SUMMARY}</p><p style="margin:0;padding:4px 0;">${T.SUMMARY}</p>`)}
${sec('Experience', times(4, () => job))}
${sec('Key Achievements', `<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 30px;">${times(4, ach)}</div>`)}
${sec('Skills', `<div>${SKILLS.map(s => `<span style="display:inline-block;font-weight:700;font-size:12.5px;color:#4b5563;border-bottom:1px solid #b8c0cc;padding:3px 8px;margin:0 6px 6px 0;">${s}</span>`).join('')}</div>`)}
${sec('Education', `<div><div style="font-size:14px;font-weight:700;">Degree and Field of Study</div><div style="font-size:13.5px;font-weight:700;color:${A};">School or University</div>${meta('#6b7280', [['cal', 'Date period', '#9ca3af'], ['pin', 'Location', '#4b5563']])}</div>`)}
`, footer({ left: '48px', right: '48px' }));
};

const wave = (): string => {
  const NAVY = '#1e3a8a';
  const A = '#4aa3f0';
  const H = (t: string) => `<div style="font-size:11px;text-transform:uppercase;color:#6b7280;margin:0 0 8px;">${t}</div>`;
  const sec = (h: string, body: string) => `<div style="margin-bottom:18px;">\n${H(h)}\n${body}\n</div>`;
  const job = `<div style="margin-bottom:10px;">
<div style="font-size:16px;color:${NAVY};">Title</div>
<div style="display:flex;gap:14px;font-size:12px;"><span style="color:#333;">Company Name</span><span style="color:#b3b3b3;">Date period</span><span style="color:#444;">Location</span></div>
<ul style="margin:2px 0 0;padding-left:16px;font-size:12px;"><li>${T.BULLET}</li></ul>
</div>`;
  const ach = (i: number) => `<div style="margin-bottom:10px;"><div style="display:flex;align-items:center;gap:8px;font-size:14px;color:${NAVY};">${icon(ACH_ICONS[i], A, 14)}${T.ACH}</div><div style="font-size:12px;color:#333;">${T.ACH_D}</div></div>`;
  const decor = `<div contenteditable="false" aria-hidden="true" style="position:absolute;inset:0;pointer-events:none;overflow:hidden;">
<svg width="100%" height="100%" viewBox="0 0 794 1123" preserveAspectRatio="none" style="position:absolute;inset:0;"><path d="M330 0c40 70 150 60 250 70s170 80 214 140V0z" fill="#dcecfb"/><path d="M0 930c80-10 150 30 210 90s90 103 110 103H0z" fill="#dcecfb"/><path d="M420 0c30 40 120 50 210 55s130 30 164 60" fill="none" stroke="#fff" stroke-width="1.5"/></svg>
</div>`;
  return page("font-family:'Inter',Arial,sans-serif;color:#333;font-size:12px;line-height:1.5;background:#fff;padding:44px 48px 72px;overflow:hidden;", `
${decor}
<div style="position:relative;display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;">
<div>
<div style="font-size:26px;color:${NAVY};line-height:1.15;">${T.Name}</div>
<div style="font-size:16px;color:${A};margin:2px 0 6px;">${T.ROLE}</div>
${contactRow('#9ca3af', 'font-size:12px;color:#333;', 12)}
</div>
${avatar(106)}
</div>
<div style="position:relative;display:flex;gap:40px;">
<div style="flex:1.25;min-width:0;">
${sec('Summary', `<p style="margin:0 0 8px;">${T.SUMMARY}</p>`)}
${sec('Experience', times(4, () => job))}
</div>
<div style="flex:1;min-width:0;">
${sec('Key Achievements', times(4, ach))}
${sec('Skills', `<div>${SKILLS.map(s => `<span style="display:inline-block;font-weight:700;font-size:12.5px;color:${NAVY};border-bottom:1px solid #b8c7e0;padding:3px 8px;margin:0 6px 6px 0;">${s}</span>`).join('')}</div>`)}
${sec('Education', `<div><div style="font-size:16px;color:${NAVY};">Degree and Field of Study</div><div style="font-size:13px;color:${A};">School or University</div><div style="display:flex;gap:14px;font-size:12px;"><span style="color:#b3b3b3;">Date period</span><span>Location</span></div></div>`)}
</div>
</div>`, footer({ left: '48px', right: '48px' }));
};

const narrow = (): string => {
  const A = '#1a91f0';
  const H = (t: string) => `<div style="font-size:13px;font-weight:400;text-transform:uppercase;color:#111;border-bottom:2px solid #111;padding-bottom:2px;margin:0 0 8px;">${t}</div>`;
  const sec = (h: string, body: string) => `<div style="margin-bottom:16px;">\n${H(h)}\n${body}\n</div>`;
  const job = `<div style="margin-bottom:10px;">
<div style="font-size:14px;color:#111;">Title</div>
<div style="font-size:12.5px;color:${A};">Company Name</div>
${meta('#555', [['cal', 'Date period', '#aaa'], ['pin', 'Location', '#333']])}
<ul style="margin:2px 0 0;padding-left:16px;font-size:11.5px;"><li>${T.BULLET}</li></ul>
</div>`;
  const ach = (i: number) => `<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:10px;"><span style="width:38px;height:38px;border-radius:50%;background:#f1f1f1;display:inline-flex;align-items:center;justify-content:center;flex:none;">${icon(ACH_ICONS[i], A, 15)}</span><div><div style="font-size:14px;color:#111;">${T.ACH}</div><div style="font-size:11.5px;color:#444;">${T.ACH_D}</div></div></div>`;
  return page("font-family:'Rubik',Arial,sans-serif;color:#333;font-size:11.5px;line-height:1.45;background:#fff;padding:40px 44px 72px;", `
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;">
<div>
<div style="font-size:34px;font-weight:700;color:#111;line-height:1.1;">${T.NAME}</div>
<div style="font-size:16px;color:${A};margin:4px 0 6px;">${T.ROLE}</div>
${contactRow('#9ca3af', 'font-size:12px;color:#333;', 12)}
</div>
${avatar(108)}
</div>
<div style="display:flex;gap:36px;">
<div style="width:220px;flex:none;">
${sec('Summary', `<p style="margin:0 0 8px;">${T.SUMMARY}</p>`)}
${sec('Experience', times(4, () => job))}
</div>
<div style="width:320px;flex:none;">
${sec('Key Achievements', times(4, ach))}
${sec('Skills', `<div>${SKILLS.map(s => `<span style="display:inline-block;font-weight:700;font-size:12px;border-bottom:1px solid #cfd5df;padding:3px 8px;margin:0 6px 6px 0;">${s}</span>`).join('')}</div>`)}
${sec('Education', `<div><div style="font-size:14px;color:#111;">Degree and Field of Study</div><div style="font-size:12.5px;color:${A};">School or University</div>${meta('#555', [['cal', 'Date period', '#aaa'], ['pin', 'Location', '#333']])}</div>`)}
</div>
</div>`, footer({ left: '44px', right: '44px' }));
};

const simple = (): string => {
  const A = '#1e88e5';
  const H = (t: string) => `<div style="font-size:15px;font-weight:700;text-transform:uppercase;color:#6b7280;margin:0 0 6px;">${t}</div>`;
  const sec = (h: string, body: string) => `<div style="margin-bottom:18px;">\n${H(h)}\n${body}\n</div>`;
  const row = (l: string, r: string, ls: string, rs: string) => `<div style="display:flex;justify-content:space-between;gap:10px;"><span style="${ls}">${l}</span><span style="${rs}">${r}</span></div>`;
  const job = `<div style="margin-bottom:8px;">
${row('Title', 'Location', 'font-size:17px;color:#111;', 'font-size:11.5px;color:#333;')}
${row('Company Name', 'Date period', `font-size:13.5px;color:${A};`, 'font-size:11.5px;color:#aaa;')}
<ul style="margin:2px 0 0;padding-left:16px;font-size:11.5px;"><li>${T.BULLET}</li></ul>
</div>`;
  const ach = `<div><div style="font-size:13.5px;font-weight:700;color:${A};">${T.ACH}</div><div style="font-size:11.5px;color:#333;">${T.ACH_D}</div></div>`;
  return page("font-family:'Inter',Arial,sans-serif;color:#333;font-size:11.5px;line-height:1.5;background:#fff;padding:44px 52px 72px;", `
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
<div>
<div style="font-size:34px;font-weight:800;color:#111;line-height:1.1;">${T.Name}</div>
<div style="font-size:17px;color:#333;margin:4px 0 6px;">${T.ROLE}</div>
<div style="font-size:12px;color:#111;">Phone &nbsp;&nbsp; Email &nbsp;&nbsp; LinkedIn/Portfolio &nbsp;&nbsp; Location</div>
</div>
${avatar(90)}
</div>
${sec('Summary', `<p style="margin:0 0 6px;">${T.SUMMARY}</p>`)}
${sec('Experience', times(4, () => job))}
${sec('Key Achievements', `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 36px;">${times(4, () => ach)}</div>`)}
${sec('Skills', `<div>${SKILLS.map(s => `<span style="display:inline-block;border-bottom:1px solid #e5e7eb;padding:2px 0;margin-right:16px;">${s}</span>`).join('')}</div>`)}
${sec('Education', `<div>${row('Degree and Field of Study', 'Location', 'font-size:17px;color:#111;', 'font-size:11.5px;color:#333;')}${row('School or University', 'Date period', 'font-size:13.5px;color:#333;', 'font-size:11.5px;color:#aaa;')}</div>`)}
`, footer());
};

const projects = (): string => {
  const A = '#00acc1';
  const raleway = "'Raleway','Rubik',Arial,sans-serif";
  const H = (t: string) => `<div style="font-family:${raleway};font-size:14px;font-weight:400;text-transform:uppercase;color:#333;border-bottom:1.5px solid #333;padding-bottom:2px;margin:0 0 8px;">${t}</div>`;
  const sec = (h: string, body: string) => `<div style="margin-bottom:16px;">\n${H(h)}\n${body}\n</div>`;
  const cell = 'border:1px solid #e5e7eb;padding:5px 8px;text-align:left;';
  const job = `<div style="margin-bottom:12px;">
<div style="font-family:${raleway};font-size:15px;color:#333;">Title</div>
<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><span style="font-size:13px;color:${A};">Company Name</span>${meta('#555', [['cal', 'Date period', '#aaa'], ['pin', 'Location', '#333']])}</div>
<ul style="margin:2px 0 8px;padding-left:16px;font-size:11.5px;"><li>${T.BULLET}</li></ul>
<table style="width:100%;border-collapse:collapse;font-size:11.5px;"><tr><th style="${cell}background:#f3f4f6;color:${A};font-weight:700;">Project name</th><th style="${cell}background:#f3f4f6;color:${A};font-weight:700;">Description</th></tr><tr><td style="${cell}">Text</td><td style="${cell}">Text</td></tr></table>
</div>`;
  const ach = (i: number) => `<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:10px;"><span style="width:34px;height:34px;border-radius:50%;background:#f1f1f1;display:inline-flex;align-items:center;justify-content:center;flex:none;">${icon(ACH_ICONS[i], A, 14)}</span><div><div style="font-size:13.5px;color:#333;">${T.ACH}</div><div style="font-size:11.5px;color:#444;">${T.ACH_D}</div></div></div>`;
  return page("font-family:'Open Sans',Arial,sans-serif;color:#333;font-size:11.5px;line-height:1.45;background:#fff;padding:40px 44px 72px;", `
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
<div>
<div style="font-family:${raleway};font-size:34px;font-weight:300;color:#222;line-height:1.1;">${T.NAME}</div>
<div style="font-size:16px;color:${A};margin:2px 0 6px;">${T.ROLE}</div>
${contactRow('#9ca3af', 'font-size:12.5px;color:#333;', 14)}
</div>
${avatar(106)}
</div>
<div style="display:flex;gap:36px;">
<div style="flex:1.3;min-width:0;">
${sec('Summary', `<p style="margin:0 0 8px;">${T.SUMMARY}</p>`)}
${sec('Experience', times(4, () => job))}
</div>
<div style="flex:1;min-width:0;">
${sec('Key Achievements', times(4, ach))}
${sec('Skills', `<div>${SKILLS.map(s => `<span style="display:inline-block;font-weight:700;font-size:12px;border-bottom:1px solid #cfd5df;padding:3px 8px;margin:0 6px 6px 0;">${s}</span>`).join('')}</div>`)}
${sec('Education', `<div><div style="font-family:${raleway};font-size:15px;color:#333;">Degree and Field of Study</div><div style="font-size:13px;color:${A};">School or University</div>${meta('#555', [['cal', 'Date period', '#aaa'], ['pin', 'Location', '#333']])}</div>`)}
</div>
</div>`, footer({ left: '44px', right: '44px' }));
};

const mint = (): string => {
  const G = '#2bb673';
  const H = (t: string) => `<div style="font-size:10.5px;text-transform:uppercase;color:${G};letter-spacing:.3px;margin:0 0 10px;">${t}</div>`;
  const sec = (h: string, body: string) => `<div style="margin-bottom:22px;">\n${H(h)}\n${body}\n</div>`;
  const job = `<div style="margin-bottom:12px;">
<div style="font-size:15px;color:#111;">Title</div>
<div style="display:flex;gap:14px;align-items:baseline;"><span style="font-size:13.5px;color:#333;">Company Name</span><span style="font-size:11.5px;color:#b3b3b3;">Date period</span><span style="font-size:11.5px;color:#333;">Location</span></div>
<ul style="margin:3px 0 0;padding-left:16px;font-size:11.5px;"><li>${T.BULLET}</li></ul>
</div>`;
  const ach = `<div style="margin-bottom:12px;"><div style="font-size:13px;color:#111;">${T.ACH}</div><div style="font-size:11.5px;color:#333;">${T.ACH_D}</div></div>`;
  return page("font-family:'Inter',Arial,sans-serif;color:#333;font-size:11.5px;line-height:1.5;background:#fff;padding:48px 52px 72px;", `
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;">
<div>
<div style="font-size:30px;font-weight:400;color:#111;line-height:1.15;">${T.NAME}</div>
<div style="font-size:15px;color:#333;margin:4px 0 6px;">${T.ROLE}</div>
${contactRow('#b3b3b3', 'font-size:12px;color:#333;', 12)}
</div>
${avatar(120)}
</div>
<div style="display:flex;gap:46px;">
<div style="flex:1.2;min-width:0;">
${sec('Summary', `<p style="margin:0 0 10px;">${T.SUMMARY}</p>`)}
${sec('Experience', times(4, () => job))}
</div>
<div style="flex:1;min-width:0;">
${sec('Key Achievements', times(4, () => ach))}
${sec('Skills', `<div>${SKILLS.map(s => `<span style="display:inline-block;font-weight:700;font-size:12px;color:#333;border-bottom:1px solid #eee;margin:0 12px 6px 0;">${s}</span>`).join('')}</div>`)}
${sec('Education', `<div><div style="font-size:15px;color:#111;">Degree and Field of Study</div><div style="font-size:13px;color:#333;">School or University</div><div style="display:flex;gap:14px;font-size:11.5px;"><span style="color:#b3b3b3;">Date period</span><span>Location</span></div></div>`)}
</div>
</div>`, footer());
};

/* ───────────────────────────── catalogue ───────────────────────────── */

const make = (id: string, name: string, tag: string, color: string, description: string, highlights: string[], html: string): Template => ({
  id, name, tag, icon: '📄', color, accent: `${color}1f`, description, highlights, html, type: 'resume',
});

export const CV_TEMPLATES: Template[] = [
  make('cv-double-column', 'Double Column', 'Modern · ATS-friendly', '#1e88e5', 'Two columns with bold section rules: experience on the left, achievements and skills on the right.', ['Two columns', 'Achievements', 'Training'], doubleColumn()),
  make('cv-ivy-league', 'Ivy League', 'Classic · ATS-friendly', '#111111', 'Centered serif headings and a single column, the traditional format recruiters know.', ['Single column', 'Serif headings', 'ATS safe'], ivyLeague()),
  make('cv-elegant', 'Elegant', 'Professional · Sidebar', '#1a91f0', 'Clean main column with a navy sidebar for achievements, skills and education.', ['Navy sidebar', 'Two columns', 'Photo-free'], elegant()),
  make('cv-crest', 'Crest', 'Creative · Serif', '#3b2f1e', 'Warm cream page, centered serif header and letter-spaced section titles.', ['Serif', 'Cream page', 'Single column'], crest()),
  make('cv-serif-minimal', 'Serif Minimal', 'Elegant · Minimal', '#2b2b2b', 'Large serif name, italic summary and outline icons for achievements.', ['Serif name', 'Minimal', 'Icons'], serifMinimal()),
  make('cv-modern', 'Modern', 'Modern · Photo', '#00b5d8', 'Two columns with a photo, icon achievements and a fresh cyan accent.', ['Photo', 'Icons', 'Two columns'], modern()),
  make('cv-polished', 'Polished', 'Creative · Sidebar', '#00675f', 'Teal sidebar with your name, achievements and skills; experience on the right.', ['Teal sidebar', 'Two columns', 'Bold header'], tealSidebar()),
  make('cv-contemporary', 'Contemporary', 'Creative · Photo', '#2f9e6e', 'Photo with soft shapes, icon section titles and a highlighted role badge.', ['Photo', 'Icon headings', 'Two columns'], greenFresh()),
  make('cv-timeline', 'Timeline', 'Creative · Timeline', '#f68b1e', 'Experience on a timeline with dates on the left, navy and orange accents.', ['Timeline', 'Photo', 'Bold colors'], timeline()),
  make('cv-compact', 'Compact', 'Modern · Photo', '#1a91f0', 'Achievements, skills and education in a left column; summary and experience on the right.', ['Left column', 'Photo', 'Icons'], compact()),
  make('cv-bold', 'Bold', 'Modern · ATS-friendly', '#3b6ef5', 'Strong underlined headings, dashed dividers and a two-column achievements grid.', ['Bold headings', 'Photo', 'Single column'], bold()),
  make('cv-wave', 'Wave', 'Creative · Design', '#4aa3f0', 'Soft blue wave shapes framing a clean two-column layout.', ['Decorative', 'Photo', 'Two columns'], wave()),
  make('cv-stylish', 'Stylish', 'Modern · Compact', '#1a91f0', 'A narrow experience column next to a wider achievements column.', ['Compact', 'Photo', 'Icons'], narrow()),
  make('cv-simple', 'Simple', 'Minimal · ATS-friendly', '#1e88e5', 'Single column with right-aligned dates and locations. Easy for parsers to read.', ['Single column', 'ATS safe', 'Photo'], simple()),
  make('cv-hybrid', 'Hybrid', 'Technical · Projects', '#00acc1', 'Each job comes with a small projects table, ideal for technical roles.', ['Projects table', 'Photo', 'Two columns'], projects()),
  make('cv-minimal', 'Minimal', 'Minimal · Light', '#2bb673', 'Light typography, small green section titles and plenty of white space.', ['Minimal', 'Photo', 'Two columns'], mint()),
];
