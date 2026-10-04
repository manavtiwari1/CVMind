// Leo's mock interview, shared by Interview Prep AI (text) and Voice Prep AI (voice).
// Shapes match backend/src/index.js /api/interview/*.

export type InterviewMode = 'text' | 'voice';

export const LEVELS = ['Fresher', 'Mid-level', 'Senior', 'Lead / Manager'] as const;
export const ROUNDS = ['Mixed', 'HR', 'Behavioural', 'Technical'] as const;
export const COUNTS = [5, 8, 10] as const;

export interface InterviewSettings {
  role: string;
  level: string;
  round: string;
  count: number;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: string;
  whatInterviewerWants: string;
  keyPoints: string[];
}

export interface VoiceMetrics {
  seconds: number;
  words: number;
  wpm: number;
  fillerCount: number;
  fillers: string[];
}

export interface AnswerFeedback {
  score: number;
  scores?: Partial<Record<'content' | 'structure' | 'relevance' | 'clarity' | 'confidence', number>>;
  verdict?: string;
  strengths: string[];
  missing: string[];
  improvedAnswer: string;
  deliveryTip?: string;
}

export interface InterviewTurn {
  questionId: string;
  answer: string;
  metrics?: VoiceMetrics;
  feedback?: AnswerFeedback;
}

export interface InterviewReportData {
  /** 0-100, the average of the answer scores */
  overallScore: number;
  answered: number;
  summary: string;
  strengths: string[];
  weakAreas: string[];
  practiceNext: string[];
}

/** What /api/interview/report saves in a 'prep' or 'voice-prep' work */
export interface SavedInterview {
  version: 2;
  mode: InterviewMode;
  settings: InterviewSettings;
  fileName?: string;
  jobDescription?: string;
  resumeText?: string;
  questions: InterviewQuestion[];
  turns: InterviewTurn[];
  report: InterviewReportData;
}
