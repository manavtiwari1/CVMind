// Shapes of backend API responses (see backend/src/services/gemini.js and backend/src/routes/*)

export interface ExperienceEntry {
  title?: string;
  company?: string;
  duration?: string;
  description?: string;
}

export interface EducationEntry {
  degree?: string;
  institution?: string;
  year?: string | number;
  cgpa?: string | number;
}

// POST /api/auto-apply/profile — resume parsed into a profile
export interface ParsedProfile {
  name?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  summary?: string;
  skills?: string[];
  techStack?: string[];
  experience?: ExperienceEntry[];
  education?: EducationEntry[];
  languages?: string[];
  preferredRoles?: string[];
  seniority?: string;
  yearsOfExperience?: number;
  certifications?: string[];
  github?: string | null;
  linkedin?: string | null;
  portfolio?: string | null;
  industries?: string[];
}

// POST /api/analyze — structured resume evaluation
export interface ResumeAnalysis {
  score: number;
  summary: string;
  atsKeywords: {
    score: number;
    matched: string[];
    missing: string[];
    feedback: string;
  };
  contentAndImpact: {
    score: number;
    feedback: string;
    suggestions: { original: string; improved: string }[];
  };
  formattingAndStyle: {
    score: number;
    feedback: string;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  fileName?: string; // added by the client for display
}

// POST /api/auto-apply/jobs — a job scored against the candidate
export interface JobMatch {
  id: string; title: string; company: string; domain: string; location: string;
  type: string; remote: string; salary: string; exp: string; posted: string;
  skills: string[]; industry: string; matchScore: number;
  matchedSkills: string[]; missingSkills: string[];
  matchBreakdown?: {
    skills: number;
    education: number;
    experience: number;
    location: number;
    jdRelevance?: number;
    preferences?: number;
  };
  matchReasoning?: string;
  isScraped?: boolean;
  apply_url?: string;
  isLiveCompany?: boolean;
}

// POST /api/prep/evaluate — feedback on one interview answer
export interface InterviewFeedback {
  score: number;
  strengths: string;
  improvements: string;
  refinedAnswer: string;
}

// ── Resume wizard ──────────────────────────────────────────────
// Prefilled from the resume extraction endpoint (backend/src/services/gemini.js)
// and emitted by ResumeWizard's onGenerate.

export interface WizardPersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  jobTitle: string;
}

export interface WizardWorkExperience {
  company: string;
  jobTitle: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface WizardEducation {
  university: string;
  degree: string;
  gradYear: string;
  cgpa: string;
}

export interface WizardCourse {
  name: string;
  platform: string;
  date: string;
}

export interface WizardLanguage {
  name: string;
  level: string;
  dots?: number;
}

export interface WizardAchievement {
  title: string;
  description: string;
}

export interface WizardTimeSlice {
  letter: string;
  activity: string;
  percentage: number;
}

// Resume data extracted from an uploaded file, used to prefill the wizard
export interface ExtractedResume {
  personalInfo?: Partial<WizardPersonalInfo>;
  summary?: string;
  workExperiences?: WizardWorkExperience[];
  educations?: WizardEducation[];
  skills?: string[];
  courses?: WizardCourse[];
  languages?: WizardLanguage[];
  achievements?: WizardAchievement[];
  timeBreakdown?: WizardTimeSlice[];
}

// What the wizard submits
export interface WizardFormData {
  personalInfo: WizardPersonalInfo;
  jobTitle: string;
  summary: string;
  education: WizardEducation[];
  workExperiences: WizardWorkExperience[];
  skills: string[];
  courses: WizardCourse[];
  languages: WizardLanguage[];
  achievements: WizardAchievement[];
  timeBreakdown: WizardTimeSlice[];
}

// ── Saved works ────────────────────────────────────────────────

// A saved Work document (backend/src/db.js workSchema)
export interface SavedWork {
  _id?: string;
  id?: string;
  userId?: string;
  title: string;
  type: string; // 'resume' | 'cover-letter' | tool-specific types
  templateId: string;
  htmlContent: string;
  createdAt?: string;
  updatedAt?: string;
  deleted?: false;
}

// Sent by the Navbar when a work is deleted, so an open editor can close it
export interface DeletedWorkNotice {
  deleted: true;
  workId: string;
}

export type LoadedWork = SavedWork | DeletedWorkNotice;

// Logged-in user as stored in localStorage 'cvmind_user' (from the backend /api/auth/* responses)
export interface StoredUser {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  address?: string;
  avatar?: string;
  isGoogleUser?: boolean;
}
