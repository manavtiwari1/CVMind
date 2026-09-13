export type UserStatus = 'active' | 'suspended' | 'banned';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  isGoogleUser: boolean;
  provider: string;
  status: UserStatus;
  statusReason: string;
  statusUpdatedAt: string | null;
  createdAt: string | null;
  lastLogin: string | null;
  loginCount: number;
}

export interface AdminStats {
  totalScans: number;
  averageScore: number;
  totalContacts: number;
  totalFixes?: number;
  totalTailors?: number;
  totalLogins?: number;
  totalResumes?: number;
  totalCoverLetters?: number;
  recentLogins?: Array<{
    id: string;
    email: string;
    name: string;
    provider: string;
    createdAt: string;
  }>;
  recentTailors?: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    score: number;
    jobDescription: string;
    matchedSkills: string[];
    missingSkills: string[];
    createdAt: string;
  }>;
  scoreDistribution: { low: number; medium: number; high: number };
  keywordTrends: Array<{ keyword: string; count: number }>;
  recentScans: Array<{ id: string; fileName: string; score: number; createdAt: string; missingKeywords: string[] }>;
  contactMessages: Array<{ id: string; name: string; email: string; subject: string; message: string; createdAt: string }>;
  recentFixes?: Array<{ id: string; fileName: string; priorScore: number; createdAt: string }>;
  totalPreps?: number;
  recentPreps?: Array<{ id: string; fileName: string; fileSize: number; questionsCount: number; createdAt: string }>;
  totalLinkedins?: number;
  totalLinkedinBios?: number;
  totalLinkedinOutreachs?: number;
  totalCareerCourses?: number;
  totalElevatorPitches?: number;
  totalCareerRoadmaps?: number;
  recentLinkedins?: Array<{ id: string; email: string; score: number; createdAt: string }>;
  recentLinkedinBios?: Array<{ id: string; email: string; jobTitle: string; createdAt: string }>;
  recentLinkedinOutreachs?: Array<{ id: string; email: string; jobTitle: string; createdAt: string }>;
  recentCareerCourses?: Array<{ id: string; email: string; jobTitle: string; createdAt: string }>;
  recentElevatorPitches?: Array<{ id: string; email: string; jobTitle: string; createdAt: string }>;
  recentCareerRoadmaps?: Array<{ id: string; email: string; createdAt: string }>;
  totalVoicePreps?: number;
  totalPortfolioGens?: number;
  totalLinkedinPosts?: number;
  totalJobFinders?: number;
  recentVoicePreps?: Array<{ id: string; email: string; jobTitle: string; score: number; createdAt: string }>;
  recentPortfolioGens?: Array<{ id: string; email: string; theme: string; createdAt: string }>;
  recentLinkedinPosts?: Array<{ id: string; email: string; topic: string; createdAt: string }>;
  recentJobFinders?: Array<{ id: string; email: string; jobsCount: number; jobDescription: string; jobType: string; createdAt: string }>;
  recentResumes?: Array<{
    id: string; title: string; templateId: string;
    createdAt: string; updatedAt: string;
    user: { name: string; email: string };
  }>;
  recentCoverLetters?: Array<{
    id: string; title: string; templateId: string;
    createdAt: string; updatedAt: string;
    user: { name: string; email: string };
  }>;
  database: { path: string; updatedAt: string | null };
  totalPayments?: number;
  recentPayments?: Array<{
    id: string; email: string; amount: number; currency: string;
    paymentMethod: string; transactionId: string; status: string; createdAt: string;
  }>;
}
