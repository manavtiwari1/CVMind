import { CheckCircle2, ExternalLink, MapPin, Send } from 'lucide-react';
import CompanyLogo from './CompanyLogo';
import { appliedShort, postedAgo, scoreTone, SOURCE_LABEL } from './format';
import type { FinderJob } from './jobFinderApi';

interface JobCardProps {
  job: FinderJob;
  selected: boolean;
  onOpen: () => void;
  onApply: () => void;
}

export function MatchBadge({ score, large = false }: { score: number | null | undefined; large?: boolean }) {
  const tone = scoreTone(score);
  if (tone === 'none') return <span className={`jf-match jf-match--none${large ? ' jf-match--lg' : ''}`} title="Not enough in the posting to score it">—</span>;
  return (
    <span className={`jf-match jf-match--${tone}${large ? ' jf-match--lg' : ''}`} title="How well this job fits your resume and preferences">
      <b>{score}%</b>
      <small>match</small>
    </span>
  );
}

export default function JobCard({ job, selected, onOpen, onApply }: JobCardProps) {
  const matched = job.match?.matchedSkills.length || 0;
  const missing = job.match?.missingSkills.length || 0;
  const via = SOURCE_LABEL[job.source] || (job.publisher ? `via ${job.publisher}` : '');

  return (
    <article className={`jf-card${selected ? ' is-selected' : ''}`}>
      <button type="button" className="jf-card-main" onClick={onOpen}>
        <CompanyLogo key={job.jobKey} company={job.company} logo={job.companyLogo} domain={job.companyDomain} />
        <span className="jf-card-body">
          <span className="jf-card-title">{job.title}</span>
          <span className="jf-card-company">{job.company}</span>
          <span className="jf-card-meta">
            {(job.location || job.remote) && <span><MapPin size={13} /> {job.location || 'Remote'}</span>}
            {job.remote && job.location !== 'Remote' && <span className="jf-tag">Remote</span>}
            {job.employmentType && <span className="jf-tag">{job.employmentType}</span>}
            {postedAgo(job.postedAt) && <span>{postedAgo(job.postedAt)}</span>}
          </span>
          {(matched > 0 || missing > 0) && (
            <span className="jf-card-skills">
              {matched > 0 && <span className="jf-skill-count jf-skill-count--ok">{matched} skill{matched === 1 ? '' : 's'} match</span>}
              {missing > 0 && <span className="jf-skill-count">{missing} missing</span>}
            </span>
          )}
          {via && <span className="jf-card-via">{via}</span>}
        </span>
        <MatchBadge score={job.match?.score} />
      </button>
      <div className="jf-card-actions">
        {job.appliedAt && (
          <span className="jf-applied"><CheckCircle2 size={14} /> Applied · {appliedShort(job.appliedAt)}</span>
        )}
        <button type="button" className={`jf-btn ${job.appliedAt ? 'jf-btn--ghost' : 'jf-btn--primary'} jf-btn--sm`} onClick={onApply}>
          {job.appliesInCvmind ? <><Send size={14} /> {job.appliedAt ? 'Applied' : 'Apply on CVMind'}</> : <>{job.appliedAt ? 'Open again' : 'Apply'} <ExternalLink size={14} /></>}
        </button>
      </div>
    </article>
  );
}
