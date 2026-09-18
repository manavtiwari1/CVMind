import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Plus, RefreshCw, Save, X } from 'lucide-react';
import type { ApplyMode, EmploymentType, JobPreferences, ResumeProfile, SalaryPeriod, Seniority, WorkMode } from '../../types/agent';
import { getPreferences, listResumes, savePreferences } from '../../lib/agentApi';
import ExtensionPairing from './ExtensionPairing';
import './ResumeTab.css';
import './PreferencesTab.css';

// Shape of the older, unsaved preferences state in AutoApply.tsx, used once to prefill the form
export interface LegacyPreferences {
  roles: string[];
  locations: string[];
  remote: string;
  salaryMin: string;
  salaryMax: string;
  employmentType: string;
  industry: string;
}

const SENIORITY_OPTIONS: { value: Seniority; label: string }[] = [
  { value: 'intern', label: 'Intern' }, { value: 'junior', label: 'Junior' }, { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' }, { value: 'staff', label: 'Staff / Lead' }, { value: 'principal', label: 'Principal' }
];
const WORK_MODE_OPTIONS: { value: WorkMode; label: string }[] = [
  { value: 'remote', label: 'Remote' }, { value: 'hybrid', label: 'Hybrid' }, { value: 'onsite', label: 'On-site' }
];
const EMPLOYMENT_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: 'full_time', label: 'Full-time' }, { value: 'part_time', label: 'Part-time' }, { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' }, { value: 'freelance', label: 'Freelance' }
];
const APPLY_MODE_OPTIONS: { value: ApplyMode; label: string }[] = [
  { value: 'ask', label: 'Ask me each time' },
  { value: 'extension', label: 'Fill in my browser (extension)' },
  { value: 'server', label: 'Let CVMind fill it, then I review' }
];
const EEO_FIELDS: { key: keyof JobPreferences['eeo']; label: string }[] = [
  { key: 'gender', label: 'Gender' }, { key: 'race', label: 'Race / ethnicity' }, { key: 'veteran', label: 'Veteran status' }, { key: 'disability', label: 'Disability' }
];

const joinList = (list: string[]) => list.join(',');
const splitList = (value: string) => value.split(',');

function seedFromLegacy(base: JobPreferences, legacy?: LegacyPreferences): JobPreferences {
  if (!legacy) return base;
  // The legacy form starts as Full-time with everything else empty; only real input counts as an earlier search
  const touched = legacy.roles.length > 0 || legacy.locations.length > 0 || legacy.remote !== 'All'
    || Boolean(legacy.salaryMin) || (Boolean(legacy.industry) && legacy.industry !== 'All');
  if (!touched) return base;
  const modes: Record<string, WorkMode[]> = { Remote: ['remote'], Hybrid: ['hybrid'], Onsite: ['onsite'] };
  const types: Record<string, EmploymentType> = { 'Full-time': 'full_time', 'Part-time': 'part_time', Internship: 'internship', Contract: 'contract' };
  const salary = Number.parseFloat(legacy.salaryMin);
  return {
    ...base,
    targetTitles: legacy.roles.length ? [...legacy.roles] : base.targetTitles,
    locations: legacy.locations.length ? [...legacy.locations] : base.locations,
    workModes: modes[legacy.remote] ?? base.workModes,
    employmentTypes: types[legacy.employmentType] ? [types[legacy.employmentType]] : base.employmentTypes,
    minSalary: Number.isFinite(salary) && salary > 0 ? { amount: salary, currency: 'INR', period: 'year' } : base.minSalary,
    includeIndustries: legacy.industry && legacy.industry !== 'All' ? [legacy.industry] : base.includeIndustries
  };
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter(item => item !== value) : [...list, value];
}

function CheckGroup<T extends string>({ options, selected, onChange }: { options: { value: T; label: string }[]; selected: T[]; onChange: (next: T[]) => void }) {
  return (
    <div className="aa-pref-options">
      {options.map(option => (
        <label key={option.value} className={`aa-pref-option ${selected.includes(option.value) ? 'active' : ''}`}>
          <input type="checkbox" checked={selected.includes(option.value)} onChange={() => onChange(toggle(selected, option.value))} />
          {option.label}
        </label>
      ))}
    </div>
  );
}

