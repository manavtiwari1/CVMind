// Shared by Leo's guided flows (Resume Tailorer, Interview Prep AI, Voice Prep AI, AI Proofreading)
import { authFetch } from './authFetch';
import { API_BASE } from './apiBase';

export const isLink = (text: string) => /^https?:\/\/\S+$/i.test(text.trim());

/** Returns an error message for an unusable CV file, or null when it is fine. */
export function cvFileError(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !['pdf', 'docx', 'txt'].includes(ext)) return 'Please upload a PDF, DOCX or TXT file.';
  if (file.size > 5 * 1024 * 1024) return 'That file is over 5 MB. Please upload a smaller one.';
  return null;
}

export interface ScrapedJob {
  title: string;
  company: string;
  /** Title, description and skills as one block of text, ready to send to the AI */
  text: string;
}

/** Reads a job posting link into a description. Throws a readable error when the page could not be read. */
export async function readJobLink(url: string, headers: Record<string, string> = {}): Promise<ScrapedJob> {
  const res = await authFetch(`${API_BASE}/api/auto-apply/scrape-job`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url.trim() }),
  });
  const body = await res.json().catch(() => ({}));
  const d = body?.data;
  // The scraper falls back to placeholder text when it cannot read a page; only trust a real description.
  if (!res.ok || !d || d.source !== 'ai_scraper' || !d.description || d.description.length < 150) {
    throw new Error("I couldn't read that job link. Please paste the job description text instead.");
  }
  const title = String(d.title || '');
  const company = String(d.company || '');
  return {
    title,
    company,
    text: [`${title}${company ? ` at ${company}` : ''}`, d.description, d.skills?.length ? `Skills: ${d.skills.join(', ')}` : ''].filter(Boolean).join('\n\n'),
  };
}
