import type { LeoPose } from '@/lib/leo';

// The simple AI tools: a form in, a written result out. Fields match the backend routes in
// backend/src/index.js (careerField names) and routes/growth.js (negotiation).

export interface ToolField {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  options?: string[];
}

export interface AiTool {
  id: string;
  title: string;
  intro: string;
  pose: LeoPose;
  endpoint: string;
  fields: ToolField[];
  /** Multipart with an optional/required file under this field name */
  file?: { field: string; label: string; required?: boolean; pdfOnly?: boolean };
  /** Builds a nested JSON body (offer negotiation) instead of flat fields */
  body?: (v: Record<string, string>) => unknown;
  button: string;
  weekly?: string;
}

const TONES = ['Professional', 'Friendly', 'Confident', 'Casual'];

export const AI_TOOLS: Record<string, AiTool> = {
  linkedin: {
    id: 'linkedin',
    title: 'LinkedIn Profile Review',
    intro: 'Upload your LinkedIn profile as a PDF (on LinkedIn: your profile → More → Save to PDF) and get a score with fixes.',
    pose: 'linkedin',
    endpoint: '/api/linkedin/analyze',
    file: { field: 'linkedinPdf', label: 'Your LinkedIn PDF', required: true, pdfOnly: true },
    fields: [{ key: 'targetRole', label: 'Role you want (optional)', placeholder: 'e.g. Product Analyst' }],
    button: 'Review my profile',
  },
  'linkedin-bio': {
    id: 'linkedin-bio',
    title: 'Headline & About',
    intro: 'A LinkedIn headline and About section that recruiters search for.',
    pose: 'linkedin',
    endpoint: '/api/linkedin/bio',
    file: { field: 'resume', label: 'Your resume (optional)' },
    fields: [
      { key: 'jobTitle', label: 'Your role', placeholder: 'e.g. Data Analyst', required: true },
      { key: 'skills', label: 'Top skills', placeholder: 'SQL, Power BI, Python' },
      { key: 'tone', label: 'Tone', options: TONES },
    ],
    button: 'Write my profile',
  },
  'linkedin-post': {
    id: 'linkedin-post',
    title: 'LinkedIn Post Writer',
    intro: 'A post people actually read: a hook, your story and a clear ending.',
    pose: 'linkedin',
    endpoint: '/api/linkedin/post',
    fields: [
      { key: 'topic', label: 'What is it about?', placeholder: 'e.g. I finished my first internship at…', required: true, multiline: true },
      { key: 'jobTitle', label: 'Your role', placeholder: 'e.g. Frontend Developer', required: true },
      { key: 'tone', label: 'Tone', options: TONES },
    ],
    button: 'Write my post',
  },
  'linkedin-outreach': {
    id: 'linkedin-outreach',
    title: 'Recruiter Outreach',
    intro: 'Short messages to recruiters and people at the company that get replies.',
    pose: 'linkedin',
    endpoint: '/api/linkedin/outreach',
    file: { field: 'resume', label: 'Your resume (optional)' },
    fields: [
      { key: 'jobTitle', label: 'Role you want', placeholder: 'e.g. SDE Intern', required: true },
      { key: 'companyName', label: 'Company', placeholder: 'e.g. Swiggy' },
      { key: 'targetName', label: 'Person you are writing to', placeholder: 'e.g. Priya (recruiter)' },
      { key: 'context', label: 'Anything to mention', placeholder: 'e.g. Saw the opening on their careers page', multiline: true },
      { key: 'tone', label: 'Tone', options: TONES },
    ],
    button: 'Write messages',
  },
  proofreading: {
    id: 'proofreading',
    title: 'Proofread',
    intro: 'Fix grammar, spelling and tone in your resume, cover letter or any text.',
    pose: 'checklist',
    endpoint: '/api/ai/proofread',
    file: { field: 'resume', label: 'Or upload a file' },
    fields: [
      { key: 'text', label: 'Your text', placeholder: 'Paste the text to check', multiline: true },
      { key: 'documentType', label: 'What is it?', options: ['Resume', 'Cover Letter', 'Email', 'Other'] },
      { key: 'industry', label: 'Industry (optional)', placeholder: 'e.g. Tech' },
    ],
    button: 'Proofread',
  },
  'elevator-pitch': {
    id: 'elevator-pitch',
    title: 'Elevator Pitch',
    intro: 'Introduce yourself in 30 seconds: for interviews, career fairs and networking.',
    pose: 'idea',
    endpoint: '/api/career/pitch',
    file: { field: 'resume', label: 'Your resume (optional)' },
    fields: [
      { key: 'jobTitle', label: 'Role you want', placeholder: 'e.g. Marketing Associate', required: true },
      { key: 'setting', label: 'Where you will use it', options: ['Interview', 'Career fair', 'Networking', 'LinkedIn'] },
      { key: 'details', label: 'Anything to include', placeholder: 'e.g. 2 internships, college fest head', multiline: true },
    ],
    button: 'Write my pitch',
  },
  'career-roadmap': {
    id: 'career-roadmap',
    title: 'Career Roadmap',
    intro: 'A step-by-step plan from where you are to the role you want.',
    pose: 'growth',
    endpoint: '/api/career/roadmap',
    file: { field: 'resume', label: 'Your resume (optional)' },
    fields: [
      { key: 'targetRole', label: 'Role you want', placeholder: 'e.g. Data Scientist', required: true },
      { key: 'currentRole', label: 'Where you are now', placeholder: 'e.g. Final-year B.Tech student' },
      { key: 'years', label: 'Years of experience', placeholder: 'e.g. 0' },
      { key: 'hoursPerWeek', label: 'Hours a week you can give', placeholder: 'e.g. 10' },
    ],
    button: 'Make my roadmap',
  },
  'career-courses': {
    id: 'career-courses',
    title: 'Skill Gaps & Courses',
    intro: 'The skills you are missing for a job, and the courses that teach them.',
    pose: 'guide',
    endpoint: '/api/career/courses',
    file: { field: 'resume', label: 'Your resume (optional)' },
    fields: [
      { key: 'targetJob', label: 'Job you want', placeholder: 'e.g. Cloud Engineer', required: true },
      { key: 'skills', label: 'Skills you have', placeholder: 'e.g. Linux, Python' },
      { key: 'level', label: 'Level', options: ['Beginner', 'Intermediate', 'Advanced'] },
    ],
    button: 'Find my gaps',
  },
  'offer-negotiation': {
    id: 'offer-negotiation',
    title: 'Salary Talk',
    intro: 'What to say to get a better offer: a script and an email, based on your offer.',
    pose: 'idea',
    endpoint: '/api/negotiation',
    fields: [
      { key: 'company', label: 'Company', placeholder: 'e.g. Infosys', required: true },
      { key: 'role', label: 'Role', placeholder: 'e.g. Systems Engineer', required: true },
      { key: 'location', label: 'City', placeholder: 'e.g. Pune' },
      { key: 'fixed', label: 'Fixed pay offered', placeholder: 'e.g. 6 LPA', required: true },
      { key: 'variable', label: 'Variable / bonus', placeholder: 'e.g. 10%' },
      { key: 'current', label: 'Your current pay (optional)', placeholder: 'e.g. 4 LPA' },
      { key: 'competing', label: 'Other offers (optional)', placeholder: 'e.g. 7 LPA at TCS', multiline: true },
      { key: 'tone', label: 'Tone', options: ['Polite', 'Confident', 'Firm'] },
    ],
    body: (v) => ({
      offer: { company: v.company, role: v.role, location: v.location, fixed: v.fixed, variable: v.variable },
      position: { current: v.current, competing: v.competing },
      tone: (v.tone || 'Polite').toLowerCase(),
    }),
    button: 'Plan my negotiation',
    weekly: 'Free plan: 1 negotiation plan a week.',
  },
};
