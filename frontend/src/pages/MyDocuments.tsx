import { useEffect, useMemo, useState } from 'react';
import {
  Plus, FileText, FileSearch, Bookmark, MoreHorizontal,
  Edit3, Link2, Trash2, AlertCircle, Crown, Check, Globe, Eye,
} from 'lucide-react';
import ProfileMenu from '../components/ProfileMenu';
import { API_BASE } from '../lib/apiBase';
import { authFetch } from '../lib/authFetch';
import { readUser, isProUser, USER_CHANGE_EVENT } from '../lib/currentUser';
import { DOCUMENT_TYPES, workLabel, workPage } from '../lib/works';
import { getErrorMessage } from '../utils/errors';
import { SUPPORT_EMAIL, mailLink } from '../data/support';
import cvmindIcon from '../assets/cvmind_icon.png';
import NotificationBell from '../components/NotificationBell';
import PageLoader from '../components/PageLoader';
import type { LoadedWork, SavedWork, StoredUser } from '../types/api';
import './MyDocuments.css';
import YourPlan from '../components/growth/YourPlan';
import ScoreHistory from '../components/growth/ScoreHistory';
import ShareDialog from '../components/growth/ShareDialog';
import { getShareLinks, type ShareLink } from '../lib/growthApi';

type Tab = 'dashboard' | 'documents' | 'saved-jobs';
type ListedWork = SavedWork & { _id: string; createdAt: string };

interface MyDocumentsProps {
  setCurrentPage: (page: string) => void;
  handleSignOut: () => void;
  setLoadedWork: (work: LoadedWork | null) => void;
}

const TABS: { id: Tab; label: string; soon?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'documents', label: 'Documents' },
  { id: 'saved-jobs', label: 'My Saved Jobs', soon: true },
];

// The splash stays up at least this long so it reads as a deliberate transition, not a flicker
const MIN_SPLASH_MS = 900;

const PRO_PERKS = ['No CVMind footer on downloads', 'Every resume template', 'Unlimited Tailor & Portfolio Generator', '2,00,000 AI tokens every 3 days'];

const workId = (w: ListedWork) => w.id || w._id;
const editedAt = (w: ListedWork) => new Date(w.updatedAt || w.createdAt);

const formatDate = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

