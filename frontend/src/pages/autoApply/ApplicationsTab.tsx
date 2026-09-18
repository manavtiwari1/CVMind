import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, Link2, FileText, Plus, RefreshCw, Trash2, Briefcase, Pencil, Upload, X } from 'lucide-react';
import type { AgentApplication, ApplicationEventItem, ApplicationStatus, ResumeProfile } from '../../types/agent';
import {
  ApiError, createApplication, listApplications, listApplicationEvents, decideApplication,
  rescoreApplication, deleteApplication, listResumes, uploadResume, RESUME_FILE_TYPES
} from '../../lib/agentApi';
import ScoreCard from './ScoreCard';
import EventTimeline from './EventTimeline';
import TailoredPreview from './TailoredPreview';
import ReviewPanel from './ReviewPanel';
import './ResumeTab.css';
import './ApplicationsTab.css';

const POLL_MS = 3000;
const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'In progress',
  matched: 'Scored',
  tailoring: 'Tailoring',
  ready_for_review: 'Ready for review',
  submitted: 'Submitted',
  failed: 'Failed'
};
const PROGRESS_LABELS: Record<string, string> = {
  parsing_job: 'Reading the job posting…',
  scoring: 'Comparing the job with your resume…',
  tailoring_resume: 'Tailoring your resume for this job…',
  writing_cover_letter: 'Writing your cover letter…',
  rendering_pdf: 'Creating your PDF…',
  filling: 'Opening the application and filling it…',
  submitting: 'Submitting your application…'
};
const IN_PROGRESS: ApplicationStatus[] = ['pending', 'tailoring'];
// These run while the status stays ready_for_review, so polling follows the step instead
const IN_PROGRESS_STEPS = ['filling', 'submitting'];

const jobTitle = (application: AgentApplication) =>
  application.job?.title || (application.status === 'pending' ? 'Reading job…' : 'Untitled role');

