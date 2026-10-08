// Shapes returned by the backend /api/agent endpoints (see backend/src/routes/agent.js)

export type ResumeSource = 'cvmind' | 'upload';
export type ResumeStatus = 'queued' | 'parsing' | 'ready' | 'failed';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance' | 'other';
export type DegreeLevel = 'none' | 'high_school' | 'associate' | 'bachelor' | 'master' | 'phd';
export type SkillCategory = 'technical' | 'tool' | 'soft' | 'language' | 'domain' | 'other';
export type Seniority = 'intern' | 'junior' | 'mid' | 'senior' | 'staff' | 'principal';

export interface ResumeBullet {
  id: string;
  text: string;
}

export interface ResumeExperience {
  id: string;
  company: string;
  title: string;
  employmentType: EmploymentType;
  startDate: string;
  endDate: string;
  current: boolean;
  location: string;
  skills: string[];
  bullets: ResumeBullet[];
}

export interface ResumeEducation {
  institution: string;
  degree: string;
  degreeLevel: DegreeLevel;
  field: string;
  endYear: string;
  gpa: string;
}

export interface ResumeStructured {
  contact: { name: string; email: string; phone: string; location: string; linkedin: string; github: string; portfolio: string };
  headline: string;
  summary: string;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: { name: string; normalized: string; category: SkillCategory }[];
  projects: { id: string; name: string; skills: string[]; bullets: ResumeBullet[] }[];
  certifications: { name: string; issuer: string; year: string }[];
  languages: string[];
}

