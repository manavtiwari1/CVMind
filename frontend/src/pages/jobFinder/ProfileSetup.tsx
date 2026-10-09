import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2, FileText, Loader2, Upload } from 'lucide-react';
import { listCvmindResumes, RESUME_FILE_TYPES, type CvmindResume } from '../../autoApply/agentApi';
import { importCvmindResume, saveProfile, uploadResume, type FinderProfile, type FinderResume, type Seniority, type WorkMode } from './jobFinderApi';
import { getErrorMessage } from '../../utils/errors';

interface ProfileSetupProps {
  profile: FinderProfile;
  firstTime: boolean;
  onChange: (profile: FinderProfile) => void;
  onDone: (profile: FinderProfile) => void;
  onCancel?: () => void;
}

const LEVELS: { value: Seniority; label: string }[] = [
  { value: 'intern', label: 'Internship' },
  { value: 'junior', label: '0–2 years' },
  { value: 'mid', label: '2–5 years' },
  { value: 'senior', label: '5+ years' },
  { value: 'staff', label: 'Lead / manager' }
];
const MODES: { value: WorkMode; label: string }[] = [
  { value: 'onsite', label: 'In office' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' }
];
const STATUS_TEXT = { ready: 'Ready', noskills: 'No skills found', failed: "Couldn't read this file" };

// A resume with skills is usable now, even while the full AI read waits; one with none had no readable text
const statusOf = (r: FinderResume): keyof typeof STATUS_TEXT => (r.status === 'failed' ? 'failed' : r.skills.length ? 'ready' : r.status === 'ready' ? 'ready' : 'noskills');

const splitList = (text: string, max: number) => [...new Set(text.split(',').map((s) => s.trim()).filter(Boolean))].slice(0, max);
const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

export default function ProfileSetup({ profile, firstTime, onChange, onDone, onCancel }: ProfileSetupProps) {
  const prefs = profile.preferences;
  const [roles, setRoles] = useState(prefs.targetTitles.join(', '));
  const [places, setPlaces] = useState(prefs.locations.join(', '));
  const [modes, setModes] = useState<WorkMode[]>(prefs.workModes);
  const [levels, setLevels] = useState<Seniority[]>(prefs.seniority);
  const [busy, setBusy] = useState<'' | 'upload' | 'import' | 'save'>('');
  const [error, setError] = useState('');
  const [cvmindResumes, setCvmindResumes] = useState<CvmindResume[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const chosen = profile.resumes.find((r) => r.id === profile.resumeId) || null;
  const others = profile.resumes.filter((r) => r.id !== profile.resumeId);
  const [showOthers, setShowOthers] = useState(false);

  const run = async (kind: typeof busy, task: () => Promise<FinderProfile>) => {
    setBusy(kind);
    setError('');
    try {
      const next = await task();
      onChange(next);
      return next;
    } catch (err) {
      setError(getErrorMessage(err) || 'Something went wrong. Please try again.');
      return null;
    } finally {
      setBusy('');
    }
  };

  const onFile = (file: File | undefined) => {
    if (file) void run('upload', () => uploadResume(file));
    if (fileRef.current) fileRef.current.value = '';
  };

  const showMyDocuments = async () => {
    setError('');
    try {
      setCvmindResumes(await listCvmindResumes());
    } catch (err) {
      setError(getErrorMessage(err) || 'Could not load My Documents.');
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const targetTitles = splitList(roles, 5);
    if (!profile.resumes.length) return setError('Add your resume first, so jobs can be matched to it.');
    if (!targetTitles.length) return setError('Add at least one role you are looking for.');
    const saved = await run('save', () => saveProfile({ targetTitles, locations: splitList(places, 5), workModes: modes, seniority: levels }));
    if (saved) onDone(saved);
  };

  return (
    <form className="jf-setup" onSubmit={submit}>
      <header className="jf-setup-head">
        <p className="jf-kicker">{firstTime ? 'Set up in a minute' : 'Your search profile'}</p>
        <h1>{firstTime ? 'Tell us what you are looking for' : 'Edit your search profile'}</h1>
        <p className="jf-muted">Jobs are ranked by how well they fit this resume and these choices. You can change them any time.</p>
      </header>

      <section className="jf-setup-block">
        <h2><span className="jf-step-no">1</span> Your resume</h2>
        {chosen && (
          <div className="jf-resume is-on">
            <FileText size={16} />
            <span className="jf-resume-name">{chosen.label}</span>
            <span className={`jf-resume-status jf-resume-status--${statusOf(chosen)}`}>{STATUS_TEXT[statusOf(chosen)]}</span>
          </div>
        )}
        {!!chosen?.skills.length && (
          <p className="jf-resume-skills"><span>Skills we found:</span> {chosen.skills.slice(0, 12).join(', ')}</p>
        )}
        {others.length > 0 && (
          <button type="button" className="jf-link" onClick={() => setShowOthers((v) => !v)} aria-expanded={showOthers}>
            {showOthers ? 'Hide other resumes' : `Use a different resume (${others.length})`}
          </button>
        )}
        {showOthers && (
          <div className="jf-docs">
            {others.map((r) => (
              <button key={r.id} type="button" className="jf-doc" disabled={!!busy}
                onClick={() => void run('save', () => saveProfile({ defaultResumeProfileId: r.id })).then((p) => { if (p) setShowOthers(false); })}>
                <FileText size={15} /> {r.label}
                <small>{r.source === 'cvmind' ? 'Built in CVMind' : 'Uploaded'}</small>
              </button>
            ))}
          </div>
        )}
        {chosen?.status === 'failed' && <p className="jf-error">{chosen.parseError || "We couldn't read that file."} Try a PDF or DOCX with selectable text.</p>}

        <div className="jf-resume-add">
          <input ref={fileRef} type="file" accept={RESUME_FILE_TYPES} hidden onChange={(e) => onFile(e.target.files?.[0])} />
          <button type="button" className="jf-btn jf-btn--ghost" disabled={!!busy} onClick={() => fileRef.current?.click()}>
            {busy === 'upload' ? <Loader2 size={15} className="jf-spin" /> : <Upload size={15} />} Upload a resume
          </button>
          <button type="button" className="jf-btn jf-btn--ghost" disabled={!!busy} onClick={showMyDocuments}>
            <FileText size={15} /> Use one from My Documents
          </button>
        </div>
        {cvmindResumes && (
          <div className="jf-docs">
            {cvmindResumes.length === 0 && <p className="jf-muted">No resumes in My Documents yet.</p>}
            {cvmindResumes.map((w) => (
              <button key={w.id} type="button" className="jf-doc" disabled={!!busy}
                onClick={() => void run('import', () => importCvmindResume(w.id)).then((p) => { if (p) setCvmindResumes(null); })}>
                <FileText size={15} /> {w.title}
                <small>Edited {new Date(w.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</small>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="jf-setup-block">
        <h2><span className="jf-step-no">2</span> What you are looking for</h2>
        <label className="jf-field">
          <span>Roles</span>
          <input value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="e.g. Frontend Developer, React Developer" maxLength={300} />
          <small>Separate roles with commas. The first one is searched by default.</small>
        </label>
        <label className="jf-field">
          <span>Cities</span>
          <input value={places} onChange={(e) => setPlaces(e.target.value)} placeholder="e.g. Bengaluru, Pune" maxLength={200} />
        </label>
        <div className="jf-field">
          <span>Work mode</span>
          <div className="jf-pills">
            {MODES.map((m) => (
              <button key={m.value} type="button" className={`jf-pill${modes.includes(m.value) ? ' is-on' : ''}`} aria-pressed={modes.includes(m.value)} onClick={() => setModes(toggle(modes, m.value))}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="jf-field">
          <span>Experience</span>
          <div className="jf-pills">
            {LEVELS.map((l) => (
              <button key={l.value} type="button" className={`jf-pill${levels.includes(l.value) ? ' is-on' : ''}`} aria-pressed={levels.includes(l.value)} onClick={() => setLevels(toggle(levels, l.value))}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && <p className="jf-error" role="alert">{error}</p>}
      <div className="jf-setup-foot">
        {onCancel && <button type="button" className="jf-btn jf-btn--ghost" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="jf-btn jf-btn--primary" disabled={!!busy}>
          {busy === 'save' ? <Loader2 size={15} className="jf-spin" /> : <CheckCircle2 size={15} />} {firstTime ? 'Show my jobs' : 'Save'}
        </button>
      </div>
    </form>
  );
}
