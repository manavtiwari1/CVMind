import { useCallback, useEffect, useState } from 'react';
import { Download, FileArchive, Search } from 'lucide-react';
import { api, download } from '../api';
import type { StudentRow } from '../api';
import { ReviewBadge, Score, Spinner, StatusBadge } from '../ui';
import { REVIEW_LABELS, errorText, fmtDate, usePortal } from '../portal';

interface Filters { q: string; status: string; branch: string; batch: string; review: string; eligible: boolean; minAts: string }
const EMPTY: Filters = { q: '', status: 'joined', branch: '', batch: '', review: '', eligible: false, minAts: '' };
const LIMIT = 50;

export default function Students() {
  const { college, openStudent, toast, readOnly } = usePortal();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [query, setQuery] = useState(EMPTY.q);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [branches, setBranches] = useState<string[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  // The search box is debounced into filters.q below
  const params = useCallback(() => ({ ...filters, eligible: filters.eligible ? 'true' : '' }), [filters]);

  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.q === query ? f : { ...f, q: query })), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    api<{ data: StudentRow[]; total: number; branches: string[]; batches: string[] }>('/students', { query: { ...params(), page, limit: LIMIT } })
      .then((r) => {
        if (cancelled) return;
        setRows(r.data);
        setTotal(r.total);
        setBranches(r.branches);
        setBatches(r.batches);
        setError('');
      })
      .catch((err) => { if (!cancelled) setError(errorText(err)); });
    return () => { cancelled = true; };
  }, [params, page]);

  const set = (patch: Partial<Filters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); setSelected(new Set()); };
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const joinedOnPage = (rows || []).filter((r) => r.status === 'joined');
  const allPicked = joinedOnPage.length > 0 && joinedOnPage.every((r) => selected.has(r.id));

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try { await fn(); } catch (err) { toast(errorText(err), 'error'); } finally { setBusy(''); }
  };
  const exportCsv = () => run('csv', () => download('/students/export.csv', { query: params() }, `${college.slug}-students.csv`));
  const zip = (body: { studentIds?: string[]; eligible?: boolean }) => run('zip', () => download('/downloads/zip', { method: 'POST', body }, `${college.slug}-resumes.zip`));

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <>
      <div className="pl-head">
        <div>
          <h1>Students</h1>
          <p>{total} {total === 1 ? 'student' : 'students'} match{filters.eligible ? ' the eligibility rule' : ''}</p>
        </div>
        <div className="pl-actions">
          <button type="button" className="pl-btn" onClick={exportCsv} disabled={!!busy}>{busy === 'csv' ? <Spinner size={14} /> : <Download size={15} />} Export CSV</button>
          {selected.size > 0
            ? <button type="button" className="pl-btn primary" onClick={() => zip({ studentIds: [...selected] })} disabled={!!busy}>{busy === 'zip' ? <Spinner size={14} /> : <FileArchive size={15} />} Download {selected.size} approved resumes</button>
            : <button type="button" className="pl-btn primary" onClick={() => zip({ eligible: true })} disabled={!!busy}>{busy === 'zip' ? <Spinner size={14} /> : <FileArchive size={15} />} Download eligible resumes</button>}
        </div>
      </div>
      {readOnly && <p className="pl-muted pl-small">Downloads and exports still work while the portal is read-only.</p>}

      <div className="pl-card">
        <div className="pl-filters">
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--pl-text-3)' }} />
            <input className="pl-input sm search" style={{ paddingLeft: 30 }} placeholder="Name, email or roll no" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} aria-label="Search students" />
          </div>
          <select className="pl-select sm" value={filters.status} onChange={(e) => set({ status: e.target.value })} aria-label="Status">
            <option value="joined">Joined</option>
            <option value="invited">Invited</option>
            <option value="declined">Declined</option>
            <option value="left">Left</option>
            <option value="all">All statuses</option>
          </select>
          <select className="pl-select sm" value={filters.branch} onChange={(e) => set({ branch: e.target.value })} aria-label="Branch">
            <option value="">All branches</option>
            {branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select className="pl-select sm" value={filters.batch} onChange={(e) => set({ batch: e.target.value })} aria-label="Batch">
            <option value="">All batches</option>
            {batches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select className="pl-select sm" value={filters.review} onChange={(e) => set({ review: e.target.value })} aria-label="Review">
            <option value="">Any review</option>
            {Object.entries(REVIEW_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input className="pl-input sm" style={{ width: 110 }} type="number" min={0} max={100} placeholder="Min ATS" value={filters.minAts} onChange={(e) => set({ minAts: e.target.value })} aria-label="Minimum ATS score" />
          <label className="pl-check"><input type="checkbox" checked={filters.eligible} onChange={(e) => set({ eligible: e.target.checked })} /> Eligible only</label>
          {JSON.stringify(filters) !== JSON.stringify({ ...EMPTY, q: filters.q }) && <button type="button" className="pl-link pl-small" onClick={() => set({ ...EMPTY, q: filters.q })}>Clear filters</button>}
        </div>

        {error && <div className="pl-notice red" style={{ margin: 12 }}>{error}</div>}
        {!rows ? <div className="pl-center"><Spinner /> Loading…</div> : rows.length === 0 ? (
          <div className="pl-empty">No students match these filters.</div>
        ) : (
          <div className="pl-table-wrap">
            <table className="pl-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}><input type="checkbox" aria-label="Select all on this page" checked={allPicked} onChange={() => setSelected(allPicked ? new Set() : new Set(joinedOnPage.map((r) => r.id)))} /></th>
                  <th>Student</th><th>Roll no</th><th>Branch</th><th>Batch</th><th className="num">ATS</th><th className="num">LinkedIn</th><th className="num">Resumes</th><th>Review</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const joined = r.status === 'joined';
                  return (
                    <tr key={r.id} className={joined ? 'clickable' : ''} onClick={() => joined && openStudent(r.id)}>
                      <td onClick={(e) => e.stopPropagation()}>{joined && <input type="checkbox" aria-label={`Select ${r.name || r.email}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} />}</td>
                      <td className="pl-name"><b>{r.name || r.email.split('@')[0]}</b><span>{r.email}</span></td>
                      <td>{r.rollNo || '—'}</td>
                      <td>{r.branch || '—'}</td>
                      <td>{r.batch || '—'}</td>
                      <td className="num"><Score value={r.stats?.atsScore} /></td>
                      <td className="num"><Score value={r.stats?.linkedinScore} /></td>
                      <td className="num">{r.stats ? r.stats.resumeCount : '—'}</td>
                      <td>{r.stats ? <>{r.stats.eligible && <span className="pl-badge green" style={{ marginRight: 4 }}>Eligible</span>}<ReviewBadge status={r.stats.reviewStatus} /></> : <span className="pl-muted pl-small">{r.status === 'invited' ? `Invited ${fmtDate(r.invitedAt)}` : '—'}</span>}</td>
                      <td><StatusBadge status={r.status} />{r.inviteError && <span className="pl-badge red" title={r.inviteError} style={{ marginLeft: 4 }}>Email failed</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {rows && total > LIMIT && (
          <div className="pl-pager">
            <span>Page {page} of {pages}</span>
            <div className="pl-actions">
              <button type="button" className="pl-btn sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button type="button" className="pl-btn sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
