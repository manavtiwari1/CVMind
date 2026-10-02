// Saved works (/api/user/work): how each type is labelled and which page reopens it.

export const WORK_LABELS: Record<string, string> = {
  resume: 'Resume',
  'cover-letter': 'Cover Letter',
  linkedin: 'LinkedIn Audit',
  'linkedin-bio': 'LinkedIn Bio',
  'linkedin-outreach': 'Outreach DM',
  'career-courses': 'Skill Gaps',
  'elevator-pitch': 'Elevator Pitch',
  'career-roadmap': 'Roadmap AI',
  prep: 'AI Prep',
};

// Tool pages that can reopen their own saved work; everything else opens in the resume builder
export const WORK_PAGES = ['linkedin', 'linkedin-bio', 'linkedin-outreach', 'career-courses', 'elevator-pitch', 'career-roadmap', 'prep'];

// Works that are documents (made in the resume editor) rather than tool results
export const DOCUMENT_TYPES = ['resume', 'cover-letter'];

export const workLabel = (type: string) => WORK_LABELS[type] || 'Resume';

export const workPage = (type: string) => (WORK_PAGES.includes(type) ? type : 'resume-editor');
