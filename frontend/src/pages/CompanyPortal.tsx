import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Users, Calendar, Sparkles, Building2, 
  MapPin, DollarSign, Eye, UserCheck, XCircle, 
  ShieldCheck, PlusCircle
} from 'lucide-react';
import './CompanyPortal.css';

interface CompanyPortalProps {
  customApiKey?: string;
  onNavigateCandidateApp?: () => void;
}

export default function CompanyPortal({ customApiKey, onNavigateCandidateApp }: CompanyPortalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'post-job' | 'applicants' | 'rankings' | 'company-info'>('overview');
  
  // Registered Company Details
  const [company, _setCompany] = useState<any>(() => {
    const saved = localStorage.getItem('cvmind_company');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {
      id: 'comp_cvmind_demo',
      name: 'TechCorp Global AI',
      email: 'recruiter@techcorp.ai',
      website: 'https://techcorp.ai',
      industry: 'Artificial Intelligence & Software',
      companySize: '100-500 employees',
      location: 'Bengaluru, India',
      description: 'Building next-generation intelligent applications for cloud and enterprise solutions.',
      logo: '',
      verified: true
    };
  });

  // Job Listing & Post Form State
  const [jobs, setJobs] = useState<any[]>([]);
  const [_loadingJobs, setLoadingJobs] = useState(false);
  const [newJob, setNewJob] = useState({
    title: 'Senior Python & AI Engineer',
    department: 'Engineering',
    jobType: 'Full-time',
    experience: '1-3 yrs',
    location: 'Bengaluru, India',
    remote: 'Hybrid',
    salary: '₹18L–₹30L/yr',
    deadline: '2026-09-30',
    description: 'We are seeking a talented Python Developer to build high-performance REST APIs, AI agent pipelines, and microservices.',
    requirements: 'Strong proficiency in Python, FastAPI/Flask, SQL databases, Docker, and experience with Gemini or OpenAI LLMs.',
    skills: 'Python, FastAPI, Docker, PostgreSQL, Gemini API, Microservices',
    allowAutoApply: true,
    maxApplications: 100
  });

  // AI Job Parser State
  const [isParsingJob, setIsParsingJob] = useState(false);
  const [parserSuccessMsg, setParserSuccessMsg] = useState('');

  // Applicant State
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [applicants, setApplicants] = useState<any[]>([]);
  const [applicantFilter, setApplicantFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null);

  // Interview Scheduler Modal State
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewApplicant, setInterviewApplicant] = useState<any>(null);
  const [interviewDate, setInterviewDate] = useState('2026-08-25');
  const [interviewTime, setInterviewTime] = useState('14:00');
  const [interviewType, setInterviewType] = useState('Technical Interview');
  const [interviewLink, setInterviewLink] = useState('https://meet.google.com/cvm-prep-room');
  const [interviewNotes, setInterviewNotes] = useState('Please bring your GitHub projects and be ready for a short live coding walk-through.');
  const [interviewSuccess, setInterviewSuccess] = useState('');

  // Load jobs from backend
  const fetchCompanyJobs = async () => {
    setLoadingJobs(true);
    try {
      const res = await fetch(`/_/backend/api/company/jobs?companyId=${company.id}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  // Load applicants for a job
  const fetchApplicants = async (jobId: string) => {
    try {
      const targetId = jobId === 'all' ? (jobs[0]?.id || 'j001') : jobId;
      const res = await fetch(`/_/backend/api/company/jobs/${targetId}/applicants`);
      if (res.ok) {
        const data = await res.json();
        setApplicants(data.applicants || []);
      }
    } catch (err) {
      console.error('Failed to fetch applicants:', err);
    }
  };

  useEffect(() => {
    fetchCompanyJobs();
  }, [company.id]);

  useEffect(() => {
    if (jobs.length > 0) {
      fetchApplicants(selectedJobId);
    }
  }, [selectedJobId, jobs]);

  // Initial mock applicants if none returned
  const displayApplicants = applicants.length > 0 ? applicants : [
    {
      id: 'CVM-948201',
      candidateName: 'Rahul Sharma',
      candidateEmail: 'rahul.sharma@example.com',
      candidatePhone: '+91 98765 43210',
      matchScore: 96,
      matchBreakdown: { skills: 98, education: 100, experience: 92, location: 100, preferences: 95 },
      matchReasoning: 'Exceptional match. Rahul possesses 4+ years of Python & React experience matching core requirements.',
      mode: 'Auto',
      status: 'Shortlisted',
      resumeText: 'Full Stack Engineer with 4 years experience in Python, FastAPI, Docker, and React. Built scalable microservices for fintech.',
      coverLetter: 'Dear Hiring Manager, I am thrilled to apply for the Python Developer position at TechCorp. My background aligns perfectly with your requirements.',
      appliedAt: new Date().toISOString(),
      events: [
        { title: 'Application Submitted', description: 'Applied via Auto Apply Agent.', timestamp: new Date().toISOString(), actor: 'Candidate' },
        { title: 'Shortlisted', description: 'Shortlisted by Recruiter for technical round.', timestamp: new Date().toISOString(), actor: 'Recruiter' }
      ]
    },
    {
      id: 'CVM-837102',
      candidateName: 'Ananya Verma',
      candidateEmail: 'ananya.v@example.com',
      candidatePhone: '+91 91234 56789',
      matchScore: 92,
      matchBreakdown: { skills: 94, education: 95, experience: 90, location: 90, preferences: 92 },
      matchReasoning: 'Strong candidate match with solid backend development projects.',
      mode: 'Assisted',
      status: 'Applied',
      resumeText: 'Backend Developer proficient in Node.js, Python, PostgreSQL, and AWS Cloud deployments.',
      coverLetter: 'I am excited to submit my tailored application for TechCorp\'s engineering team.',
      appliedAt: new Date().toISOString(),
      events: [
        { title: 'Application Submitted', description: 'Submitted via Assisted Apply.', timestamp: new Date().toISOString(), actor: 'Candidate' }
      ]
    },
    {
      id: 'CVM-749203',
      candidateName: 'Vikram Singh',
      candidateEmail: 'vikram.singh@example.com',
      candidatePhone: '+91 99887 76655',
      matchScore: 88,
      matchBreakdown: { skills: 86, education: 90, experience: 88, location: 90, preferences: 88 },
      matchReasoning: 'Good technical skillset matching key requirements.',
      mode: 'Manual',
      status: 'Applied',
      resumeText: 'Software Engineer skilled in Data Structures, Python, Flask, and MongoDB.',
      appliedAt: new Date().toISOString(),
      events: [
        { title: 'Application Submitted', description: 'Manual application.', timestamp: new Date().toISOString(), actor: 'Candidate' }
      ]
    }
  ];

  // AI Job Parser Handler
  const handleRunAIParser = async () => {
    if (!newJob.description || newJob.description.length < 20) return;
    setIsParsingJob(true);
    setParserSuccessMsg('');
    try {
      const res = await fetch('/_/backend/api/company/parse-job', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-gemini-key': customApiKey || ''
        },
        body: JSON.stringify({ jobDescription: newJob.description })
      });
      if (res.ok) {
        const data = await res.json();
        const p = data.parsed;
        setNewJob(prev => ({
          ...prev,
          title: p.title || prev.title,
          department: p.department || prev.department,
          experience: p.experience || prev.experience,
          skills: p.skills ? p.skills.join(', ') : prev.skills,
          requirements: p.requirements ? p.requirements.join('\n') : prev.requirements
        }));
        setParserSuccessMsg('✨ AI Job Parser extracted key skills and criteria successfully!');
      }
    } catch (err) {
      console.error('AI Parser error:', err);
    } finally {
      setIsParsingJob(false);
    }
  };

  // Publish Job Handler
  const handlePublishJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/_/backend/api/company/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newJob,
          companyId: company.id,
          companyName: company.name,
          domain: company.website ? company.website.replace(/https?:\/\//, '') : 'techcorp.ai',
          skills: newJob.skills.split(',').map(s => s.trim())
        })
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(prev => [data.job, ...prev]);
        setActiveTab('jobs');
        alert('🎉 Job published successfully to the central CVMind ecosystem! Candidates will now see this job in their Auto Apply feed.');
      }
    } catch (err) {
      console.error('Failed to post job:', err);
    }
  };

  // Status Update Handler (Two-way sync)
  const handleUpdateStatus = async (applicantId: string, newStatus: string) => {
    try {
      const res = await fetch(`/_/backend/api/company/applicants/${applicantId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, actorName: company.name })
      });
      if (res.ok) {
        setApplicants(prev => prev.map(a => a.id === applicantId ? { ...a, status: newStatus } : a));
        if (selectedApplicant && selectedApplicant.id === applicantId) {
          setSelectedApplicant((prev: any) => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      console.error('Failed to update applicant status:', err);
    }
  };

  // Schedule Interview Handler
  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewApplicant) return;
    try {
      const res = await fetch('/_/backend/api/company/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: interviewApplicant.id,
          date: interviewDate,
          time: interviewTime,
          type: interviewType,
          meetingLink: interviewLink,
          notes: interviewNotes,
          recruiterName: company.name
        })
      });
      if (res.ok) {
        setInterviewSuccess('🎉 Interview scheduled! Candidate notified & AI Interview Prep unlocked for candidate.');
        handleUpdateStatus(interviewApplicant.id, 'Interview');
        setTimeout(() => {
          setShowInterviewModal(false);
          setInterviewSuccess('');
        }, 2200);
      }
    } catch (err) {
      console.error('Failed to schedule interview:', err);
    }
  };

  // Filtered applicants list
  const filteredApplicants = displayApplicants.filter(a => {
    const matchesFilter = applicantFilter === 'all' || a.status.toLowerCase() === applicantFilter.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      a.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="company-portal-container">
      {/* Header Bar */}
      <header className="cp-header">
        <div className="cp-header-content">
          <div className="cp-company-brand">
            <div className="cp-company-logo">
              {company.name ? company.name.charAt(0) : 'C'}
            </div>
            <div className="cp-company-info">
              <h1>
                {company.name}
                <span className="cp-badge-verified">
                  <ShieldCheck size={14} /> Verified Employer
                </span>
              </h1>
              <div className="cp-company-meta">
                <span><Building2 size={13} /> {company.industry}</span>
                <span><MapPin size={13} /> {company.location}</span>
                <span><Users size={13} /> {company.companySize}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="cp-btn-primary" onClick={() => setActiveTab('post-job')}>
              <PlusCircle size={17} /> Post New Job
            </button>
            {onNavigateCandidateApp && (
              <button className="cp-btn-secondary" onClick={onNavigateCandidateApp}>
                Switch to Candidate Mode →
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="cp-tabs-bar">
        <button className={`cp-tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          <Briefcase size={17} /> Recruiter Dashboard
        </button>
        <button className={`cp-tab-btn ${activeTab === 'post-job' ? 'active' : ''}`} onClick={() => setActiveTab('post-job')}>
          <Sparkles size={17} /> + Post Job (AI Parser)
        </button>
        <button className={`cp-tab-btn ${activeTab === 'applicants' ? 'active' : ''}`} onClick={() => setActiveTab('applicants')}>
          <Users size={17} /> Applicant ATS ({displayApplicants.length})
        </button>
        <button className={`cp-tab-btn ${activeTab === 'jobs' ? 'active' : ''}`} onClick={() => setActiveTab('jobs')}>
          <Briefcase size={17} /> Active Jobs ({jobs.length})
        </button>
        <button className={`cp-tab-btn ${activeTab === 'rankings' ? 'active' : ''}`} onClick={() => setActiveTab('rankings')}>
          <Sparkles size={17} /> AI Candidate Ranking
        </button>
      </div>

      {/* Main Body */}
      <main className="cp-main-body">
        
        {/* OVERVIEW DASHBOARD */}
        {activeTab === 'overview' && (
          <div>
            {/* KPI Cards */}
            <div className="cp-kpi-grid">
              <div className="cp-kpi-card">
                <div className="cp-kpi-header">
                  <span>Active Jobs</span>
                  <div className="cp-kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                    <Briefcase size={20} />
                  </div>
                </div>
                <div className="cp-kpi-value">{jobs.length > 0 ? jobs.length : 3}</div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.4rem' }}>Live on Central CVMind Feed</div>
              </div>

              <div className="cp-kpi-card">
                <div className="cp-kpi-header">
                  <span>Total Applications</span>
                  <div className="cp-kpi-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                    <Users size={20} />
                  </div>
                </div>
                <div className="cp-kpi-value">{displayApplicants.length}</div>
                <div style={{ fontSize: '0.8rem', color: '#34d399', marginTop: '0.4rem' }}>+12% auto-matched today</div>
              </div>

              <div className="cp-kpi-card">
                <div className="cp-kpi-header">
                  <span>Shortlisted</span>
                  <div className="cp-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                    <UserCheck size={20} />
                  </div>
                </div>
                <div className="cp-kpi-value">{displayApplicants.filter(a => a.status === 'Shortlisted').length || 1}</div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.4rem' }}>Ready for interview scheduling</div>
              </div>

              <div className="cp-kpi-card">
                <div className="cp-kpi-header">
                  <span>Scheduled Interviews</span>
                  <div className="cp-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                    <Calendar size={20} />
                  </div>
                </div>
                <div className="cp-kpi-value">{displayApplicants.filter(a => a.status === 'Interview').length || 1}</div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.4rem' }}>AI Interview Prep active for candidate</div>
              </div>
            </div>

            {/* Banner Quick Actions */}
            <div className="cp-action-banner">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>Connect your open roles to CVMind's Auto Apply Agent</h3>
                <p style={{ margin: '0.4rem 0 0', color: '#9ca3af', fontSize: '0.9rem' }}>
                  Post jobs once. AI will automatically evaluate qualifications, calculate match scores, and direct qualified candidates to your ATS.
                </p>
              </div>
              <button className="cp-btn-primary" onClick={() => setActiveTab('post-job')}>
                <Sparkles size={16} /> Post Job with AI Parser
              </button>
            </div>

            {/* Recent Applicants Section */}
            <div className="cp-form-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white' }}>Recent Candidate Applications</h3>
                <button className="cp-btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setActiveTab('applicants')}>
                  View All Applicants →
                </button>
              </div>

              <div className="cp-table-container">
                <table className="cp-table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>AI Match Score</th>
                      <th>Apply Mode</th>
                      <th>Status</th>
                      <th>Applied Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayApplicants.slice(0, 5).map((app, idx) => (
                      <tr key={idx}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'white' }}>{app.candidateName}</div>
                          <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{app.candidateEmail}</div>
                        </td>
                        <td>
                          <span className={`cp-match-pill ${app.matchScore >= 90 ? 'cp-match-high' : 'cp-match-mid'}`}>
                            <Sparkles size={13} /> {app.matchScore}% Match
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                            {app.mode || 'Auto'} Mode
                          </span>
                        </td>
                        <td>
                          <span className={`cp-status-badge cp-status-${(app.status || 'applied').toLowerCase()}`}>
                            {app.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                          {new Date(app.appliedAt).toLocaleDateString()}
                        </td>
                        <td>
                          <button 
                            className="cp-btn-secondary" 
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                            onClick={() => {
                              setSelectedApplicant(app);
                              setActiveTab('applicants');
                            }}
                          >
                            Review Profile
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* POST NEW JOB TAB WITH AI PARSER */}
        {activeTab === 'post-job' && (
          <div className="cp-form-card">
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Sparkles style={{ color: '#3b82f6' }} /> Post Job to CVMind Job Database
              </h2>
              <p style={{ margin: '0.3rem 0 0', color: '#9ca3af', fontSize: '0.9rem' }}>
                Jobs published here immediately sync to relevant candidates via the CVMind Auto Apply Agent.
              </p>
            </div>

            {/* AI Job Parser Banner */}
            <div className="cp-ai-parser-box">
              <div>
                <h4 style={{ margin: 0, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={16} /> AI Job Description Parser
                </h4>
                <p style={{ margin: '0.2rem 0 0', color: '#d1d5db', fontSize: '0.85rem' }}>
                  Paste raw job description text below and click Parse to automatically extract skills, qualifications, and criteria!
                </p>
              </div>
              <button 
                type="button" 
                className="cp-btn-primary" 
                onClick={handleRunAIParser}
                disabled={isParsingJob}
                style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' }}
              >
                {isParsingJob ? 'Extracting with Gemini AI...' : '✨ Run AI Parser'}
              </button>
            </div>

            {parserSuccessMsg && (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                {parserSuccessMsg}
              </div>
            )}

            <form onSubmit={handlePublishJob}>
              <div className="cp-form-grid">
                <div className="cp-input-group">
                  <label>Job Title *</label>
                  <input 
                    type="text" 
                    className="cp-input" 
                    value={newJob.title} 
                    onChange={e => setNewJob({ ...newJob, title: e.target.value })} 
                    placeholder="e.g. Python Developer Intern"
                    required
                  />
                </div>

                <div className="cp-input-group">
                  <label>Department</label>
                  <input 
                    type="text" 
                    className="cp-input" 
                    value={newJob.department} 
                    onChange={e => setNewJob({ ...newJob, department: e.target.value })} 
                    placeholder="Engineering / Data Science"
                  />
                </div>

                <div className="cp-input-group">
                  <label>Job Type</label>
                  <select className="cp-select" value={newJob.jobType} onChange={e => setNewJob({ ...newJob, jobType: e.target.value })}>
                    <option value="Full-time">Full-time</option>
                    <option value="Internship">Internship</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>

                <div className="cp-input-group">
                  <label>Required Experience</label>
                  <input 
                    type="text" 
                    className="cp-input" 
                    value={newJob.experience} 
                    onChange={e => setNewJob({ ...newJob, experience: e.target.value })} 
                    placeholder="0-2 yrs / Fresher"
                  />
                </div>

                <div className="cp-input-group">
                  <label>Location</label>
                  <input 
                    type="text" 
                    className="cp-input" 
                    value={newJob.location} 
                    onChange={e => setNewJob({ ...newJob, location: e.target.value })} 
                    placeholder="Bengaluru / Remote"
                  />
                </div>

                <div className="cp-input-group">
                  <label>Remote Availability</label>
                  <select className="cp-select" value={newJob.remote} onChange={e => setNewJob({ ...newJob, remote: e.target.value })}>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote">Remote</option>
                    <option value="Onsite">Onsite</option>
                  </select>
                </div>

                <div className="cp-input-group">
                  <label>Salary Range</label>
                  <input 
                    type="text" 
                    className="cp-input" 
                    value={newJob.salary} 
                    onChange={e => setNewJob({ ...newJob, salary: e.target.value })} 
                    placeholder="₹15,000/mo or ₹18L–₹30L/yr"
                  />
                </div>

                <div className="cp-input-group">
                  <label>Application Deadline</label>
                  <input 
                    type="date" 
                    className="cp-input" 
                    value={newJob.deadline} 
                    onChange={e => setNewJob({ ...newJob, deadline: e.target.value })} 
                  />
                </div>
              </div>

              <div className="cp-input-group" style={{ marginBottom: '1.25rem' }}>
                <label>Job Description *</label>
                <textarea 
                  className="cp-textarea" 
                  rows={5}
                  value={newJob.description}
                  onChange={e => setNewJob({ ...newJob, description: e.target.value })}
                  placeholder="Paste detailed job description..."
                  required
                />
              </div>

              <div className="cp-input-group" style={{ marginBottom: '1.25rem' }}>
                <label>Required Skills (Comma separated)</label>
                <input 
                  type="text" 
                  className="cp-input" 
                  value={newJob.skills}
                  onChange={e => setNewJob({ ...newJob, skills: e.target.value })}
                  placeholder="Python, React, Node.js, AWS, SQL"
                />
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--cp-border)' }}>
                <h4 style={{ margin: '0 0 0.8rem', color: 'white' }}>Application & Auto Apply Settings</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input 
                      type="checkbox" 
                      checked={newJob.allowAutoApply}
                      onChange={e => setNewJob({ ...newJob, allowAutoApply: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
                    />
                    <span>Allow CVMind Auto Apply Agent Submission</span>
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#d1d5db' }}>Max Applications Limit:</span>
                    <input 
                      type="number" 
                      className="cp-input" 
                      style={{ width: '100px', padding: '0.4rem 0.6rem' }}
                      value={newJob.maxApplications}
                      onChange={e => setNewJob({ ...newJob, maxApplications: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <button type="submit" className="cp-btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}>
                  🚀 Publish Job to Central Central Database
                </button>
              </div>
            </form>
          </div>
        )}

        {/* APPLICANT ATS TAB */}
        {activeTab === 'applicants' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'white' }}>Applicant Tracking System (ATS)</h2>
                <p style={{ margin: '0.2rem 0 0', color: '#9ca3af', fontSize: '0.85rem' }}>
                  Manage candidate applications with two-way status synchronization.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                <input 
                  type="text" 
                  className="cp-input" 
                  placeholder="Search candidate..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '220px', padding: '0.5rem 0.8rem' }}
                />

                <select 
                  className="cp-select" 
                  value={applicantFilter}
                  onChange={e => setApplicantFilter(e.target.value)}
                  style={{ padding: '0.5rem 0.8rem' }}
                >
                  <option value="all">All Statuses</option>
                  <option value="applied">Applied</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="interview">Interview Scheduled</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="cp-table-container">
              <table className="cp-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>AI Match</th>
                    <th>Apply Mode</th>
                    <th>Status</th>
                    <th>Applied Date</th>
                    <th>Recruiter Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplicants.map((app, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>{app.candidateName}</div>
                        <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{app.candidateEmail}</div>
                      </td>
                      <td>
                        <span className={`cp-match-pill ${app.matchScore >= 90 ? 'cp-match-high' : 'cp-match-mid'}`}>
                          <Sparkles size={13} /> {app.matchScore}% Match
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.06)', padding: '0.25rem 0.55rem', borderRadius: '6px' }}>
                          {app.mode || 'Auto'} Mode
                        </span>
                      </td>
                      <td>
                        <span className={`cp-status-badge cp-status-${(app.status || 'applied').toLowerCase()}`}>
                          {app.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                        {new Date(app.appliedAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button 
                            className="cp-btn-secondary" 
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                            onClick={() => setSelectedApplicant(app)}
                          >
                            <Eye size={13} /> View
                          </button>
                          
                          <button 
                            className="cp-btn-primary" 
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', background: '#10b981' }}
                            onClick={() => handleUpdateStatus(app.id, 'Shortlisted')}
                          >
                            Shortlist
                          </button>

                          <button 
                            className="cp-btn-secondary" 
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fbbf24' }}
                            onClick={() => {
                              setInterviewApplicant(app);
                              setShowInterviewModal(true);
                            }}
                          >
                            Interview
                          </button>

                          <button 
                            className="cp-btn-secondary" 
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.78rem', color: '#ef4444' }}
                            onClick={() => handleUpdateStatus(app.id, 'Rejected')}
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ACTIVE JOBS TAB */}
        {activeTab === 'jobs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'white' }}>Active Posted Jobs</h2>
              <button className="cp-btn-primary" onClick={() => setActiveTab('post-job')}>+ Post New Job</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {(jobs.length > 0 ? jobs : [
                {
                  id: 'j001',
                  title: 'Senior Frontend Engineer',
                  companyName: company.name,
                  location: 'Bengaluru, India',
                  jobType: 'Full-time',
                  remote: 'Hybrid',
                  salary: '₹25L–₹40L/yr',
                  skills: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
                  status: 'ACTIVE'
                },
                {
                  id: 'j002',
                  title: 'Python & AI Engineer',
                  companyName: company.name,
                  location: 'Remote',
                  jobType: 'Full-time',
                  remote: 'Remote',
                  salary: '₹18L–₹30L/yr',
                  skills: ['Python', 'FastAPI', 'Docker', 'PostgreSQL'],
                  status: 'ACTIVE'
                }
              ]).map((j, i) => (
                <div key={i} className="cp-form-card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white' }}>{j.title}</h3>
                    <span className="cp-badge-verified" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>{j.status}</span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#9ca3af', margin: '0.5rem 0 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
                    <span><MapPin size={13} /> {j.location}</span>
                    <span><Briefcase size={13} /> {j.jobType}</span>
                    <span><DollarSign size={13} /> {j.salary}</span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
                    {j.skills && j.skills.map((s: string, idx: number) => (
                      <span key={idx} style={{ background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', color: '#d1d5db' }}>
                        {s}
                      </span>
                    ))}
                  </div>

                  <button 
                    className="cp-btn-secondary" 
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => {
                      setSelectedJobId(j.id);
                      setActiveTab('applicants');
                    }}
                  >
                    View Applicants ({displayApplicants.length}) →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI CANDIDATE RANKING TAB */}
        {activeTab === 'rankings' && (
          <div className="cp-form-card">
            <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles style={{ color: '#8b5cf6' }} /> AI Recruiter Candidate Ranking
            </h2>
            <p style={{ margin: '0.3rem 0 1.5rem', color: '#9ca3af', fontSize: '0.88rem' }}>
              CVMind's AI matching engine evaluates candidate profiles against your posted job requirements to rank top talent automatically.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {displayApplicants.map((cand, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--cp-border)', borderRadius: '14px', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white' }}>
                      #{i + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'white', fontSize: '1rem' }}>{cand.candidateName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{cand.matchReasoning}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="cp-match-pill cp-match-high" style={{ fontSize: '0.9rem' }}>
                      <Sparkles size={14} /> {cand.matchScore}% AI Match
                    </span>
                    <button className="cp-btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }} onClick={() => handleUpdateStatus(cand.id, 'Shortlisted')}>
                      Shortlist Candidate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* CANDIDATE PROFILE MODAL */}
      {selectedApplicant && (
        <div className="cp-modal-overlay" onClick={() => setSelectedApplicant(null)}>
          <div className="cp-modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--cp-border)', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'white' }}>{selectedApplicant.candidateName}</h3>
                <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>{selectedApplicant.candidateEmail} • {selectedApplicant.candidatePhone || 'Verified Candidate'}</div>
              </div>
              <span className="cp-match-pill cp-match-high" style={{ fontSize: '1rem' }}>
                <Sparkles size={16} /> {selectedApplicant.matchScore}% Match
              </span>
            </div>

            {/* Match Breakdown Card */}
            <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '1.25rem', borderRadius: '14px', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem', color: '#60a5fa' }}>AI Candidate Match Analysis</h4>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#d1d5db' }}>{selectedApplicant.matchReasoning}</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginTop: '1rem', textAlign: 'center' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Skills</div>
                  <div style={{ fontWeight: 700, color: '#34d399' }}>{selectedApplicant.matchBreakdown?.skills || 95}%</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Education</div>
                  <div style={{ fontWeight: 700, color: '#34d399' }}>{selectedApplicant.matchBreakdown?.education || 100}%</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Experience</div>
                  <div style={{ fontWeight: 700, color: '#34d399' }}>{selectedApplicant.matchBreakdown?.experience || 90}%</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Location</div>
                  <div style={{ fontWeight: 700, color: '#34d399' }}>{selectedApplicant.matchBreakdown?.location || 100}%</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Preferences</div>
                  <div style={{ fontWeight: 700, color: '#34d399' }}>{selectedApplicant.matchBreakdown?.preferences || 92}%</div>
                </div>
              </div>
            </div>

            {/* Resume Summary */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem', color: 'white' }}>Candidate Profile & Highlights</h4>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '10px', fontSize: '0.88rem', color: '#e5e7eb', lineHeight: 1.6 }}>
                {selectedApplicant.resumeText || 'Candidate has submitted a verified profile matching python backend engineering criteria.'}
              </div>
            </div>

            {/* Cover Letter if present */}
            {selectedApplicant.coverLetter && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem', color: 'white' }}>Cover Letter</h4>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '10px', fontSize: '0.85rem', color: '#d1d5db', fontStyle: 'italic' }}>
                  "{selectedApplicant.coverLetter}"
                </div>
              </div>
            )}

            {/* Recruiter Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="cp-btn-secondary" onClick={() => setSelectedApplicant(null)}>Close</button>
              <button className="cp-btn-primary" style={{ background: '#10b981' }} onClick={() => handleUpdateStatus(selectedApplicant.id, 'Shortlisted')}>
                Shortlist Candidate
              </button>
              <button 
                className="cp-btn-primary" 
                style={{ background: '#f59e0b' }} 
                onClick={() => {
                  setInterviewApplicant(selectedApplicant);
                  setSelectedApplicant(null);
                  setShowInterviewModal(true);
                }}
              >
                Schedule Interview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERVIEW SCHEDULER MODAL */}
      {showInterviewModal && (
        <div className="cp-modal-overlay" onClick={() => setShowInterviewModal(false)}>
          <div className="cp-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <h3 style={{ margin: '0 0 0.4rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar style={{ color: '#f59e0b' }} /> Schedule Interview with {interviewApplicant?.candidateName}
            </h3>
            <p style={{ margin: '0 0 1.25rem', color: '#9ca3af', fontSize: '0.85rem' }}>
              Scheduling an interview automatically updates the candidate's application tracker and unlocks AI Interview Prep for the candidate.
            </p>

            {interviewSuccess && (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '0.85rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {interviewSuccess}
              </div>
            )}

            <form onSubmit={handleScheduleInterview}>
              <div className="cp-input-group" style={{ marginBottom: '1rem' }}>
                <label>Interview Date</label>
                <input type="date" className="cp-input" value={interviewDate} onChange={e => setInterviewDate(e.target.value)} required />
              </div>

              <div className="cp-input-group" style={{ marginBottom: '1rem' }}>
                <label>Time (IST)</label>
                <input type="time" className="cp-input" value={interviewTime} onChange={e => setInterviewTime(e.target.value)} required />
              </div>

              <div className="cp-input-group" style={{ marginBottom: '1rem' }}>
                <label>Interview Stage / Type</label>
                <select className="cp-select" value={interviewType} onChange={e => setInterviewType(e.target.value)}>
                  <option value="Technical Interview">Technical Interview</option>
                  <option value="System Design Round">System Design Round</option>
                  <option value="HR & Cultural Fit">HR & Cultural Fit</option>
                  <option value="Final Managerial Round">Final Managerial Round</option>
                </select>
              </div>

              <div className="cp-input-group" style={{ marginBottom: '1rem' }}>
                <label>Video Meeting Link</label>
                <input type="text" className="cp-input" value={interviewLink} onChange={e => setInterviewLink(e.target.value)} placeholder="https://meet.google.com/..." required />
              </div>

              <div className="cp-input-group" style={{ marginBottom: '1.5rem' }}>
                <label>Notes for Candidate</label>
                <textarea className="cp-textarea" rows={3} value={interviewNotes} onChange={e => setInterviewNotes(e.target.value)} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="cp-btn-secondary" onClick={() => setShowInterviewModal(false)}>Cancel</button>
                <button type="submit" className="cp-btn-primary" style={{ background: '#f59e0b' }}>
                  Confirm & Notify Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
