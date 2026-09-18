import { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Upload, Target, Brain, Briefcase, TrendingUp, Users, BarChart3,
  MessageSquare, DollarSign, BookOpen, CheckCircle2, ChevronRight, ChevronLeft,
  RefreshCw, Zap, Star, ArrowRight, Bell, Globe, Code2,
  FileText, Linkedin as LinkedinIcon, AlertCircle, Play, LayoutDashboard,
  GraduationCap, Activity, Rocket, Bot, Search, X, ExternalLink, Youtube
} from 'lucide-react';
import './CareerCopilot.css';
import { authFetch } from '../lib/authFetch';

const API = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

interface CopilotProps { customApiKey: string; resumeText?: string; setResumeText?: (t: string) => void; }
type View = 'landing' | 'onboarding' | 'dashboard';
type Tab = 'home' | 'resume' | 'jobs' | 'learn' | 'interview' | 'analytics';

interface InterviewSession {
  type: string; questions: string[]; idx: number;
  answers: string[]; feedbacks: any[]; done: boolean;
}

const AGENTS = [
  { icon: <FileText size={22} />, name: 'Resume Agent', color: '#2997ff', desc: 'ATS optimization, tailoring, keyword injection', status: 'active' },
  { icon: <Search size={22} />, name: 'Job Discovery', color: '#30d158', desc: 'Finds & ranks matching jobs across all platforms', status: 'active' },
  { icon: <LinkedinIcon size={22} />, name: 'LinkedIn Agent', color: '#0077b5', desc: 'Profile optimization, networking, posts', status: 'active' },
  { icon: <BookOpen size={22} />, name: 'Skill Coach', color: '#bf5af2', desc: 'Gap analysis, learning roadmap, certifications', status: 'active' },
  { icon: <MessageSquare size={22} />, name: 'Interview Coach', color: '#ff9f0a', desc: 'Mock sessions, STAR method, voice practice', status: 'active' },
  { icon: <Users size={22} />, name: 'Networking Agent', color: '#00c7be', desc: 'Recruiters, alumni, connection drafts', status: 'active' },
  { icon: <Activity size={22} />, name: 'Application Intel', color: '#ff6b35', desc: 'Track stages, detect patterns, optimize strategy', status: 'active' },
  { icon: <DollarSign size={22} />, name: 'Salary Intel', color: '#30d158', desc: 'Benchmarking, negotiation advice, offer comparison', status: 'active' },
  { icon: <BarChart3 size={22} />, name: 'Career Analytics', color: '#ff453a', desc: 'Weekly reports, growth charts, interview ratio', status: 'active' },
];

const FEATURES = [
  { icon: <Brain size={28} />, color: '#2997ff', title: 'AI Career Manager', desc: 'One goal → full strategy. AI orchestrates 9 specialized agents working for you 24/7.' },
  { icon: <Target size={28} />, color: '#30d158', title: 'Career Health Score', desc: 'Live score across resume, LinkedIn, skills, projects, and interview readiness.' },
  { icon: <Rocket size={28} />, color: '#bf5af2', title: 'Daily AI Briefing', desc: 'Every morning: new jobs, resume tips, skill alerts, and interview prep — personalized.' },
  { icon: <BarChart3 size={28} />, color: '#ff9f0a', title: 'Career Analytics', desc: 'Track interview rate, offer rate, resume performance, and career growth over time.' },
];

const COPILOT_FEATURES = [
  { icon: <FileText size={20} />, color: '#2997ff', title: 'AI Resume Agent', desc: 'Get a 0–100 ATS score with complete keyword gap analysis. Our AI rewrites weak bullet points, injects missing keywords, and formats your resume to pass every screening filter automatically.', mockup: 'resume' },
  { icon: <Search size={20} />, color: '#30d158', title: 'Smart Job Discovery', desc: 'Upload your resume once. AI scans and ranks matching roles across LinkedIn, Naukri, and Indeed by match %, salary, and location — filtered to exactly what you want.', mockup: 'jobs' },
  { icon: <MessageSquare size={20} />, color: '#ff9f0a', title: 'Interview AI Coach', desc: 'Practice HR, Technical, and STAR behavioral rounds with AI-generated questions tailored to your resume. Get live scoring, refined model answers, and a full performance report.', mockup: 'interview' },
  { icon: <TrendingUp size={20} />, color: '#bf5af2', title: 'Career Health Score', desc: 'A live 0–100 career fitness score across resume strength, LinkedIn optimization, skill gaps, interview readiness, and application velocity — updated as your profile improves.', mockup: 'health' },
  { icon: <Briefcase size={20} />, color: '#ff6b35', title: 'One-Click Apply & Track', desc: 'Apply to matched jobs on LinkedIn, Naukri, or Indeed in one click. Every application auto-logs with status, date, and portal — giving you complete pipeline visibility.', mockup: 'apply' },
];

const SKILL_DEMAND: Record<string, number> = {
  'React': 82, 'Node.js': 78, 'Python': 88, 'TypeScript': 76, 'Docker': 79,
  'Kubernetes': 68, 'AWS': 73, 'System Design': 85, 'GraphQL': 52, 'Redis': 61,
  'MongoDB': 65, 'PostgreSQL': 70, 'CI/CD': 75, 'Git': 90, 'REST API': 82,
  'Microservices': 71, 'Angular': 58, 'Vue.js': 54, 'Java': 72, 'Go': 64,
};

const INTERVIEW_BANKS: Record<string, (goal: string) => string[]> = {
  'HR Interview': (g) => [
    `Tell me about yourself and why you're pursuing a ${g} role.`,
    `Where do you see yourself in 5 years as a ${g}?`,
    `What is your greatest strength relevant to ${g}?`,
    `Describe a challenge you faced at work and how you handled it.`,
    `Why are you looking for a new opportunity right now?`,
  ],
  'Technical Round': (g) => [
    `What are the core technical skills required for ${g} and how do you rate yourself on each?`,
    `Walk me through how you would debug a production issue in a ${g} system.`,
    `Explain a complex technical concept relevant to ${g} in simple terms.`,
    `Describe the most technically challenging project you've built. How did you architect it?`,
    `How do you approach system design? Design a URL shortener at scale.`,
  ],
  'Behavioral (STAR)': (g) => [
    `Tell me about a time you demonstrated leadership in a ${g} project.`,
    `Describe a situation where you had to meet an impossible deadline. What did you do?`,
    `Give an example of when you disagreed with a manager or teammate. How did you resolve it?`,
    `Tell me about your biggest professional failure and what you learned from it.`,
    `Describe a time you took initiative and went above and beyond your role.`,
  ],
  'Voice Practice': (g) => [
    `Introduce yourself in 60 seconds as a ${g} candidate.`,
    `What makes you the ideal candidate for this ${g} position over others?`,
    `Describe your most impressive project in 2 minutes.`,
    `What are your salary expectations for a ${g} role in 2025?`,
    `Do you have any questions for the hiring team?`,
  ],
};

function HealthRing({ score }: { score: number }) {
  const r = 52; const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 70 ? '#30d158' : score >= 50 ? '#ff9f0a' : '#ff453a';
  return (
    <svg width="136" height="136" viewBox="0 0 136 136">
      <circle cx="68" cy="68" r={r} fill="none" stroke="#f2f2f7" strokeWidth="11" />
      <circle cx="68" cy="68" r={r} fill="none" stroke={color} strokeWidth="11"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 68 68)"
        style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
      <text x="68" y="63" textAnchor="middle" fontSize="26" fontWeight="800" fill="#1d1d1f">{score}</text>
      <text x="68" y="81" textAnchor="middle" fontSize="10" fill="#8e8e93">/ 100</text>
    </svg>
  );
}