export default function PreferencesTab({ seed }: { seed?: LegacyPreferences }) {
  const [prefs, setPrefs] = useState<JobPreferences | null>(null);
  const [resumes, setResumes] = useState<ResumeProfile[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([getPreferences(), listResumes().catch(() => [] as ResumeProfile[])])
      .then(([{ preferences, exists }, resumeList]) => {
        if (cancelled) return;
        const initial = exists ? preferences : seedFromLegacy(preferences, seed);
        setPrefs(initial);
        setResumes(resumeList.filter(r => r.status === 'ready'));
        if (!exists && initial !== preferences) {
          setDirty(true);
          setNotice('We prefilled this from your earlier job search. Review and save to keep it.');
        } else if (!exists && resumeList.some(r => r.status !== 'failed')) {
          setNotice('Your resume is already loaded for the agent. Just set your job preferences and save.');
        }
      })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
    // Seed is only read on first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (patch: Partial<JobPreferences>) => {
    setPrefs(current => (current ? { ...current, ...patch } : current));
    setDirty(true);
    setNotice('');
  };

  const onSave = async () => {
    if (!prefs) return;
    setSaving(true); setError(''); setNotice('');
    try {
      setPrefs(await savePreferences(prefs));
      setDirty(false);
      setNotice('Preferences saved. The agent will use them to score and filter jobs.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (!prefs) {
    return (
      <div className="aa-resume-tab">
        {error ? <div className="aa-error"><AlertCircle size={16} /> {error}</div> : <div className="aa-empty"><RefreshCw size={28} className="aa-spin" /></div>}
      </div>
    );
  }

  return (
    <div className="aa-resume-tab">
      <div className="aa-resume-header">
        <div>
          <h1 className="aa-agent-tab-title">Job preferences</h1>
          <p className="aa-profile-hub-desc">Tell the agent what you're looking for. These settings shape the fit score, filter out jobs you'd never take, and answer common application questions.</p>
        </div>
      </div>

      {error && <div className="aa-error"><AlertCircle size={16} /> {error}</div>}
      {notice && <div className="aa-resume-notice"><CheckCircle2 size={16} /> {notice}</div>}

      <div className="aa-resume-detail">
        <div className="aa-resume-editor">
          <fieldset className="aa-resume-section">
            <legend className="aa-sandbox-section-title">Roles</legend>
            <label className="aa-resume-field">
              <span className="aa-label">Target job titles <span className="aa-label-hint">comma separated</span></span>
              <input className="aa-input" value={joinList(prefs.targetTitles)} placeholder="Backend Engineer, Platform Engineer" onChange={e => update({ targetTitles: splitList(e.target.value) })} />
            </label>
            <span className="aa-label">Seniority</span>
            <CheckGroup options={SENIORITY_OPTIONS} selected={prefs.seniority} onChange={seniority => update({ seniority })} />
          </fieldset>

          <fieldset className="aa-resume-section">
            <legend className="aa-sandbox-section-title">Location &amp; work style</legend>
            <label className="aa-resume-field">
              <span className="aa-label">Preferred locations <span className="aa-label-hint">comma separated</span></span>
              <input className="aa-input" value={joinList(prefs.locations)} placeholder="Bengaluru, Pune, Remote - India" onChange={e => update({ locations: splitList(e.target.value) })} />
            </label>
            <CheckGroup options={WORK_MODE_OPTIONS} selected={prefs.workModes} onChange={workModes => update({ workModes })} />
            <label className="aa-resume-check">
              <input type="checkbox" checked={prefs.willingToRelocate} onChange={e => update({ willingToRelocate: e.target.checked })} />
              I'm willing to relocate
            </label>
          </fieldset>

          <fieldset className="aa-resume-section">
            <legend className="aa-sandbox-section-title">Pay &amp; job type</legend>
            <div className="aa-resume-grid">
              <label className="aa-resume-field">
                <span className="aa-label">Minimum salary</span>
                <input className="aa-input" type="number" min={0} value={prefs.minSalary?.amount ?? ''} placeholder="Leave empty for no minimum"
                  onChange={e => update({ minSalary: e.target.value === '' ? null : { currency: 'INR', period: 'year', ...prefs.minSalary, amount: Number(e.target.value) } })} />
              </label>
              <label className="aa-resume-field">
                <span className="aa-label">Currency</span>
                <input className="aa-input" maxLength={3} value={prefs.minSalary?.currency ?? 'INR'} disabled={!prefs.minSalary}
                  onChange={e => prefs.minSalary && update({ minSalary: { ...prefs.minSalary, currency: e.target.value.toUpperCase() } })} />
              </label>
              <label className="aa-resume-field">
                <span className="aa-label">Per</span>
                <select className="aa-input" value={prefs.minSalary?.period ?? 'year'} disabled={!prefs.minSalary}
                  onChange={e => prefs.minSalary && update({ minSalary: { ...prefs.minSalary, period: e.target.value as SalaryPeriod } })}>
                  <option value="year">Year</option><option value="month">Month</option><option value="hour">Hour</option>
                </select>
              </label>
            </div>
            <CheckGroup options={EMPLOYMENT_OPTIONS} selected={prefs.employmentTypes} onChange={employmentTypes => update({ employmentTypes })} />
          </fieldset>

          <fieldset className="aa-resume-section">
            <legend className="aa-sandbox-section-title">Filters</legend>
            <div className="aa-resume-grid">
              <label className="aa-resume-field">
                <span className="aa-label">Industries to prefer <span className="aa-label-hint">comma separated</span></span>
                <input className="aa-input" value={joinList(prefs.includeIndustries)} placeholder="Fintech, SaaS" onChange={e => update({ includeIndustries: splitList(e.target.value) })} />
              </label>
              <label className="aa-resume-field">
                <span className="aa-label">Industries to avoid</span>
                <input className="aa-input" value={joinList(prefs.excludeIndustries)} placeholder="Gambling" onChange={e => update({ excludeIndustries: splitList(e.target.value) })} />
              </label>
            </div>
            <label className="aa-resume-field">
              <span className="aa-label">Never apply to these companies <span className="aa-label-hint">comma separated, e.g. your current employer</span></span>
              <input className="aa-input" value={joinList(prefs.excludedCompanies)} onChange={e => update({ excludedCompanies: splitList(e.target.value) })} />
            </label>
          </fieldset>

          <fieldset className="aa-resume-section">
            <legend className="aa-sandbox-section-title">Work authorization</legend>
            {prefs.workAuthorization.map((auth, i) => (
              <div key={i} className="aa-pref-row">
                <input className="aa-input" value={auth.country} placeholder="Country" onChange={e => update({ workAuthorization: prefs.workAuthorization.map((a, j) => (j === i ? { ...a, country: e.target.value } : a)) })} />
                <label className="aa-resume-check"><input type="checkbox" checked={auth.authorized} onChange={e => update({ workAuthorization: prefs.workAuthorization.map((a, j) => (j === i ? { ...a, authorized: e.target.checked } : a)) })} /> Authorized to work</label>
                <label className="aa-resume-check"><input type="checkbox" checked={auth.needsSponsorship} onChange={e => update({ workAuthorization: prefs.workAuthorization.map((a, j) => (j === i ? { ...a, needsSponsorship: e.target.checked } : a)) })} /> Needs visa sponsorship</label>
                <button type="button" className="aa-btn-ghost aa-btn-sm" aria-label="Remove country" onClick={() => update({ workAuthorization: prefs.workAuthorization.filter((_, j) => j !== i) })}><X size={14} /></button>
              </div>
            ))}
            <button type="button" className="aa-btn-ghost aa-btn-sm aa-pref-add" onClick={() => update({ workAuthorization: [...prefs.workAuthorization, { country: '', authorized: true, needsSponsorship: false }] })}>
              <Plus size={14} /> Add country
            </button>
          </fieldset>

          <fieldset className="aa-resume-section">
            <legend className="aa-sandbox-section-title">How the agent applies</legend>
            <div className="aa-resume-grid">
              <label className="aa-resume-field">
                <span className="aa-label">Resume to use</span>
                <select className="aa-input" value={prefs.defaultResumeProfileId ?? ''} onChange={e => update({ defaultResumeProfileId: e.target.value || null })}>
                  <option value="">My default resume</option>
                  {resumes.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </label>
              <label className="aa-resume-field">
                <span className="aa-label">Filling applications</span>
                <select className="aa-input" value={prefs.applyMode} onChange={e => update({ applyMode: e.target.value as ApplyMode })}>
                  {APPLY_MODE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <label className="aa-resume-field">
                <span className="aa-label">Only suggest jobs scoring at least</span>
                <input className="aa-input" type="number" min={0} max={100} value={prefs.minScoreToSuggest} onChange={e => update({ minScoreToSuggest: Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))) })} />
              </label>
              <label className="aa-resume-field">
                <span className="aa-label">Max applications per day</span>
                <input className="aa-input" type="number" min={1} max={100} value={prefs.dailyApplyCap} onChange={e => update({ dailyApplyCap: Math.max(1, Math.min(100, Math.round(Number(e.target.value) || 1))) })} />
              </label>
              <label className="aa-resume-field">
                <span className="aa-label">Notice period</span>
                <input className="aa-input" value={prefs.noticePeriod} placeholder="e.g. 30 days" onChange={e => update({ noticePeriod: e.target.value })} />
              </label>
            </div>
          </fieldset>

          <fieldset className="aa-resume-section">
            <legend className="aa-sandbox-section-title">Voluntary disclosure questions</legend>
            <p className="aa-label-hint">Used only when a form asks. "decline" means the agent picks "prefer not to say".</p>
            <div className="aa-resume-grid">
              {EEO_FIELDS.map(field => (
                <label key={field.key} className="aa-resume-field">
                  <span className="aa-label">{field.label}</span>
                  <input className="aa-input" value={prefs.eeo[field.key]} onChange={e => update({ eeo: { ...prefs.eeo, [field.key]: e.target.value } })} />
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="aa-resume-section">
            <legend className="aa-sandbox-section-title">Saved answers</legend>
            <p className="aa-label-hint">Answers you give often, like "Why do you want to work here?" The agent reuses them instead of writing new ones.</p>
            {prefs.standardAnswers.map((item, i) => (
              <div key={i} className="aa-resume-entry">
                <label className="aa-resume-field aa-resume-field-wide">
                  <span className="aa-label">Question</span>
                  <input className="aa-input" value={item.question} onChange={e => update({ standardAnswers: prefs.standardAnswers.map((a, j) => (j === i ? { ...a, question: e.target.value } : a)) })} />
                </label>
                <label className="aa-resume-field aa-resume-field-wide">
                  <span className="aa-label">Answer</span>
                  <textarea className="aa-input" rows={3} value={item.answer} onChange={e => update({ standardAnswers: prefs.standardAnswers.map((a, j) => (j === i ? { ...a, answer: e.target.value } : a)) })} />
                </label>
                <button type="button" className="aa-btn-ghost aa-btn-sm" onClick={() => update({ standardAnswers: prefs.standardAnswers.filter((_, j) => j !== i) })}><X size={14} /> Remove</button>
              </div>
            ))}
            <button type="button" className="aa-btn-ghost aa-btn-sm aa-pref-add" onClick={() => update({ standardAnswers: [...prefs.standardAnswers, { key: '', question: '', answer: '' }] })}>
              <Plus size={14} /> Add answer
            </button>
          </fieldset>

          <ExtensionPairing />
        </div>

        {dirty && (
          <div className="aa-resume-savebar">
            <span>You have unsaved changes</span>
            <button className="aa-btn-primary aa-btn-sm" disabled={saving} onClick={onSave}>
              {saving ? <RefreshCw size={14} className="aa-spin" /> : <Save size={14} />} Save preferences
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
