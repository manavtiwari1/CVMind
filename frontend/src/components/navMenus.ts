import {
  FileText, ScanSearch, Target, Globe, MessageSquare, Mic, SpellCheck, Code2,
  Briefcase, Send, UserCheck, PenLine, MessagesSquare, GraduationCap, Presentation,
  Map as MapIcon, Info, Mail, HelpCircle, BookOpen,
  type LucideIcon,
} from 'lucide-react';

export type NavBadge = 'new' | 'soon';

/** A row with an icon tile, a title and a one-line description. */
export interface NavTile {
  page: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  badge?: NavBadge;
}

/** A plain text link, used for the "Learning" style columns. */
export interface NavTextLink {
  page: string;
  title: string;
}

export interface NavColumn {
  heading: string;
  tiles?: NavTile[];
  links?: NavTextLink[];
}

export interface NavMenu {
  label: string;
  /** Pages that should highlight this menu as active. */
  pages: string[];
  columns: NavColumn[];
}

// Every `page` below is a route the app already handles (see validPages in App.tsx).
export const NAV_MENUS: NavMenu[] = [
  {
    label: 'Resume',
    pages: ['home', 'resume-builder', 'resume-editor', 'tailor', 'portfolio-gen'],
    columns: [
      {
        heading: 'Tools',
        tiles: [
          { page: 'resume-builder', title: 'Resume Builder', desc: 'Create a professional resume in minutes', icon: FileText },
          { page: 'home', title: 'Resume Checker', desc: 'Is your resume good enough?', icon: ScanSearch },
          { page: 'tailor', title: 'Resume Tailorer', desc: 'Match any job description instantly', icon: Target },
          { page: 'portfolio-gen', title: 'Portfolio Generator', desc: 'Build a shareable portfolio site', icon: Globe },
        ],
      },
      {
        heading: 'Learning',
        links: [
          { page: 'how-to-create-an-ats-friendly-resume', title: 'How to write an ATS-friendly resume' },
          { page: 'resume-format-for-freshers', title: 'Resume format for freshers' },
          { page: 'resume-keywords-guide', title: 'Resume keywords guide' },
          { page: 'ats-resume-checklist', title: 'ATS resume checklist' },
          { page: 'pdf-vs-docx-resume', title: 'PDF vs DOCX resume' },
        ],
      },
    ],
  },
  {
    label: 'AI Tools',
    pages: ['prep', 'voice-prep', 'job-finder', 'proofreading', 'auto-apply', 'code'],
    columns: [
      {
        heading: 'Interview',
        tiles: [
          { page: 'prep', title: 'Interview Prep AI', desc: 'Mock interview from your CV and the job', icon: MessageSquare },
          { page: 'code', title: 'CVMind Code', desc: 'DSA practice, AI code judge & assessments', icon: Code2, badge: 'new' },
          { page: 'voice-prep', title: 'Voice Prep AI', desc: 'Answer out loud, get speaking feedback', icon: Mic },
          { page: 'proofreading', title: 'AI Proofreading', desc: 'Grammar, tone & power verbs', icon: SpellCheck },
        ],
      },
      {
        heading: 'Job Search',
        tiles: [
          { page: 'job-finder', title: 'AI Job Finder', desc: 'Curated roles matching your profile', icon: Briefcase },
          { page: 'auto-apply', title: 'Auto Apply Agent', desc: 'Coming soon: AI applies to jobs for you', icon: Send, badge: 'soon' },
        ],
      },
      {
        heading: 'Learning',
        links: [
          { page: 'tell-me-about-yourself', title: '"Tell me about yourself" answers' },
          { page: 'resume-mistakes-to-avoid', title: '15 resume mistakes to avoid' },
        ],
      },
    ],
  },
  {
    label: 'Career',
    pages: ['linkedin', 'linkedin-bio', 'linkedin-outreach', 'linkedin-post', 'career-courses', 'elevator-pitch', 'career-roadmap'],
    columns: [
      {
        heading: 'LinkedIn',
        tiles: [
          { page: 'linkedin', title: 'Profile PDF Audit', desc: 'Score and fix your profile', icon: UserCheck },
          { page: 'linkedin-bio', title: 'Bio & Banner Generator', desc: 'Write a standout headline and About', icon: PenLine },
          { page: 'linkedin-outreach', title: 'Outreach & DM Writer', desc: 'Messages recruiters reply to', icon: MessagesSquare },
        ],
      },
      {
        heading: 'Career Path',
        tiles: [
          { page: 'career-courses', title: 'Skill Gaps & Courses', desc: 'Find what to learn next', icon: GraduationCap },
          { page: 'elevator-pitch', title: 'Elevator Pitch Builder', desc: 'Introduce yourself in 30 seconds', icon: Presentation },
          { page: 'career-roadmap', title: 'Career Roadmap', desc: 'Plan your next moves', icon: MapIcon },
        ],
      },
      {
        heading: 'Learning',
        links: [
          { page: 'linkedin-profile-optimization', title: 'LinkedIn profile optimization' },
          { page: 'tell-me-about-yourself', title: '"Tell me about yourself" formula' },
        ],
      },
    ],
  },
  {
    label: 'Resources',
    pages: ['about', 'contact', 'faq', 'blog', 'privacy', 'terms', 'refund-policy'],
    columns: [
      {
        heading: 'Company',
        tiles: [
          { page: 'about', title: 'About Us', desc: 'Who we are and what we build', icon: Info },
          { page: 'contact', title: 'Contact Us', desc: 'Questions, feedback or support', icon: Mail },
          { page: 'faq', title: "FAQ's", desc: 'Quick answers to common questions', icon: HelpCircle },
        ],
      },
      {
        heading: 'Learn & Legal',
        tiles: [
          { page: 'blog', title: 'Blog & Articles', desc: 'Resume and interview guides', icon: BookOpen },
        ],
        links: [
          { page: 'privacy', title: 'Privacy Policy' },
          { page: 'terms', title: 'Terms of Service' },
          { page: 'refund-policy', title: 'Refund Policy' },
        ],
      },
    ],
  },
];
