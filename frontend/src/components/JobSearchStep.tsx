import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowUpRight, Briefcase, Clock, CornerDownLeft, Loader2, MapPin, Search, Target, X } from 'lucide-react';
import { API_BASE } from '../lib/apiBase';
import { getErrorMessage } from '../utils/errors';

export interface LiveJob {
  id: string;
  source: 'greenhouse' | 'lever';
  title: string;
  company: string;
  domain: string;
  location: string;
  remote: boolean;
  team: string;
  type: string;
  postedAt: string | null;
  url: string;
}

interface JobSearchStepProps {
  onSkip: () => void;
  onTarget: (job: LiveJob) => void;
}

const SUGGESTIONS = ['Software Engineer', 'Product Manager', 'Data Analyst', 'Product Designer', 'Marketing', 'Frontend Developer'];

const ago = (iso: string | null) => {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days < 14 ? '' : 's'} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${days < 60 ? '' : 's'} ago`;
  return 'Over a year ago';
};

/** Company logo from its website's icon, falling back to the first letter. */
function Logo({ job, size = 40 }: { job: LiveJob; size?: number }) {
  const [failed, setFailed] = useState(false);
  const letter = job.company.trim().charAt(0).toUpperCase() || '?';
  return (
    <span className="js-logo" style={{ width: size, height: size }}>
      {!failed && job.domain
        ? <img src={`https://www.google.com/s2/favicons?domain=${job.domain}&sz=128`} alt="" onError={() => setFailed(true)} />
        : letter}
    </span>
  );
}

/** Turns plain job-board text into headings, paragraphs and bullet lists. */
function Description({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) { blocks.push(<ul key={`l${blocks.length}`}>{list.map((li, i) => <li key={i}>{li}</li>)}</ul>); list = []; } };
  text.split(/\n+/).map(l => l.trim()).filter(Boolean).slice(0, 80).forEach((line, i) => {
    const bullet = /^[•\-*–·]\s*/.exec(line);
    if (bullet) { list.push(line.slice(bullet[0].length)); return; }
    flush();
    const heading = line.length < 70 && (/:$/.test(line) || (line === line.toUpperCase() && /[A-Z]/.test(line)) || /^(about|what|who|why|how|your|you|responsibilities|requirements|qualifications|benefits|perks|the role|the team)\b/i.test(line) && line.split(' ').length <= 8);
    blocks.push(heading ? <h4 key={i}>{line.replace(/:$/, '')}</h4> : <p key={i}>{line}</p>);
  });
  flush();
  return <div className="js-desc">{blocks}</div>;
}

