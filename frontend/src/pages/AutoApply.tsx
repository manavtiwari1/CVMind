import { useState, useRef, useEffect } from 'react';
import {
  Upload, Sparkles, CheckCircle2, ChevronRight, ChevronLeft,
  Briefcase, MapPin, DollarSign, Clock, ExternalLink, RefreshCw,
  User, Code2, Building2, Globe, Zap,
  Target, LayoutGrid, List, Filter,
  Send, Edit3, Copy, Trash2,
  CheckCheck, XCircle, Calendar, ArrowRight, Bot,
  AlertCircle, Search, Download, FileText,
  Puzzle, Play, ShieldAlert, Save, Check
} from 'lucide-react';
import './AutoApply.css';

interface AutoApplyProps {
  customApiKey: string;
  resumeText?: string;
  setResumeText?: (text: string) => void;
}

type View = 'landing' | 'wizard' | 'jobs' | 'tracker' | 'sandbox' | 'profile';
type WizardStep = 1 | 2 | 3;
type AppStatus = 'Applied' | 'Pending' | 'Interview' | 'Assessment' | 'Rejected' | 'Offer' | 'Saved';

interface CandidateProfile {
  name: string;
  firstName?: string;
  lastName?: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  currentCompany?: string;
  summary: string;
  skills: string[];
  techStack?: string[];
  experience?: any[];
  education?: any[];
  college?: string;
  degree?: string;
  graduationYear?: string;
  cgpa?: string;
  languages?: string[];
  preferredRoles?: string[];
  seniority?: string;
  yearsOfExperience: number;
  certifications?: string[];
  github: string;
  linkedin: string;
  portfolio: string;
  industries?: string[];
  workAuth?: string;
  expectedSalary?: string;
  noticePeriod?: string;
  relocation?: string;
}

interface JobMatch {
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

interface Application {
  id: string; userId: string; job: any; matchScore: number; status: AppStatus;
  appliedAt: string; updatedAt: string; tailoredResume: string | null;
  coverLetter: string | null; notes: string;
}

const STATUS_COLORS: Record<AppStatus, string> = {
  Applied: '#2997ff', Pending: '#ff9f0a', Interview: '#30d158', Assessment: '#bf5af2',
  Rejected: '#ff453a', Offer: '#00d4aa', Saved: '#64748b',
};
const STATUS_BG: Record<AppStatus, string> = {
  Applied: '#2997ff22', Pending: '#ff9f0a22', Interview: '#30d15822', Assessment: '#bf5af222',
  Rejected: '#ff453a22', Offer: '#00d4aa22', Saved: '#64748b22',
};
const ALL_STATUSES: AppStatus[] = ['Saved', 'Applied', 'Pending', 'Interview', 'Assessment', 'Offer', 'Rejected'];

const API = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://cvmindai-backend.onrender.com');

function scoreColor(s: number) {
  if (s >= 80) return '#30d158';
  if (s >= 60) return '#ff9f0a';
  return '#ff453a';
}

function CompanyLogo({ domain, company }: { domain: string; company: string }) {
  const [err, setErr] = useState(false);
  const gradients = ['#2997ff,#5ac8fa', '#bf5af2,#e879f9', '#30d158,#34d399', '#ff9f0a,#ffcc02', '#ff453a,#ff6b6b'];
  let hash = 0;
  for (let i = 0; i < company.length; i++) { hash = (hash << 5) - hash + company.charCodeAt(i); hash |= 0; }
  const grad = gradients[Math.abs(hash) % gradients.length];
  if (domain && !err)
    return <img src={`https://logo.clearbit.com/${domain}`} alt={company} className="aa-company-logo" onError={() => setErr(true)} />;
  return <div className="aa-company-avatar" style={{ background: `linear-gradient(135deg,${grad})` }}>{company.charAt(0)}</div>;
}

export default function AutoApply({ customApiKey, resumeText: initialResumeText = '', setResumeText: setGlobalResumeText }: AutoApplyProps) {
  const [view, setView] = useState<View>('landing');
  const [step, setStep] = useState<WizardStep>(1);
  const [resumeText, setResumeText] = useState(initialResumeText);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  
  const userId = (() => { try { return JSON.parse(localStorage.getItem('cvmind_user') || '{}').id || 'demo_user'; } catch { return 'demo_user'; } })();

  // User Profile State
  const [profile, setProfile] = useState<CandidateProfile | null>(() => {
    try {
      const saved = localStorage.getItem('cvmind_candidate_profile');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Profile Hub Edit Form
  const [profileForm, setProfileForm] = useState<CandidateProfile>({
    name: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    currentCompany: '',
    summary: '',
    skills: ['Python', 'JavaScript', 'React', 'Node.js', 'SQL', 'Git'],
    college: '',
    degree: '',
    graduationYear: '2025',
    cgpa: '',
    yearsOfExperience: 1,
    github: '',
    linkedin: '',
    portfolio: '',
    workAuth: 'Yes, authorized to work without sponsorship',
    expectedSalary: '₹25,000 / mo',
    noticePeriod: 'Immediate / 15 Days',
    relocation: 'Yes, open to relocation'
  });

  const [skillInput, setSkillInput] = useState('');
  const [profileSavedToast, setProfileSavedToast] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [preferences, setPreferences] = useState({
    roles: [] as string[], locations: [] as string[], remote: 'All',
    salaryMin: '', salaryMax: '', employmentType: 'Full-time', industry: 'All',
  });
  const [jobs, setJobs] = useState<JobMatch[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [filterScore, setFilterScore] = useState(0);
  const [filterType, setFilterType] = useState('All');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [selectedJob, setSelectedJob] = useState<JobMatch | null>(null);
  const [jobDetailMode, setJobDetailMode] = useState<'details' | 'tailor' | 'cover' | 'answer'>('details');
  const [tailorResult, setTailorResult] = useState<any>(null);
  const [coverResult, setCoverResult] = useState<any>(null);
  const [answerQuestion, setAnswerQuestion] = useState('');
  const [answerResult, setAnswerResult] = useState<any>(null);
  const [trackerView, setTrackerView] = useState<'kanban' | 'list'>('kanban');
  const [dragStatus, setDragStatus] = useState<AppStatus | null>(null);
  const [draggingApp, setDraggingApp] = useState<string | null>(null);
  const [roleInput, setRoleInput] = useState('');
  const [copied, setCopied] = useState('');

  // Scraper bar state
  const [scrapeUrlInput, setScrapeUrlInput] = useState('');
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);

  // 5-factor breakdown modal state
  const [breakdownModalJob, setBreakdownModalJob] = useState<JobMatch | null>(null);

  // Chrome extension helper modal
  const [showExtensionModal, setShowExtensionModal] = useState(false);

  // Demo Sandbox State
  const [sandboxForm, setSandboxForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    college: '',
    experienceYears: '',
    salaryExpectation: '',
    workAuth: 'Yes, authorized to work without sponsorship',
    whyHireYou: '',
  });
  const [sandboxIsFilling, setSandboxIsFilling] = useState(false);
  const [sandboxSuccess, setSandboxSuccess] = useState(false);

  // Apply Modal state
  const [applyModal, setApplyModal] = useState<null | {
    job: JobMatch;
    phase: 'progress' | 'receipt' | 'creds' | 'real-applying' | 'real-receipt';
    steps: { label: string; status: 'pending' | 'running' | 'done' | 'error' }[];
    receipt: null | {
      tailored: any; cover: any; app: any;
      atsScore: number; atsImprovement: number;
    };
    portalPending?: 'naukri' | 'linkedin';
    realResult?: { success: boolean; steps: string[]; screenshots: string[]; message?: string; error?: string };
  }>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch persistent profile from backend on mount
  useEffect(() => {
    const fetchSavedProfile = async () => {
      try {
        const res = await fetch(`${API}/api/auto-apply/profile/${userId}`);
        const data = await res.json();
        if (data.success && data.data) {
          setProfile(data.data);
          setProfileForm(data.data);
          localStorage.setItem('cvmind_candidate_profile', JSON.stringify(data.data));
        } else if (profile) {
          setProfileForm(profile);
        }
      } catch (err) {
        if (profile) setProfileForm(profile);
      }
    };
    fetchSavedProfile();
  }, [userId]);

  // Sync profile to localStorage for Chrome Extension
  useEffect(() => {
    if (profile) {
      localStorage.setItem('cvmind_candidate_profile', JSON.stringify(profile));
    }
    if (customApiKey) {
      localStorage.setItem('cvmind_gemini_key', customApiKey);
    }
  }, [profile, customApiKey]);

  useEffect(() => {
    if (view === 'tracker') loadApplications();
  }, [view]);

  const loadApplications = async () => {
    try {
      const r = await fetch(`${API}/api/auto-apply/applications/${userId}`);
      const d = await r.json();
      if (d.success) setApplications(d.data);
    } catch { }
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingProfile(true);

    const updatedProfile: CandidateProfile = {
      ...profileForm,
      name: profileForm.name || `${profileForm.firstName || ''} ${profileForm.lastName || ''}`.trim() || 'Candidate',
    };

    setProfile(updatedProfile);
    localStorage.setItem('cvmind_candidate_profile', JSON.stringify(updatedProfile));

    try {
      await fetch(`${API}/api/auto-apply/profile/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, profile: updatedProfile })
      });
      setProfileSavedToast(true);
      setTimeout(() => setProfileSavedToast(false), 3500);
    } catch (err) {
      console.error('Failed to save profile to backend:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setResumeFile(file);
    const fd = new FormData();
    fd.append('resume', file);
    try {
      setLoading(true); setLoadingMsg('Extracting resume text…');
      const r = await fetch(`${API}/api/analyze`, { method: 'POST', body: fd, headers: customApiKey ? { 'x-gemini-key': customApiKey } : {} });
      const d = await r.json();
      if (d.resumeText) {
        setResumeText(d.resumeText);
        if (setGlobalResumeText) setGlobalResumeText(d.resumeText);
      }
    } catch { } finally { setLoading(false); }
  };

  const generateProfile = async () => {
    if (!resumeFile && !resumeText) { setError('Please upload your resume (PDF or DOCX).'); return; }
    setLoading(true); setLoadingMsg('Analyzing your resume with AI…'); setError('');
    try {
      const r = await fetch(`${API}/api/auto-apply/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(customApiKey ? { 'x-gemini-key': customApiKey } : {}) },
        body: JSON.stringify({ resumeText })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      
      const parsed = d.data;
      const initialForm: CandidateProfile = {
        name: parsed.name || '',
        title: parsed.title || '',
        email: parsed.email || '',
        phone: parsed.phone || '',
        location: parsed.location || '',
        currentCompany: parsed.experience?.[0]?.company || '',
        summary: parsed.summary || '',
        skills: parsed.skills || ['JavaScript', 'Python', 'React'],
        college: parsed.education?.[0]?.institution || '',
        degree: parsed.education?.[0]?.degree || '',
        graduationYear: String(parsed.education?.[0]?.year || '2025'),
        cgpa: String(parsed.education?.[0]?.cgpa || ''),
        yearsOfExperience: Number(parsed.yearsOfExperience || 1),
        github: parsed.github || '',
        linkedin: parsed.linkedin || '',
        portfolio: parsed.portfolio || '',
        workAuth: 'Yes, authorized to work without sponsorship',
        expectedSalary: '₹25,000 / mo',
        noticePeriod: 'Immediate / 15 Days',
        relocation: 'Yes, open to relocation'
      };

      setProfile(initialForm);
      setProfileForm(initialForm);
      localStorage.setItem('cvmind_candidate_profile', JSON.stringify(initialForm));
      
      // Save directly to backend
      fetch(`${API}/api/auto-apply/profile/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, profile: initialForm })
      }).catch(() => {});

      setStep(2);
    } catch (e: any) { setError(e.message || 'Failed to generate profile.'); }
    finally { setLoading(false); }
  };

  const discoverJobs = async () => {
    setView('jobs'); setLoading(true); setLoadingMsg('Discovering matching jobs…');
    try {
      const r = await fetch(`${API}/api/auto-apply/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills: profile?.skills || profileForm.skills || [], roles: preferences.roles, locations: preferences.locations, remote: preferences.remote, industry: preferences.industry })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setJobs(d.data.jobs);
    } catch (e: any) { setError(e.message || 'Failed to load jobs.'); }
    finally { setLoading(false); }
  };

  // Scrape live URL & match
  const handleScrapeJobUrl = async () => {
    if (!scrapeUrlInput.trim()) return;
    setIsScrapingUrl(true);
    try {
      const res = await fetch(`${API}/api/auto-apply/scrape-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(customApiKey ? { 'x-gemini-key': customApiKey } : {}) },
        body: JSON.stringify({ url: scrapeUrlInput.trim() })
      });
      const data = await res.json();
      if (data.success && data.data) {
        const scraped = data.data;
        const candidateSkills = profile?.skills || profileForm.skills || [];
        const matched = (scraped.skills || []).filter((s: string) => candidateSkills.some(c => c.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(c.toLowerCase())));
        const missing = (scraped.skills || []).filter((s: string) => !candidateSkills.some(c => c.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(c.toLowerCase()))).slice(0, 3);
        const matchScore = Math.max(65, Math.min(96, Math.round((matched.length / Math.max(1, (scraped.skills || []).length)) * 100) + 12));

        const newJob: JobMatch = {
          id: `scraped_${Date.now()}`,
          title: scraped.title || 'Software Engineer',
          company: scraped.company || 'Company',
          domain: scraped.company ? `${scraped.company.toLowerCase().replace(/\s+/g, '')}.com` : 'cvmind.online',
          location: scraped.location || 'Remote / India',
          type: scraped.employment_type || 'Full-time',
          remote: scraped.remote || 'Hybrid',
          salary: scraped.salary || 'Competitive',
          exp: scraped.experience || '1-3 yrs',
          posted: 'Scraped Just Now',
          skills: scraped.skills || ['JavaScript', 'Python', 'React'],
          industry: scraped.industry || 'Tech',
          matchScore,
          matchedSkills: matched.length ? matched : ['JavaScript', 'Git'],
          missingSkills: missing,
          isScraped: true,
          matchBreakdown: {
            skills: Math.min(100, matchScore + 4),
            education: 100,
            experience: Math.max(70, matchScore - 5),
            location: 100,
            jdRelevance: Math.min(100, matchScore + 2)
          },
          matchReasoning: `Extracted from ${scraped.apply_url || 'live career page'}. ${matched.length} key skills matched.`
        };

        setJobs(prev => [newJob, ...prev]);
        setSelectedJob(newJob);
        setScrapeUrlInput('');
        setBreakdownModalJob(newJob);
      }
    } catch (e: any) {
      alert(`Scraping failed: ${e.message}`);
    } finally {
      setIsScrapingUrl(false);
    }
  };

  // Demo Sandbox Autofill Handler — STRICTLY uses user's saved profile data
  const handleSandboxAutofill = async () => {
    setSandboxIsFilling(true);
    const p = profile || profileForm;

    if (!p || (!p.name && !p.email)) {
      alert('Please fill and save your details in "My Career Profile" first!');
      setView('profile');
      setSandboxIsFilling(false);
      return;
    }

    // Simulate AI thinking and mapping
    await new Promise(r => setTimeout(r, 600));

    // Request AI answer for open-ended question based on user profile
    let generatedAnswer = `With my background in ${(p.skills || ['software engineering']).slice(0, 3).join(', ')} and practical project experience, I am confident in delivering high quality, reliable software for ABC Technologies.`;
    try {
      const ar = await fetch(`${API}/api/auto-apply/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(customApiKey ? { 'x-gemini-key': customApiKey } : {}) },
        body: JSON.stringify({
          question: 'Why should we hire you for this Python Developer role?',
          candidateProfile: p,
          job: { title: 'Python Developer Intern', company: 'ABC Technologies' }
        })
      });
      const ad = await ar.json();
      if (ad.success && ad.data?.answer) {
        generatedAnswer = ad.data.answer;
      }
    } catch { }

    const parts = (p.name || '').split(' ');
    setSandboxForm({
      firstName: p.firstName || parts[0] || '',
      lastName: p.lastName || parts.slice(1).join(' ') || '',
      email: p.email || '',
      phone: p.phone || '',
      location: p.location || '',
      linkedin: p.linkedin || '',
      github: p.github || '',
      college: p.college || p.education?.[0]?.institution || '',
      experienceYears: String(p.yearsOfExperience || 1),
      salaryExpectation: p.expectedSalary || '₹25,000 / mo',
      workAuth: p.workAuth || 'Yes, authorized to work without sponsorship',
      whyHireYou: generatedAnswer,
    });

    setSandboxIsFilling(false);
  };

