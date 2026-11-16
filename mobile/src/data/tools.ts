import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { LeoPose } from '@/lib/leo';
import { colors } from '@/theme';

// Every CVMind product, as tiles on Home. `route` is the app screen ("browser:<page>" opens that
// cvmind.in page in the browser); null opens a "coming soon" sheet.

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface Tool {
  id: string;
  title: string;
  blurb: string;
  icon: IconName;
  tint: string;
  soft: string;
  pose: LeoPose;
  route: string | null;
  isNew?: boolean;
}

export interface ToolGroup {
  id: string;
  title: string;
  tools: Tool[];
}

const violet = { tint: colors.brand, soft: colors.brandSoft };
const teal = { tint: colors.teal, soft: colors.tealSoft };
const blue = { tint: colors.blue, soft: colors.blueSoft };
const amber = { tint: colors.amber, soft: colors.amberSoft };
const rose = { tint: colors.rose, soft: colors.roseSoft };

export const TOOL_GROUPS: ToolGroup[] = [
  {
    id: 'resume',
    title: 'Resume',
    tools: [
      { id: 'resume-builder', title: 'Resume Builder', blurb: 'Build an ATS-ready resume in minutes', icon: 'document-text', ...violet, pose: 'resume', route: '/resume/new' },
      { id: 'resume-check', title: 'ATS Check', blurb: 'Score your resume and fix every point', icon: 'speedometer', ...teal, pose: 'checklist', route: '/ats' },
      { id: 'tailor', title: 'Tailor to Job', blurb: 'Match your resume to a job description', icon: 'git-compare', ...blue, pose: 'thinking', route: '/tailor' },
      { id: 'cover-letter', title: 'Cover Letter', blurb: 'A personal letter for every job', icon: 'mail-open', ...amber, pose: 'typing', route: '/cover-letter' },
      { id: 'proofreading', title: 'Proofread', blurb: 'Fix grammar and tone', icon: 'checkmark-done', ...rose, pose: 'checklist', route: '/tool/proofreading' },
    ],
  },
  {
    id: 'interview',
    title: 'Interview',
    tools: [
      { id: 'prep', title: 'Interview Prep', blurb: 'Questions made from your resume', icon: 'chatbubbles', ...violet, pose: 'support', route: '/interview' },
      { id: 'voice-prep', title: 'Voice Interview', blurb: 'Practise out loud, get feedback', icon: 'mic', ...rose, pose: 'support', route: '/interview?mode=voice' },
      { id: 'aptitude', title: 'Aptitude Tests', blurb: 'Timed practice tests', icon: 'calculator', ...blue, pose: 'thinking', route: '/aptitude' },
      { id: 'elevator-pitch', title: 'Elevator Pitch', blurb: 'Introduce yourself in 30 seconds', icon: 'megaphone', ...amber, pose: 'idea', route: '/tool/elevator-pitch' },
    ],
  },
  {
    id: 'jobs',
    title: 'Jobs',
    tools: [
      { id: 'job-finder', title: 'AI Job Finder', blurb: 'Real jobs matched to you', icon: 'briefcase', ...teal, pose: 'growth', route: '/jobs' },
      { id: 'auto-apply', title: 'Auto-Apply', blurb: 'Let Leo apply for you', icon: 'flash', ...violet, pose: 'typing', route: '/web?page=auto-apply&title=Auto-Apply' },
      { id: 'offer-negotiation', title: 'Salary Talk', blurb: 'Negotiate your offer', icon: 'cash', ...amber, pose: 'idea', route: '/tool/offer-negotiation' },
    ],
  },
  {
    id: 'linkedin',
    title: 'LinkedIn',
    tools: [
      { id: 'linkedin', title: 'Profile Review', blurb: 'Score your LinkedIn profile', icon: 'logo-linkedin', ...blue, pose: 'linkedin', route: '/tool/linkedin' },
      { id: 'linkedin-bio', title: 'Headline & About', blurb: 'Write a profile that gets found', icon: 'person-circle', ...violet, pose: 'linkedin', route: '/tool/linkedin-bio' },
      { id: 'linkedin-post', title: 'Post Writer', blurb: 'Posts people actually read', icon: 'create', ...teal, pose: 'linkedin', route: '/tool/linkedin-post' },
      { id: 'linkedin-outreach', title: 'Outreach', blurb: 'Messages to recruiters', icon: 'paper-plane', ...rose, pose: 'linkedin', route: '/tool/linkedin-outreach' },
    ],
  },
  {
    id: 'career',
    title: 'Career',
    tools: [
      { id: 'learn-with-leo', title: 'Learn with Leo', blurb: 'Bite-size lessons with voice', icon: 'school', ...violet, pose: 'guide', route: 'browser:learn-with-leo', isNew: true },
      { id: 'career-roadmap', title: 'Career Roadmap', blurb: 'Your path to the next role', icon: 'map', ...teal, pose: 'growth', route: '/tool/career-roadmap' },
      { id: 'career-courses', title: 'Courses', blurb: 'Courses for the skills you need', icon: 'library', ...blue, pose: 'guide', route: '/tool/career-courses' },
      { id: 'portfolio', title: 'Portfolio Site', blurb: 'Your own website in a minute', icon: 'globe', ...amber, pose: 'idea', route: '/web?page=portfolio-gen&title=Portfolio Site' },
      { id: 'code-arena', title: 'Code Arena', blurb: 'DSA practice and contests', icon: 'code-slash', ...rose, pose: 'typing', route: '/web?page=code-arena&title=Code Arena' },
    ],
  },
];

export const ALL_TOOLS = TOOL_GROUPS.flatMap((g) => g.tools);
export const toolById = (id: string) => ALL_TOOLS.find((t) => t.id === id);

// The five steps of the "plan to get hired" card (backend/src/growth/progress.js PLAN_STEPS)
export const PLAN_STEPS: Record<string, { title: string; tool: string }> = {
  resume: { title: 'Build your resume', tool: 'resume-builder' },
  ats: { title: 'Check your ATS score', tool: 'resume-check' },
  tailor: { title: 'Tailor it to a job', tool: 'tailor' },
  practise: { title: 'Practise an interview', tool: 'prep' },
  apply: { title: 'Apply to a job', tool: 'job-finder' },
};
