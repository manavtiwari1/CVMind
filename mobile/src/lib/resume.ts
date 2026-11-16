import { RESUME_TEMPLATES, TEMPLATES, type Template } from '@web/data/resumeTemplates';
import { splitFooter, withFooter } from '@web/lib/resumeFooter';
import type { ExtractedResume, ResumeAnalysis, WizardFormData } from '@web/types/api';

import { api } from './api';

// Resume building in the app, on the website's own templates (frontend/src/data, read through the
// @web alias) and the same API calls as frontend/src/lib/resumeHandoff.ts, so a resume made here
// looks and saves exactly like one made on cvmind.in.

export type { ExtractedResume, ResumeAnalysis, Template };
export { RESUME_TEMPLATES };

export const DEFAULT_TEMPLATE = 'cv-ivy-league';

/** Templates people can pick (old designs stay only so saved resumes still find theirs) */
export const PICKABLE_TEMPLATES = RESUME_TEMPLATES.filter((t) => !t.legacy && t.type !== 'cover-letter');

export const templateFor = (id?: string): Template =>
  TEMPLATES.find((t) => t.id === id) ?? TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE) ?? RESUME_TEMPLATES[0];

// AI-filled HTML is shown and edited in a WebView, so strip anything that could run code
// (the website does this with DOMParser in lib/sanitizeHtml.ts)
export function sanitizeResumeHtml(html: string): string {
  return html
    .replace(/<(script|iframe|object|embed|form|textarea|select|button)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|iframe|object|embed|link|meta|base|form|input|button|textarea|select)\b[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src|xlink:href)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
}

const stripFences = (html: string) => html.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();

/** Puts the locked CVMind footer back after the AI filled the template body */
export const finishHtml = (generated: string, templateId?: string) =>
  withFooter(sanitizeResumeHtml(stripFences(generated)), splitFooter(templateFor(templateId).html).footer);

export const toFormData = (d: ExtractedResume): WizardFormData => ({
  personalInfo: {
    fullName: d.personalInfo?.fullName || '',
    email: d.personalInfo?.email || '',
    phone: d.personalInfo?.phone || '',
    location: d.personalInfo?.location || '',
    linkedin: d.personalInfo?.linkedin || '',
    jobTitle: d.personalInfo?.jobTitle || '',
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

export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string | null;
}

const fileForm = (file: PickedFile, field = 'resume') => {
  const form = new FormData();
  form.append(field, { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as unknown as Blob);
  return form;
};

/** Reads an uploaded resume (PDF, DOCX, TXT) into the structured data templates are filled from */
export async function parseResumeFile(file: PickedFile): Promise<ExtractedResume> {
  const data = await api<{ data: ExtractedResume }>('/api/resume/parse-data', { method: 'POST', form: fileForm(file) });
  return data.data;
}

/** A public LinkedIn profile link, read on the server */
export async function importLinkedIn(url: string): Promise<ExtractedResume> {
  const data = await api<{ data: ExtractedResume }>('/api/resume/import-linkedin', { method: 'POST', body: { url } });
  return data.data;
}

/**
 * Fills a template with the resume data. keepFacts true keeps the wording as given (an uploaded
 * resume); false lets the AI polish typed answers, as the website's Resume Builder does.
 */
export async function fillTemplate(data: ExtractedResume, templateId: string, keepFacts: boolean): Promise<string> {
  const template = templateFor(templateId);
  const res = await api<{ data: { generatedHtml: string } }>('/api/resume/generate', {
    method: 'POST',
    body: { templateHtml: splitFooter(template.html).body, formData: toFormData(data), keepFacts },
  });
  if (!res.data?.generatedHtml) throw new Error('Could not fill the template. Please try again.');
  return finishHtml(res.data.generatedHtml, template.id);
}

/** Saves to My Documents (the same list as on cvmind.in). Returns the saved id. */
export async function saveResume(userId: string, doc: { title: string; templateId: string; htmlContent: string; workId?: string; type?: string }): Promise<string> {
  const res = await api<{ data: { _id?: string; id?: string } }>('/api/user/work', {
    method: 'POST',
    body: { userId, title: doc.title, type: doc.type || 'resume', templateId: doc.templateId, htmlContent: doc.htmlContent, ...(doc.workId ? { workId: doc.workId } : {}) },
  });
  return String(res.data?._id || res.data?.id || doc.workId || '');
}

export interface AnalyzeResult {
  data: ResumeAnalysis;
  resumeText: string;
  work?: { _id?: string; id?: string } | null;
  scoreChange?: ResumeAnalysis['scoreChange'];
}

/** The ATS check: scores the resume and saves the report to My Documents (signed in) */
export const analyzeResume = (file: PickedFile) => api<AnalyzeResult>('/api/analyze', { method: 'POST', form: fileForm(file) });

export interface TailorResult {
  matchScore: number;
  matchedSkills: string[];
  missingSkillsRecommended: string[];
  insights?: string[];
  tailoredData?: ExtractedResume;
  generatedHtml: string;
  templateId: string;
  resumeText: string;
  [key: string]: unknown;
}

/** Rewrites the resume for one job and fills the chosen template with the result */
export async function tailorResume(file: PickedFile, jobDescription: string, templateId: string) {
  const template = templateFor(templateId);
  const form = fileForm(file);
  form.append('jobDescription', jobDescription);
  form.append('templateId', template.id);
  form.append('templateHtml', splitFooter(template.html).body);
  const res = await api<{ data: TailorResult; work?: { _id?: string; id?: string } | null }>('/api/tailor', { method: 'POST', form });
  const html = res.data.generatedHtml ? finishHtml(res.data.generatedHtml, template.id) : '';
  return { ...res.data, html, workId: String(res.work?._id || res.work?.id || '') };
}