export default function CareerCopilot({ customApiKey, resumeText: initialResume = '', setResumeText: setGlobalResume }: CopilotProps) {
  const [view, setView] = useState<View>('landing');
  const [tab, setTab] = useState<Tab>('home');
  const [step, setStep] = useState(1);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState(initialResume);
  const [goal, setGoal] = useState('');
  const [prefs, setPrefs] = useState({ salary: '', location: '', remote: 'Hybrid', industry: 'All' });
  const [profile, setProfile] = useState<any>(null);
  const [healthScore, setHealthScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [dailyBriefing, setDailyBriefing] = useState<any>(null);
  const [agentActive, setAgentActive] = useState('');
  const [agentPanel, setAgentPanel] = useState<string | null>(null);
  const [activeFeature, setActiveFeature] = useState(0);

  // Resume analysis
  const [resumeAnalysis, setResumeAnalysis] = useState<any>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const resumeAnalyzed = useRef(false);

  // Resume builder / AI fix
  const [aiFixLoading, setAiFixLoading] = useState(false);
  const [aiFixedResume, setAiFixedResume] = useState<string | null>(null);
  const [showResumeEditor, setShowResumeEditor] = useState(false);
  const [editableProfile, setEditableProfile] = useState<any>(null);

  // Interview
  const [interviewSession, setInterviewSession] = useState<InterviewSession | null>(null);
  const [interviewInput, setInterviewInput] = useState('');
  const [interviewEvalLoading, setInterviewEvalLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Analytics / Applications tracking
  const [applications, setApplications] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('cvmind_cc_apps') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    if (view === 'dashboard' && healthScore === 0) {
      setTimeout(() => setHealthScore(profile?.careerHealthScore || 72), 300);
    }
    if (view === 'dashboard' && !resumeAnalyzed.current && (resumeFile || resumeText)) {
      resumeAnalyzed.current = true;
      analyzeResume();
    }
  }, [view]);

  useEffect(() => {
    if (tab === 'resume' && !resumeAnalysis && !resumeLoading && (resumeFile || resumeText)) {
      analyzeResume();
    }
  }, [tab]);

  const analyzeResume = async () => {
    if (resumeLoading) return;
    setResumeLoading(true);
    try {
      const fd = new FormData();
      if (resumeFile) fd.append('resume', resumeFile);
      else if (resumeText) fd.append('resumeText', resumeText);
      else return;
      const headers: Record<string, string> = {};
      if (customApiKey) headers['x-gemini-key'] = customApiKey;
      const r = await fetch(`${API}/api/analyze`, { method: 'POST', body: fd, headers });
      const d = await r.json();
      if (d.success && d.data) setResumeAnalysis(d.data);
    } catch { } finally { setResumeLoading(false); }
  };

  const handleFileUpload = async (file: File) => {
    setResumeFile(file);
    const fd = new FormData(); fd.append('resume', file);
    try {
      setLoading(true); setLoadingMsg('Reading resume…');
      const r = await fetch(`${API}/api/analyze`, { method: 'POST', body: fd, headers: customApiKey ? { 'x-gemini-key': customApiKey } : {} });
      const d = await r.json();
      if (d.resumeText) { setResumeText(d.resumeText); if (setGlobalResume) setGlobalResume(d.resumeText); }
    } catch { } finally { setLoading(false); setLoadingMsg(''); }
  };

  const buildProfile = async () => {
    if (!resumeText.trim() && !resumeFile) { setError('Please upload your resume first.'); return; }
    setLoading(true); setLoadingMsg('AI is building your career profile…'); setError('');
    try {
      let text = resumeText;
      if (!text.trim() && resumeFile) {
        setLoadingMsg('Extracting resume text…');
        const fd = new FormData(); fd.append('resume', resumeFile);
        const r0 = await fetch(`${API}/api/analyze`, { method: 'POST', body: fd, headers: customApiKey ? { 'x-gemini-key': customApiKey } : {} });
        const d0 = await r0.json();
        text = d0.resumeText || '';
        if (text) { setResumeText(text); if (setGlobalResume) setGlobalResume(text); }
      }
      if (!text.trim()) { setError('Could not read resume text. Please try a different file.'); return; }
      setLoadingMsg('AI is building your career profile…');
      const r = await authFetch(`${API}/api/auto-apply/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(customApiKey ? { 'x-gemini-key': customApiKey } : {}) },
        body: JSON.stringify({ resumeText: text })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setProfile({ ...d.data, careerGoal: goal, careerHealthScore: 72 });
      setStep(3);
    } catch (e: any) { setError(e.message || 'Failed to build profile.'); }
    finally { setLoading(false); }
  };

  const launchCopilot = async () => {
    setLoading(true); setLoadingMsg('Launching your AI Career Copilot…');
    try {
      const r = await fetch(`${API}/api/auto-apply/jobs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills: profile?.skills || [], roles: [goal], locations: [prefs.location || 'India'], remote: prefs.remote, industry: prefs.industry })
      });
      const d = await r.json();
      if (d.success) setJobs(d.data.jobs || []);
      setDailyBriefing({
        date: new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
        newJobs: d.data?.jobs?.length || 0,
        resumeTip: 'Add quantified achievements to your experience section to boost ATS score by ~12%.',
        skillAlert: `You're missing Docker and Kubernetes — required in 68% of ${goal || 'tech'} roles.`,
        networkingAction: 'Connect with 3 recruiters at your target companies today.',
        interviewTip: 'Practice the STAR method for behavioral questions — your last weak area.',
      });
      setView('dashboard');
    } catch { setView('dashboard'); }
    finally { setLoading(false); }
  };

  const applyToJob = (job: any, portal: 'linkedin' | 'naukri' | 'indeed') => {
    const q = encodeURIComponent(`${job.title} ${job.company}`);
    const loc = encodeURIComponent(job.location || 'India');
    const slug = job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const links = {
      linkedin: `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${loc}`,
      naukri: `https://www.naukri.com/${slug}-jobs-in-${encodeURIComponent((job.location || 'india').toLowerCase().replace(/\s+/g, '-'))}`,
      indeed: `https://in.indeed.com/jobs?q=${encodeURIComponent(job.title)}&l=${loc}`,
    };
    const app = { title: job.title, company: job.company, location: job.location, portal, appliedAt: new Date().toISOString() };
    const updated = [...applications, app];
    setApplications(updated);
    localStorage.setItem('cvmind_cc_apps', JSON.stringify(updated));
    window.open(links[portal], '_blank');
  };

  const startInterview = (type: string) => {
    const g = profile?.careerGoal || goal || 'Software Engineer';
    const questions = INTERVIEW_BANKS[type]?.(g) || INTERVIEW_BANKS['HR Interview'](g);
    setInterviewSession({ type, questions, idx: 0, answers: [], feedbacks: [], done: false });
    setInterviewInput('');
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const submitAnswer = async () => {
    if (!interviewSession || !interviewInput.trim()) return;
    setInterviewEvalLoading(true);
    const currentQ = interviewSession.questions[interviewSession.idx];
    let feedback: any = null;
    try {
      const r = await fetch(`${API}/api/prep/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(customApiKey ? { 'x-gemini-key': customApiKey } : {}) },
        body: JSON.stringify({ question: currentQ, userAnswer: interviewInput, resumeText })
      });
      const d = await r.json();
      feedback = d.success ? d.data : null;
    } catch { }
    const newAnswers = [...interviewSession.answers, interviewInput];
    const newFeedbacks = [...interviewSession.feedbacks, feedback];
    const nextIdx = interviewSession.idx + 1;
    const done = nextIdx >= interviewSession.questions.length;
    setInterviewSession({ ...interviewSession, idx: nextIdx, answers: newAnswers, feedbacks: newFeedbacks, done });
    setInterviewInput('');
    setInterviewEvalLoading(false);
    if (!done) setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const avgInterviewScore = () => {
    if (!interviewSession?.feedbacks.length) return 0;
    const valid = interviewSession.feedbacks.filter(Boolean);
    if (!valid.length) return 0;
    return Math.round(valid.reduce((s, f) => s + (f.score || 0), 0) / valid.length * 10);
  };

  const getSkillGaps = () => {
    if (resumeAnalysis?.atsKeywords?.missing?.length) {
      return resumeAnalysis.atsKeywords.missing.slice(0, 8).map((s: string) => ({
        skill: s, demand: SKILL_DEMAND[s] || Math.floor(50 + Math.random() * 35),
        priority: (SKILL_DEMAND[s] || 60) >= 70 ? 'high' : 'medium'
      }));
    }
    return [
      { skill: 'Docker', demand: 79, priority: 'high' },
      { skill: 'System Design', demand: 85, priority: 'high' },
      { skill: 'AWS', demand: 73, priority: 'high' },
      { skill: 'Kubernetes', demand: 68, priority: 'high' },
      { skill: 'Redis', demand: 61, priority: 'medium' },
      { skill: 'GraphQL', demand: 52, priority: 'medium' },
    ];
  };

  const fixAndDownloadResume = async () => {
    if (!resumeText) { setError('Resume text not available. Please re-upload.'); return; }
    if (!resumeAnalysis) { setError('Wait for AI analysis to finish first.'); return; }
    setAiFixLoading(true); setError('');
    try {
      const r = await fetch(`${API}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(customApiKey ? { 'x-gemini-key': customApiKey } : {}) },
        body: JSON.stringify({ resumeText, analysisResult: resumeAnalysis })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setAiFixedResume(d.data.optimizedResume);
    } catch (e: any) { setError(e.message || 'AI fix failed. Try again.'); }
    finally { setAiFixLoading(false); }
  };

  const downloadAsPDF = (text: string) => {
    const name = profile?.name || 'Resume';
    const lines = text.split('\n').map(l =>
      l.match(/^[A-Z][A-Z\s]+$/) ? `<h2>${l}</h2>` : `<p>${l || '&nbsp;'}</p>`
    ).join('');
    const html = `<!DOCTYPE html><html><head><title>${name} — Resume</title>
<style>body{font-family:Arial,sans-serif;margin:40px;color:#1a1a1a;font-size:11pt;line-height:1.6}h2{font-size:12pt;text-transform:uppercase;border-bottom:1.5px solid #1a1a1a;padding-bottom:2px;margin:18px 0 8px}p{margin:2px 0}@media print{@page{margin:20mm}}</style>
</head><body>${lines}</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
  };

  const downloadAsDOC = (text: string, filename = 'resume') => {
    const name = profile?.name || 'Resume';
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'><title>${name}</title><style>body{font-family:Arial,sans-serif;font-size:11pt;line-height:1.6;margin:2cm}h2{font-size:12pt;text-transform:uppercase;border-bottom:1px solid #000;margin:18px 0 8px}p{margin:2px 0}</style></head><body>${text.split('\n').map(l => l.match(/^[A-Z][A-Z\s]+$/) ? `<h2>${l}</h2>` : `<p>${l || '&nbsp;'}</p>`).join('')}</body></html>`;
    const blob = new Blob(['﻿', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${filename}.doc`; a.click();
    URL.revokeObjectURL(url);
  };

  const buildResumeTextFromProfile = (p: any): string => {
    const lines: string[] = [];
    if (p.name) lines.push(p.name);
    const contact = [p.email, p.phone, p.location].filter(Boolean).join(' | ');
    if (contact) lines.push(contact);
    const links = [p.linkedin, p.github, p.portfolio].filter(Boolean).join(' | ');
    if (links) lines.push(links);
    lines.push('');
    if (p.summary) { lines.push('PROFESSIONAL SUMMARY'); lines.push(p.summary); lines.push(''); }
    const allSkills = [...(p.skills || []), ...(p.techStack || [])].filter((v, i, a) => a.indexOf(v) === i);
    if (allSkills.length) { lines.push('SKILLS'); lines.push(allSkills.join(', ')); lines.push(''); }
    if (p.experience?.length) {
      lines.push('EXPERIENCE');
      p.experience.forEach((e: any) => {
        lines.push(`${e.title} at ${e.company} | ${e.duration}`);
        if (e.description) lines.push(`• ${e.description}`);
        lines.push('');
      });
    }
    if (p.education?.length) {
      lines.push('EDUCATION');
      p.education.forEach((e: any) => { lines.push(`${e.degree} | ${e.institution} | ${e.year}`); });
      lines.push('');
    }
    if (p.certifications?.length) { lines.push('CERTIFICATIONS'); lines.push(p.certifications.join(', ')); }
    return lines.join('\n');
  };

  const openResumeEditor = () => {
    setEditableProfile(JSON.parse(JSON.stringify(profile || {})));
    setShowResumeEditor(true);
    setAiFixedResume(null);
  };

  const LEARN_PATH = [
    { step: 1, title: 'Docker Fundamentals', time: '1 week', platform: 'YouTube', yt: 'https://www.youtube.com/results?search_query=docker+tutorial+for+beginners', udemy: 'https://www.udemy.com/courses/search/?q=docker' },
    { step: 2, title: 'System Design Primer', time: '2 weeks', platform: 'YouTube / Educative', yt: 'https://www.youtube.com/results?search_query=system+design+interview+prep', udemy: 'https://www.udemy.com/courses/search/?q=system+design' },
    { step: 3, title: 'AWS Cloud Practitioner', time: '3 weeks', platform: 'AWS / YouTube', yt: 'https://www.youtube.com/results?search_query=aws+cloud+practitioner+full+course', udemy: 'https://www.udemy.com/courses/search/?q=aws+cloud+practitioner' },
    { step: 4, title: 'Kubernetes Crash Course', time: '1 week', platform: 'YouTube / KodeKloud', yt: 'https://www.youtube.com/results?search_query=kubernetes+crash+course+for+beginners', udemy: 'https://www.udemy.com/courses/search/?q=kubernetes' },
  ];

  const resumeScores = resumeAnalysis ? [
    ['ATS Score', resumeAnalysis.atsKeywords?.score ?? 72, '#2997ff'],
    ['Keyword Match', Math.round(((resumeAnalysis.atsKeywords?.matched?.length || 0) / Math.max((resumeAnalysis.atsKeywords?.matched?.length || 0) + (resumeAnalysis.atsKeywords?.missing?.length || 1), 1)) * 100), '#bf5af2'],
    ['Readability', resumeAnalysis.formattingAndStyle?.score ?? 85, '#30d158'],
    ['Impact Score', resumeAnalysis.contentAndImpact?.score ?? 61, '#ff9f0a'],
  ] : [
    ['ATS Score', 72, '#2997ff'], ['Keyword Match', 68, '#bf5af2'],
    ['Readability', 85, '#30d158'], ['Impact Score', 61, '#ff9f0a'],
  ];

  const aiSuggestions: string[] = resumeAnalysis?.recommendations?.length
    ? resumeAnalysis.recommendations
    : resumeAnalysis?.weaknesses?.length
      ? resumeAnalysis.weaknesses
      : [
        'Add quantified achievements (e.g. "Reduced load time by 40%") to experience bullets.',
        'Include 3 missing keywords: Docker, Microservices, CI/CD.',
        'Summary section is too generic — personalize for each target role.',
        'Add a Projects section to showcase hands-on experience.',
        'Skills section missing: TypeScript, Redis, System Design.',
      ];

  const portalCounts = applications.reduce((acc: Record<string, number>, a) => { acc[a.portal] = (acc[a.portal] || 0) + 1; return acc; }, {});

  // ── LANDING ────────────────────────────────────────────────────────────────────
  if (view === 'landing') return (
    <div className="cc-landing">
      <div className="cc-landing-hero">
        <div className="cc-hero-badge"><Bot size={14} /><span>9 AI Agents Working for You</span></div>
        <h1 className="cc-hero-title">AI Career <span className="cc-gradient-text">Copilot</span></h1>
        <p className="cc-hero-sub">Define your career goal. Our AI orchestrates 9 specialized agents to optimize your resume, discover jobs, prepare you for interviews, and track your entire career journey — automatically.</p>
        <div className="cc-hero-actions">
          <button className="cc-btn-primary cc-btn-large" onClick={() => setView('onboarding')}>
            <Rocket size={18} /> Launch My Copilot
          </button>
        </div>
        <div className="cc-hero-agents">
          {AGENTS.slice(0, 6).map((a, i) => (
            <div key={i} className="cc-agent-pill" style={{ '--ag-color': a.color } as any}>
              <span style={{ color: a.color }}>{a.icon}</span>{a.name}
            </div>
          ))}
        </div>
      </div>

      <div className="cc-features-grid">
        {FEATURES.map((f, i) => (
          <div key={i} className="cc-feature-card">
            <div className="cc-feature-icon" style={{ background: `${f.color}18`, color: f.color }}>{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* ── EQUIPPED SECTION ── */}
      <div className="cc-equipped-section">
        <div className="cc-equipped-inner">
          <div className="cc-equipped-left">
            <div className="cc-equipped-eyebrow"><Zap size={12} />FULLY EQUIPPED FOR THE AGE OF AI</div>
            <h2 className="cc-equipped-title">Fully equipped for<br/>your career</h2>
            <div className="cc-accordion">
              {COPILOT_FEATURES.map((f, i) => (
                <div key={i} className={`cc-acc-item ${activeFeature === i ? 'open' : ''}`} onClick={() => setActiveFeature(i)} style={{ '--acc-c': f.color } as any}>
                  <div className="cc-acc-header">
                    <span className="cc-acc-icon" style={{ color: f.color }}>{f.icon}</span>
                    <span className="cc-acc-title">{f.title}</span>
                    <span className="cc-acc-toggle">{activeFeature === i ? '−' : '+'}</span>
                  </div>
                  {activeFeature === i && <div className="cc-acc-body">{f.desc}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="cc-equipped-right">
            <div className="cc-mockup-window">
              <div className="cc-mockup-titlebar">
                <span className="cc-mock-dot" style={{ background: '#ff5f57' }} />
                <span className="cc-mock-dot" style={{ background: '#febc2e' }} />
                <span className="cc-mock-dot" style={{ background: '#28c840' }} />
                <span className="cc-mock-label"><Bot size={11} />AI Career Copilot</span>
              </div>

              {/* Resume mockup */}
              {activeFeature === 0 && (
                <div className="cc-mock-body cc-mock-resume">
                  <div className="cc-mock-ats-row">
                    <svg width="72" height="72" viewBox="0 0 72 72">
                      <circle cx="36" cy="36" r="28" fill="none" stroke="#e8e8ed" strokeWidth="6"/>
                      <circle cx="36" cy="36" r="28" fill="none" stroke="#2997ff" strokeWidth="6" strokeDasharray="175.9" strokeDashoffset="26" strokeLinecap="round" transform="rotate(-90 36 36)"/>
                      <text x="36" y="41" textAnchor="middle" fontSize="18" fontWeight="800" fill="#1d1d1f">85</text>
                    </svg>
                    <div><div className="cc-mock-ats-label">ATS Score</div><div className="cc-mock-ats-sub" style={{ color: '#30d158' }}>Great match ✓</div></div>
                  </div>
                  <div className="cc-mock-section-label">KEYWORD ANALYSIS</div>
                  {[['React.js', 98, '#30d158'], ['TypeScript', 92, '#30d158'], ['AWS Cloud', 74, '#2997ff'], ['System Design', 55, '#ff9f0a']].map(([k, v, c]) => (
                    <div key={String(k)} className="cc-mock-kw-row">
                      <span>{k}</span>
                      <div className="cc-mock-bar"><div style={{ width: `${v}%`, background: String(c) }} /></div>
                      <span>{v}%</span>
                    </div>
                  ))}
                  <div className="cc-mock-badges">
                    <span className="cc-mock-badge green">✓ Format OK</span>
                    <span className="cc-mock-badge green">✓ One Page</span>
                    <span className="cc-mock-badge orange">⚠ 3 gaps</span>
                  </div>
                </div>
              )}

              {/* Jobs mockup */}
              {activeFeature === 1 && (
                <div className="cc-mock-body cc-mock-jobs">
                  <div className="cc-mock-section-label">TOP JOB MATCHES</div>
                  {[{ title: 'Senior Frontend Engineer', co: 'Razorpay', score: 94, salary: '₹25–40L' },
                    { title: 'Full Stack Developer', co: 'Zepto', score: 87, salary: '₹18–30L' },
                    { title: 'React Developer', co: 'CRED', score: 81, salary: '₹20–35L' }].map((j, i) => (
                    <div key={i} className="cc-mock-job-card">
                      <div className="cc-mock-job-score" style={{ color: i === 0 ? '#30d158' : '#2997ff' }}>{j.score}%</div>
                      <div className="cc-mock-job-info"><div className="cc-mock-job-title">{j.title}</div><div className="cc-mock-job-meta">{j.co} · {j.salary}</div></div>
                      <div className="cc-mock-apply-btn">Apply</div>
                    </div>
                  ))}
                  <div className="cc-mock-job-footer"><Search size={11} />30 matches found across 3 platforms</div>
                </div>
              )}

              {/* Interview mockup */}
              {activeFeature === 2 && (
                <div className="cc-mock-body cc-mock-interview">
                  <div className="cc-mock-section-label">INTERVIEW COACH · HR Round</div>
                  <div className="cc-mock-question"><MessageSquare size={13} color="#ff9f0a" /><span>Tell me about yourself and why you're the right fit for this role?</span></div>
                  <div className="cc-mock-answer-area">Your answer goes here…</div>
                  <div className="cc-mock-feedback-row">
                    <div className="cc-mock-score-pill" style={{ background: '#30d15820', color: '#30d158' }}>8 / 10</div>
                    <div className="cc-mock-fb-text">Strong opening. Add a specific metric to boost impact.</div>
                  </div>
                  <div className="cc-mock-progress-dots">
                    {[0,1,2,3,4].map(i => <div key={i} className={`cc-mock-dot-step ${i === 1 ? 'active' : i < 1 ? 'done' : ''}`} />)}
                  </div>
                </div>
              )}

              {/* Health score mockup */}
              {activeFeature === 3 && (
                <div className="cc-mock-body cc-mock-health">
                  <div className="cc-mock-health-center">
                    <svg width="90" height="90" viewBox="0 0 90 90">
                      <circle cx="45" cy="45" r="36" fill="none" stroke="#e8e8ed" strokeWidth="7"/>
                      <circle cx="45" cy="45" r="36" fill="none" stroke="url(#hg)" strokeWidth="7" strokeDasharray="226" strokeDashoffset="40" strokeLinecap="round" transform="rotate(-90 45 45)"/>
                      <defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#bf5af2"/><stop offset="100%" stopColor="#2997ff"/></linearGradient></defs>
                      <text x="45" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="#1d1d1f">84</text>
                    </svg>
                    <div className="cc-mock-health-label">Career Health</div>
                  </div>
                  {[['Resume', 88, '#30d158'], ['LinkedIn', 72, '#2997ff'], ['Skills', 65, '#bf5af2'], ['Interview', 78, '#ff9f0a'], ['Applications', 55, '#ff6b35']].map(([k, v, c]) => (
                    <div key={String(k)} className="cc-mock-kw-row">
                      <span>{k}</span>
                      <div className="cc-mock-bar"><div style={{ width: `${v}%`, background: String(c) }} /></div>
                      <span>{v}%</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Apply & Track mockup */}
              {activeFeature === 4 && (
                <div className="cc-mock-body cc-mock-apply">
                  <div className="cc-mock-section-label">APPLICATION TRACKER</div>
                  {[{ title: 'Senior Frontend Eng', co: 'Razorpay', status: 'Applied', color: '#2997ff', days: '2d ago' },
                    { title: 'Full Stack Dev', co: 'Zepto', status: 'Viewed', color: '#ff9f0a', days: '4d ago' },
                    { title: 'React Developer', co: 'CRED', status: 'Interview', color: '#30d158', days: '6d ago' },
                    { title: 'ML Engineer', co: 'Google', status: 'Applied', color: '#2997ff', days: '1w ago' }].map((a, i) => (
                    <div key={i} className="cc-mock-app-row">
                      <div className="cc-mock-app-dot" style={{ background: a.color }} />
                      <div className="cc-mock-app-info"><div className="cc-mock-app-title">{a.title}</div><div className="cc-mock-app-co">{a.co} · {a.days}</div></div>
                      <span className="cc-mock-app-status" style={{ color: a.color, background: `${a.color}18` }}>{a.status}</span>
                    </div>
                  ))}
                  <div className="cc-mock-job-footer"><Activity size={11} />4 active applications tracked</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="cc-agents-section">
        <h2 className="cc-section-title">9 Specialized AI Agents</h2>
        <p className="cc-section-sub">Each agent masters one domain. Together they cover your entire career journey.</p>
        <div className="cc-agents-grid">
          {AGENTS.map((a, i) => (
            <div key={i} className="cc-agent-card">
              <div className="cc-agent-icon" style={{ background: `${a.color}15`, color: a.color }}>{a.icon}</div>
              <div className="cc-agent-info">
                <div className="cc-agent-name">{a.name}</div>
                <div className="cc-agent-desc">{a.desc}</div>
              </div>
              <div className="cc-agent-dot" style={{ background: '#30d158' }} />
            </div>
          ))}
        </div>
      </div>

      <div className="cc-cta-section">
        <h2>Your AI Career Manager Awaits</h2>
        <p>Stop using 10 different tools. Let one AI handle your entire job search.</p>
        <button className="cc-btn-primary cc-btn-large" onClick={() => setView('onboarding')}>
          <Sparkles size={18} /> Get Started Free
        </button>
      </div>
    </div>
  );

  // ── ONBOARDING ─────────────────────────────────────────────────────────────────
  if (view === 'onboarding') return (
    <div className="cc-onboarding">
      <div className="cc-ob-progress">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`cc-ob-step ${step >= s ? 'active' : ''} ${step > s ? 'done' : ''}`}>
            <div className="cc-ob-dot">{step > s ? <CheckCircle2 size={14} /> : s}</div>
            <span>{['Resume', 'Career Goal', 'Profile', 'Preferences'][s - 1]}</span>
            {s < 4 && <ChevronRight size={14} className="cc-ob-arrow" />}
          </div>
        ))}
      </div>

      <div className="cc-ob-card">
        {step === 1 && (
          <>
            <div className="cc-ob-header"><Upload size={32} color="#2997ff" /><h2>Upload Your Resume</h2><p>AI will extract your skills, experience, and build your career profile.</p></div>
            <div className={`cc-upload-zone ${resumeFile ? 'uploaded' : ''}`} onClick={() => document.getElementById('cc-file')?.click()}>
              <input id="cc-file" type="file" accept=".pdf,.docx,.txt" hidden onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
              {loading ? <><RefreshCw size={32} className="cc-spin" color="#2997ff" /><p>{loadingMsg}</p></> :
                resumeFile ? <><CheckCircle2 size={40} color="#30d158" /><p className="cc-upload-name">{resumeFile.name}</p><p className="cc-upload-hint">Click to change</p></> :
                  <><Upload size={40} color="#8e8e93" /><p className="cc-upload-title">Drop your resume here</p><p className="cc-upload-hint">PDF, DOCX · Max 5MB</p></>}
            </div>
            {error && <div className="cc-error"><AlertCircle size={14} />{error}</div>}
            <button className="cc-btn-primary cc-btn-full" disabled={!resumeFile || loading} onClick={() => setStep(2)}>Continue <ChevronRight size={16} /></button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="cc-ob-header"><Target size={32} color="#30d158" /><h2>Set Your Career Goal</h2><p>What role are you targeting? The AI will build a complete strategy around this.</p></div>
            <div className="cc-goal-grid">
              {['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Data Scientist', 'Product Manager', 'AI/ML Engineer', 'DevOps Engineer', 'Data Analyst', 'React Developer'].map(g => (
                <button key={g} className={`cc-goal-chip ${goal === g ? 'selected' : ''}`} onClick={() => setGoal(g)}>{g}</button>
              ))}
            </div>
            <input className="cc-input" placeholder="Or type your own goal…" value={goal} onChange={e => setGoal(e.target.value)} />
            <div className="cc-ob-nav">
              <button className="cc-btn-ghost" onClick={() => setStep(1)}><ChevronLeft size={16} /> Back</button>
              <button className="cc-btn-primary" disabled={!goal || loading} onClick={buildProfile}>
                {loading ? <><RefreshCw size={16} className="cc-spin" />{loadingMsg}</> : <>Build My Profile <ChevronRight size={16} /></>}
              </button>
            </div>
          </>
        )}

        {step === 3 && profile && (
          <>
            <div className="cc-ob-header"><CheckCircle2 size={32} color="#30d158" /><h2>Profile Built!</h2><p>Your AI career profile is ready. Here's what we found:</p></div>
            <div className="cc-profile-preview">
              <div className="cc-profile-row"><span className="cc-profile-label">Name</span><span>{(profile.name && profile.name !== 'Full Name') ? profile.name : (profile.email?.split('@')[0] || '—')}</span></div>
              <div className="cc-profile-row"><span className="cc-profile-label">Title</span><span>{(profile.title && profile.title !== 'Job Title') ? profile.title : goal}</span></div>
              <div className="cc-profile-row"><span className="cc-profile-label">Experience</span><span>{profile.yearsOfExperience ? `${profile.yearsOfExperience} years` : (profile.experience?.length ? `${profile.experience.length}+ roles` : '—')}</span></div>
              <div className="cc-profile-row"><span className="cc-profile-label">Skills</span>
                <div className="cc-skills-preview">{(profile.skills || []).slice(0, 8).map((s: string) => <span key={s} className="cc-skill-tag">{s}</span>)}</div>
              </div>
              <div className="cc-profile-row"><span className="cc-profile-label">Career Goal</span><span className="cc-goal-badge"><Target size={12} />{goal}</span></div>
            </div>
            <div className="cc-ob-nav">
              <button className="cc-btn-ghost" onClick={() => setStep(2)}><ChevronLeft size={16} /> Back</button>
              <button className="cc-btn-primary" onClick={() => setStep(4)}>Set Preferences <ChevronRight size={16} /></button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className="cc-ob-header"><Zap size={32} color="#ff9f0a" /><h2>Preferences</h2><p>Customize what the AI should focus on.</p></div>
            <div className="cc-pref-grid">
              <div><label className="cc-label"><DollarSign size={13} />Expected Salary</label><input className="cc-input" placeholder="e.g. ₹15L–₹25L" value={prefs.salary} onChange={e => setPrefs(p => ({ ...p, salary: e.target.value }))} /></div>
              <div><label className="cc-label"><Globe size={13} />Preferred Location</label><input className="cc-input" placeholder="e.g. Bengaluru, Mumbai" value={prefs.location} onChange={e => setPrefs(p => ({ ...p, location: e.target.value }))} /></div>
              <div><label className="cc-label"><Briefcase size={13} />Work Mode</label>
                <select className="cc-select" value={prefs.remote} onChange={e => setPrefs(p => ({ ...p, remote: e.target.value }))}>
                  {['Remote', 'Hybrid', 'Onsite', 'All'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div><label className="cc-label"><Activity size={13} />Industry</label>
                <select className="cc-select" value={prefs.industry} onChange={e => setPrefs(p => ({ ...p, industry: e.target.value }))}>
                  {['All', 'Tech', 'Fintech', 'E-commerce', 'SaaS', 'Healthcare', 'EdTech', 'Gaming'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="cc-ob-nav">
              <button className="cc-btn-ghost" onClick={() => setStep(3)}><ChevronLeft size={16} /> Back</button>
              <button className="cc-btn-primary" disabled={loading} onClick={launchCopilot}>
                {loading ? <><RefreshCw size={16} className="cc-spin" />{loadingMsg}</> : <><Rocket size={16} /> Launch Copilot</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // ── DASHBOARD ──────────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <LayoutDashboard size={16} /> },
    { id: 'resume', label: 'Resume', icon: <FileText size={16} /> },
    { id: 'jobs', label: 'Jobs', icon: <Briefcase size={16} /> },
    { id: 'learn', label: 'Learn', icon: <GraduationCap size={16} /> },
    { id: 'interview', label: 'Interview', icon: <MessageSquare size={16} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={16} /> },
  ];

  const skillGaps = getSkillGaps();

  return (
    <div className="cc-dashboard">
      {/* Interview Modal */}
      {interviewSession && (
        <div className="cc-modal-backdrop" onClick={() => setInterviewSession(null)}>
          <div className="cc-interview-modal" onClick={e => e.stopPropagation()}>
            <div className="cc-modal-header">
              <div>
                <div className="cc-modal-title">{interviewSession.type}</div>
                {!interviewSession.done && <div className="cc-modal-progress">Question {interviewSession.idx + 1} of {interviewSession.questions.length}</div>}
              </div>
              <button className="cc-icon-btn" onClick={() => setInterviewSession(null)}><X size={18} /></button>
            </div>

            {!interviewSession.done ? (
              <>
                <div className="cc-modal-q-track">
                  {interviewSession.questions.map((_, i) => (
                    <div key={i} className={`cc-q-dot ${i < interviewSession.idx ? 'done' : i === interviewSession.idx ? 'active' : ''}`} />
                  ))}
                </div>
                <div className="cc-modal-question">{interviewSession.questions[interviewSession.idx]}</div>

                {/* Show feedback from previous answer if exists */}
                {interviewSession.feedbacks.length > 0 && interviewSession.feedbacks[interviewSession.idx - 1] && (
                  <div className="cc-answer-feedback">
                    <div className="cc-feedback-score">Score: <strong>{interviewSession.feedbacks[interviewSession.idx - 1].score}/10</strong></div>
                    <div className="cc-feedback-strengths"><CheckCircle2 size={13} color="#30d158" />{interviewSession.feedbacks[interviewSession.idx - 1].strengths}</div>
                    <div className="cc-feedback-improve"><AlertCircle size={13} color="#ff9f0a" />{interviewSession.feedbacks[interviewSession.idx - 1].improvements}</div>
                    {interviewSession.feedbacks[interviewSession.idx - 1].refinedAnswer && (
                      <details className="cc-refined-answer"><summary>See refined answer</summary><p>{interviewSession.feedbacks[interviewSession.idx - 1].refinedAnswer}</p></details>
                    )}
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  className="cc-interview-textarea"
                  placeholder="Type your answer here… Be specific, use examples."
                  value={interviewInput}
                  onChange={e => setInterviewInput(e.target.value)}
                  rows={5}
                />
                <button className="cc-btn-primary cc-btn-full" disabled={!interviewInput.trim() || interviewEvalLoading} onClick={submitAnswer}>
                  {interviewEvalLoading ? <><RefreshCw size={15} className="cc-spin" />Evaluating…</> : interviewSession.idx === interviewSession.questions.length - 1 ? <>Submit & Finish <CheckCircle2 size={15} /></> : <>Submit & Next <ChevronRight size={15} /></>}
                </button>
              </>
            ) : (
              <div className="cc-interview-done">
                <div className="cc-done-score">
                  <HealthRing score={avgInterviewScore()} />
                  <div className="cc-done-label">Overall Score</div>
                </div>
                <div className="cc-done-breakdown">
                  {interviewSession.questions.map((q, i) => (
                    <div key={i} className="cc-done-row">
                      <div className="cc-done-q">Q{i + 1}: {q.slice(0, 60)}…</div>
                      {interviewSession.feedbacks[i] && (
                        <div className="cc-done-score-pill" style={{ background: (interviewSession.feedbacks[i].score || 0) >= 7 ? 'rgba(48,209,88,.12)' : 'rgba(255,159,10,.12)', color: (interviewSession.feedbacks[i].score || 0) >= 7 ? '#30d158' : '#ff9f0a' }}>
                          {interviewSession.feedbacks[i].score}/10
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button className="cc-btn-primary cc-btn-full" onClick={() => startInterview(interviewSession.type)}><RefreshCw size={15} /> Practice Again</button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="cc-dash-header">
        <div className="cc-dash-title">
          <Bot size={20} color="#2997ff" />
          <span>Career Copilot</span>
          <span className="cc-dash-goal-badge"><Target size={11} />{profile?.careerGoal || goal || 'Software Engineer'}</span>
        </div>
        <div className="cc-dash-actions">
          <button className="cc-icon-btn" title="Notifications"><Bell size={18} /></button>
          <button className="cc-icon-btn" title="Refresh" onClick={analyzeResume} disabled={resumeLoading}>
            <RefreshCw size={18} className={resumeLoading ? 'cc-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="cc-tabs">
        {tabs.map(t => <button key={t.id} className={`cc-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.icon}{t.label}</button>)}
      </div>

      <div className="cc-dash-body">
        {/* HOME */}
        {tab === 'home' && (
          <div className="cc-home">
            <div className="cc-home-top">
              <div className="cc-health-card">
                <HealthRing score={healthScore} />
                <div className="cc-health-details">
                  <div className="cc-health-title">Career Health Score</div>
                  <div className="cc-health-breakdown">
                    {[['Resume', resumeAnalysis?.score ?? 78], ['LinkedIn', 60], ['Skills', 68], ['Interview', avgInterviewScore() || 55], ['Projects', 80]].map(([k, v]) => (
                      <div key={String(k)} className="cc-health-row">
                        <span>{k}</span>
                        <div className="cc-health-bar"><div style={{ width: `${v}%`, background: Number(v) >= 70 ? '#30d158' : '#ff9f0a' }} /></div>
                        <span>{v}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {dailyBriefing && (
                <div className="cc-briefing-card">
                  <div className="cc-briefing-header"><Bell size={14} color="#2997ff" /><span>Daily AI Briefing</span><span className="cc-briefing-date">{dailyBriefing.date}</span></div>
                  <div className="cc-briefing-items">
                    <div className="cc-briefing-item cc-bi-jobs"><Briefcase size={13} /><span><strong>{dailyBriefing.newJobs} new jobs</strong> match your profile today</span></div>
                    <div className="cc-briefing-item cc-bi-resume"><TrendingUp size={13} /><span>{dailyBriefing.resumeTip}</span></div>
                    <div className="cc-briefing-item cc-bi-skill"><AlertCircle size={13} /><span>{dailyBriefing.skillAlert}</span></div>
                    <div className="cc-briefing-item cc-bi-network"><Users size={13} /><span>{dailyBriefing.networkingAction}</span></div>
                    <div className="cc-briefing-item cc-bi-interview"><MessageSquare size={13} /><span>{dailyBriefing.interviewTip}</span></div>
                  </div>
                </div>
              )}
            </div>
            <div className="cc-agents-status">
              <div className="cc-section-label">Active Agents</div>
              <div className="cc-agents-row">
                {AGENTS.map((a, i) => {
                  const tabMap: Record<string, Tab> = {
                    'Resume Agent': 'resume', 'Job Discovery': 'jobs',
                    'Skill Coach': 'learn', 'Interview Coach': 'interview',
                    'Application Intel': 'analytics', 'Career Analytics': 'analytics',
                  };
                  const panelAgents = ['LinkedIn Agent', 'Networking Agent', 'Salary Intel'];
                  const isPanel = panelAgents.includes(a.name);
                  const handleClick = () => {
                    setAgentActive(a.name);
                    if (isPanel) {
                      setAgentPanel(agentPanel === a.name ? null : a.name);
                    } else {
                      setAgentPanel(null);
                      if (tabMap[a.name]) setTab(tabMap[a.name]);
                    }
                  };
                  return (
                    <button key={i} className={`cc-agent-status-card ${agentActive === a.name ? 'active' : ''}`} onClick={handleClick} style={{ '--ag-c': a.color } as any} title={a.desc}>
                      <div style={{ color: a.color }}>{a.icon}</div>
                      <span>{a.name.split(' ')[0]}</span>
                      <div className="cc-agent-pulse" style={{ background: a.color }} />
                    </button>
                  );
                })}
              </div>
              {agentActive && !agentPanel && (
                <div className="cc-agent-detail">
                  {(() => { const ag = AGENTS.find(a => a.name === agentActive)!; return <><span style={{ color: ag.color, fontWeight: 700 }}>{ag.name}</span> — {ag.desc} <span className="cc-agent-detail-action">↑ Navigating…</span></>; })()}
                </div>
              )}
              {agentPanel === 'LinkedIn Agent' && (
                <div className="cc-agent-panel">
                  <div className="cc-agent-panel-header" style={{ borderColor: '#0077b5' }}>
                    <LinkedinIcon size={18} color="#0077b5" /><span style={{ color: '#0077b5' }}>LinkedIn Agent</span>
                    <button className="cc-panel-close" onClick={() => { setAgentPanel(null); setAgentActive(''); }}><X size={14} /></button>
                  </div>
                  <div className="cc-agent-panel-body">
                    <div className="cc-ap-section">
                      <div className="cc-ap-label">Optimized Headline</div>
                      <div className="cc-ap-content cc-ap-copyable">
                        {profile?.title || goal} | {(profile?.skills || []).slice(0, 3).join(' · ')} | {profile?.yearsOfExperience ? `${profile.yearsOfExperience}+ yrs exp` : 'Open to Opportunities'}
                      </div>
                    </div>
                    <div className="cc-ap-section">
                      <div className="cc-ap-label">About Section Draft</div>
                      <div className="cc-ap-content">
                        I'm a passionate {profile?.title || goal} with {profile?.yearsOfExperience || '2+'} years of experience building impactful solutions using {(profile?.skills || ['modern technologies']).slice(0, 4).join(', ')}. I thrive at the intersection of technical excellence and business outcomes — turning complex problems into clean, scalable solutions. Currently seeking {goal || 'exciting new opportunities'} where I can drive meaningful impact. Let's connect!
                      </div>
                    </div>
                    <div className="cc-ap-section">
                      <div className="cc-ap-label">Post Ideas to Boost Visibility</div>
                      {['Share a project you built: what problem it solves, your tech stack, and key learnings.',
                        `Write about your journey learning ${(profile?.skills || ['your top skill'])[0]} — your mistakes and breakthroughs.`,
                        'Share 3 interview tips specific to your domain. Engineers love concrete advice.'
                      ].map((idea, i) => (
                        <div key={i} className="cc-ap-post-idea"><Zap size={12} color="#0077b5" /><span>{idea}</span></div>
                      ))}
                    </div>
                    <a href="https://www.linkedin.com/in/" target="_blank" rel="noopener noreferrer" className="cc-ap-action-btn" style={{ background: '#0077b5' }}>
                      <ExternalLink size={14} /> Open LinkedIn Profile
                    </a>
                  </div>
                </div>
              )}
              {agentPanel === 'Networking Agent' && (
                <div className="cc-agent-panel">
                  <div className="cc-agent-panel-header" style={{ borderColor: '#00c7be' }}>
                    <Users size={18} color="#00c7be" /><span style={{ color: '#00c7be' }}>Networking Agent</span>
                    <button className="cc-panel-close" onClick={() => { setAgentPanel(null); setAgentActive(''); }}><X size={14} /></button>
                  </div>
                  <div className="cc-agent-panel-body">
                    <div className="cc-ap-section">
                      <div className="cc-ap-label">Recruiter Outreach Message</div>
                      <div className="cc-ap-content cc-ap-copyable">
                        Hi [Recruiter Name], I came across your profile while exploring {goal || 'tech'} opportunities. I'm a {profile?.title || goal} with {profile?.yearsOfExperience || '2+'} years in {(profile?.skills || ['software development']).slice(0, 2).join(' & ')}. Would love to learn about any open roles at your company. Happy to share my resume. Thanks!
                      </div>
                    </div>
                    <div className="cc-ap-section">
                      <div className="cc-ap-label">Peer Connection Request</div>
                      <div className="cc-ap-content cc-ap-copyable">
                        Hey [Name]! I noticed you work as a {goal} — would love to connect and exchange learnings. Always great to grow my network with like-minded professionals in {(profile?.industries || ['tech'])[0] || 'tech'}!
                      </div>
                    </div>
                    <div className="cc-ap-section">
                      <div className="cc-ap-label">Daily Networking Actions</div>
                      {[`Search "${goal} hiring" on LinkedIn and connect with 3 active recruiters`,
                        'Comment on 2 posts in your feed with a thoughtful insight (boosts visibility)',
                        'Follow 5 companies in your target industry to stay updated on openings',
                        'Send a follow-up to any pending applications older than 7 days'
                      ].map((action, i) => (
                        <div key={i} className="cc-ap-post-idea"><CheckCircle2 size={12} color="#00c7be" /><span>{action}</span></div>
                      ))}
                    </div>
                    <a href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent((goal || 'software engineer') + ' recruiter')}`} target="_blank" rel="noopener noreferrer" className="cc-ap-action-btn" style={{ background: '#00c7be' }}>
                      <ExternalLink size={14} /> Find Recruiters on LinkedIn
                    </a>
                  </div>
                </div>
              )}
              {agentPanel === 'Salary Intel' && (() => {
                const SALARY_MAP: Record<string, [number, number, number]> = {
                  'Software Engineer': [10, 35, 18], 'Frontend Developer': [8, 28, 15],
                  'Backend Developer': [10, 32, 17], 'Full Stack Developer': [10, 35, 18],
                  'Data Scientist': [12, 40, 22], 'AI/ML Engineer': [15, 50, 28],
                  'DevOps Engineer': [12, 38, 20], 'Product Manager': [15, 45, 25],
                  'React Developer': [8, 28, 15], 'Data Analyst': [7, 22, 13],
                };
                const key = Object.keys(SALARY_MAP).find(k => (goal || '').toLowerCase().includes(k.toLowerCase())) || 'Software Engineer';
                const [min, max, avg] = SALARY_MAP[key] || [10, 30, 16];
                return (
                  <div className="cc-agent-panel">
                    <div className="cc-agent-panel-header" style={{ borderColor: '#30d158' }}>
                      <DollarSign size={18} color="#30d158" /><span style={{ color: '#30d158' }}>Salary Intel</span>
                      <button className="cc-panel-close" onClick={() => { setAgentPanel(null); setAgentActive(''); }}><X size={14} /></button>
                    </div>
                    <div className="cc-agent-panel-body">
                      <div className="cc-salary-range-card">
                        <div className="cc-salary-role">{goal || 'Software Engineer'} · India Market</div>
                        <div className="cc-salary-bars">
                          <div className="cc-salary-bar-row"><span>Entry</span><div className="cc-sbar"><div style={{ width: `${(min/max)*100}%`, background: '#ff9f0a' }} /></div><span>₹{min}L</span></div>
                          <div className="cc-salary-bar-row cc-highlight"><span>Mid (You)</span><div className="cc-sbar"><div style={{ width: `${(avg/max)*100}%`, background: '#30d158' }} /></div><span>₹{avg}L</span></div>
                          <div className="cc-salary-bar-row"><span>Senior</span><div className="cc-sbar"><div style={{ width: '100%', background: '#2997ff' }} /></div><span>₹{max}L</span></div>
                        </div>
                      </div>
                      <div className="cc-ap-section">
                        <div className="cc-ap-label">Negotiation Tips</div>
                        {[`Your skills in ${(profile?.skills || ['your stack'])[0]} command a premium — mention it early.`,
                          `Counter-offer: always ask for at least 15–20% above the first offer.`,
                          'Research the company\'s funding stage — Series B+ companies have more headroom.',
                          'Ask for stock options if base is non-negotiable.'
                        ].map((tip, i) => (
                          <div key={i} className="cc-ap-post-idea"><Star size={12} color="#30d158" /><span>{tip}</span></div>
                        ))}
                      </div>
                      <a href={`https://www.glassdoor.co.in/Salaries/${encodeURIComponent((goal || 'software-engineer').toLowerCase().replace(/\s+/g, '-'))}-salary-SRCH_KO0,${(goal || 'Software Engineer').length}.htm`} target="_blank" rel="noopener noreferrer" className="cc-ap-action-btn" style={{ background: '#30d158' }}>
                        <ExternalLink size={14} /> Check Live Salaries on Glassdoor
                      </a>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="cc-quick-jobs">
              <div className="cc-section-label">Top Job Matches Today</div>
              {jobs.slice(0, 4).map((j: any, i) => (
                <div key={i} className="cc-job-row">
                  <div className="cc-job-score" style={{ color: j.matchScore >= 75 ? '#30d158' : '#ff9f0a' }}>{j.matchScore}%</div>
                  <div className="cc-job-info"><div className="cc-job-title">{j.title}</div><div className="cc-job-co">{j.company} · {j.location} · {j.salary}</div></div>
                  <button className="cc-btn-sm" onClick={() => setTab('jobs')}>View <ArrowRight size={12} /></button>
                </div>
              ))}
              {jobs.length === 0 && <div className="cc-empty-state"><Search size={28} /><p>No jobs loaded yet. Go to Jobs tab to discover matches.</p></div>}
            </div>
          </div>
        )}

        {/* RESUME */}
        {tab === 'resume' && (
          <div className="cc-module">
            <div className="cc-module-header">
              <FileText size={20} color="#2997ff" /><h3>Resume Center</h3>
              {resumeLoading && <span className="cc-loading-badge"><RefreshCw size={12} className="cc-spin" />Analyzing…</span>}
              {!resumeLoading && resumeAnalysis && <span className="cc-badge-green">AI Analyzed</span>}
            </div>
            <div className="cc-resume-scores">
              {resumeScores.map(([k, v, c]) => (
                <div key={String(k)} className="cc-score-card">
                  <div className="cc-score-val" style={{ color: String(c) }}>{v}%</div>
                  <div className="cc-score-label">{k}</div>
                </div>
              ))}
            </div>

            {resumeAnalysis?.atsKeywords?.missing?.length > 0 && (
              <div className="cc-missing-keywords">
                <div className="cc-section-label">Missing Keywords</div>
                <div className="cc-kw-chips">
                  {resumeAnalysis.atsKeywords.missing.slice(0, 10).map((kw: string) => (
                    <a key={kw} href={`https://www.youtube.com/results?search_query=learn+${encodeURIComponent(kw)}`} target="_blank" rel="noopener noreferrer" className="cc-kw-chip-missing">{kw} <ExternalLink size={10} /></a>
                  ))}
                </div>
              </div>
            )}

            <div className="cc-ai-suggestions">
              <div className="cc-section-label">AI Suggestions</div>
              {aiSuggestions.slice(0, 6).map((s, i) => (
                <div key={i} className="cc-suggestion"><Sparkles size={13} color="#2997ff" /><span>{s}</span></div>
              ))}
            </div>

            {resumeAnalysis?.contentAndImpact?.suggestions?.length > 0 && (
              <div className="cc-rewrites">
                <div className="cc-section-label">AI Bullet Rewrites</div>
                {resumeAnalysis.contentAndImpact.suggestions.map((s: any, i: number) => (
                  <div key={i} className="cc-rewrite-card">
                    <div className="cc-rewrite-before"><span>Before</span><p>{s.original}</p></div>
                    <ArrowRight size={14} color="#8e8e93" className="cc-rewrite-arrow" />
                    <div className="cc-rewrite-after"><span>After</span><p>{s.improved}</p></div>
                  </div>
                ))}
              </div>
            )}

            {/* ── AI Fix & Download ── */}
            <div className="cc-resume-fix-bar">
              <button className="cc-btn-fix" onClick={fixAndDownloadResume} disabled={aiFixLoading || !resumeAnalysis}>
                {aiFixLoading ? <><RefreshCw size={14} className="cc-spin" /> AI is fixing…</> : <><Sparkles size={14} /> AI Fix & Download</>}
              </button>
              <button className="cc-btn-edit" onClick={openResumeEditor} disabled={!profile}>
                <FileText size={14} /> {showResumeEditor ? 'Close Editor' : 'Edit Resume'}
              </button>
              <button className="cc-btn-ghost cc-btn-sm-re" onClick={analyzeResume} disabled={resumeLoading}>
                <RefreshCw size={13} className={resumeLoading ? 'cc-spin' : ''} /> Re-Analyze
              </button>
            </div>

            {/* ── AI Fixed Resume Preview ── */}
            {aiFixedResume && !showResumeEditor && (
              <div className="cc-fixed-resume-panel">
                <div className="cc-frp-header">
                  <CheckCircle2 size={16} color="#30d158" />
                  <span>AI-Fixed Resume Ready</span>
                  <div className="cc-frp-actions">
                    <button className="cc-frp-btn cc-frp-pdf" onClick={() => downloadAsPDF(aiFixedResume)}>
                      <ArrowRight size={12} /> Download PDF
                    </button>
                    <button className="cc-frp-btn cc-frp-doc" onClick={() => downloadAsDOC(aiFixedResume, `${(profile?.name || 'resume').replace(/\s+/g, '_')}_optimized`)}>
                      <ArrowRight size={12} /> Download DOCX
                    </button>
                    <button className="cc-frp-close" onClick={() => setAiFixedResume(null)}><X size={13} /></button>
                  </div>
                </div>
                <pre className="cc-frp-preview">{aiFixedResume}</pre>
              </div>
            )}

            {/* ── Resume Editor ── */}
            {showResumeEditor && editableProfile && (
              <div className="cc-resume-editor">
                <div className="cc-re-header">
                  <FileText size={16} color="#2997ff" /><span>Resume Builder</span>
                  <div className="cc-re-actions">
                    <button className="cc-frp-btn cc-frp-pdf" onClick={() => downloadAsPDF(buildResumeTextFromProfile(editableProfile))}>
                      <ArrowRight size={12} /> PDF
                    </button>
                    <button className="cc-frp-btn cc-frp-doc" onClick={() => downloadAsDOC(buildResumeTextFromProfile(editableProfile), `${(editableProfile.name || 'resume').replace(/\s+/g, '_')}`)}>
                      <ArrowRight size={12} /> DOCX
                    </button>
                    <button className="cc-frp-close" onClick={() => setShowResumeEditor(false)}><X size={13} /></button>
                  </div>
                </div>
                <div className="cc-re-body">
                  {/* Personal Info */}
                  <div className="cc-re-section"><div className="cc-re-section-title">Personal Info</div>
                    <div className="cc-re-grid2">
                      <div className="cc-re-field"><label>Full Name</label><input value={editableProfile.name || ''} onChange={e => setEditableProfile({ ...editableProfile, name: e.target.value })} placeholder="Your Name" /></div>
                      <div className="cc-re-field"><label>Job Title</label><input value={editableProfile.title || ''} onChange={e => setEditableProfile({ ...editableProfile, title: e.target.value })} placeholder="e.g. Software Engineer" /></div>
                      <div className="cc-re-field"><label>Email</label><input value={editableProfile.email || ''} onChange={e => setEditableProfile({ ...editableProfile, email: e.target.value })} placeholder="you@email.com" /></div>
                      <div className="cc-re-field"><label>Phone</label><input value={editableProfile.phone || ''} onChange={e => setEditableProfile({ ...editableProfile, phone: e.target.value })} placeholder="+91 98765 43210" /></div>
                      <div className="cc-re-field"><label>Location</label><input value={editableProfile.location || ''} onChange={e => setEditableProfile({ ...editableProfile, location: e.target.value })} placeholder="City, Country" /></div>
                      <div className="cc-re-field"><label>LinkedIn</label><input value={editableProfile.linkedin || ''} onChange={e => setEditableProfile({ ...editableProfile, linkedin: e.target.value })} placeholder="linkedin.com/in/you" /></div>
                      <div className="cc-re-field"><label>GitHub</label><input value={editableProfile.github || ''} onChange={e => setEditableProfile({ ...editableProfile, github: e.target.value })} placeholder="github.com/you" /></div>
                      <div className="cc-re-field"><label>Portfolio</label><input value={editableProfile.portfolio || ''} onChange={e => setEditableProfile({ ...editableProfile, portfolio: e.target.value })} placeholder="yoursite.com" /></div>
                    </div>
                  </div>
                  {/* Summary */}
                  <div className="cc-re-section"><div className="cc-re-section-title">Professional Summary</div>
                    <textarea className="cc-re-textarea" rows={4} value={editableProfile.summary || ''} onChange={e => setEditableProfile({ ...editableProfile, summary: e.target.value })} placeholder="2-3 sentence professional summary…" />
                  </div>
                  {/* Skills */}
                  <div className="cc-re-section"><div className="cc-re-section-title">Skills</div>
                    <textarea className="cc-re-textarea" rows={2} value={(editableProfile.skills || []).join(', ')} onChange={e => setEditableProfile({ ...editableProfile, skills: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })} placeholder="React, TypeScript, Node.js, Python…" />
                    <div className="cc-re-hint">Comma-separated list</div>
                  </div>
                  {/* Experience */}
                  <div className="cc-re-section"><div className="cc-re-section-title">Experience
                    <button className="cc-re-add-btn" onClick={() => setEditableProfile({ ...editableProfile, experience: [...(editableProfile.experience || []), { title: '', company: '', duration: '', description: '' }] })}>+ Add</button>
                  </div>
                    {(editableProfile.experience || []).map((exp: any, i: number) => (
                      <div key={i} className="cc-re-entry">
                        <div className="cc-re-grid2">
                          <div className="cc-re-field"><label>Job Title</label><input value={exp.title || ''} onChange={e => { const ex = [...editableProfile.experience]; ex[i] = { ...ex[i], title: e.target.value }; setEditableProfile({ ...editableProfile, experience: ex }); }} placeholder="Software Engineer" /></div>
                          <div className="cc-re-field"><label>Company</label><input value={exp.company || ''} onChange={e => { const ex = [...editableProfile.experience]; ex[i] = { ...ex[i], company: e.target.value }; setEditableProfile({ ...editableProfile, experience: ex }); }} placeholder="Acme Corp" /></div>
                          <div className="cc-re-field"><label>Duration</label><input value={exp.duration || ''} onChange={e => { const ex = [...editableProfile.experience]; ex[i] = { ...ex[i], duration: e.target.value }; setEditableProfile({ ...editableProfile, experience: ex }); }} placeholder="Jan 2022 – Present" /></div>
                        </div>
                        <div className="cc-re-field"><label>Description</label><textarea className="cc-re-textarea" rows={2} value={exp.description || ''} onChange={e => { const ex = [...editableProfile.experience]; ex[i] = { ...ex[i], description: e.target.value }; setEditableProfile({ ...editableProfile, experience: ex }); }} placeholder="Bullet points describing your role and impact…" /></div>
                        <button className="cc-re-del-btn" onClick={() => { const ex = editableProfile.experience.filter((_: any, j: number) => j !== i); setEditableProfile({ ...editableProfile, experience: ex }); }}>Remove</button>
                      </div>
                    ))}
                  </div>
                  {/* Education */}
                  <div className="cc-re-section"><div className="cc-re-section-title">Education
                    <button className="cc-re-add-btn" onClick={() => setEditableProfile({ ...editableProfile, education: [...(editableProfile.education || []), { degree: '', institution: '', year: '' }] })}>+ Add</button>
                  </div>
                    {(editableProfile.education || []).map((edu: any, i: number) => (
                      <div key={i} className="cc-re-entry">
                        <div className="cc-re-grid2">
                          <div className="cc-re-field"><label>Degree</label><input value={edu.degree || ''} onChange={e => { const ed = [...editableProfile.education]; ed[i] = { ...ed[i], degree: e.target.value }; setEditableProfile({ ...editableProfile, education: ed }); }} placeholder="B.Tech Computer Science" /></div>
                          <div className="cc-re-field"><label>Institution</label><input value={edu.institution || ''} onChange={e => { const ed = [...editableProfile.education]; ed[i] = { ...ed[i], institution: e.target.value }; setEditableProfile({ ...editableProfile, education: ed }); }} placeholder="IIT Delhi" /></div>
                          <div className="cc-re-field"><label>Year</label><input value={edu.year || ''} onChange={e => { const ed = [...editableProfile.education]; ed[i] = { ...ed[i], year: e.target.value }; setEditableProfile({ ...editableProfile, education: ed }); }} placeholder="2023" /></div>
                        </div>
                        <button className="cc-re-del-btn" onClick={() => { const ed = editableProfile.education.filter((_: any, j: number) => j !== i); setEditableProfile({ ...editableProfile, education: ed }); }}>Remove</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* JOBS */}
        {tab === 'jobs' && (
          <div className="cc-module">
            <div className="cc-module-header"><Briefcase size={20} color="#30d158" /><h3>Job Center</h3><span className="cc-badge">{jobs.length} matches</span></div>
            {jobs.map((j: any, i) => (
              <div key={i} className="cc-job-card">
                <div className="cc-job-card-score" style={{ background: j.matchScore >= 75 ? '#30d15820' : '#ff9f0a20', color: j.matchScore >= 75 ? '#30d158' : '#ff9f0a' }}>{j.matchScore}%</div>
                <div className="cc-job-card-body">
                  <div className="cc-job-card-title">{j.title} — {j.company}</div>
                  <div className="cc-job-card-meta">{j.location} · {j.type} · {j.remote} · {j.salary}</div>
                  <div className="cc-job-card-skills">
                    {(j.matchedSkills || []).slice(0, 3).map((s: string) => <span key={s} className="cc-skill-matched">{s}</span>)}
                    {(j.missingSkills || []).slice(0, 2).map((s: string) => <span key={s} className="cc-skill-missing">{s}</span>)}
                  </div>
                  <div className="cc-apply-links">
                    <button className="cc-apply-btn cc-apply-linkedin" onClick={() => applyToJob(j, 'linkedin')}><LinkedinIcon size={13} /> LinkedIn</button>
                    <button className="cc-apply-btn cc-apply-naukri" onClick={() => applyToJob(j, 'naukri')}>🅽 Naukri</button>
                    <button className="cc-apply-btn cc-apply-indeed" onClick={() => applyToJob(j, 'indeed')}><Search size={13} /> Indeed</button>
                  </div>
                </div>
              </div>
            ))}
            {jobs.length === 0 && (
              <div className="cc-empty-state">
                <Search size={32} />
                <p>No jobs loaded yet.</p>
                <button className="cc-btn-primary" onClick={launchCopilot} disabled={loading}>
                  {loading ? <><RefreshCw size={14} className="cc-spin" />Loading…</> : <><RefreshCw size={14} /> Discover Jobs</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* LEARN */}
        {tab === 'learn' && (
          <div className="cc-module">
            <div className="cc-module-header"><GraduationCap size={20} color="#bf5af2" /><h3>Learning Center</h3></div>
            <div className="cc-section-label">Skill Gaps — Market Demand</div>
            {skillGaps.map((s: { skill: string; demand: number; priority: string }, i: number) => (
              <div key={i} className="cc-skill-gap-row">
                <span className="cc-skill-gap-name">{s.skill}</span>
                <div className="cc-skill-gap-bar"><div style={{ width: `${s.demand}%`, background: s.priority === 'high' ? '#ff453a' : '#ff9f0a' }} /></div>
                <span className="cc-skill-gap-pct">{s.demand}%</span>
                <span className={`cc-priority-badge ${s.priority}`}>{s.priority}</span>
                <a href={`https://www.youtube.com/results?search_query=learn+${encodeURIComponent(s.skill)}+tutorial`} target="_blank" rel="noopener noreferrer" className="cc-learn-yt-btn"><Youtube size={13} /></a>
              </div>
            ))}

            <div className="cc-section-label" style={{ marginTop: 24 }}>AI Learning Roadmap</div>
            {LEARN_PATH.map((item) => (
              <div key={item.step} className="cc-learn-step">
                <div className="cc-learn-step-num">{item.step}</div>
                <div style={{ flex: 1 }}>
                  <div className="cc-learn-step-title">{item.title}</div>
                  <div className="cc-learn-step-meta">{item.time} · {item.platform}</div>
                </div>
                <div className="cc-learn-step-links">
                  <a href={item.yt} target="_blank" rel="noopener noreferrer" className="cc-learn-link cc-learn-link-yt"><Youtube size={13} />YouTube</a>
                  <a href={item.udemy} target="_blank" rel="noopener noreferrer" className="cc-learn-link cc-learn-link-udemy"><Star size={13} />Udemy</a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* INTERVIEW */}
        {tab === 'interview' && (
          <div className="cc-module">
            <div className="cc-module-header"><MessageSquare size={20} color="#ff9f0a" /><h3>Interview Coach</h3></div>
            <div className="cc-interview-scores">
              {[['HR Round', avgInterviewScore() || 65], ['Technical', 58], ['Behavioral', 72], ['Communication', 80]].map(([k, v]) => (
                <div key={String(k)} className="cc-score-card">
                  <div className="cc-score-val" style={{ color: Number(v) >= 70 ? '#30d158' : '#ff9f0a' }}>{v}%</div>
                  <div className="cc-score-label">{k}</div>
                </div>
              ))}
            </div>
            <div className="cc-section-label">Practice Sessions</div>
            {[
              { type: 'HR Interview', icon: <Users size={16} />, color: '#2997ff', desc: '5 personalized questions based on your profile' },
              { type: 'Technical Round', icon: <Code2 size={16} />, color: '#30d158', desc: 'DSA + System Design + Role-specific questions' },
              { type: 'Behavioral (STAR)', icon: <Star size={16} />, color: '#ff9f0a', desc: 'STAR method practice with AI feedback on each answer' },
              { type: 'Voice Practice', icon: <Play size={16} />, color: '#bf5af2', desc: '5 questions with detailed feedback and refined model answers' },
            ].map((s, i) => (
              <div key={i} className="cc-interview-session" style={{ '--si-color': s.color } as any}>
                <div className="cc-session-icon" style={{ color: s.color, background: `${s.color}15` }}>{s.icon}</div>
                <div style={{ flex: 1 }}><div className="cc-session-title">{s.type}</div><div className="cc-session-desc">{s.desc}</div></div>
                <button className="cc-btn-sm" onClick={() => startInterview(s.type)}><Play size={12} /> Start</button>
              </div>
            ))}
            <div className="cc-interview-tip">
              <Sparkles size={14} color="#2997ff" />
              <span>Each session evaluates your answers with AI and gives you a score out of 10 with improvements and a refined model answer.</span>
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {tab === 'analytics' && (
          <div className="cc-module">
            <div className="cc-module-header"><BarChart3 size={20} color="#ff453a" /><h3>Career Analytics</h3></div>
            <div className="cc-analytics-stats">
              {[
                ['Applications', applications.length, '#2997ff'],
                ['LinkedIn', portalCounts.linkedin || 0, '#0077b5'],
                ['Naukri', portalCounts.naukri || 0, '#ff6b35'],
                ['Indeed', portalCounts.indeed || 0, '#2164f3'],
              ].map(([k, v, c]) => (
                <div key={String(k)} className="cc-analytics-stat">
                  <div className="cc-stat-val" style={{ color: String(c) }}>{v}</div>
                  <div className="cc-stat-label">{k}</div>
                </div>
              ))}
            </div>

            {applications.length > 0 ? (
              <div className="cc-recent-apps">
                <div className="cc-section-label">Recent Applications</div>
                {applications.slice().reverse().slice(0, 8).map((a, i) => (
                  <div key={i} className="cc-app-row">
                    <div className="cc-app-icon" style={{ background: a.portal === 'linkedin' ? 'rgba(0,119,181,.1)' : a.portal === 'naukri' ? 'rgba(255,107,53,.1)' : 'rgba(33,100,243,.1)' }}>
                      {a.portal === 'linkedin' ? <LinkedinIcon size={14} color="#0077b5" /> : <Search size={14} color="#ff6b35" />}
                    </div>
                    <div className="cc-app-info">
                      <div className="cc-app-title">{a.title} — {a.company}</div>
                      <div className="cc-app-meta">{a.portal} · {new Date(a.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <span className="cc-app-status">Applied</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="cc-empty-state" style={{ marginTop: 16 }}>
                <Briefcase size={28} />
                <p>No applications tracked yet. Click apply buttons in the Jobs tab to track here.</p>
                <button className="cc-btn-primary" onClick={() => setTab('jobs')}><Briefcase size={14} /> Browse Jobs</button>
              </div>
            )}

            <div className="cc-weekly-report">
              <div className="cc-section-label">This Week's AI Summary</div>
              <div className="cc-report-items">
                <div className="cc-report-item"><CheckCircle2 size={14} color="#30d158" /><span>Career Copilot active — profile created and analyzed</span></div>
                <div className="cc-report-item"><CheckCircle2 size={14} color="#30d158" /><span>Career Health Score: {healthScore}/100 — keep improving</span></div>
                <div className="cc-report-item"><Activity size={14} color="#2997ff" /><span>{applications.length} jobs applied via Copilot</span></div>
                {resumeAnalysis && <div className="cc-report-item"><CheckCircle2 size={14} color="#30d158" /><span>Resume ATS Score: {resumeAnalysis.atsKeywords?.score ?? 72}% — {(resumeAnalysis.atsKeywords?.missing?.length || 0)} keywords to add</span></div>}
                <div className="cc-report-item"><Sparkles size={14} color="#2997ff" /><span>Practice more interview sessions to boost your coach score</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