export default function ApplicationsTab({ onEditResume }: { onEditResume?: (resumeId: string) => void } = {}) {
  const [applications, setApplications] = useState<AgentApplication[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [resumes, setResumes] = useState<ResumeProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [eventsState, setEventsState] = useState<{ applicationId: string; items: ApplicationEventItem[] } | null>(null);
  const [inputMode, setInputMode] = useState<'url' | 'description'>('url');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [resumeId, setResumeId] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [changingResume, setChangingResume] = useState(false);
  const resumeFileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const applyList = useCallback((data: AgentApplication[]) => {
    setApplications(data);
    setLoaded(true);
    setSelectedId(current => (current && data.some(a => a.id === current) ? current : data[0]?.id ?? null));
  }, []);

  const refresh = useCallback(async () => applyList(await listApplications()), [applyList]);
  // Parsing resumes are usable too: scoring waits until they are ready
  const loadResumes = useCallback(() => listResumes().then(list => setResumes(list.filter(r => r.status !== 'failed'))).catch(() => {}), []);

  useEffect(() => {
    listApplications().then(applyList).catch(e => { setError(e.message); setLoaded(true); });
    loadResumes();
  }, [applyList, loadResumes]);

  const inFlight = applications.some(a => IN_PROGRESS.includes(a.status) || IN_PROGRESS_STEPS.includes(a.progress?.step ?? ''));
  useEffect(() => {
    if (!inFlight) return;
    const timer = setInterval(() => { refresh().catch(() => {}); }, POLL_MS);
    return () => clearInterval(timer);
  }, [inFlight, refresh]);

  const selected = applications.find(a => a.id === selectedId) || null;
  const selectedUpdatedAt = selected?.updatedAt;
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    listApplicationEvents(selectedId)
      .then(items => { if (!cancelled) setEventsState({ applicationId: selectedId, items }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedId, selectedUpdatedAt]);
  const events = eventsState?.applicationId === selectedId ? eventsState.items : [];

  const run = async (label: string, action: () => Promise<void>) => {
    setBusy(label); setError(''); setNotice('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy('');
    }
  };

  const replaceApplication = (updated: AgentApplication) =>
    setApplications(list => list.map(a => (a.id === updated.id ? updated : a)));

  const onAdd = () => run('add', async () => {
    try {
      // Nothing chosen: the backend uses the dashboard resume (default, or the latest one saved in CVMind)
      const chosenId = resumeFile ? (await uploadResume(resumeFile)).data.id : resumeId;
      const created = await createApplication({
        ...(inputMode === 'url' ? { url: url.trim() } : { description: description.trim() }),
        ...(chosenId ? { resumeProfileId: chosenId } : {})
      });
      setUrl('');
      setDescription('');
      resetToDashboardResume();
      await Promise.all([refresh(), loadResumes()]);
      setSelectedId(created.id);
      setNotice(resumeFile
        ? 'Job added with the resume you uploaded. The agent is reading both and scoring your fit.'
        : 'Job added. The agent is reading it and scoring your fit.');
    } catch (e) {
      const existing = e instanceof ApiError && e.code === 'ALREADY_ADDED' ? (e.details as AgentApplication | undefined) : undefined;
      if (!existing?.id) throw e;
      setSelectedId(existing.id);
      setNotice('You already added this job, so we opened it.');
    }
  });

  const resetToDashboardResume = () => {
    setResumeId('');
    setResumeFile(null);
    setChangingResume(false);
  };

  const onDecide = (application: AgentApplication, action: 'approve' | 'skip', overrideGates: boolean) => run('decide', async () => {
    replaceApplication(await decideApplication(application.id, { action, overrideGates }));
  });

  const onRescore = (application: AgentApplication) => run('rescore', async () => {
    replaceApplication(await rescoreApplication(application.id));
    setNotice('Re-scoring with your latest resume and preferences.');
  });

  const onDelete = (application: AgentApplication) => {
    if (!window.confirm(`Remove "${jobTitle(application)}" from your applications?`)) return;
    run('delete', async () => {
      await deleteApplication(application.id);
      await refresh();
    });
  };

  const defaultResume = resumes.find(r => r.isDefault) ?? resumes.find(r => r.status === 'ready') ?? resumes[0] ?? null;
  const chosenResume = resumeId ? resumes.find(r => r.id === resumeId) ?? null : defaultResume;
  const canSubmit = !busy && (inputMode === 'url' ? url.trim().length > 0 : description.trim().length > 0);

  const renderDetail = (application: AgentApplication) => {
    const job = application.job;
    return (
      <>
        <div className="aa-resume-detail-head">
          <div>
            <h2 className="aa-resume-detail-title">{jobTitle(application)}</h2>
            <p className="aa-label-hint">
              {[job?.company, job?.location, job?.workMode && job.workMode !== 'unknown' ? job.workMode : ''].filter(Boolean).join(' · ') || 'Job details will appear once the posting is read.'}
            </p>
          </div>
          <div className="aa-resume-actions">
            {job?.applyUrl && (
              <a className="aa-btn-ghost aa-btn-sm" href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} /> Open posting
              </a>
            )}
            <button className="aa-btn-ghost aa-btn-sm aa-resume-danger" disabled={!!busy} onClick={() => onDelete(application)}>
              <Trash2 size={14} /> Remove
            </button>
          </div>
        </div>

        {(IN_PROGRESS.includes(application.status) || IN_PROGRESS_STEPS.includes(application.progress?.step ?? '')) && (
          <div className="aa-empty">
            <RefreshCw size={28} className="aa-spin" />
            <p>{PROGRESS_LABELS[application.progress?.step ?? ''] ?? 'Working on it…'}</p>
          </div>
        )}

        {application.status === 'failed' && (
          <div className="aa-error">
            <AlertCircle size={16} /> {application.error?.message || 'Something went wrong with this job.'}
            <button className="aa-btn-ghost aa-btn-sm" disabled={!!busy} onClick={() => onRescore(application)}>Try again</button>
          </div>
        )}

        {application.score && (
          <ScoreCard
            key={application.id}
            application={application}
            busy={!!busy}
            onDecide={(action, overrideGates) => onDecide(application, action, overrideGates)}
            onRescore={() => onRescore(application)}
          />
        )}

        {application.tailored && ['ready_for_review', 'submitted'].includes(application.status) && (
          <TailoredPreview
            key={application.id}
            application={application}
            busy={!!busy}
            onSubmitted={replaceApplication}
          />
        )}

        {['ready_for_review', 'submitted'].includes(application.status) && (application.tailored || application.fill) && (
          <ReviewPanel
            key={application.id}
            application={application}
            busy={!!busy}
            onChanged={replaceApplication}
          />
        )}

        {job?.status === 'ready' && job.requirements && (
          <section className="aa-app-requirements">
            <h4 className="aa-score-subtitle">What the job asks for</h4>
            <ul>
              {job.requirements.minYearsExperience !== null && <li>{job.requirements.minYearsExperience}+ years of experience</li>}
              {job.requirements.educationLevel && <li>Education: {job.requirements.educationLevel.replace('_', ' ')}</li>}
              {!!job.requirements.mustHaveSkills.length && <li>Required skills: {job.requirements.mustHaveSkills.join(', ')}</li>}
              {!!job.requirements.niceToHaveSkills.length && <li>Nice to have: {job.requirements.niceToHaveSkills.join(', ')}</li>}
            </ul>
            {!!job.responsibilities.length && (
              <>
                <h4 className="aa-score-subtitle">Responsibilities</h4>
                <ul>{job.responsibilities.map((item, i) => <li key={i}>{item.text}</li>)}</ul>
              </>
            )}
          </section>
        )}

        <EventTimeline events={events} />
      </>
    );
  };

  return (
    <div className="aa-resume-tab">
      <div className="aa-resume-header">
        <div>
          <h1 className="aa-agent-tab-title">Agent applications</h1>
          <p className="aa-profile-hub-desc">Paste a job link or description. The agent reads the posting, checks the hard requirements and scores how well your resume fits before you decide to apply.</p>
        </div>
      </div>

      {error && <div className="aa-error"><AlertCircle size={16} /> {error}</div>}
      {notice && <div className="aa-resume-notice"><CheckCircle2 size={16} /> {notice}</div>}

      <form className="aa-app-form" onSubmit={e => { e.preventDefault(); if (canSubmit) onAdd(); }}>
        <div className="aa-app-toggle" role="tablist" aria-label="How to add a job">
          <button type="button" role="tab" aria-selected={inputMode === 'url'} className={inputMode === 'url' ? 'active' : ''} onClick={() => setInputMode('url')}>
            <Link2 size={14} /> Job link
          </button>
          <button type="button" role="tab" aria-selected={inputMode === 'description'} className={inputMode === 'description' ? 'active' : ''} onClick={() => setInputMode('description')}>
            <FileText size={14} /> Paste description
          </button>
        </div>
        {inputMode === 'url' ? (
          <input className="aa-input" type="url" value={url} placeholder="https://boards.greenhouse.io/company/jobs/123" onChange={e => setUrl(e.target.value)} />
        ) : (
          <textarea className="aa-input" rows={6} value={description} placeholder="Paste the full job posting, including requirements and responsibilities" onChange={e => setDescription(e.target.value)} />
        )}
        <div className="aa-app-resume">
          <div className="aa-app-resume-summary">
            <span className="aa-label">Resume for this job</span>
            {resumeFile ? (
              <strong>{resumeFile.name} <span className="aa-app-resume-meta">· new upload</span></strong>
            ) : chosenResume ? (
              <strong>
                {chosenResume.label}
                <span className="aa-app-resume-meta">
                  {chosenResume.structured?.headline ? ` · ${chosenResume.structured.headline}` : ''}
                  {chosenResume.isDefault ? ' · dashboard resume' : ''}
                  {chosenResume.status !== 'ready' ? ' · still reading' : ''}
                </span>
              </strong>
            ) : (
              <strong>Your latest resume from your CVMind dashboard</strong>
            )}
          </div>
          <div className="aa-app-resume-actions">
            {chosenResume && !resumeFile && onEditResume && (
              <button type="button" className="aa-btn-ghost aa-btn-sm" disabled={!!busy} onClick={() => onEditResume(chosenResume.id)}>
                <Pencil size={14} /> Edit
              </button>
            )}
            <button type="button" className="aa-btn-ghost aa-btn-sm" disabled={!!busy} onClick={() => (changingResume ? resetToDashboardResume() : setChangingResume(true))}>
              {changingResume ? <><X size={14} /> Use dashboard resume</> : 'Change'}
            </button>
          </div>
          {changingResume && (
            <div className="aa-app-resume-change">
              {resumes.length > 0 && (
                <select className="aa-input" value={resumeFile ? '' : resumeId} disabled={!!resumeFile} onChange={e => setResumeId(e.target.value)}>
                  <option value="">Dashboard resume{defaultResume ? ` (${defaultResume.label})` : ''}</option>
                  {resumes.filter(r => r.id !== defaultResume?.id).map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              )}
              <input ref={resumeFileRef} type="file" hidden accept={RESUME_FILE_TYPES} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) setResumeFile(file); }} />
              {resumeFile ? (
                <button type="button" className="aa-btn-ghost aa-btn-sm" disabled={!!busy} onClick={() => setResumeFile(null)}><X size={14} /> Remove upload</button>
              ) : (
                <button type="button" className="aa-btn-ghost aa-btn-sm" disabled={!!busy} onClick={() => resumeFileRef.current?.click()}><Upload size={14} /> Upload a different resume</button>
              )}
            </div>
          )}
        </div>
        <div className="aa-app-form-row">
          <button type="submit" className="aa-btn-primary" disabled={!canSubmit}>
            {busy === 'add' ? <RefreshCw size={15} className="aa-spin" /> : <Plus size={15} />} Add &amp; score
          </button>
        </div>
      </form>

      {!loaded ? (
        <div className="aa-empty"><RefreshCw size={28} className="aa-spin" /></div>
      ) : applications.length === 0 ? (
        <div className="aa-empty">
          <Briefcase size={36} />
          <p>No jobs yet. Add a job above to see how well you fit.</p>
        </div>
      ) : (
        <div className="aa-resume-layout">
          <ul className="aa-resume-list">
            {applications.map(application => (
              <li key={application.id}>
                <button className={`aa-resume-item ${application.id === selectedId ? 'active' : ''}`} onClick={() => setSelectedId(application.id)}>
                  <span className="aa-resume-item-label">{jobTitle(application)}</span>
                  <span className="aa-resume-item-meta">
                    <span className={`aa-app-status is-${application.status}`}>{STATUS_LABELS[application.status]}</span>
                    {application.job?.company}
                    {application.score && <span className="aa-app-score">{application.score.total}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <section className="aa-resume-detail">{selected && renderDetail(selected)}</section>
        </div>
      )}
    </div>
  );
}