export interface ResumeProfile {
  id: string;
  userId: string;
  label: string;
  isDefault: boolean;
  source: ResumeSource;
  status: ResumeStatus;
  parseError?: string;
  structured: ResumeStructured | null;
  derived?: { totalYearsExperience: number; seniority: Seniority; normalizedSkillSet: string[] };
  originalFileRef?: { filename?: string; mimeType?: string; size?: number; workId?: string; workUpdatedAt?: string };
  userEdited: boolean;
  editedAt?: string;
  embeddedBullets: number;
  outOfDate?: boolean;
  sourceMissing?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Editor payload accepted by PATCH /api/agent/resumes/:id (bullets as plain strings; ids are reassigned server-side)
export interface ResumeEditable {
  contact: ResumeStructured['contact'];
  headline: string;
  summary: string;
  experience: (Omit<ResumeExperience, 'id' | 'bullets'> & { bullets: string[] })[];
  education: ResumeEducation[];
  skills: { name: string; category: SkillCategory }[];
  projects: { name: string; skills: string[]; bullets: string[] }[];
  certifications: { name: string; issuer: string; year: string }[];
  languages: string[];
}

export type WorkMode = 'remote' | 'hybrid' | 'onsite';
export type ApplyMode = 'extension' | 'server' | 'ask';
export type SalaryPeriod = 'year' | 'month' | 'hour';

// GET/PUT /api/agent/preferences
export interface JobPreferences {
  targetTitles: string[];
  seniority: Seniority[];
  locations: string[];
  workModes: WorkMode[];
  employmentTypes: EmploymentType[];
  minSalary: { amount: number; currency: string; period: SalaryPeriod } | null;
  includeIndustries: string[];
  excludeIndustries: string[];
  excludedCompanies: string[];
  workAuthorization: { country: string; authorized: boolean; needsSponsorship: boolean }[];
  willingToRelocate: boolean;
  noticePeriod: string;
  defaultResumeProfileId: string | null;
  applyMode: ApplyMode;
  minScoreToSuggest: number;
  dailyApplyCap: number;
  eeo: { gender: string; race: string; veteran: string; disability: string };
  standardAnswers: { key: string; question: string; answer: string }[];
}

export type ApplicationStatus = 'pending' | 'matched' | 'tailoring' | 'ready_for_review' | 'submitted' | 'failed';
export type GateResult = 'pass' | 'fail' | 'warn' | 'unknown' | 'n_a';
export type Recommendation = 'strong' | 'good' | 'weak' | 'not_recommended';
export type ScoreComponentKey = 'skills' | 'semantic' | 'title' | 'seniority' | 'preferences';

export interface ScoreGate {
  key: string;
  result: GateResult;
  reason: string;
}

// Legacy (migrated) applications only carry total + scoringVersion, so everything else is optional
export interface ApplicationScore {
  total: number;
  scoringVersion: string;
  components?: Record<ScoreComponentKey, number | null>;
  weightsUsed?: Partial<Record<ScoreComponentKey, number>>;
  gates?: ScoreGate[];
  gatesPassed?: boolean;
  recommendation?: Recommendation;
  matchedSkills?: string[];
  impliedSkills?: string[];
  missingSkills?: string[];
  missingMustHave?: string[];
  topMatches?: { responsibility: string; bulletId: string; bulletText: string; similarity: number }[];
  computedAt?: string;
}

export interface ApplicationJob {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: string;
  employmentType: string;
  seniority: string;
  industry: string;
  url: string | null;
  applyUrl: string | null;
  ats: string;
  source: 'url' | 'paste';
  status: 'pending' | 'parsing' | 'ready' | 'failed';
  parseError: string | null;
  salary: { min: number; max: number; currency: string; period: string } | null;
  requirements: { mustHaveSkills: string[]; niceToHaveSkills: string[]; minYearsExperience: number | null; educationLevel: string | null } | null;
  responsibilities: { text: string; core: boolean }[];
}

export interface AgentApplication {
  id: string;
  status: ApplicationStatus;
  progress: { step?: string; updatedAt?: string } | null;
  decision: { state: 'undecided' | 'approved' | 'skipped'; mode?: string | null; overrideGates?: boolean; at?: string };
  score: ApplicationScore | null;
  error: { stage: string; code: string | null; message: string } | null;
  resumeProfileId: string | null;
  createdAt: string;
  updatedAt: string;
  tailored: { generatedAt: string; userEdited: boolean; hasPdf: boolean; changes: string[] } | null;
  submission: { via: string; submittedAt: string } | null;
  fill: ApplicationFill | null;
  job: ApplicationJob | null;
}

export interface TailoredBullet {
  sourceBulletId: string | null;
  text: string;
  original: string | null;
}

export interface TailoredResume {
  contact: ResumeStructured['contact'];
  headline: string;
  summary: string;
  experience: { id: string; company: string; title: string; location: string; startDate: string; endDate: string; current: boolean; bullets: TailoredBullet[] }[];
  projects: { id: string; name: string; bullets: TailoredBullet[] }[];
  skills: string[];
  education: ResumeEducation[];
  certifications: { name: string; issuer: string; year: string }[];
  languages: string[];
}

export interface TailoredDocuments {
  resume: TailoredResume;
  coverLetter: { subject: string; body: string; needsReview: boolean; warnings: string[] };
  changes: string[];
  violations: number;
  userEdited: boolean;
  generatedAt: string;
  pdf: { filename: string; size: number; renderedAt: string } | null;
}

export interface TailoredEditPayload {
  headline?: string;
  summary?: string;
  experience?: { id: string; bullets: string[] }[];
  projects?: { id: string; bullets: string[] }[];
  skills?: string[];
  coverLetter?: { subject: string; body: string };
}

export interface ApplicationEventItem {
  id: string;
  type: string;
  actor: string;
  message: string;
  createdAt: string;
}

export interface FillPlanItem {
  selector: string;
  label: string;
  canonicalKey: string;
  action: 'fill' | 'select' | 'check' | 'upload' | 'answer' | 'skip';
  value: string;
  valueSource: string;
  sensitive: boolean;
  requiresReview: boolean;
  reason: string;
}

// Summary carried on the application itself
export interface ApplicationFill {
  adapter: string | null;
  planHash: string | null;
  approved: boolean;
  filled: number;
  needsReview: number;
  unmappedRequired: number;
  mismatches: number;
  hasScreenshot: boolean;
  handoff: string | null;
  blockedReason: string | null;
  filledAt: string | null;
}

// Full detail from GET /applications/:id/review
export interface ReviewData {
  adapter: string;
  planHash: string;
  approved: boolean;
  items: FillPlanItem[];
  unmappedRequired: { selector: string; label: string }[];
  mismatches: { selector: string; label: string; reason: string }[];
  handoff: string | null;
  blockedReason: string | null;
  filledAt: string | null;
  screenshotUrl: string | null;
}

export interface ExtensionDevice {
  id: string;
  name: string;
  createdAt: string;
  lastSeenAt: string | null;
}

export interface PairCode {
  code: string;
  expiresAt: string;
}

export interface AgentApiError {
  status: number;
  code?: string;
  message: string;
}
