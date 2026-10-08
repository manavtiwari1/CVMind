const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Single column, standard headings, real text: the layout ATS parsers read most reliably
const STYLES = `
body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;line-height:1.35;color:#111;margin:0}
h1{font-size:20pt;margin:0}
.headline{margin:2px 0;font-size:11.5pt}
.contact{margin:2px 0 8px;font-size:9.5pt;color:#333}
h2{font-size:11pt;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #999;margin:12px 0 6px;padding-bottom:2px}
.entry{margin-bottom:8px;page-break-inside:avoid}
.entry-head{display:flex;justify-content:space-between;gap:12px}
.dates{white-space:nowrap;color:#333}
.meta{color:#444;font-size:9.5pt}
ul{margin:3px 0 0 16px;padding:0}
li{margin:1px 0}
p{margin:3px 0}`;

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export function formatMonth(value) {
  const match = String(value || '').match(/^(\d{4})(?:-(\d{1,2}))?$/);
  if (!match) return String(value || '');
  return match[2] ? `${MONTHS[Number(match[2]) - 1] ?? ''} ${match[1]}`.trim() : match[1];
}

export function formatDateRange({ startDate, endDate, current }) {
  return [formatMonth(startDate), current ? 'Present' : formatMonth(endDate)].filter(Boolean).join(' – ');
}

const section = (title, body) => (body ? `<section><h2>${title}</h2>${body}</section>` : '');
const bulletList = (bullets = []) => (bullets.length ? `<ul>${bullets.map((b) => `<li>${escapeHtml(b.text)}</li>`).join('')}</ul>` : '');

export function renderResumeHtml(resume) {
  const contact = resume.contact || {};
  const contactLine = [contact.email, contact.phone, contact.location, contact.linkedin, contact.github, contact.portfolio]
    .filter(Boolean).map(escapeHtml).join(' · ');

  const experience = (resume.experience || []).map((role) => `<div class="entry">
<div class="entry-head"><span><strong>${escapeHtml(role.title)}</strong>${role.company ? ` — ${escapeHtml(role.company)}` : ''}</span><span class="dates">${escapeHtml(formatDateRange(role))}</span></div>
${role.location ? `<div class="meta">${escapeHtml(role.location)}</div>` : ''}${bulletList(role.bullets)}</div>`).join('');

  const projects = (resume.projects || []).map((project) => `<div class="entry"><strong>${escapeHtml(project.name)}</strong>${bulletList(project.bullets)}</div>`).join('');

  const education = (resume.education || []).map((edu) => `<div class="entry">
<div class="entry-head"><span><strong>${escapeHtml(edu.degree)}</strong>${edu.field && !String(edu.degree).includes(edu.field) ? `, ${escapeHtml(edu.field)}` : ''}${edu.institution ? ` — ${escapeHtml(edu.institution)}` : ''}</span><span class="dates">${escapeHtml(edu.endYear)}</span></div>
${edu.gpa ? `<div class="meta">GPA: ${escapeHtml(edu.gpa)}</div>` : ''}</div>`).join('');

  const certifications = (resume.certifications || []).length
    ? `<ul>${resume.certifications.map((cert) => `<li>${escapeHtml(cert.name)}${[cert.issuer, cert.year].filter(Boolean).length ? ` (${[cert.issuer, cert.year].filter(Boolean).map(escapeHtml).join(', ')})` : ''}</li>`).join('')}</ul>`
    : '';

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(contact.name || 'Resume')}</title><style>${STYLES}</style></head><body>
<header><h1>${escapeHtml(contact.name)}</h1>${resume.headline ? `<p class="headline">${escapeHtml(resume.headline)}</p>` : ''}<p class="contact">${contactLine}</p></header>
${section('Summary', resume.summary ? `<p>${escapeHtml(resume.summary)}</p>` : '')}
${section('Experience', experience)}
${section('Projects', projects)}
${section('Skills', (resume.skills || []).length ? `<p>${resume.skills.map(escapeHtml).join(', ')}</p>` : '')}
${section('Education', education)}
${section('Certifications', certifications)}
${section('Languages', (resume.languages || []).length ? `<p>${resume.languages.map(escapeHtml).join(', ')}</p>` : '')}
</body></html>`;
}
