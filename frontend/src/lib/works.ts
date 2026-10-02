// Saved works (/api/user/work): how each type is labelled and which page reopens it.

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
  linkedin: 'LinkedIn Audit',
  'linkedin-bio': 'LinkedIn Bio',
  'linkedin-outreach': 'Outreach DM',
  'linkedin-post': 'LinkedIn Post',
  'career-courses': 'Skill Gaps',
  'elevator-pitch': 'Elevator Pitch',
  'career-roadmap': 'Roadmap AI',
};

// Pages that reopen a saved work of each type; anything not listed opens in the resume editor
const WORK_PAGES: Record<string, string> = {
  'resume-check': 'home',
  'resume-optimized': 'home',
  'resume-tailor': 'tailor',
  proofread: 'proofreading',
  'job-finder': 'job-finder',
  prep: 'prep',
  'voice-prep': 'voice-prep',
  'portfolio-gen': 'portfolio-gen',
  linkedin: 'linkedin',
  'linkedin-bio': 'linkedin-bio',
  'linkedin-outreach': 'linkedin-outreach',
  'linkedin-post': 'linkedin-post',
  'career-courses': 'career-courses',
  'elevator-pitch': 'elevator-pitch',
  'career-roadmap': 'career-roadmap',
};

// Works that are documents (made in the resume editor) rather than tool results
export const DOCUMENT_TYPES = ['resume', 'cover-letter'];

export const workLabel = (type: string) => WORK_LABELS[type] || 'Resume';

export const workPage = (type: string) => WORK_PAGES[type] || 'resume-editor';
