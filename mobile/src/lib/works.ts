import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { api, ApiError, getApiToken } from './api';
import { API_BASE } from './config';

// Saved works (/api/user/work): the same My Documents as on cvmind.in. Labels follow
// frontend/src/lib/works.ts.

export interface Work {
  _id: string;
  id?: string;
  title: string;
  type: string;
  templateId?: string;
  htmlContent?: string;
  createdAt: string;
  updatedAt?: string;
}

export const WORK_LABELS: Record<string, string> = {
  resume: 'Resume',
  'cover-letter': 'Cover Letter',
  'resume-check': 'Resume Check',
  'resume-optimized': 'Optimized Resume',
  'resume-tailor': 'Tailored Resume',
  proofread: 'Proofread',
  'job-finder': 'Job Search',
  prep: 'Interview Prep',
  'voice-prep': 'Voice Prep',
  'portfolio-gen': 'Portfolio',
  linkedin: 'Profile Audit',
  'linkedin-bio': 'Bio & Banner',
  'linkedin-outreach': 'Outreach Messages',
  'linkedin-post': 'LinkedIn Post',
  'career-courses': 'Skill Gaps',
  'elevator-pitch': 'Elevator Pitch',
  'career-roadmap': 'Career Roadmap',
  'offer-negotiation': 'Offer Negotiation',
  aptitude: 'Aptitude Test',
};

// Things the user keeps (the website's Documents tab), as opposed to tool results
export const DOCUMENT_TYPES = ['resume', 'cover-letter', 'portfolio-gen'];
// Types whose content is a printable page (PDF export)
export const PRINTABLE_TYPES = ['resume', 'cover-letter', 'resume-tailor', 'resume-optimized'];

type IconName = ComponentProps<typeof Ionicons>['name'];
export const WORK_ICONS: Record<string, IconName> = {
  resume: 'document-text',
  'cover-letter': 'mail-open',
  'portfolio-gen': 'globe',
  'resume-check': 'speedometer',
  'resume-tailor': 'git-compare',
  'resume-optimized': 'sparkles',
  prep: 'chatbubbles',
  'voice-prep': 'mic',
  aptitude: 'calculator',
};

export const workLabel = (type: string) => WORK_LABELS[type] || 'Document';
export const workIcon = (type: string): IconName => WORK_ICONS[type] || 'document-outline';
export const workId = (w: Work) => String(w._id || w.id);
export const editedAt = (w: Work) => new Date(w.updatedAt || w.createdAt);
export const isHtml = (w: Work) => /^\s*</.test(w.htmlContent || '');

export const listWorks = (userId: string) => api<{ data: Work[] }>(`/api/user/work/${encodeURIComponent(userId)}`).then((r) => r.data || []);
export const deleteWork = (userId: string, id: string) => api(`/api/user/work/${encodeURIComponent(userId)}/${encodeURIComponent(id)}`, { method: 'DELETE' });

const safeName = (name: string) => name.replace(/[^A-Za-z0-9 _-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'CVMind document';

/** The server renders the PDF (the website's exact export); the app saves it and returns its file address. */
export async function downloadPdf(html: string, title: string): Promise<{ uri: string; name: string }> {
  const name = safeName(title);
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/pdf' };
  const token = getApiToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/resume/pdf`, { method: 'POST', headers, body: JSON.stringify({ html, fileName: name, paper: 'a4' }) });
  } catch {
    throw new ApiError("Can't reach CVMind. Check your internet and try again.", 0, { code: 'OFFLINE' });
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new ApiError(typeof data.error === 'string' ? data.error : 'Could not create the PDF. Please try again.', res.status, data);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  const { File, Paths } = await import('expo-file-system');
  const file = new File(Paths.cache, `${name}.pdf`);
  if (file.exists) file.delete();
  await file.write(bytes);
  return { uri: file.uri, name: `${name}.pdf` };
}

// Same fonts the server loads for exports, so the preview looks like the PDF
const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Rubik:wght@300;400;500;600;700&family=Lato:wght@400;700&family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;700&family=Poppins:wght@400;500;600&family=Open+Sans:wght@400;600;700;800&family=Raleway:wght@300;400;600&family=EB+Garamond:wght@400;500&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,400&family=Great+Vibes&family=Montserrat:wght@400;500;600;700;800&display=swap';

/** A page that shows a saved resume or letter at A4 width, scaled down to fit the phone */
export const previewPage = (html: string) => `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=820">
<link rel="stylesheet" href="${FONTS_HREF}">
<style>html,body{margin:0;background:#eef0f5}body{padding:24px 0}.page{width:794px;min-height:1123px;margin:0 auto;background:#fff;box-shadow:0 6px 30px rgba(20,24,60,.12);font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#111}*{box-sizing:border-box}[contenteditable]{outline:none}</style>
</head><body><div class="page">${html}</div></body></html>`;