export default function JobSearchStep({ onSkip, onTarget }: JobSearchStepProps) {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');
  const [jobs, setJobs] = useState<LiveJob[] | null>(null);
  const [total, setTotal] = useState(0);
  const [companies, setCompanies] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  // Description of the selected job, keyed by job id so a stale response is never shown.
  const [detail, setDetail] = useState<{ id: string; text: string; error: string } | null>(null);
  const reqId = useRef(0);
  const detailPane = useRef<HTMLElement>(null);

  const runSearch = async (raw: string = query) => {
    const q = raw.trim();
    if (q.length < 2) return;
    const my = ++reqId.current;
    setSearching(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/jobs/search?q=${encodeURIComponent(q)}`);
      const body = await res.json();
      if (my !== reqId.current) return;
      if (!res.ok || !body.success) throw new Error(body.error || 'Could not load jobs.');
      setJobs(body.jobs || []);
      setTotal(body.total || 0);
      setCompanies(body.companies || []);
      setSearched(q);
      setSelectedId(body.jobs?.[0]?.id ?? null);
    } catch (err) {
      if (my !== reqId.current) return;
      setJobs(null);
      setError(getErrorMessage(err) || 'Could not load jobs. Please try again.');
    } finally {
      if (my === reqId.current) setSearching(false);
    }
  };

  // Search as the user types (after a short pause).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3 || q === searched) return;
    const t = setTimeout(() => runSearch(q), 600);
    return () => clearTimeout(t);
    // runSearch reads the latest query itself
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const selected = jobs?.find(j => j.id === selectedId) || null;

  // Load the full description for the selected job.
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    fetch(`${API_BASE}/api/jobs/detail?id=${encodeURIComponent(selected.id)}`)
      .then(r => r.json().then(b => ({ ok: r.ok, b })))
      .then(({ ok, b }) => {
        if (cancelled) return;
        if (!ok) throw new Error(b.error || 'Could not load this job.');
        setDetail({ id: selected.id, text: b.description || '', error: '' });
      })
      .catch(err => { if (!cancelled) setDetail({ id: selected.id, text: '', error: getErrorMessage(err) || 'Could not load this job.' }); });
    detailPane.current?.scrollTo({ top: 0 });
    return () => { cancelled = true; };
  }, [selected]);

  const clear = () => { reqId.current++; setQuery(''); setSearched(''); setJobs(null); setSelectedId(null); setError(''); setSearching(false); };
  const pick = (s: string) => { setQuery(s); runSearch(s); };
  const current = detail && selected && detail.id === selected.id ? detail : null;
  const detailText = current ? current.text : null;
  const detailError = current?.error || '';

  return (
    <div className="ro-job">
      <h1 className="ro-title">What job do you want next?</h1>
      <p className="ro-sub">Search real openings, pick the job you want, and we'll tailor your resume to it.</p>

      <form className="ro-search" onSubmit={e => { e.preventDefault(); runSearch(); }} role="search">
        <Search size={16} className="ro-search-icon" aria-hidden="true" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Job title, skill or company, e.g. Product Designer Bangalore" aria-label="Search jobs" autoFocus />
        {query && <button type="button" className="ro-icon-btn" onClick={clear} aria-label="Clear search"><X size={15} /></button>}
        <button type="submit" className="ro-go" disabled={query.trim().length < 2 || searching} aria-label="Search">
          {searching ? <Loader2 size={15} className="ro-spin" /> : <CornerDownLeft size={15} />}
        </button>
      </form>

      {!jobs && !searching && (
        <div className="js-chips" aria-label="Popular searches">
          {SUGGESTIONS.map(s => <button key={s} type="button" onClick={() => pick(s)}>{s}</button>)}
        </div>
      )}

      <div className="ro-actions">
        <button type="button" className="ro-link" onClick={onSkip}>Skip this step</button>
        {jobs && jobs.length > 0 ? (
          <button type="button" className="ro-btn ro-btn--green" disabled={!selected} onClick={() => selected && onTarget(selected)}>
            <Target size={15} /> Target this job
          </button>
        ) : (
          <button type="button" className="ro-btn ro-btn--green" disabled={query.trim().length < 2 || searching} onClick={() => runSearch()}>
            {searching ? <Loader2 size={15} className="ro-spin" /> : <Search size={15} />} Search
          </button>
        )}
      </div>

      {error && <p className="ro-error" role="alert"><AlertTriangle size={14} /> {error}</p>}

      {searching && !jobs && (
        <div className="js-wrap" aria-busy="true" aria-label="Loading jobs">
          <div className="js-list">{[0, 1, 2, 3].map(i => <div key={i} className="js-skel" />)}</div>
          <div className="js-detail"><div className="js-skel js-skel--tall" /></div>
        </div>
      )}

      {jobs && jobs.length === 0 && (
        <div className="js-empty">
          <Briefcase size={28} aria-hidden="true" />
          <h2>No live openings for “{searched}” right now</h2>
          <p>
            We search the career pages of {companies.slice(0, 8).join(', ')} and more.
            Try a job title or skill instead of a company name.
          </p>
          <div className="js-chips">{SUGGESTIONS.map(s => <button key={s} type="button" onClick={() => pick(s)}>{s}</button>)}</div>
        </div>
      )}

      {jobs && jobs.length > 0 && (
        <div className={`js-wrap${searching ? ' is-busy' : ''}`}>
          <div className="js-list" role="listbox" aria-label="Job results">
            <p className="js-count">
              <b><strong>{total.toLocaleString()} live openings</strong>{total > jobs.length ? ` · top ${jobs.length} shown` : ''}</b>
              <span>From company career pages, updated every 30 min</span>
            </p>
            {jobs.map(j => (
              <button key={j.id} type="button" role="option" aria-selected={j.id === selectedId}
                className={`js-card${j.id === selectedId ? ' is-on' : ''}`} onClick={() => setSelectedId(j.id)}>
                <Logo job={j} />
                <span className="js-card-main">
                  <strong>{j.title}</strong>
                  <span className="js-card-co">{j.company}</span>
                  <span className="js-card-meta">
                    {j.location && <span><MapPin size={11} /> {j.location}</span>}
                    {j.remote && <em>Remote</em>}
                  </span>
                </span>
                {j.postedAt && <span className="js-card-age">{ago(j.postedAt)}</span>}
              </button>
            ))}
          </div>

          {selected && (
            <article className="js-detail" ref={detailPane} aria-live="polite">
              <header className="js-head">
                <Logo job={selected} size={52} />
                <div>
                  <h2>{selected.title}</h2>
                  <p className="js-co">{selected.company}</p>
                  <p className="js-meta">
                    {selected.location && <span><MapPin size={13} /> {selected.location}</span>}
                    {selected.team && <span><Briefcase size={13} /> {selected.team}</span>}
                    {selected.type && <span>{selected.type}</span>}
                    {selected.postedAt && <span><Clock size={13} /> Posted {ago(selected.postedAt).toLowerCase()}</span>}
                  </p>
                </div>
              </header>
              <div className="js-head-actions">
                <button type="button" className="ro-btn ro-btn--green" onClick={() => onTarget(selected)}><Target size={15} /> Target this job</button>
                {selected.url && <a className="js-apply" href={selected.url} target="_blank" rel="noopener noreferrer">View on {selected.company}'s site <ArrowUpRight size={14} /></a>}
              </div>

              <h3 className="js-about">About the job</h3>
              {detailError ? <p className="ro-error"><AlertTriangle size={14} /> {detailError}</p>
                : detailText === null ? <div className="js-lines" aria-label="Loading description">{[90, 100, 76, 95, 60, 88].map((w, i) => <span key={i} style={{ width: `${w}%` }} />)}</div>
                : detailText ? <Description text={detailText} />
                : <p className="js-muted">The company didn't publish a description here. Open the posting for details.</p>}
            </article>
          )}
        </div>
      )}
    </div>
  );
}
