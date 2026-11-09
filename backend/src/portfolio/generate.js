import { callClaude, generatePortfolioSiteWithClaude } from '../services/gemini.js';
import { saveWork, findUserById, savePortfolioGenLog } from '../db.js';

// Building a portfolio site from a resume. Shared by the Portfolio Studio
// (/api/portfolio/generate-site) and Leo's build_portfolio tool.

export const PORTFOLIO_THEMES = {
  'dark-pro': { label: 'Dark Pro', bg: '#0a0a0f', card: '#12121a', accent: '#6366f1', text: '#e2e8f0', secondary: '#94a3b8' },
  ocean: { label: 'Ocean', bg: '#0c1a2e', card: '#0f2744', accent: '#0ea5e9', text: '#e0f2fe', secondary: '#7dd3fc' },
  emerald: { label: 'Emerald', bg: '#0a1a0f', card: '#0f2a1a', accent: '#10b981', text: '#d1fae5', secondary: '#6ee7b7' },
  purple: { label: 'Purple', bg: '#0f0a1e', card: '#1a1030', accent: '#a855f7', text: '#ede9fe', secondary: '#c4b5fd' },
  minimal: { label: 'Minimal', bg: '#ffffff', card: '#f8fafc', accent: '#2997ff', text: '#0f172a', secondary: '#475569' }
};

// No set look: the user's own description decides the design, or else the AI designer does
export const CUSTOM_LOOK = 'custom';
export const lookLabel = (look) => PORTFOLIO_THEMES[look]?.label || 'Custom design';

// Details a user can keep off a public page
export const HIDEABLE_DETAILS = ['email', 'phone', 'location', 'linkedin', 'github'];

const extractionPrompt = (resumeText) => `Extract structured data from this resume and return ONLY JSON. Use only what is written in it, and leave anything it doesn't say empty:

Resume:
${resumeText.substring(0, 15000)}

Return this exact JSON structure:
{
  "name": "Full Name",
  "title": "Professional Title",
  "summary": "2-3 sentence professional summary",
  "email": "email if found else empty string",
  "phone": "phone if found else empty string",
  "location": "city, country if found else empty string",
  "linkedin": "linkedin url if found else empty string",
  "github": "github url if found else empty string",
  "skills": ["skill1", "skill2", "skill3", "skill4", "skill5", "skill6", "skill7", "skill8"],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Jan 2022 - Present",
      "points": ["achievement 1", "achievement 2"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "Institution Name",
      "year": "2020"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Short description",
      "tech": ["tech1", "tech2"]
    }
  ]
}`;

/**
 * Reads the resume and designs the page.
 *   wishes: what the user asked the site to focus on, in their words
 *   hide:   HIDEABLE_DETAILS removed before the page is designed, so they can't appear on it
 *   design: how the user wants it to look, in their words; takes the place of a named look
 *   live:   { stage(name), html(text), reset() } to show the build as it happens
 */
export async function buildPortfolioSite({ resumeText, colorTheme, style, wishes = '', hide = [], design = '', live }) {
  const brief = String(design || '').trim().slice(0, 500);
  const fallbackColors = PORTFOLIO_THEMES[colorTheme] || PORTFOLIO_THEMES['dark-pro'];
  const colors = brief || colorTheme === CUSTOM_LOOK ? null : fallbackColors;
  live?.stage('reading');
  const portfolioData = await callClaude({ prompt: extractionPrompt(resumeText), jsonMode: true, plainStyle: false });
  for (const field of hide) if (HIDEABLE_DETAILS.includes(field)) delete portfolioData[field];

  // Claude designs the site; the fixed template is only the backup if that fails
  let portfolioHTML;
  live?.stage('designing');
  try {
    portfolioHTML = await generatePortfolioSiteWithClaude({ data: portfolioData, colors, style: colorTheme, wishes, design: brief, onHtml: live?.html });
  } catch (designError) {
    console.error('Portfolio design failed, using the template:', designError.message);
    live?.reset();
    portfolioHTML = generatePortfolioHTML(portfolioData, fallbackColors, style || 'dark-pro');
  }
  return { portfolioData, portfolioHTML };
}

// Saves to My Documents, over workId when one is given (an edit). Returns null when that fails, so
// the user still gets the page they waited for.
export async function savePortfolio({ userId, portfolioData, portfolioHTML, colorTheme, style, workId = null }) {
  let work = null;
  try {
    work = await saveWork({
      userId,
      title: `Portfolio - ${portfolioData.name || 'My Portfolio'}`,
      type: 'portfolio-gen',
      templateId: `portfolio-${colorTheme || 'dark-pro'}`,
      htmlContent: JSON.stringify({ portfolioData, colorTheme, style, portfolioHTML }),
      workId
    });
  } catch (err) {
    console.error('[works] could not save result:', err.message);
  }
  if (workId) return work;
  // The log is only for admin counts, so it must not cost the user a finished page
  try {
    const user = await findUserById(userId);
    if (user) await savePortfolioGenLog({ email: user.email, userId, theme: colorTheme || 'dark-pro' });
  } catch (err) {
    console.error('Portfolio log failed:', err.message);
  }
  return work;
}

