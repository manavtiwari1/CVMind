// Shared by the pages that end with a designed resume (Resume Tailorer, AI Proofreading):
// filling a CVMind template, exporting it, and handing it to the resume editor.
import { RESUME_TEMPLATES, TEMPLATES, type Template } from '../data/resumeTemplates';
import { authFetch } from './authFetch';
import { API_BASE } from './apiBase';
import { readUser } from './currentUser';
import { splitFooter, withFooter } from './resumeFooter';
import { sanitizeResumeHtml } from './sanitizeHtml';
import type { ExtractedResume, SavedWork, WizardFormData } from '../types/api';

export const DEFAULT_TEMPLATE = 'cv-ivy-league';
export const PAGE_W = 794;
export const PAGE_H = 1123;

export const templateFor = (id?: string): Template =>
  TEMPLATES.find(t => t.id === id) ?? TEMPLATES.find(t => t.id === DEFAULT_TEMPLATE) ?? RESUME_TEMPLATES[0];

/** Fills the locked CVMind footer back in after the AI filled the template body. */
export const finishHtml = (generated: string, templateId?: string) =>
  withFooter(sanitizeResumeHtml(generated), splitFooter(templateFor(templateId).html).footer);

export const toFormData = (d: ExtractedResume): WizardFormData => ({
  personalInfo: {
    fullName: d.personalInfo?.fullName || '', email: d.personalInfo?.email || '', phone: d.personalInfo?.phone || '',
    location: d.personalInfo?.location || '', linkedin: d.personalInfo?.linkedin || '', jobTitle: d.personalInfo?.jobTitle || '',
  },
  jobTitle: d.personalInfo?.jobTitle || '',
  summary: d.summary || '',
  education: d.educations || [],
  workExperiences: d.workExperiences || [],
  skills: d.skills || [],
  courses: d.courses || [],
  languages: d.languages || [],
  achievements: d.achievements || [],
  timeBreakdown: [],
});

/** Plain text of the resume as laid out (used for TXT export). */
export function htmlToText(html: string): string {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;left:-10000px;top:0;width:${PAGE_W}px`;
  el.innerHTML = html;
  document.body.appendChild(el);
  const text = el.innerText;
  el.remove();
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

/** Puts structured resume data into a template. Keeps the facts as they are. */
export async function fillTemplate(data: ExtractedResume, templateId: string, headers: Record<string, string> = {}): Promise<string> {
  const template = templateFor(templateId);
  const res = await authFetch(`${API_BASE}/api/resume/generate`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateHtml: splitFooter(template.html).body, formData: toFormData(data), keepFacts: true }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.data?.generatedHtml) throw new Error(body.error || 'Could not fill the template.');
  const generated = String(body.data.generatedHtml).replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '');
  return finishHtml(generated, template.id);
}

/** Reads resume text into the structured data the templates are filled from. */
export async function parseResumeText(resumeText: string, headers: Record<string, string> = {}): Promise<ExtractedResume> {
  const res = await authFetch(`${API_BASE}/api/resume/parse-data`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.data) throw new Error(body.error || 'Could not read your resume.');
  return body.data;
}

export function downloadWord(html: string, fileName: string) {
  const doc = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>Resume</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
<style>body{font-family:Arial,sans-serif;margin:1in;}@page{margin:1in;}</style>
</head><body>${html}</body></html>`;
  const url = URL.createObjectURL(new Blob(['﻿', doc], { type: 'application/msword' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `${fileName}.doc` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/** The work to open in the resume editor; saved first when signed in so it shows up in My Documents. */
export async function workForEditor(html: string, templateId: string, title: string, source: string): Promise<SavedWork> {
  let work: SavedWork = { title, type: 'resume', templateId, htmlContent: html, source };
  const user = readUser();
  const userId = user?.id || user?._id;
  if (userId) {
    try {
      const res = await authFetch(`${API_BASE}/api/user/work`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, title, type: 'resume', templateId, htmlContent: html, source }),
      });
      const body = await res.json();
      if (res.ok && body.data) work = { ...work, ...body.data, htmlContent: html, source };
    } catch (err) {
      console.error('Could not save the resume before opening the editor:', err);
    }
  }
  return work;
}
