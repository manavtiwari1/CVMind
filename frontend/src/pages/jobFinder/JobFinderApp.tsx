import { useCallback, useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ArrowLeft, Bell, BellRing, Building2, CheckCircle2, Crown, ExternalLink, Loader2, MapPin, Search, Send, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import JobCard from './JobCard';
import JobDrawer from './JobDrawer';
import MoreOnJobSites from './MoreOnJobSites';
import ProfileSetup from './ProfileSetup';
import AlertsDialog from './AlertsDialog';
import ReferralDialog from './ReferralDialog';
import { getAlerts } from '../../lib/growthApi';
import { appliedOn } from './format';
import { getFeed, getJob, getProfile, recordApply, JobFinderError, type Feed, type FeedFilters, type FinderJob, type FinderPlan, type FinderProfile } from './jobFinderApi';
import { requestUpgrade, userIsPro } from '../../lib/billing';
import { USER_CHANGE_EVENT } from '../../lib/currentUser';
import { getErrorMessage } from '../../utils/errors';
import './JobFinder.css';

interface JobFinderAppProps {
  setCurrentPage: (page: string) => void;
}

// Skills searched at once (the server's MAX_SEARCH_SKILLS)
const MAX_SKILLS = 3;

const DAYS = [
  { value: null, label: 'Any time' },
  { value: 1, label: 'Past 24 hours' },
  { value: 3, label: 'Past 3 days' },
  { value: 7, label: 'Past week' },
  { value: 30, label: 'Past month' }
];
const LEVELS = [
  { value: null, label: 'Any experience' },
  { value: 'fresher', label: 'Fresher / intern' },
  { value: 'junior', label: '0–2 years' },
  { value: 'mid', label: '2–5 years' },
  { value: 'senior', label: '5+ years' }
] as const;
const TYPES = [
  { value: null, label: 'Any job type' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'internship', label: 'Internship' }
] as const;

function Dialog({ icon, title, children, actions, onClose }: { icon: ReactNode; title: string; children: ReactNode; actions: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="jf-dialog-backdrop" onClick={onClose}>
      <div className="jf-dialog" role="alertdialog" aria-modal="true" aria-labelledby="jf-dialog-title" onClick={(e) => e.stopPropagation()}>
        <span className="jf-dialog-icon">{icon}</span>
        <h2 id="jf-dialog-title">{title}</h2>
        <p>{children}</p>
        <div className="jf-dialog-actions">{actions}</div>
      </div>
    </div>
  );
}

export default function JobFinderApp({ setCurrentPage }: JobFinderAppProps) {
  const [profile, setProfile] = useState<FinderProfile | null>(null);
  // Pro, or what a free account has left (one application a month, a few full searches a day)
  const [plan, setPlan] = useState<FinderPlan | null>(null);
  const [profileError, setProfileError] = useState('');
  const [editing, setEditing] = useState(false);

  const [filters, setFilters] = useState<FeedFilters>({});
  const [draftQ, setDraftQ] = useState('');
  const [draftPlace, setDraftPlace] = useState('');
  const [draftCompany, setDraftCompany] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  // The last feed answer, with the request it answers; a newer request means it's loading
  const [feedState, setFeedState] = useState<{ key: string; feed?: Feed; error?: string } | null>(null);

  const [selected, setSelected] = useState<FinderJob | null>(null);
  // "You already applied" for a job marked applied; "did you apply?" after its page was opened
  const [dialog, setDialog] = useState<{ kind: 'applied' | 'confirm'; job: FinderJob } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  // Job alert emails (null until loaded) and the "Find a referral" dialog
  const [alertsOn, setAlertsOn] = useState<boolean | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [referralFor, setReferralFor] = useState<FinderJob | null>(null);

  // Edge-to-edge app page: lift the default content width cap while mounted. The 3D tilt
  // perspective on .main-content (styles/3d-effects.css) would also make the fixed dialogs, toast
  // and phone drawer position against the whole page instead of the screen, so it's switched off.
  useEffect(() => {
    const main = document.querySelector('.main-content') as HTMLElement | null;
    if (!main) return;
    main.style.maxWidth = 'none';
    main.style.padding = '0';
    main.style.margin = '0';
    main.style.perspective = 'none';
    return () => {
      main.style.maxWidth = '';
      main.style.padding = '';
      main.style.margin = '';
      main.style.perspective = '';
    };
  }, []);

  const handleError = useCallback((err: unknown, fallback: string) => {
    if (err instanceof JobFinderError && err.code === 'JOB_APPLY_LIMIT') {
      requestUpgrade('job-apply');
      return '';
    }
    return getErrorMessage(err) || fallback;
  }, []);

  const loadProfile = useCallback(() => getProfile().then((p) => { setProfile(p); setPlan(p.plan); }), []);

  useEffect(() => {
    loadProfile().catch((err) => setProfileError(getErrorMessage(err) || 'Could not load your search profile.'));
  }, [loadProfile]);

  // Pro bought or given while this page is open (App refreshes the stored account) lifts the limits
  useEffect(() => {
    const onUserChange = () => { if (userIsPro()) loadProfile().catch(() => {}); };
    window.addEventListener(USER_CHANGE_EVENT, onUserChange);
    return () => window.removeEventListener(USER_CHANGE_EVENT, onUserChange);
  }, [loadProfile]);

  const chosen = profile?.resumes.find((r) => r.id === profile.resumeId) || null;
  const waiting = chosen?.status === 'queued' || chosen?.status === 'parsing';
  // Skills come from the file's text right away; only a file with no readable text has none
  const noSkills = Boolean(chosen) && chosen?.status !== 'failed' && !chosen?.skills.length;

  // While the full read is waiting, check back for a minute; after that the next visit picks it up
  useEffect(() => {
    if (!waiting) return;
    let checks = 0;
    const timer = setInterval(() => {
      checks += 1;
      if (checks > 12) clearInterval(timer);
      else getProfile().then(setProfile).catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [waiting]);

  const ready = Boolean(profile?.onboarded && profile.resumes.length) && !editing;
  // A resume that finishes reading re-ranks the jobs
  const feedKey = JSON.stringify([filters, chosen?.id, chosen?.status]);
  const feedLoading = ready && feedState?.key !== feedKey;
  const feed = feedState?.feed || null;
  const feedError = feedState?.key === feedKey ? feedState.error || '' : '';

  useEffect(() => {
    if (!ready) return;
    let live = true;
    getFeed(filters)
      .then((res) => {
        if (!live) return;
        setFeedState({ key: feedKey, feed: res });
        if (res.plan) setPlan(res.plan);
        if (res.mode !== 'skills' && !filters.q && res.query) setDraftQ(res.query);
        if (!filters.location && res.location) setDraftPlace(res.location);
      })
      .catch((err) => { if (live) setFeedState((prev) => ({ key: feedKey, feed: prev?.feed, error: handleError(err, 'Could not load jobs. Please try again.') })); });
    return () => { live = false; };
  }, [ready, filters, feedKey, handleError]);

  useEffect(() => {
    if (!ready) return;
    let live = true;
    getAlerts().then((a) => { if (live) setAlertsOn(a.enabled); }).catch(() => {});
    return () => { live = false; };
  }, [ready]);

  // A job alert email links to one job (?job=<key>): open it once the page is ready
  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams(window.location.search);
    const jobKey = params.get('job');
    if (!jobKey) return;
    params.delete('job');
    params.delete('from');
    const qs = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
    let live = true;
    getJob(jobKey)
      .then((res) => { if (live) setSelected(res.job); })
      .catch((err) => { if (live) setToast(getErrorMessage(err) || 'That job is no longer listed.'); });
    return () => { live = false; };
  }, [ready]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const markApplied = (jobKey: string, appliedAt: string) => {
    setFeedState((st) => (st?.feed ? { ...st, feed: { ...st.feed, jobs: st.feed.jobs.map((j) => (j.jobKey === jobKey ? { ...j, appliedAt } : j)) } } : st));
    setSelected((s) => (s && s.jobKey === jobKey ? { ...s, appliedAt } : s));
  };

  // Opened on the click itself, so popup blockers allow the new tab
  const openPage = (job: FinderJob) => {
    if (job.applyUrl) window.open(job.applyUrl, '_blank', 'noopener,noreferrer');
  };

  const outOfApplies = Boolean(plan && !plan.pro && plan.applies && plan.applies.used >= plan.applies.limit);

  // Apply opens the company's page and then asks; a job only counts as applied once the user says so.
  // For a CVMind recruiter's job the question comes first, since saying yes sends the resume.
  // A free account that used this month's application gets the Pro dialog instead.
  const apply = (job: FinderJob) => {
    if (job.appliedAt) return setDialog({ kind: 'applied', job });
    if (outOfApplies) return requestUpgrade('job-apply');
    if (!job.appliesInCvmind) openPage(job);
    setDialog({ kind: 'confirm', job });
  };

  const confirmApplied = async (job: FinderJob) => {
    setSaving(true);
    try {
      const res = await recordApply(job.jobKey);
      markApplied(job.jobKey, res.appliedAt);
      if (res.plan) setPlan(res.plan);
      setToast(job.appliesInCvmind
        ? (res.alreadyApplied ? `You applied on ${appliedOn(res.appliedAt)}.` : `Your resume was sent to ${job.company}.`)
        : `Saved. ${job.title} at ${job.company} is marked as applied.`);
      setDialog(null);
    } catch (err) {
      setToast(handleError(err, 'Could not save this. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const search = (e: FormEvent) => {
    e.preventDefault();
    setSelected(null);
    setFilters((f) => ({ ...f, q: draftQ.trim(), location: draftPlace.trim(), company: draftCompany.trim() || undefined }));
  };

  const topBar = (extra?: ReactNode) => (
    <header className="jf-top">
      <div className="jf-top-brand">
        <button type="button" className="jf-top-home" aria-label="My Documents" onClick={() => setCurrentPage('my-documents')}>
          <ArrowLeft size={16} /> <span className="jf-top-home-label">My Documents</span>
        </button>
        <span className="jf-top-name">AI Job Finder</span>
        {plan?.pro && <span className="jf-top-pro"><Crown size={12} /> Pro</span>}
        {plan && !plan.pro && plan.applies && (
          <button type="button" className="jf-top-free" onClick={() => setCurrentPage('pricing')} title="See Pro plans">
            {plan.applies.used >= plan.applies.limit
              ? <>Free · this month's application used · <b>Get Pro</b></>
              : plan.applies.credits
                ? <>Free · {plan.applies.limit - plan.applies.used} applications left ({plan.applies.credits} from invites)</>
                : <>Free · {plan.applies.limit - plan.applies.used} application left this month</>}
          </button>
        )}
      </div>
      {extra}
    </header>
  );

  if (!profile) {
    return (
      <div className="jf-app">
        {topBar()}
        <div className="jf-loading">
          {profileError ? <p className="jf-error">{profileError}</p> : <Loader2 size={28} className="jf-spin" aria-label="Loading" />}
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="jf-app">
        {topBar()}
        <ProfileSetup
          profile={profile}
          firstTime={!profile.onboarded}
          onChange={(p) => { setProfile(p); setPlan(p.plan); }}
          onDone={(p) => { setProfile(p); setPlan(p.plan); setEditing(false); setFilters({}); }}
          onCancel={profile.onboarded ? () => setEditing(false) : undefined}
        />
      </div>
    );
  }

  const jobs = feed?.jobs || [];
  const setFilter = <K extends keyof FeedFilters>(key: K, value: FeedFilters[K]) => {
    setSelected(null);
    setFilters((f) => ({ ...f, [key]: value }));
  };
  const bySkills = filters.mode === 'skills';
  // Picked skills, or the ones the server chose when none were picked yet
  const searchedSkills = filters.skills?.length ? filters.skills : (feed?.mode === 'skills' ? feed.skills || [] : []);
  const toggleSkill = (skill: string) => {
    const next = searchedSkills.includes(skill) ? searchedSkills.filter((s) => s !== skill) : [...searchedSkills, skill].slice(-MAX_SKILLS);
    setFilter('skills', next.length ? next : undefined);
  };

  return (
    <div className="jf-app">
      {topBar(<>
        <button type="button" className="jf-resume-chip jf-alerts-chip" onClick={() => setShowAlerts(true)} title="Email me new jobs that match my resume">
          {alertsOn ? <BellRing size={14} /> : <Bell size={14} />}
          <span className="jf-resume-chip-text">Job alerts{alertsOn ? ' · On' : ''}</span>
        </button>
        <button type="button" className="jf-resume-chip" onClick={() => setEditing(true)} title="Change your resume and preferences">
          <span className={`jf-dot jf-dot--${chosen ? (chosen.skills.length ? 'ready' : chosen.status) : 'none'}`} />
          <span className="jf-resume-chip-text">{chosen ? chosen.label : 'No resume'} · Edit profile</span>
        </button>
      </>)}

      <div className="jf-tabs" role="tablist" aria-label="Find jobs by">
        <button type="button" role="tab" aria-selected={!bySkills} className={`jf-tab${!bySkills ? ' is-on' : ''}`} onClick={() => setFilter('mode', 'role')}>
          <Search size={15} /> For your role
        </button>
        <button type="button" role="tab" aria-selected={bySkills} className={`jf-tab${bySkills ? ' is-on' : ''}`} onClick={() => setFilter('mode', 'skills')}>
          <Sparkles size={15} /> For your skills
        </button>
      </div>

      {bySkills && (
        <div className="jf-skillpick">
          <span className="jf-skillpick-label">Jobs that ask for these skills from your resume (pick up to {MAX_SKILLS}):</span>
          <div className="jf-pills">
            {(chosen?.skills || []).slice(0, 20).map((skill) => (
              <button key={skill} type="button" className={`jf-pill${searchedSkills.includes(skill) ? ' is-on' : ''}`} aria-pressed={searchedSkills.includes(skill)} onClick={() => toggleSkill(skill)}>
                {skill}
              </button>
            ))}
          </div>
        </div>
      )}

      <form className="jf-search" onSubmit={search} role="search">
        {!bySkills && (
          <label className="jf-search-field">
            <Search size={17} />
            <input value={draftQ} onChange={(e) => setDraftQ(e.target.value)} placeholder="Role, e.g. React Developer" aria-label="Role" maxLength={100} />
          </label>
        )}
        <label className="jf-search-field">
          <Building2 size={17} />
          <input value={draftCompany} onChange={(e) => setDraftCompany(e.target.value)} placeholder="Company, e.g. Infosys (optional)" aria-label="Company" maxLength={60} />
        </label>
        <label className="jf-search-field">
          <MapPin size={17} />
          <input value={draftPlace} onChange={(e) => setDraftPlace(e.target.value)} placeholder="City, or leave empty" aria-label="City" maxLength={80} />
        </label>
        <button type="submit" className="jf-btn jf-btn--primary">Search</button>
        <button type="button" className="jf-btn jf-btn--ghost jf-filters-toggle" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
          <SlidersHorizontal size={15} /> Filters
        </button>
      </form>

      <div className={`jf-filters${showFilters ? ' is-open' : ''}`}>
        <select value={filters.days ?? ''} onChange={(e) => setFilter('days', e.target.value ? Number(e.target.value) : null)} aria-label="Posted">
          {DAYS.map((d) => <option key={d.label} value={d.value ?? ''}>{d.label}</option>)}
        </select>
        <select value={filters.level ?? ''} onChange={(e) => setFilter('level', (e.target.value || null) as FeedFilters['level'])} aria-label="Experience">
          {LEVELS.map((l) => <option key={l.label} value={l.value ?? ''}>{l.label}</option>)}
        </select>
        <select value={filters.type ?? ''} onChange={(e) => setFilter('type', (e.target.value || null) as FeedFilters['type'])} aria-label="Job type">
          {TYPES.map((t) => <option key={t.label} value={t.value ?? ''}>{t.label}</option>)}
        </select>
        <label className={`jf-pill${filters.remote ? ' is-on' : ''}`}>
          <input type="checkbox" checked={Boolean(filters.remote)} onChange={(e) => setFilter('remote', e.target.checked)} /> Remote only
        </label>
      </div>

      {feed?.limitedSources && (
        <p className="jf-banner">
          You've used today's {plan?.searches?.limit ?? 10} full searches on the free plan, so these results come from company careers pages and CVMind recruiters only.
          {' '}<button type="button" onClick={() => setCurrentPage('pricing')}>Get Pro for every source</button>
        </p>
      )}
      {noSkills && (
        <p className="jf-banner">We couldn't find skills in your resume's text, so scores use only your role, level and city. A PDF or Word file with selectable text works best. <button type="button" onClick={() => setEditing(true)}>Upload another</button></p>
      )}
      {chosen?.status === 'failed' && (
        <p className="jf-banner jf-banner--warn">We couldn't read your resume, so scores only use your preferences. <button type="button" onClick={() => setEditing(true)}>Upload another</button></p>
      )}

      <div className={`jf-results${selected ? ' has-drawer' : ''}`}>
        <section className="jf-list" aria-busy={feedLoading} aria-label="Jobs">
          <div className="jf-list-head">
            {feedLoading ? <span><Loader2 size={15} className="jf-spin" /> Finding jobs…</span>
              : feed && <span>{jobs.length ? `${jobs.length} job${jobs.length === 1 ? '' : 's'} ${feed.mode === 'skills' ? `that ask for ${feed.query}` : feed.query ? `for "${feed.query}"` : ''}${feed.company ? ` at ${feed.company}` : ''}${feed.location ? ` in ${feed.location}` : ''}` : ''}</span>}
            {!feedLoading && jobs.length > 0 && (
              <span className="jf-muted">
                Best match first
                {/* Adzuna's terms ask that their listings credit them */}
                {jobs.some((j) => j.source === 'adzuna') && <> · <a className="jf-credit" href="https://www.adzuna.in" target="_blank" rel="noopener noreferrer">Jobs by Adzuna</a></>}
              </span>
            )}
          </div>

          {feed && !feedLoading && !feed.needsRole && !feed.needsSkills && (
            <MoreOnJobSites
              keywords={feed.mode === 'skills' ? (feed.skills || []).join(' ') : [feed.query, feed.company].filter(Boolean).join(' ')}
              location={feed.location || ''}
            />
          )}

          {feedError && <p className="jf-error">{feedError}</p>}
          {!feedLoading && !feedError && feed?.needsRole && (
            <div className="jf-empty"><p>Type a role above, or add one to your profile, to see jobs.</p></div>
          )}
          {!feedLoading && !feedError && feed?.needsSkills && (
            <div className="jf-empty">
              <h3>No skills on your resume yet</h3>
              <p>We couldn't find skills to search with. Upload a resume with a skills section, or search by role instead.</p>
            </div>
          )}
          {!feedLoading && !feedError && feed && !feed.needsRole && !feed.needsSkills && !jobs.length && (
            <div className="jf-empty">
              <h3>No jobs found for this search</h3>
              <p>{feed.company
                ? `We didn't find open jobs at ${feed.company} in our sources right now. Large employers often post only on their own careers site, so check theirs too, or search without the company.`
                : feed.mode === 'skills'
                  ? 'Try other skills, another city, or fewer filters.'
                  : 'Try a broader role (for example "Developer" instead of "React Native Developer"), another city, or fewer filters.'}</p>
            </div>
          )}

          {jobs.map((job) => (
            <JobCard key={job.jobKey} job={job} selected={selected?.jobKey === job.jobKey} onOpen={() => setSelected(job)} onApply={() => apply(job)} />
          ))}
        </section>

        {selected && (
          <>
            <div className="jf-drawer-scrim" onClick={() => setSelected(null)} />
            <JobDrawer job={selected} onClose={() => setSelected(null)} onApply={apply} onFindReferral={setReferralFor} />
          </>
        )}
      </div>

      {dialog?.kind === 'applied' && (
        <Dialog
          icon={<CheckCircle2 size={24} />}
          title="You already applied to this job"
          onClose={() => setDialog(null)}
          actions={<>
            <button type="button" className="jf-btn jf-btn--ghost" onClick={() => setDialog(null)}>{dialog.job.appliesInCvmind ? 'Close' : 'Cancel'}</button>
            {!dialog.job.appliesInCvmind && (
              <button type="button" className="jf-btn jf-btn--primary" onClick={() => { openPage(dialog.job); setDialog(null); }}>Open it anyway <ExternalLink size={15} /></button>
            )}
          </>}
        >
          You marked <b>{dialog.job.title}</b> at <b>{dialog.job.company}</b> as applied on {dialog.job.appliedAt ? appliedOn(dialog.job.appliedAt) : 'an earlier day'}
          {dialog.job.appliesInCvmind ? ', and your resume was sent to the recruiter.' : '.'}
        </Dialog>
      )}
      {dialog?.kind === 'confirm' && (
        <Dialog
          icon={dialog.job.appliesInCvmind ? <Send size={22} /> : <ExternalLink size={22} />}
          title={dialog.job.appliesInCvmind ? `Send your resume to ${dialog.job.company}?` : 'Did you apply?'}
          onClose={() => setDialog(null)}
          actions={<>
            <button type="button" className="jf-btn jf-btn--ghost" disabled={saving} onClick={() => setDialog(null)}>{dialog.job.appliesInCvmind ? 'Cancel' : 'Not yet'}</button>
            <button type="button" className="jf-btn jf-btn--primary" disabled={saving} onClick={() => void confirmApplied(dialog.job)}>
              {saving && <Loader2 size={15} className="jf-spin" />} {dialog.job.appliesInCvmind ? 'Send resume' : 'Yes, I applied'}
            </button>
          </>}
        >
          {dialog.job.appliesInCvmind
            ? <>The recruiter for <b>{dialog.job.title}</b> gets your name, email, phone and resume.</>
            : <>We opened the application for <b>{dialog.job.title}</b> at <b>{dialog.job.company}</b> in a new tab. Once you've sent it, tell us and we'll remember it, so this job shows as applied next time.</>}
        </Dialog>
      )}
      {showAlerts && (
        <AlertsDialog
          role={feed?.mode === 'skills' ? '' : feed?.query || profile.preferences.targetTitles[0] || ''}
          location={feed?.location || profile.preferences.locations[0] || ''}
          onClose={() => setShowAlerts(false)}
          onSaved={(a) => { setAlertsOn(a.enabled); setToast(a.enabled ? `Job alerts are on. We'll email you ${a.frequency === 'daily' ? 'daily' : 'weekly'} when new jobs match.` : 'Job alerts are off.'); }}
        />
      )}
      {referralFor && <ReferralDialog job={referralFor} onClose={() => setReferralFor(null)} />}
      {toast && (
        <div className="jf-toast" role="status">
          {toast}
          <button type="button" onClick={() => setToast('')} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}
    </div>
  );
}