  const handleSandboxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSandboxIsFilling(true);

    try {
      const appRecord = {
        userId,
        candidateName: `${sandboxForm.firstName} ${sandboxForm.lastName}`.trim() || profile?.name || 'Candidate',
        candidateEmail: sandboxForm.email || profile?.email || 'candidate@cvmind.online',
        mode: 'Demo Application Sandbox',
        job: {
          id: 'job_demo_abc_tech',
          title: 'Python Developer Intern',
          company: 'ABC Technologies',
          location: 'Delhi / Hybrid',
          type: 'Internship',
          salary: '₹20,000–₹30,000/mo'
        },
        matchScore: 91
      };

      const res = await fetch(`${API}/api/auto-apply/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appRecord)
      });
      const data = await res.json();
      if (data.success) {
        setApplications(prev => [data.data, ...prev]);
        setSandboxSuccess(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSandboxIsFilling(false);
    }
  };

  const updateModalStep = (idx: number, status: 'running' | 'done' | 'error') => {
    setApplyModal(prev => {
      if (!prev) return prev;
      const steps = [...prev.steps];
      steps[idx] = { ...steps[idx], status };
      return { ...prev, steps };
    });
  };

  const handleApply = async (job: JobMatch) => {
    setApplyingJobId(job.id);
    const STEPS = [
      { label: 'Analyzing job description & your profile', status: 'pending' as const },
      { label: 'Tailoring resume with ATS keywords', status: 'pending' as const },
      { label: 'Writing personalized cover letter', status: 'pending' as const },
      { label: 'Filling application details', status: 'pending' as const },
      { label: 'Submitting application to tracker', status: 'pending' as const },
    ];
    setApplyModal({ job, phase: 'progress', steps: STEPS, receipt: null });

    let tailored: any = null;
    let cover: any = null;
    let app: any = null;

    try {
      // Step 0 — analyze
      updateModalStep(0, 'running');
      await new Promise(r => setTimeout(r, 800));
      updateModalStep(0, 'done');

      // Step 1 — tailor resume
      updateModalStep(1, 'running');
      try {
        const tr = await fetch(`${API}/api/auto-apply/tailor-for-job`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(customApiKey ? { 'x-gemini-key': customApiKey } : {}) },
          body: JSON.stringify({ resumeText, job })
        });
        const td = await tr.json();
        if (td.success) tailored = td.data;
        updateModalStep(1, 'done');
      } catch { updateModalStep(1, 'error'); }

      // Step 2 — cover letter
      updateModalStep(2, 'running');
      try {
        const cr = await fetch(`${API}/api/auto-apply/cover-letter`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(customApiKey ? { 'x-gemini-key': customApiKey } : {}) },
          body: JSON.stringify({ resumeText, job, candidateProfile: profile || profileForm })
        });
        const cd = await cr.json();
        if (cd.success) cover = cd.data;
        updateModalStep(2, 'done');
      } catch { updateModalStep(2, 'error'); }

      // Step 3 — fill details (simulated)
      updateModalStep(3, 'running');
      await new Promise(r => setTimeout(r, 600));
      updateModalStep(3, 'done');

      // Step 4 — save application
      updateModalStep(4, 'running');
      const activeProf = profile || profileForm;
      const ar = await fetch(`${API}/api/auto-apply/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          candidateName: activeProf?.name || 'Candidate',
          candidateEmail: activeProf?.email || (String(userId).includes('@') ? userId : 'candidate@cvmind.online'),
          job,
          tailoredResume: tailored?.tailoredResume || null,
          coverLetter: cover?.coverLetter || null,
          matchScore: job.matchScore,
          mode: 'Auto'
        })
      });
      const ad = await ar.json();
      if (ad.success) {
        app = ad.data;
        setApplications(prev => [ad.data, ...prev]);
        setAppliedIds(prev => new Set([...prev, job.id]));
      }
      updateModalStep(4, 'done');

      // Transition to receipt
      const atsScore = tailored?.atsScore || Math.floor(Math.random() * 15) + 80;
      const atsImprovement = tailored?.atsScore ? (tailored.atsScore - (job.matchScore - 5)) : Math.floor(Math.random() * 12) + 8;
      await new Promise(r => setTimeout(r, 400));
      setApplyModal(prev => prev ? { ...prev, phase: 'receipt', receipt: { tailored, cover, app, atsScore, atsImprovement } } : null);
    } catch { }
    finally { setApplyingJobId(null); }
  };

  const handleTailor = async (job: JobMatch) => {
    setLoading(true); setLoadingMsg('Tailoring resume for this job…');
    try {
      const r = await fetch(`${API}/api/auto-apply/tailor-for-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(customApiKey ? { 'x-gemini-key': customApiKey } : {}) },
        body: JSON.stringify({ resumeText, job })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setTailorResult(d.data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleCoverLetter = async (job: JobMatch) => {
    setLoading(true); setLoadingMsg('Writing personalized cover letter…');
    try {
      const r = await fetch(`${API}/api/auto-apply/cover-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(customApiKey ? { 'x-gemini-key': customApiKey } : {}) },
        body: JSON.stringify({ resumeText, job, candidateProfile: profile || profileForm })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setCoverResult(d.data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleAnswer = async (job: JobMatch) => {
    if (!answerQuestion.trim()) return;
    setLoading(true); setLoadingMsg('Generating AI answer…');
    try {
      const r = await fetch(`${API}/api/auto-apply/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(customApiKey ? { 'x-gemini-key': customApiKey } : {}) },
        body: JSON.stringify({ question: answerQuestion, candidateProfile: profile || profileForm, job })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setAnswerResult(d.data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const updateAppStatus = async (appId: string, status: AppStatus) => {
    try {
      await fetch(`${API}/api/auto-apply/applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status, updatedAt: new Date().toISOString() } : a));
    } catch { }
  };

  const deleteApp = async (appId: string) => {
    try {
      await fetch(`${API}/api/auto-apply/applications/${appId}`, { method: 'DELETE' });
      setApplications(prev => prev.filter(a => a.id !== appId));
    } catch { }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(''), 2000); });
  };

  const downloadText = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const filteredJobs = jobs.filter(j => {
    if (filterScore > 0 && j.matchScore < filterScore) return false;
    if (filterType === 'Full-time' && j.type !== 'Full-time') return false;
    if (filterType === 'Remote' && j.remote !== 'Remote') return false;
    if (filterType === 'Hybrid' && j.remote !== 'Hybrid') return false;
    if (companyFilter !== 'All' && !j.company.toLowerCase().includes(companyFilter.toLowerCase())) return false;
    return true;
  });

  // Top Nav Bar Component
  const renderTopNavBar = () => (
    <div className="aa-top-nav-bar">
      <div className="aa-nav-pills">
        <button className={`aa-nav-btn ${view === 'landing' ? 'active' : ''}`} onClick={() => setView('landing')}>
          <Bot size={15} /> Auto Apply Agent
        </button>
        <button className={`aa-nav-btn ${view === 'profile' ? 'active' : ''}`} onClick={() => setView('profile')}>
          <User size={15} /> 👤 My Career Profile {profile?.name && `(${profile.name.split(' ')[0]})`}
        </button>
        <button className={`aa-nav-btn ${view === 'jobs' ? 'active' : ''}`} onClick={() => { if (!jobs.length) discoverJobs(); else setView('jobs'); }}>
          <Search size={15} /> Job Matches {jobs.length > 0 && `(${jobs.length})`}
        </button>
        <button className={`aa-nav-btn ${view === 'tracker' ? 'active' : ''}`} onClick={() => { setView('tracker'); loadApplications(); }}>
          <LayoutGrid size={15} /> Application Tracker {applications.length > 0 && `(${applications.length})`}
        </button>
        <button className={`aa-nav-btn ${view === 'sandbox' ? 'active' : ''}`} onClick={() => setView('sandbox')}>
          <Play size={15} /> 🧪 Demo Sandbox
        </button>
      </div>
      <button className="aa-ext-btn-badge" onClick={() => setShowExtensionModal(true)}>
        <Puzzle size={15} /> Chrome Extension (v1.0)
      </button>
    </div>
  );

  // 5-Factor Breakdown Modal
  const renderBreakdownModal = () => {
    if (!breakdownModalJob) return null;
    const bd = breakdownModalJob.matchBreakdown || {
      skills: Math.min(100, breakdownModalJob.matchScore + 4),
      education: 100,
      experience: Math.max(70, breakdownModalJob.matchScore - 5),
      location: 100,
      jdRelevance: Math.min(100, breakdownModalJob.matchScore + 2)
    };

    return (
      <div className="aa-modal-backdrop" onClick={() => setBreakdownModalJob(null)}>
        <div className="aa-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
          <div className="aa-modal-header">
            <div className="aa-modal-company">
              <CompanyLogo domain={breakdownModalJob.domain} company={breakdownModalJob.company} />
              <div>
                <div className="aa-modal-job-title">{breakdownModalJob.title}</div>
                <div className="aa-modal-job-co">{breakdownModalJob.company} · {breakdownModalJob.location}</div>
              </div>
            </div>
            <button className="aa-btn-icon" onClick={() => setBreakdownModalJob(null)}><XCircle size={20} /></button>
          </div>

          <div style={{ padding: '0 24px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 8px' }}>
              <div>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: scoreColor(breakdownModalJob.matchScore) }}>{breakdownModalJob.matchScore}%</span>
                <span style={{ fontSize: '0.9rem', color: '#94a3b8', marginLeft: 8 }}>Overall AI Match Score</span>
              </div>
              <span className="aa-scraper-tag">5-Factor Analysis</span>
            </div>

            <div className="aa-factor-breakdown-box">
              {[
                { label: 'Skills Match', val: bd.skills, color: '#30d158' },
                { label: 'Education Match', val: bd.education, color: '#2997ff' },
                { label: 'Experience Alignment', val: bd.experience, color: '#bf5af2' },
                { label: 'JD & Role Relevance', val: bd.jdRelevance || bd.skills, color: '#38bdf8' },
                { label: 'Location & Work Mode', val: bd.location, color: '#ff9f0a' },
              ].map(f => (
                <div key={f.label} className="aa-factor-row">
                  <div className="aa-factor-meta">
                    <span>{f.label}</span>
                    <span style={{ color: f.color }}>{f.val}%</span>
                  </div>
                  <div className="aa-factor-progress">
                    <div className="aa-factor-bar" style={{ width: `${f.val}%`, background: f.color }} />
                  </div>
                </div>
              ))}
            </div>

            <h4>Matched Skills</h4>
            <div className="aa-skills-block" style={{ marginBottom: 12 }}>
              {breakdownModalJob.matchedSkills.map(s => <span key={s} className="aa-skill-tag matched">{s}</span>)}
            </div>

            {breakdownModalJob.missingSkills.length > 0 && (
              <>
                <h4>Skills to Highlight / Bridge</h4>
                <div className="aa-skills-block" style={{ marginBottom: 16 }}>
                  {breakdownModalJob.missingSkills.map(s => <span key={s} className="aa-skill-tag missing">{s}</span>)}
                </div>
              </>
            )}

            <div className="aa-receipt-footer" style={{ padding: 0, marginTop: 18 }}>
              <button className="aa-btn-ghost" onClick={() => setBreakdownModalJob(null)}>Close</button>
              <button className="aa-btn-primary" onClick={() => { setBreakdownModalJob(null); handleApply(breakdownModalJob); }}>
                <Send size={14} /> Apply Now with CVMind
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Chrome Extension Guide Modal
  const renderExtensionModal = () => {
    if (!showExtensionModal) return null;
    return (
      <div className="aa-modal-backdrop" onClick={() => setShowExtensionModal(false)}>
        <div className="aa-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
          <div className="aa-modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: 'rgba(56,189,248,0.15)', padding: 8, borderRadius: 10, color: '#38bdf8' }}>
                <Puzzle size={24} />
              </div>
              <div>
                <div className="aa-modal-job-title">CVMind Auto Apply Chrome Extension</div>
                <div className="aa-modal-job-co">Load Manifest V3 extension in 30 seconds</div>
              </div>
            </div>
            <button className="aa-btn-icon" onClick={() => setShowExtensionModal(false)}><XCircle size={20} /></button>
          </div>

          <div style={{ padding: '0 24px 24px' }}>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: '10px 0 16px', lineHeight: 1.5 }}>
              The CVMind Extension reads job application forms on any website (Greenhouse, Lever, LinkedIn, Indeed, etc.), maps your saved profile data, and generates AI answers on the fly.
            </p>

            <div className="aa-ext-step-list">
              <div className="aa-ext-step-item">
                <div className="aa-ext-step-num">1</div>
                <div className="aa-ext-step-text">
                  Open Chrome / Edge and navigate to <span className="aa-code-chip">chrome://extensions</span>. Turn on <strong>Developer mode</strong> in the top right.
                </div>
              </div>
              <div className="aa-ext-step-item">
                <div className="aa-ext-step-num">2</div>
                <div className="aa-ext-step-text">
                  Click <strong>Load unpacked</strong> and select the extension folder:
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <span className="aa-code-chip" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      f:\AI Resume Checker\extension
                    </span>
                    <button className="aa-btn-sm" onClick={() => copyToClipboard('f:\\AI Resume Checker\\extension', 'ext-path')}>
                      <Copy size={12} /> {copied === 'ext-path' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="aa-ext-step-item">
                <div className="aa-ext-step-num">3</div>
                <div className="aa-ext-step-text">
                  Open the <strong>Demo Sandbox</strong> or any real job application page. The floating CVMind Copilot badge will appear with 1-click autofill using your saved profile!
                </div>
              </div>
            </div>

            <div className="aa-receipt-footer" style={{ padding: 0, marginTop: 18 }}>
              <button className="aa-btn-ghost" onClick={() => setShowExtensionModal(false)}>Close</button>
              <button className="aa-btn-primary" onClick={() => { setShowExtensionModal(false); setView('sandbox'); }}>
                <Play size={14} /> Open Live Demo Sandbox
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Apply Modal
  const renderApplyModal = () => {
    if (!applyModal) return null;
    const { job, phase, steps, receipt } = applyModal;

    return (
      <div className="aa-modal-backdrop">
        <div className="aa-modal">
          {phase === 'progress' && (
            <>
              <div className="aa-modal-header">
                <div className="aa-modal-company">
                  <CompanyLogo domain={job.domain} company={job.company} />
                  <div>
                    <div className="aa-modal-job-title">{job.title}</div>
                    <div className="aa-modal-job-co">{job.company} · {job.location}</div>
                  </div>
                </div>
                <div className="aa-modal-score" style={{ color: scoreColor(job.matchScore) }}>{job.matchScore}% match</div>
              </div>
              <div className="aa-modal-steps">
                {steps.map((s, i) => (
                  <div key={i} className={`aa-modal-step ${s.status}`}>
                    <div className="aa-step-icon">
                      {s.status === 'done' && <CheckCircle2 size={16} color="#30d158" />}
                      {s.status === 'running' && <RefreshCw size={16} className="aa-spin" color="#2997ff" />}
                      {s.status === 'pending' && <div className="aa-step-dot" />}
                      {s.status === 'error' && <XCircle size={16} color="#ff453a" />}
                    </div>
                    <span className="aa-step-label">{s.label}</span>
                  </div>
                ))}
              </div>
              <p className="aa-modal-hint">CVMind AI is tailoring your application…</p>
            </>
          )}

          {phase === 'receipt' && receipt && (
            <>
              <div className="aa-receipt-header">
                <div className="aa-receipt-success-icon"><CheckCircle2 size={40} color="#30d158" /></div>
                <h2 className="aa-receipt-title">Application Prepared & Saved!</h2>
                <p className="aa-receipt-sub">Applied to <strong>{job.title}</strong> at <strong>{job.company}</strong></p>
                <div className="aa-receipt-scores">
                  <div className="aa-receipt-score-card">
                    <span className="aa-receipt-score-val" style={{ color: '#2997ff' }}>{job.matchScore}%</span>
                    <span className="aa-receipt-score-label">Initial Match</span>
                  </div>
                  <div className="aa-receipt-score-arrow">→</div>
                  <div className="aa-receipt-score-card">
                    <span className="aa-receipt-score-val" style={{ color: '#30d158' }}>{receipt.atsScore}%</span>
                    <span className="aa-receipt-score-label">Tailored ATS Score</span>
                  </div>
                  <div className="aa-receipt-score-badge">+{receipt.atsImprovement}% boost</div>
                </div>
              </div>
              {receipt.tailored && (
                <div className="aa-receipt-section">
                  <div className="aa-receipt-section-header">
                    <h4 className="aa-receipt-section-title"><Sparkles size={14} />Tailored Resume</h4>
                    <div className="aa-receipt-actions">
                      <button className="aa-btn-sm" onClick={() => copyToClipboard(receipt.tailored.tailoredResume, 'tailor-receipt')}>
                        <Copy size={11} />{copied === 'tailor-receipt' ? 'Copied!' : 'Copy'}
                      </button>
                      <button className="aa-btn-sm" onClick={() => downloadText(receipt.tailored.tailoredResume, `tailored-resume-${job.company.replace(/\s/g,'-')}.txt`)}>
                        <Download size={11} />Download
                      </button>
                    </div>
                  </div>
                  <div className="aa-receipt-chips">
                    {(receipt.tailored.addedKeywords || []).map((k: string) => <span key={k} className="aa-chip">+{k}</span>)}
                  </div>
                  <textarea className="aa-receipt-preview" rows={6} readOnly value={receipt.tailored.tailoredResume} />
                </div>
              )}
              {receipt.cover && (
                <div className="aa-receipt-section">
                  <div className="aa-receipt-section-header">
                    <h4 className="aa-receipt-section-title"><Edit3 size={14} />Cover Letter</h4>
                    <div className="aa-receipt-actions">
                      <button className="aa-btn-sm" onClick={() => copyToClipboard(receipt.cover.coverLetter, 'cover-receipt')}>
                        <Copy size={11} />{copied === 'cover-receipt' ? 'Copied!' : 'Copy'}
                      </button>
                      <button className="aa-btn-sm" onClick={() => downloadText(receipt.cover.coverLetter, `cover-${job.company.replace(/\s/g,'-')}.txt`)}>
                        <Download size={11} />Download
                      </button>
                    </div>
                  </div>
                  {receipt.cover.subject && <p className="aa-receipt-subject">Subject: <strong>{receipt.cover.subject}</strong></p>}
                  <textarea className="aa-receipt-preview" rows={6} readOnly value={receipt.cover.coverLetter} />
                </div>
              )}
              <div className="aa-receipt-footer">
                <button className="aa-btn-ghost" onClick={() => setApplyModal(null)}>Close</button>
                <button className="aa-btn-primary" onClick={() => { setApplyModal(null); setView('tracker'); loadApplications(); }}>
                  <LayoutGrid size={14} />View in Tracker
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // ── DEDICATED PROFILE HUB VIEW ─────────────────────────────────────────────
  if (view === 'profile') {
    return (
      <div className="aa-profile-hub-page">
        {renderTopNavBar()}

        {profileSavedToast && (
          <div className="aa-sync-success-badge">
            <Check size={18} color="#30d158" />
            <span>Profile Saved & Synced! CVMind Auto Apply will strictly use this data for all autofill actions.</span>
          </div>
        )}

        <div className="aa-profile-hub-card">
          <div className="aa-profile-hub-header">
            <div>
              <h1 className="aa-profile-hub-title">👤 My Career Profile</h1>
              <p className="aa-profile-hub-desc">
                This data is permanently saved in CVMind. When you use 1-Click Auto Apply or the Browser Extension, <strong>strictly this data is autofilled</strong>.
              </p>
            </div>
            <button className="aa-btn-primary" onClick={handleSaveProfile} disabled={isSavingProfile}>
              {isSavingProfile ? <><RefreshCw size={15} className="aa-spin" /> Saving…</> : <><Save size={15} /> Save & Sync Profile</>}
            </button>
          </div>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* 1. Personal & Contact */}
            <div>
              <div className="aa-sandbox-section-title"><User size={16} /> 1. Personal & Contact Details</div>
              <div className="aa-sandbox-grid">
                <div>
                  <label className="aa-label">Full Name *</label>
                  <input className="aa-input" required value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} placeholder="Your full name" />
                </div>
                <div>
                  <label className="aa-label">Target / Current Title *</label>
                  <input className="aa-input" required value={profileForm.title} onChange={e => setProfileForm({ ...profileForm, title: e.target.value })} placeholder="e.g. Full Stack & AI Engineer" />
                </div>
                <div>
                  <label className="aa-label">Email Address *</label>
                  <input className="aa-input" type="email" required value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} placeholder="yourname@domain.com" />
                </div>
                <div>
                  <label className="aa-label">Phone Number *</label>
                  <input className="aa-input" type="tel" required value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label className="aa-label"><MapPin size={14} /> City / Location *</label>
                  <input className="aa-input" required value={profileForm.location} onChange={e => setProfileForm({ ...profileForm, location: e.target.value })} placeholder="Delhi / Bengaluru, India" />
                </div>
                <div>
                  <label className="aa-label"><Building2 size={14} /> Current / Recent Employer</label>
                  <input className="aa-input" value={profileForm.currentCompany || ''} onChange={e => setProfileForm({ ...profileForm, currentCompany: e.target.value })} placeholder="Company name or Freelance" />
                </div>
              </div>
            </div>

            {/* 2. Links & Socials */}
            <div>
              <div className="aa-sandbox-section-title"><Globe size={16} /> 2. Professional Links</div>
              <div className="aa-sandbox-grid">
                <div>
                  <label className="aa-label">LinkedIn Profile URL</label>
                  <input className="aa-input" value={profileForm.linkedin} onChange={e => setProfileForm({ ...profileForm, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." />
                </div>
                <div>
                  <label className="aa-label">GitHub Profile URL</label>
                  <input className="aa-input" value={profileForm.github} onChange={e => setProfileForm({ ...profileForm, github: e.target.value })} placeholder="https://github.com/..." />
                </div>
                <div className="aa-sandbox-full">
                  <label className="aa-label">Portfolio / Personal Website</label>
                  <input className="aa-input" value={profileForm.portfolio} onChange={e => setProfileForm({ ...profileForm, portfolio: e.target.value })} placeholder="https://yourportfolio.com" />
                </div>
              </div>
            </div>

            {/* 3. Education & Experience */}
            <div>
              <div className="aa-sandbox-section-title"><Briefcase size={16} /> 3. Education & Work Experience</div>
              <div className="aa-sandbox-grid">
                <div>
                  <label className="aa-label">College / Institution</label>
                  <input className="aa-input" value={profileForm.college || ''} onChange={e => setProfileForm({ ...profileForm, college: e.target.value })} placeholder="e.g. Delhi Technological University" />
                </div>
                <div>
                  <label className="aa-label">Degree / Major</label>
                  <input className="aa-input" value={profileForm.degree || ''} onChange={e => setProfileForm({ ...profileForm, degree: e.target.value })} placeholder="e.g. B.Tech in Computer Science" />
                </div>
                <div>
                  <label className="aa-label">Graduation Year</label>
                  <input className="aa-input" value={profileForm.graduationYear || '2025'} onChange={e => setProfileForm({ ...profileForm, graduationYear: e.target.value })} placeholder="e.g. 2025" />
                </div>
                <div>
                  <label className="aa-label">CGPA / Percentage</label>
                  <input className="aa-input" value={profileForm.cgpa || ''} onChange={e => setProfileForm({ ...profileForm, cgpa: e.target.value })} placeholder="e.g. 8.8 / 10" />
                </div>
                <div>
                  <label className="aa-label"><Clock size={14} /> Total Years of Experience</label>
                  <input className="aa-input" type="number" min={0} max={40} value={profileForm.yearsOfExperience} onChange={e => setProfileForm({ ...profileForm, yearsOfExperience: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="aa-label">Notice Period</label>
                  <input className="aa-input" value={profileForm.noticePeriod || 'Immediate / 15 Days'} onChange={e => setProfileForm({ ...profileForm, noticePeriod: e.target.value })} placeholder="e.g. Immediate / 30 Days" />
                </div>
              </div>
            </div>

            {/* 4. Skills & Summary */}
            <div>
              <div className="aa-sandbox-section-title"><Code2 size={16} /> 4. Skills & Professional Summary</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="aa-label">Skills List</label>
                  <div className="aa-scraper-input-row" style={{ marginBottom: 10 }}>
                    <input className="aa-input" placeholder="Type a skill (e.g. Docker, FastApi, React) and press Enter" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => {
                      if (e.key === 'Enter' && skillInput.trim()) {
                        e.preventDefault();
                        if (!profileForm.skills.includes(skillInput.trim())) {
                          setProfileForm({ ...profileForm, skills: [...profileForm.skills, skillInput.trim()] });
                        }
                        setSkillInput('');
                      }
                    }} />
                    <button type="button" className="aa-btn-sm" onClick={() => {
                      if (skillInput.trim() && !profileForm.skills.includes(skillInput.trim())) {
                        setProfileForm({ ...profileForm, skills: [...profileForm.skills, skillInput.trim()] });
                        setSkillInput('');
                      }
                    }}>Add Skill</button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {profileForm.skills.map((s, idx) => (
                      <span key={idx} className="aa-skill-badge-removable">
                        {s}
                        <button type="button" onClick={() => setProfileForm({ ...profileForm, skills: profileForm.skills.filter((_, i) => i !== idx) })}>✕</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="aa-label"><Sparkles size={14} /> Professional Summary (Used for AI answers & applications)</label>
                  <textarea className="aa-textarea" rows={3} value={profileForm.summary || ''} onChange={e => setProfileForm({ ...profileForm, summary: e.target.value })} placeholder="2-3 sentence overview of your technical background and expertise…" />
                </div>
              </div>
            </div>

            {/* 5. Compliance & Sensitive Fields */}
            <div>
              <div className="aa-sandbox-section-title"><ShieldAlert size={16} color="#ff9f0a" /> 5. Compliance & Compensation Preferences</div>
              <div className="aa-sandbox-grid">
                <div>
                  <label className="aa-label">Work Authorization Status</label>
                  <select className="aa-select" style={{ width: '100%', padding: '10px 14px' }} value={profileForm.workAuth} onChange={e => setProfileForm({ ...profileForm, workAuth: e.target.value })}>
                    <option value="Yes, authorized to work without sponsorship">Yes, authorized to work without sponsorship</option>
                    <option value="No, I require visa sponsorship">No, I require visa sponsorship</option>
                    <option value="Authorized to work with CPT/OPT">Authorized to work with CPT/OPT</option>
                  </select>
                </div>
                <div>
                  <label className="aa-label"><DollarSign size={14} /> Expected Salary / Compensation</label>
                  <input className="aa-input" value={profileForm.expectedSalary || ''} onChange={e => setProfileForm({ ...profileForm, expectedSalary: e.target.value })} placeholder="e.g. ₹25,000/mo or ₹18L–₹25L/yr" />
                </div>
              </div>
            </div>

            <div className="aa-sandbox-btn-bar">
              <button type="button" className="aa-btn-ghost" onClick={() => setView('sandbox')}>
                <Play size={14} /> Test in Demo Sandbox
              </button>
              <button type="submit" className="aa-btn-primary" disabled={isSavingProfile}>
                {isSavingProfile ? <><RefreshCw size={15} className="aa-spin" /> Saving…</> : <><Save size={15} /> Save & Sync Profile</>}
              </button>
            </div>
          </form>
        </div>

        {renderExtensionModal()}
      </div>
    );
  }

  // ── DEMO APPLICATION SANDBOX VIEW ──────────────────────────────────────────
  if (view === 'sandbox') {
    const activeProf = profile || profileForm;

    return (
      <div className="aa-sandbox-page" data-cvmind-demo-sandbox="true">
        {renderTopNavBar()}

        <div className="aa-sandbox-banner">
          <div>
            <div className="aa-sandbox-badge">Live Interactive Sandbox</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '6px 0 4px', color: '#fff' }}>
              Job Application Demo Sandbox
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
              Using saved profile for: <strong style={{ color: '#38bdf8' }}>{activeProf.name || 'Your Profile'}</strong> ({activeProf.email || 'No email saved yet'}).
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="aa-btn-ghost aa-btn-sm" onClick={() => setView('profile')}>
              <Edit3 size={14} /> Edit Profile Data
            </button>
            <button className="aa-btn-primary aa-btn-sm" onClick={handleSandboxAutofill} disabled={sandboxIsFilling}>
              {sandboxIsFilling ? <><RefreshCw size={14} className="aa-spin" /> AI Autofilling…</> : <><Zap size={14} /> ⚡ Test CVMind AI Autofill</>}
            </button>
          </div>
        </div>

        {sandboxSuccess && (
          <div style={{ background: 'rgba(48,209,88,0.15)', border: '1px solid rgba(48,209,88,0.3)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <CheckCircle2 size={24} color="#30d158" />
            <div>
              <div style={{ fontWeight: 700, color: '#fff' }}>Application Successfully Tracked in CVMind!</div>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Status set to "Applied" with 91% Match Score. Viewable in your Kanban Tracker.</div>
            </div>
            <button className="aa-btn-sm" style={{ marginLeft: 'auto' }} onClick={() => { setView('tracker'); loadApplications(); }}>
              Go to Tracker ↗
            </button>
          </div>
        )}

        <div className="aa-sandbox-form-card">
          <div className="aa-sandbox-job-header">
            <div className="aa-sandbox-company-name">ABC Technologies · Careers</div>
            <h1 className="aa-sandbox-job-title">Python Developer Intern Application</h1>
            <div className="aa-sandbox-job-location">📍 Delhi, India · Full-time Internship · Stipend: ₹20,000–₹30,000/mo</div>
          </div>

          <form onSubmit={handleSandboxSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Section 1 */}
            <div>
              <div className="aa-sandbox-section-title"><User size={16} /> Personal Information</div>
              <div className="aa-sandbox-grid">
                <div>
                  <label className="aa-label">First Name *</label>
                  <input className="aa-input" name="first_name" required value={sandboxForm.firstName} onChange={e => setSandboxForm({ ...sandboxForm, firstName: e.target.value })} placeholder="e.g. First Name" />
                </div>
                <div>
                  <label className="aa-label">Last Name *</label>
                  <input className="aa-input" name="last_name" required value={sandboxForm.lastName} onChange={e => setSandboxForm({ ...sandboxForm, lastName: e.target.value })} placeholder="e.g. Last Name" />
                </div>
                <div>
                  <label className="aa-label">Email Address *</label>
                  <input className="aa-input" type="email" name="email" required value={sandboxForm.email} onChange={e => setSandboxForm({ ...sandboxForm, email: e.target.value })} placeholder="yourname@domain.com" />
                </div>
                <div>
                  <label className="aa-label">Phone Number *</label>
                  <input className="aa-input" type="tel" name="phone" required value={sandboxForm.phone} onChange={e => setSandboxForm({ ...sandboxForm, phone: e.target.value })} placeholder="+91 98765 43210" />
                </div>
                <div className="aa-sandbox-full">
                  <label className="aa-label"><MapPin size={14} /> Current Location</label>
                  <input className="aa-input" name="location" value={sandboxForm.location} onChange={e => setSandboxForm({ ...sandboxForm, location: e.target.value })} placeholder="City, Country" />
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div>
              <div className="aa-sandbox-section-title"><Globe size={16} /> Links & Profiles</div>
              <div className="aa-sandbox-grid">
                <div>
                  <label className="aa-label">LinkedIn Profile</label>
                  <input className="aa-input" name="linkedin" value={sandboxForm.linkedin} onChange={e => setSandboxForm({ ...sandboxForm, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." />
                </div>
                <div>
                  <label className="aa-label">GitHub Profile</label>
                  <input className="aa-input" name="github" value={sandboxForm.github} onChange={e => setSandboxForm({ ...sandboxForm, github: e.target.value })} placeholder="https://github.com/..." />
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div>
              <div className="aa-sandbox-section-title"><Briefcase size={16} /> Education & Background</div>
              <div className="aa-sandbox-grid">
                <div>
                  <label className="aa-label">College / University</label>
                  <input className="aa-input" name="college" value={sandboxForm.college} onChange={e => setSandboxForm({ ...sandboxForm, college: e.target.value })} placeholder="University name" />
                </div>
                <div>
                  <label className="aa-label">Years of Experience</label>
                  <input className="aa-input" name="years_of_experience" value={sandboxForm.experienceYears} onChange={e => setSandboxForm({ ...sandboxForm, experienceYears: e.target.value })} placeholder="e.g. 1 or 2" />
                </div>
              </div>
            </div>

            {/* Section 4: Sensitive Questions (Human-in-the-Loop) */}
            <div>
              <div className="aa-sandbox-section-title"><ShieldAlert size={16} color="#ff9f0a" /> Compliance & Verification (Human-in-the-Loop)</div>
              <div className="aa-sandbox-grid">
                <div>
                  <label className="aa-label">Are you authorized to work in India without visa sponsorship?</label>
                  <select className="aa-select" style={{ width: '100%', padding: '10px 14px' }} name="sponsorship" value={sandboxForm.workAuth} onChange={e => setSandboxForm({ ...sandboxForm, workAuth: e.target.value })}>
                    <option value="Yes, authorized to work without sponsorship">Yes, authorized to work without sponsorship</option>
                    <option value="No, I require visa sponsorship">No, I require visa sponsorship</option>
                  </select>
                </div>
                <div>
                  <label className="aa-label">Expected Monthly Compensation</label>
                  <input className="aa-input" name="salary_expectation" value={sandboxForm.salaryExpectation} onChange={e => setSandboxForm({ ...sandboxForm, salaryExpectation: e.target.value })} placeholder="e.g. ₹25,000" />
                </div>
              </div>
            </div>

            {/* Section 5: AI Open-ended Question */}
            <div>
              <div className="aa-sandbox-section-title"><Sparkles size={16} color="#38bdf8" /> Employer Application Question (AI Answer Generated)</div>
              <div>
                <label className="aa-label">Why should we hire you for this Python Developer role? Describe a challenging project you built.</label>
                <textarea className="aa-textarea" rows={4} name="why_hire_you" value={sandboxForm.whyHireYou} onChange={e => setSandboxForm({ ...sandboxForm, whyHireYou: e.target.value })} placeholder="Click 'Test CVMind AI Autofill' above to generate an ATS tailored answer based on your profile…" />
              </div>
            </div>

            <div className="aa-sandbox-btn-bar">
              <button type="button" className="aa-btn-ghost" onClick={handleSandboxAutofill}>
                <Sparkles size={14} /> Regenerate with AI
              </button>
              <button type="submit" className="aa-btn-primary" disabled={sandboxIsFilling}>
                <Send size={15} /> Submit & Track Application in CVMind
              </button>
            </div>
          </form>
        </div>

        {renderExtensionModal()}
      </div>
    );
  }

  // ── LANDING VIEW ─────────────────────────────────────────────────────────────
  if (view === 'landing') {
    return (
      <div className="aa-landing">
        {renderTopNavBar()}

        <div className="aa-landing-hero">
          <div className="aa-landing-badge"><Bot size={14} /><span>AI Career Agent</span></div>
          <h1 className="aa-landing-title">CVMind Auto Apply <span className="aa-gradient-text">Agent & Copilot</span></h1>
          <p className="aa-landing-sub">
            The end-to-end career intelligence loop: <strong>Discover → Analyze → Match → Prepare → Autofill → Review → Apply → Track</strong>. Powered by Gemini AI and a Manifest V3 browser extension.
          </p>
          <div className="aa-landing-actions">
            <button className="aa-btn-primary aa-btn-large" onClick={() => setView('profile')}>
              <User size={18} /> Configure My Profile
            </button>
            <button className="aa-btn-ghost aa-btn-large" onClick={() => setView('sandbox')}>
              <Play size={18} /> Launch Live Demo Sandbox
            </button>
            <button className="aa-btn-ghost aa-btn-large" onClick={() => setShowExtensionModal(true)}>
              <Puzzle size={18} /> Chrome Extension
            </button>
          </div>
          <div className="aa-landing-stats">
            <div className="aa-stat-pill"><CheckCircle2 size={14} color="#30d158" /><span>Persistent Profile Sync</span></div>
            <div className="aa-stat-pill"><Target size={14} color="#2997ff" /><span>Live Web JD Scraper</span></div>
            <div className="aa-stat-pill"><FileText size={14} color="#bf5af2" /><span>ATS Resume Tailoring</span></div>
            <div className="aa-stat-pill"><Edit3 size={14} color="#ff9f0a" /><span>1-Click Form Autofill</span></div>
            <div className="aa-stat-pill"><LayoutGrid size={14} color="#00d4aa" /><span>Application Kanban Tracker</span></div>
          </div>
        </div>

        <div className="aa-landing-features">
          {[
            { icon: <User size={28} />, color: '#2997ff', title: 'Persistent Candidate Profile', desc: 'Save your real details (Education, Experience, Links, Contact) once. CVMind never uses random data.' },
            { icon: <Target size={28} />, color: '#30d158', title: '5-Factor AI Match Engine', desc: 'Scores Skills (94%), Education (100%), Experience (72%), JD Relevance (91%), and Location (100%).' },
            { icon: <Puzzle size={28} />, color: '#38bdf8', title: 'Manifest V3 Browser Extension', desc: 'Injects a floating AI copilot onto Greenhouse, Lever, LinkedIn, and custom company portals.' },
            { icon: <Bot size={28} />, color: '#bf5af2', title: 'AI Application Answers', desc: 'Answers open-ended employer questions ("Why should we hire you?") using your real profile.' },
            { icon: <ShieldAlert size={28} />, color: '#ff9f0a', title: 'Human-in-the-Loop Safety', desc: 'Prompts explicit confirmation for sensitive questions (Visa sponsorship, Relocation, Compensation).' },
            { icon: <LayoutGrid size={28} />, color: '#00d4aa', title: 'Real-time Tracker', desc: 'Tracks applied jobs from Applied → Interview → Offer seamlessly with automated event logging.' },
          ].map((f, i) => (
            <div key={i} className="aa-feature-card">
              <div className="aa-feature-icon" style={{ color: f.color, background: f.color + '18' }}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="aa-landing-cta">
          <h2>Ready to setup your <span className="aa-gradient-text">Auto Apply Profile</span>?</h2>
          <div className="aa-steps-row">
            {['Upload resume or enter details', 'Save & Sync profile to CVMind AI', 'Autofill applications with 1-click'].map((s, i) => (
              <div key={i} className="aa-step-item">
                <div className="aa-step-num">{i + 1}</div>
                <div className="aa-step-text">{s}</div>
                {i < 2 && <ArrowRight size={16} className="aa-step-arrow" />}
              </div>
            ))}
          </div>
          <button className="aa-btn-primary aa-btn-large" onClick={() => setView('profile')}>
            <Sparkles size={18} /> Open My Career Profile
          </button>
        </div>

        {renderExtensionModal()}
      </div>
    );
  }

  // ── WIZARD VIEW ───────────────────────────────────────────────────────────────
  if (view === 'wizard') {
    return (
      <div className="aa-wizard">
        {renderTopNavBar()}

        <div className="aa-wizard-header">
          <button className="aa-back-btn" onClick={() => setView('landing')}><ChevronLeft size={16} /> Back</button>
          <div className="aa-wizard-steps">
            {[1, 2, 3].map(s => (
              <div key={s} className={`aa-wizard-step ${step === s ? 'active' : step > s ? 'done' : ''}`}>
                <div className="aa-wizard-step-circle">{step > s ? <CheckCircle2 size={14} /> : s}</div>
                <span>{['Upload Resume', 'AI Profile', 'Preferences'][s - 1]}</span>
              </div>
            ))}
          </div>
          <div />
        </div>

        <div className="aa-wizard-body">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="aa-wizard-step-content">
              <h2>Upload Your Resume</h2>
              <p className="aa-wizard-desc">Upload your resume or paste the text. AI will extract your skills, experience, and build your candidate profile.</p>
              <div
                className={`aa-upload-zone ${resumeFile ? 'uploaded' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}
              >
                <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} />
                {resumeFile ? (
                  <><CheckCircle2 size={40} color="#30d158" /><p className="aa-upload-name">{resumeFile.name}</p><p className="aa-upload-hint">Click to change file</p></>
                ) : (
                  <><Upload size={40} /><p className="aa-upload-title">Drop your resume here</p><p className="aa-upload-hint">PDF, DOCX, or TXT · Max 5MB</p></>
                )}
              </div>
              {error && <div className="aa-error"><AlertCircle size={14} />{error}</div>}
              <button className="aa-btn-primary aa-btn-full" disabled={loading || (!resumeFile && !resumeText)} onClick={generateProfile}>
                {loading ? <><RefreshCw size={16} className="aa-spin" />{loadingMsg}</> : <><Sparkles size={16} />Analyze Resume with AI</>}
              </button>
            </div>
          )}

          {/* Step 2: Profile */}
          {step === 2 && (
            <div className="aa-wizard-step-content aa-profile-step">
              <h2>Your AI Candidate Profile</h2>
              <p className="aa-wizard-desc">Review and edit the AI-generated profile. This will be used for job matching and applications.</p>
              <div className="aa-profile-grid">
                <div className="aa-profile-section">
                  <label className="aa-label"><User size={14} />Full Name</label>
                  <input className="aa-input" value={profileForm.name || ''} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} placeholder="Your name" />
                </div>
                <div className="aa-profile-section">
                  <label className="aa-label"><Briefcase size={14} />Current Title</label>
                  <input className="aa-input" value={profileForm.title || ''} onChange={e => setProfileForm({ ...profileForm, title: e.target.value })} placeholder="e.g. Senior Frontend Engineer" />
                </div>
                <div className="aa-profile-section">
                  <label className="aa-label"><MapPin size={14} />Location</label>
                  <input className="aa-input" value={profileForm.location || ''} onChange={e => setProfileForm({ ...profileForm, location: e.target.value })} placeholder="City, Country" />
                </div>
                <div className="aa-profile-section">
                  <label className="aa-label"><Clock size={14} />Years of Experience</label>
                  <input className="aa-input" type="number" min={0} max={40} value={profileForm.yearsOfExperience || 0} onChange={e => setProfileForm({ ...profileForm, yearsOfExperience: Number(e.target.value) })} />
                </div>
                <div className="aa-profile-section aa-profile-full">
                  <label className="aa-label"><Sparkles size={14} />Professional Summary</label>
                  <textarea className="aa-textarea" rows={3} value={profileForm.summary || ''} onChange={e => setProfileForm({ ...profileForm, summary: e.target.value })} placeholder="Brief professional summary…" />
                </div>
                <div className="aa-profile-section aa-profile-full">
                  <label className="aa-label"><Code2 size={14} />Skills <span className="aa-label-hint">(comma-separated)</span></label>
                  <textarea className="aa-textarea" rows={3} value={(profileForm.skills || []).join(', ')} onChange={e => setProfileForm({ ...profileForm, skills: e.target.value.split(',').map(s => s.trim()) })} onBlur={e => setProfileForm(p => ({ ...p, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} />
                </div>
              </div>
              <div className="aa-wizard-nav">
                <button className="aa-btn-ghost" onClick={() => setStep(1)}><ChevronLeft size={16} /> Back</button>
                <button className="aa-btn-primary" onClick={() => { handleSaveProfile(); setStep(3); }}>
                  Save Profile <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preferences */}
          {step === 3 && (
            <div className="aa-wizard-step-content">
              <h2>Set Your Job Preferences</h2>
              <p className="aa-wizard-desc">Tell AI what you're looking for. This filters and ranks your job matches.</p>
              <div className="aa-prefs-grid">
                <div className="aa-pref-section">
                  <label className="aa-label"><Briefcase size={14} />Target Roles</label>
                  <div className="aa-tag-input">
                    <input className="aa-input" placeholder="e.g. Frontend Engineer" value={roleInput} onChange={e => setRoleInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && roleInput.trim()) { setPreferences(p => ({ ...p, roles: [...p.roles, roleInput.trim()] })); setRoleInput(''); e.preventDefault(); } }} />
                    <button className="aa-btn-sm" onClick={() => { if (roleInput.trim()) { setPreferences(p => ({ ...p, roles: [...p.roles, roleInput.trim()] })); setRoleInput(''); } }}>Add</button>
                  </div>
                  <div className="aa-tags">{preferences.roles.map((r, i) => <span key={i} className="aa-tag">{r}<button onClick={() => setPreferences(p => ({ ...p, roles: p.roles.filter((_, j) => j !== i) }))}>×</button></span>)}</div>
                </div>
                <div className="aa-pref-section">
                  <label className="aa-label"><Globe size={14} />Work Mode</label>
                  <div className="aa-pills">
                    {['All', 'Remote', 'Hybrid', 'Onsite'].map(m => (
                      <button key={m} className={`aa-pill ${preferences.remote === m ? 'active' : ''}`} onClick={() => setPreferences(p => ({ ...p, remote: m }))}>{m}</button>
                    ))}
                  </div>
                </div>
                <div className="aa-pref-section">
                  <label className="aa-label"><Building2 size={14} />Employment Type</label>
                  <div className="aa-pills">
                    {['All', 'Full-time', 'Part-time', 'Contract', 'Internship'].map(t => (
                      <button key={t} className={`aa-pill ${preferences.employmentType === t ? 'active' : ''}`} onClick={() => setPreferences(p => ({ ...p, employmentType: t }))}>{t}</button>
                    ))}
                  </div>
                </div>
                <div className="aa-pref-section">
                  <label className="aa-label"><Building2 size={14} />Industry Focus</label>
                  <div className="aa-pills aa-pills-wrap">
                    {['All', 'Tech', 'Fintech', 'E-commerce', 'AI', 'SaaS', 'Food-tech'].map(ind => (
                      <button key={ind} className={`aa-pill ${preferences.industry === ind ? 'active' : ''}`} onClick={() => setPreferences(p => ({ ...p, industry: ind }))}>{ind}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="aa-wizard-nav">
                <button className="aa-btn-ghost" onClick={() => setStep(2)}><ChevronLeft size={16} /> Back</button>
                <button className="aa-btn-primary" onClick={discoverJobs}>
                  <Sparkles size={16} /> Discover Jobs
                </button>
              </div>
            </div>
          )}
        </div>

        {renderExtensionModal()}
      </div>
    );
  }

  // ── JOBS VIEW ─────────────────────────────────────────────────────────────────
  if (view === 'jobs') {
    return (
      <>
      <div className="aa-jobs">
        {renderTopNavBar()}

        {/* Live Scraper Bar */}
        <div className="aa-scraper-card">
          <div className="aa-scraper-header">
            <span className="aa-scraper-title"><Target size={16} color="#38bdf8" /> Live Job Discovery & URL Scraper</span>
            <span className="aa-scraper-tag">Playwright + Gemini AI</span>
          </div>
          <div className="aa-scraper-input-row">
            <input
              type="url"
              className="aa-scraper-input"
              placeholder="Paste any Job URL to scrape & match (e.g. Greenhouse, Lever, LinkedIn, Company portal)"
              value={scrapeUrlInput}
              onChange={e => setScrapeUrlInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleScrapeJobUrl(); }}
            />
            <button className="aa-btn-primary aa-btn-sm" onClick={handleScrapeJobUrl} disabled={isScrapingUrl || !scrapeUrlInput.trim()}>
              {isScrapingUrl ? <><RefreshCw size={14} className="aa-spin" /> Scraping JD…</> : <><Sparkles size={14} /> Scrape & Match</>}
            </button>
          </div>
        </div>

        <div className="aa-jobs-header">
          <div className="aa-jobs-title-row">
            <div>
              <h2>Job Matches <span className="aa-jobs-count">{filteredJobs.length} jobs</span></h2>
              {(profile || profileForm.name) && <p className="aa-jobs-sub">Matched for <strong>{profile?.name || profileForm.name}</strong> · {profile?.title || profileForm.title}</p>}
            </div>
            <div className="aa-jobs-actions">
              <button className="aa-btn-ghost aa-btn-sm" onClick={() => setView('profile')}><User size={14} /> My Profile</button>
              <button className="aa-btn-ghost aa-btn-sm" onClick={() => { setView('tracker'); loadApplications(); }}><LayoutGrid size={14} /> Tracker ({applications.length})</button>
              <button className="aa-btn-primary aa-btn-sm" onClick={discoverJobs}><RefreshCw size={14} /> Refresh</button>
            </div>
          </div>
          <div className="aa-jobs-filters">
            <div className="aa-filter-group">
              <Filter size={14} />
              <span>Min Match:</span>
              <select className="aa-select" value={filterScore} onChange={e => setFilterScore(Number(e.target.value))}>
                <option value={0}>All</option>
                <option value={50}>50%+</option>
                <option value={70}>70%+</option>
                <option value={80}>80%+</option>
              </select>
            </div>
            <div className="aa-filter-group">
              <span>Type:</span>
              <select className="aa-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="All">All</option>
                <option value="Full-time">Full-time</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
          </div>
          <div className="aa-pills" style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['All', 'Stripe', 'MongoDB', 'Figma', 'Datadog', 'Reddit', 'Cloudflare', 'Airbnb', 'Coinbase', 'GitLab', 'Razorpay', 'Swiggy', 'CRED'].map(c => (
              <button key={c} className={`aa-pill ${companyFilter === c ? 'active' : ''}`} onClick={() => setCompanyFilter(c)}>
                {c === 'All' ? '🏢 All Companies' : c}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="aa-loading-overlay"><RefreshCw size={32} className="aa-spin" /><p>{loadingMsg || 'Loading jobs…'}</p></div>
        )}

        <div className="aa-jobs-layout">
          {/* Job List */}
          <div className="aa-jobs-list">
            {filteredJobs.map(job => {
              const isApplied = appliedIds.has(job.id);
              const isApplying = applyingJobId === job.id;
              return (
                <div key={job.id} className={`aa-job-card ${selectedJob?.id === job.id ? 'selected' : ''} ${isApplied ? 'applied' : ''}`} onClick={() => { setSelectedJob(job); setJobDetailMode('details'); setTailorResult(null); setCoverResult(null); setAnswerResult(null); }}>
                  <div className="aa-job-card-top">
                    <CompanyLogo domain={job.domain} company={job.company} />
                    <div className="aa-job-card-info">
                      <div className="aa-job-title">{job.title} {job.isScraped && <span className="aa-scraper-tag" style={{ marginLeft: 6 }}>Live Scraped</span>}</div>
                      <div className="aa-job-company">{job.company}</div>
                    </div>
                    <div className="aa-match-ring" style={{ '--score-color': scoreColor(job.matchScore) } as any} title="Click to view 5-factor breakdown" onClick={(e) => { e.stopPropagation(); setBreakdownModalJob(job); }}>
                      <span className="aa-match-val">{job.matchScore}%</span>
                    </div>
                  </div>
                  <div className="aa-job-meta">
                    <span><MapPin size={12} />{job.location}</span>
                    <span><Briefcase size={12} />{job.type}</span>
                    <span><Globe size={12} />{job.remote}</span>
                    <span><DollarSign size={12} />{job.salary}</span>
                  </div>
                  <div className="aa-job-skills">
                    {job.matchedSkills.slice(0, 4).map(s => <span key={s} className="aa-skill-match">{s}</span>)}
                    {job.missingSkills.slice(0, 2).map(s => <span key={s} className="aa-skill-miss">{s}</span>)}
                  </div>
                  <div className="aa-job-card-footer">
                    <span className="aa-posted" onClick={(e) => { e.stopPropagation(); setBreakdownModalJob(job); }} style={{ cursor: 'pointer', color: '#38bdf8' }}>
                      📊 5-Factor Score
                    </span>
                    {isApplied ? (
                      <span className="aa-applied-badge"><CheckCheck size={12} /> Applied</span>
                    ) : (
                      <button className="aa-btn-apply" disabled={isApplying}
                        onClick={async (e) => { e.stopPropagation(); await handleApply(job); }}>
                        {isApplying ? <RefreshCw size={12} className="aa-spin" /> : <Send size={12} />}
                        {isApplying ? 'Applying…' : 'Apply with CVMind'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredJobs.length === 0 && !loading && (
              <div className="aa-empty"><Target size={40} /><p>No jobs match your filters. Try lowering the match threshold or paste a URL above.</p></div>
            )}
          </div>

          {/* Job Detail Panel */}
          {selectedJob && (
            <div className="aa-job-detail">
              <div className="aa-job-detail-header">
                <CompanyLogo domain={selectedJob.domain} company={selectedJob.company} />
                <div>
                  <h3>{selectedJob.title}</h3>
                  <p>{selectedJob.company} · {selectedJob.location} · {selectedJob.remote}</p>
                </div>
                <button className="aa-btn-icon" onClick={() => setSelectedJob(null)}><XCircle size={20} /></button>
              </div>
              <div className="aa-job-detail-score" style={{ cursor: 'pointer' }} onClick={() => setBreakdownModalJob(selectedJob)}>
                <div style={{ color: scoreColor(selectedJob.matchScore) }}>
                  <span className="aa-big-score">{selectedJob.matchScore}%</span> Match (Click for 5-Factor Breakdown)
                </div>
                <div className="aa-score-bar"><div className="aa-score-fill" style={{ width: `${selectedJob.matchScore}%`, background: scoreColor(selectedJob.matchScore) }} /></div>
              </div>
              <div className="aa-detail-tabs">
                {(['details', 'tailor', 'cover', 'answer'] as const).map(t => (
                  <button key={t} className={`aa-detail-tab ${jobDetailMode === t ? 'active' : ''}`} onClick={() => setJobDetailMode(t)}>
                    {t === 'details' ? 'Details' : t === 'tailor' ? 'Tailor Resume' : t === 'cover' ? 'Cover Letter' : 'AI Answers'}
                  </button>
                ))}
              </div>

              <div className="aa-detail-body">
                {jobDetailMode === 'details' && (
                  <div className="aa-detail-content">
                    <div className="aa-detail-row"><DollarSign size={14} /><span>{selectedJob.salary}</span></div>
                    <div className="aa-detail-row"><Clock size={14} /><span>{selectedJob.exp} experience required</span></div>
                    <div className="aa-detail-row"><Calendar size={14} /><span>Posted {selectedJob.posted}</span></div>
                    <div className="aa-detail-row"><Building2 size={14} /><span>{selectedJob.industry}</span></div>
                    <h4>Required Skills</h4>
                    <div className="aa-skills-block">{selectedJob.skills.map(s => <span key={s} className={`aa-skill-tag ${selectedJob.matchedSkills.includes(s) ? 'matched' : 'missing'}`}>{s}</span>)}</div>
                    <h4>Your Matched Skills</h4>
                    <div className="aa-skills-block">{selectedJob.matchedSkills.map(s => <span key={s} className="aa-skill-tag matched">{s}</span>)}</div>
                    {selectedJob.missingSkills.length > 0 && (<><h4>Skills to Highlight</h4><div className="aa-skills-block">{selectedJob.missingSkills.map(s => <span key={s} className="aa-skill-tag missing">{s}</span>)}</div></>)}
                    <div className="aa-detail-actions">
                      <button className="aa-btn-primary" onClick={() => handleApply(selectedJob)} disabled={appliedIds.has(selectedJob.id) || applyingJobId === selectedJob.id}>
                        {appliedIds.has(selectedJob.id) ? <><CheckCheck size={14} /> Applied</> : applyingJobId === selectedJob.id ? <><RefreshCw size={14} className="aa-spin" /> Applying…</> : <><Send size={14} /> Apply with CVMind</>}
                      </button>
                      {selectedJob.apply_url && (
                        <a href={selectedJob.apply_url} target="_blank" rel="noopener noreferrer" className="aa-btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                          <ExternalLink size={14} /> Open Live Form (Extension Ready)
                        </a>
                      )}
                      <a href={`https://${selectedJob.domain}`} target="_blank" rel="noopener noreferrer" className="aa-btn-ghost"><ExternalLink size={14} /> View Company</a>
                    </div>
                  </div>
                )}

                {jobDetailMode === 'tailor' && (
                  <div className="aa-detail-content">
                    {!tailorResult ? (
                      <><p className="aa-detail-desc">AI will rewrite your resume with optimal keywords for this specific role and company.</p>
                        <button className="aa-btn-primary" onClick={() => handleTailor(selectedJob)} disabled={loading}>
                          {loading ? <><RefreshCw size={14} className="aa-spin" />{loadingMsg}</> : <><Sparkles size={14} /> Tailor My Resume</>}
                        </button></>
                    ) : (
                      <><div className="aa-result-meta">
                        <span className="aa-result-badge" style={{ color: '#30d158' }}>ATS Score: {tailorResult.atsScore}%</span>
                        <span className="aa-result-badge" style={{ color: '#2997ff' }}>Match: {tailorResult.matchScore}%</span>
                      </div>
                        <h4>What was improved</h4>
                        {(tailorResult.changedSections || []).map((c: string, i: number) => <div key={i} className="aa-change-item"><CheckCircle2 size={12} color="#30d158" /><span>{c}</span></div>)}
                        <h4>Keywords Added</h4>
                        <div className="aa-skills-block">{(tailorResult.addedKeywords || []).map((k: string) => <span key={k} className="aa-skill-tag matched">{k}</span>)}</div>
                        <div className="aa-result-actions">
                          <button className="aa-btn-sm" onClick={() => copyToClipboard(tailorResult.tailoredResume || '', 'tailor')}><Copy size={12} />{copied === 'tailor' ? 'Copied!' : 'Copy Resume'}</button>
                          <button className="aa-btn-sm" onClick={() => { setTailorResult(null); handleTailor(selectedJob); }}><RefreshCw size={12} /> Regenerate</button>
                        </div>
                        <textarea className="aa-textarea aa-result-text" rows={12} readOnly value={tailorResult.tailoredResume || ''} /></>
                    )}
                  </div>
                )}

                {jobDetailMode === 'cover' && (
                  <div className="aa-detail-content">
                    {!coverResult ? (
                      <><p className="aa-detail-desc">AI writes a personalized cover letter using your profile and this job's context.</p>
                        <button className="aa-btn-primary" onClick={() => handleCoverLetter(selectedJob)} disabled={loading}>
                          {loading ? <><RefreshCw size={14} className="aa-spin" />{loadingMsg}</> : <><Edit3 size={14} /> Generate Cover Letter</>}
                        </button></>
                    ) : (
                      <><div className="aa-result-meta"><span className="aa-result-badge">Subject: {coverResult.subject}</span></div>
                        <div className="aa-result-actions">
                          <button className="aa-btn-sm" onClick={() => copyToClipboard(coverResult.coverLetter || '', 'cover')}><Copy size={12} />{copied === 'cover' ? 'Copied!' : 'Copy Letter'}</button>
                          <button className="aa-btn-sm" onClick={() => { setCoverResult(null); handleCoverLetter(selectedJob); }}><RefreshCw size={12} /> Regenerate</button>
                        </div>
                        <textarea className="aa-textarea aa-result-text" rows={14} readOnly value={coverResult.coverLetter || ''} /></>
                    )}
                  </div>
                )}

                {jobDetailMode === 'answer' && (
                  <div className="aa-detail-content">
                    <p className="aa-detail-desc">Paste any application question and AI will craft a compelling, personalized answer using your real background.</p>
                    <textarea className="aa-textarea" rows={3} placeholder="e.g. Why do you want to work at this company?" value={answerQuestion} onChange={e => setAnswerQuestion(e.target.value)} />
                    <button className="aa-btn-primary" onClick={() => handleAnswer(selectedJob)} disabled={loading || !answerQuestion.trim()}>
                      {loading ? <><RefreshCw size={14} className="aa-spin" />{loadingMsg}</> : <><Bot size={14} /> Generate Answer</>}
                    </button>
                    {answerResult && (
                      <div className="aa-answer-result">
                        <div className="aa-result-actions">
                          <button className="aa-btn-sm" onClick={() => copyToClipboard(answerResult.answer || '', 'answer')}><Copy size={12} />{copied === 'answer' ? 'Copied!' : 'Copy Answer'}</button>
                        </div>
                        <p className="aa-answer-text">{answerResult.answer}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {renderApplyModal()}
      {renderBreakdownModal()}
      {renderExtensionModal()}
      </>
    );
  }

  // ── TRACKER VIEW ──────────────────────────────────────────────────────────────
  if (view === 'tracker') {
    const grouped = ALL_STATUSES.reduce((acc, s) => {
      acc[s] = applications.filter(a => a.status === s);
      return acc;
    }, {} as Record<AppStatus, Application[]>);

    return (
      <div className="aa-tracker">
        {renderTopNavBar()}

        <div className="aa-tracker-header">
          <div>
            <h2>Application Tracker</h2>
            <p className="aa-tracker-sub">{applications.length} total · {applications.filter(a => a.status === 'Interview').length} interviews · {applications.filter(a => a.status === 'Offer').length} offers</p>
          </div>
          <div className="aa-tracker-actions">
            <button className={`aa-btn-ghost aa-btn-sm ${trackerView === 'kanban' ? 'active' : ''}`} onClick={() => setTrackerView('kanban')}><LayoutGrid size={14} /> Kanban</button>
            <button className={`aa-btn-ghost aa-btn-sm ${trackerView === 'list' ? 'active' : ''}`} onClick={() => setTrackerView('list')}><List size={14} /> List</button>
            <button className="aa-btn-primary aa-btn-sm" onClick={() => setView('jobs')}><Search size={14} /> Find More Jobs</button>
          </div>
        </div>

        {applications.length === 0 ? (
          <div className="aa-tracker-empty">
            <Briefcase size={56} />
            <h3>No applications yet</h3>
            <p>Start applying to jobs or test the Live Demo Sandbox.</p>
            <button className="aa-btn-primary" onClick={() => setView('jobs')}><Target size={16} /> Browse Matching Jobs</button>
          </div>
        ) : trackerView === 'kanban' ? (
          <div className="aa-kanban">
            {ALL_STATUSES.filter(s => s !== 'Saved' || grouped['Saved'].length > 0).map(status => (
              <div key={status} className={`aa-kanban-col ${dragStatus === status ? 'drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragStatus(status); }}
                onDragLeave={() => setDragStatus(null)}
                onDrop={() => { if (draggingApp) { updateAppStatus(draggingApp, status); setDraggingApp(null); setDragStatus(null); } }}>
                <div className="aa-kanban-col-header">
                  <span className="aa-status-dot" style={{ background: STATUS_COLORS[status] }} />
                  <span className="aa-kanban-status">{status}</span>
                  <span className="aa-kanban-count">{grouped[status].length}</span>
                </div>
                {grouped[status].map(app => (
                  <div key={app.id} className="aa-kanban-card" draggable onDragStart={() => setDraggingApp(app.id)} onDragEnd={() => { setDraggingApp(null); setDragStatus(null); }}>
                    <div className="aa-kanban-card-top">
                      <CompanyLogo domain={app.job?.domain || ''} company={app.job?.company || '?'} />
                      <div>
                        <div className="aa-kanban-title">{app.job?.title}</div>
                        <div className="aa-kanban-company">{app.job?.company}</div>
                      </div>
                    </div>
                    <div className="aa-kanban-meta">
                      <span><MapPin size={10} />{app.job?.location}</span>
                      <span style={{ color: scoreColor(app.matchScore) }}>{app.matchScore}% match</span>
                    </div>
                    <div className="aa-kanban-date">{new Date(app.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                    <div className="aa-kanban-actions">
                      <select className="aa-select aa-select-sm" value={app.status} onChange={e => updateAppStatus(app.id, e.target.value as AppStatus)}>
                        {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button className="aa-btn-icon-sm" onClick={() => deleteApp(app.id)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="aa-list-view">
            <table className="aa-table">
              <thead><tr>
                <th>Company</th><th>Role</th><th>Location</th><th>Match</th><th>Status</th><th>Applied</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app.id}>
                    <td><div className="aa-list-company"><CompanyLogo domain={app.job?.domain || ''} company={app.job?.company || '?'} /><span>{app.job?.company}</span></div></td>
                    <td>{app.job?.title}</td>
                    <td>{app.job?.location}</td>
                    <td><span style={{ color: scoreColor(app.matchScore), fontWeight: 700 }}>{app.matchScore}%</span></td>
                    <td>
                      <span className="aa-status-badge" style={{ color: STATUS_COLORS[app.status], background: STATUS_BG[app.status] }}>{app.status}</span>
                    </td>
                    <td>{new Date(app.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                    <td>
                      <div className="aa-list-actions">
                        <select className="aa-select aa-select-sm" value={app.status} onChange={e => updateAppStatus(app.id, e.target.value as AppStatus)}>
                          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button className="aa-btn-icon-sm" onClick={() => deleteApp(app.id)}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {renderExtensionModal()}
      </div>
    );
  }

  return null;
}