function timeAgo(d: Date) {
  const minutes = Math.round((Date.now() - d.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDate(d);
}

type LoadResult = { ok: true; works: ListedWork[] } | { ok: false; error: string };

async function loadWorks(userId: string | undefined): Promise<LoadResult> {
  if (!userId) return { ok: true, works: [] };
  try {
    const res = await authFetch(`${API_BASE}/api/user/work/${userId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch documents.');
    const works: ListedWork[] = data.data || [];
    return { ok: true, works: works.sort((a, b) => editedAt(b).getTime() - editedAt(a).getTime()) };
  } catch (err) {
    return { ok: false, error: getErrorMessage(err) || 'We could not load your documents. Refresh the page to try again.' };
  }
}

export default function MyDocuments({ setCurrentPage, handleSignOut, setLoadedWork }: MyDocumentsProps) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [user, setUser] = useState<StoredUser | null>(readUser);
  const userId = user?.id || user?._id;
  const isPro = isProUser(user);

  const [splash, setSplash] = useState(true);
  const [works, setWorks] = useState<ListedWork[]>([]);
  const [loadError, setLoadError] = useState('');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [shareFor, setShareFor] = useState<ListedWork | null>(null);
  const [shareLinks, setShareLinks] = useState<Record<string, ShareLink>>({});

  useEffect(() => {
    const sync = () => setUser(readUser());
    window.addEventListener(USER_CHANGE_EVENT, sync);
    return () => window.removeEventListener(USER_CHANGE_EVENT, sync);
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([loadWorks(userId), new Promise(r => setTimeout(r, MIN_SPLASH_MS))]).then(([result]) => {
      if (!alive) return;
      if (result.ok) setWorks(result.works);
      else setLoadError(result.error);
      setSplash(false);
    });
    return () => { alive = false; };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    getShareLinks().then(links => { if (alive) setShareLinks(links); }).catch(() => { /* counts just don't show */ });
    return () => { alive = false; };
  }, [userId]);

  useEffect(() => {
    if (!menuFor) return;
    const close = () => setMenuFor(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuFor]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const documents = useMemo(() => works.filter(w => DOCUMENT_TYPES.includes(w.type)), [works]);

  const openWork = (w: ListedWork) => {
    setLoadedWork(w);
    setCurrentPage(workPage(w.type));
  };

  // A past ATS check from the score history reopens its report
  const openReport = (id: string) => {
    const w = works.find(x => workId(x) === id);
    if (w) openWork(w);
    else setToast('That report is no longer saved.');
  };

  const deleteWork = async (w: ListedWork) => {
    const id = workId(w);
    if (!userId || !window.confirm(`Delete "${w.title}" permanently?`)) return;
    try {
      const res = await authFetch(`${API_BASE}/api/user/work/${userId}/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete document.');
      setWorks(prev => prev.filter(x => workId(x) !== id));
      setLoadedWork({ deleted: true, workId: id });
      setToast('Deleted');
    } catch (err) {
      setToast(getErrorMessage(err) || 'Could not delete. Please try again.');
    }
  };

  const renderTable = (list: ListedWork[], empty: React.ReactNode) => {
    if (loadError) {
      return <div className="md-empty md-empty--error"><AlertCircle size={18} /> {loadError}</div>;
    }
    if (list.length === 0) return empty;
    return (
      <div className="md-table-wrap">
        <table className="md-table">
          <thead>
            <tr>
              <th>Name</th>
              <th className="md-col-type">Type</th>
              <th className="md-col-created">Created at</th>
              <th>Last edit</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {list.map(w => {
              const id = workId(w);
              return (
                <tr key={id}>
                  <td>
                    <button type="button" className="md-doc-name" onClick={() => openWork(w)} title={w.title}>
                      <FileText size={16} />
                      <span className="md-doc-text">
                        <span className="md-doc-title">
                          {w.title}
                          {shareLinks[id]?.enabled && (
                            <span className="md-share-views" title="Share link views"><Eye size={12} /> {shareLinks[id].viewCount}</span>
                          )}
                        </span>
                        <small className="md-doc-type">{workLabel(w.type)}</small>
                      </span>
                    </button>
                  </td>
                  <td className="md-col-type">{workLabel(w.type)}</td>
                  <td className="md-col-created">{formatDate(new Date(w.createdAt))}</td>
                  <td>{timeAgo(editedAt(w))}</td>
                  <td className="md-actions">
                    <button type="button" className="md-icon-btn" title="Open" aria-label={`Open ${w.title}`} onClick={() => openWork(w)}>
                      <Edit3 size={16} />
                    </button>
                    <div className="md-menu-anchor" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        className="md-icon-btn"
                        aria-label={`More actions for ${w.title}`}
                        aria-haspopup="menu"
                        aria-expanded={menuFor === id}
                        onClick={() => setMenuFor(menuFor === id ? null : id)}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      {menuFor === id && (
                        <div className="md-menu" role="menu">
                          <button role="menuitem" onClick={() => { setMenuFor(null); openWork(w); }}>
                            <Edit3 size={15} /> Open
                          </button>
                          {w.type === 'resume' && (
                            <button role="menuitem" onClick={() => { setMenuFor(null); setShareFor(w); }}>
                              <Link2 size={15} /> Share link
                            </button>
                          )}
                          <button role="menuitem" className="danger" onClick={() => { setMenuFor(null); deleteWork(w); }}>
                            <Trash2 size={15} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const createButton = (
    <button type="button" className="md-btn md-btn--solid" onClick={() => setCurrentPage('resume-editor')}>
      <Plus size={16} /> Create
    </button>
  );

  const emptyDocuments = (
    <div className="md-empty">
      <FileText size={28} />
      <strong>No documents yet</strong>
      <span>Resumes and cover letters you save in the builder will show up here.</span>
      <button type="button" className="md-btn md-btn--solid" onClick={() => setCurrentPage('resume-editor')}>Create a resume</button>
    </div>
  );

  const renderDashboard = () => (
    <div className="md-dash">
      <div className="md-dash-main">
        <section className="md-section">
          <div className="md-section-head">
            <h2>Resume check</h2>
          </div>
          <div className="md-hero">
            <div className="md-hero-art" aria-hidden="true">
              <FileSearch size={56} strokeWidth={1.5} />
            </div>
            <div className="md-hero-text">
              <h3>See how recruiters' software reads your resume</h3>
              <p>Upload your resume and CV Mind scores how well it passes Applicant Tracking Systems, then lists what to fix.</p>
              <button type="button" className="md-btn md-btn--solid md-btn--lg" onClick={() => setCurrentPage('home')}>
                Upload Resume
              </button>
            </div>
          </div>
        </section>

        <ScoreHistory userKey={String(userId || '')} onOpenReport={openReport} onCheckResume={() => setCurrentPage('home')} />

        <section className="md-section">
          <div className="md-section-head">
            <h2>Saved jobs</h2>
          </div>
          <div className="md-panel md-row-card">
            <div>
              <strong>Saved jobs are coming soon</strong>
              <p>You'll be able to save jobs you like here and track every application in one place.</p>
            </div>
            <button type="button" className="md-btn md-btn--outline" onClick={() => setTab('saved-jobs')}>
              <Bookmark size={16} /> Learn more
            </button>
          </div>
        </section>

        <section className="md-section">
          <div className="md-section-head">
            <h2>My works</h2>
            <div className="md-section-actions">
              {documents.length > 0 && (
                <button type="button" className="md-link" onClick={() => setTab('documents')}>All documents</button>
              )}
              {createButton}
            </div>
          </div>
          {renderTable(works, (
            <div className="md-empty">
              <FileText size={28} />
              <strong>Nothing saved yet</strong>
              <span>Resumes, cover letters and results you save from CV Mind tools will show up here.</span>
              <button type="button" className="md-btn md-btn--solid" onClick={() => setCurrentPage('resume-editor')}>Create a resume</button>
            </div>
          ))}
        </section>
      </div>

      <aside className="md-dash-side">
        {userId && <YourPlan userKey={String(userId)} setCurrentPage={setCurrentPage} />}

        {!isPro && (
          <section className="md-pro">
            <span className="md-pro-badge"><Crown size={13} /> CV Mind Pro</span>
            <h3>Stand out with Pro</h3>
            <ul>
              {PRO_PERKS.map(p => (
                <li key={p}><Check size={15} /> {p}</li>
              ))}
            </ul>
            <button type="button" className="md-pro-btn" onClick={() => setCurrentPage('pricing')}>See plans</button>
          </section>
        )}
      </aside>
    </div>
  );

  const renderDocuments = () => (
    <section className="md-section md-narrow">
      <div className="md-section-head">
        <h2 className="md-page-title">Documents</h2>
        <div className="md-section-actions">{createButton}</div>
      </div>
      {renderTable(documents, emptyDocuments)}
    </section>
  );

  const renderSavedJobs = () => (
    <section className="md-section md-narrow">
      <div className="md-section-head">
        <h2 className="md-page-title">My Saved Jobs</h2>
      </div>
      <div className="md-empty md-soon">
        <Bookmark size={30} />
        <strong>Coming soon</strong>
        <span>Save jobs you want to apply to, see how well your resume matches each one, and keep track of where you've applied.</span>
        <button type="button" className="md-btn md-btn--outline" onClick={() => setCurrentPage('job-finder')}>Try AI Job Finder meanwhile</button>
      </div>
    </section>
  );

  if (splash) {
    return (
      <PageLoader label="Loading your documents" />
    );
  }

  return (
    <div className="md-app">
      <header className="md-top">
        <button type="button" className="md-brand" onClick={() => setCurrentPage('home')} title="CV Mind home">
          <img src={cvmindIcon} alt="" />
          <span>CVMind</span>
        </button>

        <nav className="md-tabs" aria-label="My Documents sections">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              className={`md-tab${tab === t.id ? ' active' : ''}`}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.soon && <span className="md-soon-chip">Soon</span>}
            </button>
          ))}
        </nav>

        <div className="md-top-actions">
          {!isPro && (
            <button type="button" className="nav-upgrade-btn" onClick={() => setCurrentPage('pricing')}>Upgrade</button>
          )}
          <NotificationBell setCurrentPage={setCurrentPage} />
          <ProfileMenu user={user} setCurrentPage={setCurrentPage} handleSignOut={handleSignOut} />
        </div>
      </header>

      <main className="md-main">
        {tab === 'dashboard' && renderDashboard()}
        {tab === 'documents' && renderDocuments()}
        {tab === 'saved-jobs' && renderSavedJobs()}
      </main>

      <footer className="md-foot">
        <div className="md-foot-rule"><span>Resumes recruiters love</span></div>
        <div className="md-foot-row">
          <span className="md-foot-copy">
            &copy; {new Date().getFullYear()}{' '}
            <button type="button" className="md-foot-brand" onClick={() => setCurrentPage('home')}>CVMind</button>. All Rights Reserved.
          </span>
          <nav className="md-foot-links" aria-label="Footer">
            <button type="button" onClick={() => setCurrentPage('resume-editor')}>Resume Builder</button>
            <button type="button" onClick={() => setCurrentPage('pricing')}>{isPro ? 'Plans' : 'Upgrade'}</button>
            <button type="button" onClick={() => setCurrentPage('terms')}>Terms</button>
            <button type="button" onClick={() => setCurrentPage('privacy')}>Privacy</button>
            <button type="button" onClick={() => setCurrentPage('blog')}>Blog</button>
            <a className="md-foot-email" href={mailLink()}>{SUPPORT_EMAIL}</a>
            <button type="button" onClick={handleSignOut}>Log Out</button>
          </nav>
          <span className="md-foot-lang" title="More languages coming soon">
            English <Globe size={14} />
          </span>
        </div>
      </footer>

      {toast && <div className="md-toast" role="status">{toast}</div>}

      {shareFor && (
        <ShareDialog
          workId={workId(shareFor)}
          title={shareFor.title}
          onClose={() => setShareFor(null)}
          onChange={link => setShareLinks(prev => ({ ...prev, [workId(shareFor)]: link }))}
          onUpgrade={() => { setShareFor(null); setCurrentPage('pricing'); }}
        />
      )}
    </div>
  );
}
