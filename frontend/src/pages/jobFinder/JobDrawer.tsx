import { useEffect, useState } from 'react';
import { Bot, CheckCircle2, ExternalLink, Loader2, Lock, MapPin, Send, Wand2, X } from 'lucide-react';
import CompanyLogo from './CompanyLogo';
import { MatchBadge } from './JobCard';
import { appliedOn, postedAgo, SOURCE_LABEL } from './format';
import { getJob, type FinderJob, type JobMatch } from './jobFinderApi';
import { saveTailorJob } from '../../lib/tailorHandoff';
import { urlForPage } from '../../lib/hosts';
import { getErrorMessage } from '../../utils/errors';

interface JobDrawerProps {
  job: FinderJob;
  onClose: () => void;
  onApply: (job: FinderJob) => void;
}

export default function JobDrawer({ job, onClose, onApply }: JobDrawerProps) {
  // Loaded detail, kept with the job it belongs to so switching jobs never shows the previous one
  const [loaded, setLoaded] = useState<{ jobKey: string; description?: string; match?: JobMatch; error?: string } | null>(null);
  const current = loaded?.jobKey === job.jobKey ? loaded : null;
  const detail = current?.match ? { description: current.description || '', match: current.match } : null;
  const error = current?.error || '';

  useEffect(() => {
    let live = true;
    getJob(job.jobKey)
      .then((res) => { if (live) setLoaded({ jobKey: job.jobKey, description: res.job.description, match: res.match }); })
      .catch((err) => { if (live) setLoaded({ jobKey: job.jobKey, error: getErrorMessage(err) || 'Could not load this job.' }); });
    return () => { live = false; };
  }, [job.jobKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const match = detail?.match || job.match;
  const via = SOURCE_LABEL[job.source] || (job.publisher ? `Listed on ${job.publisher}` : '');

  const tailor = () => {
    saveTailorJob(`${job.title} at ${job.company}\n\n${detail?.description || job.snippet}`);
    window.open(urlForPage('tailor'), '_blank', 'noopener,noreferrer');
  };

  return (
    <aside className="jf-drawer" aria-label={`${job.title} at ${job.company}`}>
      <div className="jf-drawer-head">
        <CompanyLogo key={job.jobKey} company={job.company} logo={job.companyLogo} domain={job.companyDomain} size={52} />
        <div className="jf-drawer-titles">
          <h2>{job.title}</h2>
          <p>{job.company}</p>
          <p className="jf-drawer-meta">
            {(job.location || job.remote) && <span><MapPin size={13} /> {job.location || 'Remote'}</span>}
            {job.employmentType && <span>{job.employmentType}</span>}
            {postedAgo(job.postedAt) && <span>Posted {postedAgo(job.postedAt).toLowerCase()}</span>}
            {via && <span>{via}</span>}
          </p>
        </div>
        <button type="button" className="jf-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
      </div>

      <div className="jf-drawer-actions">
        <button type="button" className={`jf-btn ${job.appliedAt ? 'jf-btn--ghost' : 'jf-btn--primary'}`} onClick={() => onApply(job)}>
          {job.appliesInCvmind
            ? <><Send size={15} /> {job.appliedAt ? 'Applied' : 'Apply on CVMind'}</>
            : <>{job.appliedAt ? 'Open the application again' : 'Apply on company site'} <ExternalLink size={15} /></>}
        </button>
        <button type="button" className="jf-btn jf-btn--ghost" onClick={tailor}>
          <Wand2 size={15} /> Tailor my resume for this job
        </button>
        <button type="button" className="jf-btn jf-btn--locked" disabled title="Auto Apply is coming soon">
          <Bot size={15} /> Apply with Auto Apply <span className="jf-soon"><Lock size={11} /> Coming soon</span>
        </button>
        {job.appliedAt && (
          <p className="jf-drawer-applied"><CheckCircle2 size={15} /> You applied to this job on {appliedOn(job.appliedAt)}.</p>
        )}
      </div>

      <section className="jf-drawer-section">
        <div className="jf-drawer-match">
          <MatchBadge score={match?.score} large />
          <div>
            <h3>How you match</h3>
            <p>Skills named in the posting compared with your resume, plus the role, level and place you asked for.</p>
          </div>
        </div>
        {!!match?.matchedSkills.length && (
          <div className="jf-chip-group">
            <span className="jf-chip-label">You have</span>
            {match.matchedSkills.map((s) => <span key={s} className="jf-chip jf-chip--ok">{s}</span>)}
          </div>
        )}
        {!!match?.missingSkills.length && (
          <div className="jf-chip-group">
            <span className="jf-chip-label">Not on your resume</span>
            {match.missingSkills.map((s) => <span key={s} className="jf-chip jf-chip--miss">{s}</span>)}
          </div>
        )}
        {match && !match.matchedSkills.length && !match.missingSkills.length && (
          <p className="jf-muted">This posting doesn't name skills we can compare.</p>
        )}
      </section>

      <section className="jf-drawer-section">
        <h3>About the job</h3>
        {error && <p className="jf-error">{error}</p>}
        {!detail && !error && <p className="jf-muted"><Loader2 size={15} className="jf-spin" /> Loading the full description…</p>}
        {detail && (detail.description
          ? <div className="jf-description">{detail.description}</div>
          : <p className="jf-muted">The full description is on the company's page.</p>)}
      </section>
    </aside>
  );
}