function generatePortfolioHTML(data, colors, style) {
  const { name, title, summary, email, phone, location, linkedin, github, skills = [], experience = [], education = [], projects = [] } = data;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${name || 'My Portfolio'} — Portfolio</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:${colors.bg};--card:${colors.card};--accent:${colors.accent};--text:${colors.text};--secondary:${colors.secondary}}
  body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);line-height:1.6;min-height:100vh}
  a{color:var(--accent);text-decoration:none}
  .hero{min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:4rem 2rem;background:radial-gradient(ellipse at 50% 0%,${colors.accent}22 0%,transparent 70%)}
  .hero-inner{max-width:700px}
  .avatar{width:96px;height:96px;border-radius:50%;background:linear-gradient(135deg,${colors.accent},${colors.secondary});display:flex;align-items:center;justify-content:center;font-size:2.5rem;font-weight:800;color:#fff;margin:0 auto 1.5rem;border:3px solid ${colors.accent}44;box-shadow:0 0 40px ${colors.accent}33}
  h1{font-size:clamp(2rem,5vw,3.5rem);font-weight:800;letter-spacing:-0.03em;margin-bottom:0.5rem}
  .hero-title{font-size:1.1rem;color:var(--accent);font-weight:600;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:1.25rem}
  .hero-summary{font-size:1rem;color:var(--secondary);max-width:560px;margin:0 auto 2rem;line-height:1.8}
  .contact-links{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-bottom:2rem}
  .contact-link{display:inline-flex;align-items:center;gap:0.4rem;background:${colors.card};border:1px solid ${colors.accent}33;color:var(--text);padding:0.5rem 1rem;border-radius:99px;font-size:0.82rem;font-weight:500;transition:all 0.2s}
  .contact-link:hover{background:${colors.accent};color:#fff;border-color:${colors.accent}}
  section{padding:5rem 2rem;max-width:1000px;margin:0 auto}
  .section-label{font-size:0.75rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--accent);margin-bottom:0.5rem}
  h2{font-size:2rem;font-weight:800;letter-spacing:-0.02em;margin-bottom:2.5rem}
  .divider{height:1px;background:${colors.accent}22;margin-bottom:3rem}
  .skills-grid{display:flex;flex-wrap:wrap;gap:0.65rem}
  .skill-tag{background:${colors.card};border:1px solid ${colors.accent}33;color:var(--secondary);padding:0.45rem 1rem;border-radius:99px;font-size:0.82rem;font-weight:500;transition:all 0.2s;cursor:default}
  .skill-tag:hover{background:${colors.accent}22;color:var(--text);border-color:${colors.accent}}
  .exp-card{background:${colors.card};border:1px solid ${colors.accent}22;border-radius:12px;padding:1.75rem;margin-bottom:1.25rem;position:relative;overflow:hidden;transition:transform 0.2s,box-shadow 0.2s}
  .exp-card::before{content:'';position:absolute;top:0;left:0;width:3px;height:100%;background:var(--accent);border-radius:3px 0 0 3px}
  .exp-card:hover{transform:translateY(-2px);box-shadow:0 8px 30px ${colors.accent}22}
  .exp-top{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:0.75rem;flex-wrap:wrap}
  .exp-title{font-size:1.05rem;font-weight:700;color:var(--text)}
  .exp-company{font-size:0.88rem;color:var(--accent);font-weight:600;margin-top:0.15rem}
  .exp-duration{font-size:0.78rem;color:var(--secondary);white-space:nowrap;background:${colors.accent}15;padding:0.25rem 0.75rem;border-radius:99px;border:1px solid ${colors.accent}22}
  .exp-points{list-style:none;margin-top:0.75rem}
  .exp-points li{font-size:0.87rem;color:var(--secondary);padding:0.25rem 0 0.25rem 1.2rem;position:relative}
  .exp-points li::before{content:'▸';position:absolute;left:0;color:var(--accent);font-size:0.75rem;top:0.3rem}
  .edu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem}
  .edu-card{background:${colors.card};border:1px solid ${colors.accent}22;border-radius:12px;padding:1.5rem;transition:all 0.2s}
  .edu-card:hover{border-color:${colors.accent}55;transform:translateY(-2px)}
  .edu-degree{font-size:1rem;font-weight:700;margin-bottom:0.35rem}
  .edu-inst{font-size:0.85rem;color:var(--accent);font-weight:600}
  .edu-year{font-size:0.78rem;color:var(--secondary);margin-top:0.25rem}
  .proj-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem}
  .proj-card{background:${colors.card};border:1px solid ${colors.accent}22;border-radius:12px;padding:1.5rem;transition:all 0.2s;display:flex;flex-direction:column}
  .proj-card:hover{border-color:${colors.accent}55;transform:translateY(-3px);box-shadow:0 10px 30px ${colors.accent}18}
  .proj-name{font-size:1rem;font-weight:700;margin-bottom:0.5rem}
  .proj-desc{font-size:0.85rem;color:var(--secondary);line-height:1.6;flex:1;margin-bottom:1rem}
  .proj-tech{display:flex;flex-wrap:wrap;gap:0.4rem}
  .tech-tag{background:${colors.accent}15;color:var(--accent);padding:0.2rem 0.65rem;border-radius:99px;font-size:0.72rem;font-weight:600;border:1px solid ${colors.accent}33}
  footer{text-align:center;padding:3rem 2rem;color:var(--secondary);font-size:0.82rem;border-top:1px solid ${colors.accent}15}
  .footer-name{color:var(--accent);font-weight:700}
  @media(max-width:600px){.exp-top{flex-direction:column}.edu-grid,.proj-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<section class="hero">
  <div class="hero-inner">
    <div class="avatar">${(name||'U').charAt(0).toUpperCase()}</div>
    <h1>${name || 'Your Name'}</h1>
    <div class="hero-title">${title || 'Professional'}</div>
    <p class="hero-summary">${summary || ''}</p>
    <div class="contact-links">
      ${email ? `<a href="mailto:${email}" class="contact-link">✉ ${email}</a>` : ''}
      ${phone ? `<a href="tel:${phone}" class="contact-link">📞 ${phone}</a>` : ''}
      ${location ? `<span class="contact-link">📍 ${location}</span>` : ''}
      ${linkedin ? `<a href="${linkedin}" target="_blank" class="contact-link">💼 LinkedIn</a>` : ''}
      ${github ? `<a href="${github}" target="_blank" class="contact-link">🐙 GitHub</a>` : ''}
    </div>
  </div>
</section>

${skills.length > 0 ? `
<div class="divider" style="max-width:1000px;margin:0 auto 0"></div>
<section>
  <div class="section-label">Tech Stack</div>
  <h2>Skills & Expertise</h2>
  <div class="skills-grid">
    ${skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}
  </div>
</section>` : ''}

${experience.length > 0 ? `
<div class="divider" style="max-width:1000px;margin:0 auto 0"></div>
<section>
  <div class="section-label">Career Journey</div>
  <h2>Work Experience</h2>
  ${experience.map(e => `
  <div class="exp-card">
    <div class="exp-top">
      <div>
        <div class="exp-title">${e.title || ''}</div>
        <div class="exp-company">${e.company || ''}</div>
      </div>
      <span class="exp-duration">${e.duration || ''}</span>
    </div>
    ${e.points && e.points.length > 0 ? `<ul class="exp-points">${e.points.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}
  </div>`).join('')}
</section>` : ''}

${projects.length > 0 ? `
<div class="divider" style="max-width:1000px;margin:0 auto 0"></div>
<section>
  <div class="section-label">What I've Built</div>
  <h2>Projects</h2>
  <div class="proj-grid">
    ${projects.map(p => `
    <div class="proj-card">
      <div class="proj-name">${p.name || ''}</div>
      <div class="proj-desc">${p.description || ''}</div>
      <div class="proj-tech">${(p.tech || []).map(t => `<span class="tech-tag">${t}</span>`).join('')}</div>
    </div>`).join('')}
  </div>
</section>` : ''}

${education.length > 0 ? `
<div class="divider" style="max-width:1000px;margin:0 auto 0"></div>
<section>
  <div class="section-label">Academic Background</div>
  <h2>Education</h2>
  <div class="edu-grid">
    ${education.map(e => `
    <div class="edu-card">
      <div class="edu-degree">${e.degree || ''}</div>
      <div class="edu-inst">${e.institution || ''}</div>
      <div class="edu-year">${e.year || ''}</div>
    </div>`).join('')}
  </div>
</section>` : ''}

<footer>
  <p>Made with ❤️ by <span class="footer-name">${name || 'Me'}</span> · Generated by <span class="footer-name">CV Mind</span></p>
</footer>
</body>
</html>`;
}
