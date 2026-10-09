const DAY_MS = 24 * 60 * 60 * 1000;

/** "Today", "Yesterday", "5 days ago", "3 weeks ago"; '' when unknown */
export function postedAgo(value: string | null): string {
  if (!value) return '';
  const days = Math.floor((Date.now() - new Date(value).getTime()) / DAY_MS);
  if (Number.isNaN(days)) return '';
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

/** "9 Oct 2026" */
export const appliedOn = (value: string) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

/** "9 Oct" for badges */
export const appliedShort = (value: string) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

export function scoreTone(score: number | null | undefined): 'high' | 'mid' | 'low' | 'none' {
  if (score === null || score === undefined) return 'none';
  return score >= 70 ? 'high' : score >= 45 ? 'mid' : 'low';
}

export const SOURCE_LABEL: Record<string, string> = {
  greenhouse: 'Company careers page',
  lever: 'Company careers page',
  ashby: 'Company careers page',
  smartrecruiters: 'Company careers page',
  workable: 'Company careers page',
  cvmind: 'Posted on CVMind',
  jsearch: '',
  adzuna: ''
};
