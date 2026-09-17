import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Upload, FileText, RefreshCw, Star, Trash2, Download, AlertCircle, CheckCircle2, Save, Plus, X } from 'lucide-react';
import type { ResumeProfile, ResumeEditable, EmploymentType, DegreeLevel } from '../../types/agent';
import {
  ApiError, listResumes, uploadResume, importFromWork, updateResume, reparseResume,
  setDefaultResume, deleteResume, downloadResumeFile, listCvmindResumes, toEditable, RESUME_FILE_TYPES, type CvmindResume
} from '../../lib/agentApi';
import './ResumeTab.css';

const POLL_MS = 3000;
const STATUS_LABEL: Record<ResumeProfile['status'], string> = { queued: 'Queued', parsing: 'Parsing…', ready: 'Ready', failed: 'Failed' };
const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: 'full_time', label: 'Full-time' }, { value: 'part_time', label: 'Part-time' }, { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' }, { value: 'freelance', label: 'Freelance' }, { value: 'other', label: 'Other' }
];
const DEGREE_LEVELS: { value: DegreeLevel; label: string }[] = [
  { value: 'none', label: 'None' }, { value: 'high_school', label: 'High school' }, { value: 'associate', label: 'Associate / Diploma' },
  { value: 'bachelor', label: "Bachelor's" }, { value: 'master', label: "Master's" }, { value: 'phd', label: 'PhD' }
];
const CONTACT_FIELDS: { key: keyof ResumeEditable['contact']; label: string; type?: string }[] = [
  { key: 'name', label: 'Full name' }, { key: 'email', label: 'Email', type: 'email' }, { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'location', label: 'Location' }, { key: 'linkedin', label: 'LinkedIn URL' }, { key: 'github', label: 'GitHub URL' },
  { key: 'portfolio', label: 'Portfolio URL' }
];

const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : '');
// Comma lists keep raw spacing while typing; the server trims and drops empty entries
const splitComma = (value: string) => value.split(',');

function TextField({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="aa-resume-field">
      <span className="aa-label">{label}</span>
      <input className="aa-input" type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

function ListField({ label, hint, value, onChange, rows = 4 }: { label: string; hint: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return (
    <label className="aa-resume-field aa-resume-field-wide">
      <span className="aa-label">{label} <span className="aa-label-hint">{hint}</span></span>
      <textarea className="aa-input" rows={rows} value={value} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

// initialSelectedId opens a specific resume, e.g. when Agent Applications sends the user here to edit it
export default function ResumeTab({ initialSelectedId }: { initialSelectedId?: string | null } = {}) {
  const [resumes, setResumes] = useState<ResumeProfile[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const [edits, setEdits] = useState<{ resumeId: string; draft: ResumeEditable } | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [works, setWorks] = useState<CvmindResume[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = resumes.find(r => r.id === selectedId) || null;

  const applyList = useCallback((data: ResumeProfile[]) => {
    setResumes(data);
    setLoaded(true);
    setSelectedId(current => (current && data.some(r => r.id === current) ? current : data.find(r => r.isDefault)?.id ?? data[0]?.id ?? null));
  }, []);

  const refresh = useCallback(async () => applyList(await listResumes()), [applyList]);

  useEffect(() => {
    listResumes().then(applyList).catch(e => { setError(e.message); setLoaded(true); });
  }, [applyList]);

  const inFlight = resumes.some(r => r.status === 'queued' || r.status === 'parsing');
  useEffect(() => {
    if (!inFlight) return;
    const timer = setInterval(() => { refresh().catch(() => {}); }, POLL_MS);
    return () => clearInterval(timer);
  }, [inFlight, refresh]);

  // The editor shows server data until the user edits; edits stick to their resume until saved or discarded
  const baseDraft = useMemo(() => (selected?.status === 'ready' && selected.structured ? toEditable(selected.structured) : null), [selected]);
  const activeEdits = edits?.resumeId === selectedId ? edits : null;
  const dirty = activeEdits !== null;
  const draft = activeEdits?.draft ?? baseDraft;

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

  const edit = (update: (draft: ResumeEditable) => void) => {
    if (!draft || !selectedId) return;
    const next = structuredClone(draft);
    update(next);
    setEdits({ resumeId: selectedId, draft: next });
  };

  const selectResume = (id: string) => {
    if (id === selectedId) return;
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
    setEdits(null);
    setSelectedId(id);
  };

  const onUpload = (file: File) => run('upload', async () => {
    const result = await uploadResume(file);
    setEdits(null);
    await refresh();
    setSelectedId(result.data.id);
    setNotice(result.deduped ? 'This file was already uploaded.' : 'Resume uploaded. Parsing usually takes under a minute.');
  });

  const onImport = (workId: string) => run('import', async () => {
    const result = await importFromWork(workId);
    setWorks(null);
    setEdits(null);
    await refresh();
    setSelectedId(result.data.id);
    setNotice(result.deduped ? 'This resume is already imported and up to date.' : 'Importing your CVMind resume…');
  });

  const onSave = () => run('save', async () => {
    if (!selected || !draft) return;
    await updateResume(selected.id, { structured: draft });
    setEdits(null);
    await refresh();
    setNotice('Saved. The agent will use your edits for matching and applications.');
  });

  const onReparse = (resume: ResumeProfile) => run('reparse', async () => {
    try {
      await reparseResume(resume.id, false);
    } catch (e) {
      if (!(e instanceof ApiError && e.code === 'USER_EDITED')) throw e;
      if (!window.confirm(e.message)) return;
      await reparseResume(resume.id, true);
    }
    setEdits(null);
    await refresh();
  });

  const onDelete = (resume: ResumeProfile) => {
    if (!window.confirm(`Delete "${resume.label}"? This removes the parsed profile and the uploaded file.`)) return;
    run('delete', async () => {
      await deleteResume(resume.id);
      setEdits(null);
      await refresh();
    });
  };

  const onDownload = (resume: ResumeProfile) => run('download', async () => {
    const blob = await downloadResumeFile(resume.id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = resume.originalFileRef?.filename || 'resume';
    link.click();
    URL.revokeObjectURL(url);
  });

  const renderEditor = (value: ResumeEditable) => (
    <div className="aa-resume-editor">
      <fieldset className="aa-resume-section">
        <legend className="aa-sandbox-section-title">Contact</legend>
        <div className="aa-resume-grid">
          {CONTACT_FIELDS.map(field => (
            <TextField key={field.key} label={field.label} type={field.type} value={value.contact[field.key]} onChange={v => edit(d => { d.contact[field.key] = v; })} />
          ))}
          <TextField label="Headline" value={value.headline} onChange={v => edit(d => { d.headline = v; })} placeholder="e.g. Senior Backend Engineer" />
        </div>
        <ListField label="Summary" hint="" rows={3} value={value.summary} onChange={v => edit(d => { d.summary = v; })} />
      </fieldset>

      <fieldset className="aa-resume-section">
        <legend className="aa-sandbox-section-title">Experience</legend>
        {value.experience.map((role, i) => (
          <div key={i} className="aa-resume-entry">
            <div className="aa-resume-grid">
              <TextField label="Title" value={role.title} onChange={v => edit(d => { d.experience[i].title = v; })} />
              <TextField label="Company" value={role.company} onChange={v => edit(d => { d.experience[i].company = v; })} />
              <label className="aa-resume-field">
                <span className="aa-label">Type</span>
                <select className="aa-input" value={role.employmentType} onChange={e => edit(d => { d.experience[i].employmentType = e.target.value as EmploymentType; })}>
                  {EMPLOYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <TextField label="Location" value={role.location} onChange={v => edit(d => { d.experience[i].location = v; })} />
              <TextField label="Start (YYYY-MM)" value={role.startDate} onChange={v => edit(d => { d.experience[i].startDate = v; })} placeholder="2021-06" />
              {!role.current && <TextField label="End (YYYY-MM)" value={role.endDate} onChange={v => edit(d => { d.experience[i].endDate = v; })} placeholder="2023-12" />}
              <label className="aa-resume-check">
                <input type="checkbox" checked={role.current} onChange={e => edit(d => { d.experience[i].current = e.target.checked; if (e.target.checked) d.experience[i].endDate = ''; })} />
                I currently work here
              </label>
            </div>
            <ListField label="Achievements" hint="one per line" value={role.bullets.join('\n')} onChange={v => edit(d => { d.experience[i].bullets = v.split('\n'); })} />
            <TextField label="Skills used (comma separated)" value={role.skills.join(',')} onChange={v => edit(d => { d.experience[i].skills = splitComma(v); })} />
            <button type="button" className="aa-btn-ghost aa-btn-sm" onClick={() => edit(d => { d.experience.splice(i, 1); })}><X size={14} /> Remove role</button>
          </div>
        ))}
        <button type="button" className="aa-btn-ghost aa-btn-sm" onClick={() => edit(d => { d.experience.push({ company: '', title: '', employmentType: 'full_time', startDate: '', endDate: '', current: false, location: '', skills: [], bullets: [] }); })}>
          <Plus size={14} /> Add role
        </button>
      </fieldset>

      <fieldset className="aa-resume-section">
        <legend className="aa-sandbox-section-title">Education</legend>
        {value.education.map((edu, i) => (
          <div key={i} className="aa-resume-entry">
            <div className="aa-resume-grid">
              <TextField label="Institution" value={edu.institution} onChange={v => edit(d => { d.education[i].institution = v; })} />
              <TextField label="Degree" value={edu.degree} onChange={v => edit(d => { d.education[i].degree = v; })} />
              <label className="aa-resume-field">
                <span className="aa-label">Level</span>
                <select className="aa-input" value={edu.degreeLevel} onChange={e => edit(d => { d.education[i].degreeLevel = e.target.value as DegreeLevel; })}>
                  {DEGREE_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </label>
              <TextField label="Field of study" value={edu.field} onChange={v => edit(d => { d.education[i].field = v; })} />
              <TextField label="Graduation year" value={edu.endYear} onChange={v => edit(d => { d.education[i].endYear = v; })} />
              <TextField label="GPA / %" value={edu.gpa} onChange={v => edit(d => { d.education[i].gpa = v; })} />
            </div>
            <button type="button" className="aa-btn-ghost aa-btn-sm" onClick={() => edit(d => { d.education.splice(i, 1); })}><X size={14} /> Remove</button>
          </div>
        ))}
        <button type="button" className="aa-btn-ghost aa-btn-sm" onClick={() => edit(d => { d.education.push({ institution: '', degree: '', degreeLevel: 'bachelor', field: '', endYear: '', gpa: '' }); })}>
          <Plus size={14} /> Add education
        </button>
      </fieldset>

      <fieldset className="aa-resume-section">
        <legend className="aa-sandbox-section-title">Skills, projects &amp; more</legend>
        <TextField
          label="Skills (comma separated)"
          value={value.skills.map(s => s.name).join(',')}
          onChange={v => edit(d => {
            const categories = new Map(d.skills.map(s => [s.name.trim().toLowerCase(), s.category]));
            d.skills = splitComma(v).map(name => ({ name, category: categories.get(name.trim().toLowerCase()) ?? 'technical' }));
          })}
        />
        {value.projects.map((project, i) => (
          <div key={i} className="aa-resume-entry">
            <TextField label="Project name" value={project.name} onChange={v => edit(d => { d.projects[i].name = v; })} />
            <ListField label="Highlights" hint="one per line" rows={3} value={project.bullets.join('\n')} onChange={v => edit(d => { d.projects[i].bullets = v.split('\n'); })} />
            <TextField label="Skills used (comma separated)" value={project.skills.join(',')} onChange={v => edit(d => { d.projects[i].skills = splitComma(v); })} />
            <button type="button" className="aa-btn-ghost aa-btn-sm" onClick={() => edit(d => { d.projects.splice(i, 1); })}><X size={14} /> Remove project</button>
          </div>
        ))}
        <button type="button" className="aa-btn-ghost aa-btn-sm" onClick={() => edit(d => { d.projects.push({ name: '', skills: [], bullets: [] }); })}>
          <Plus size={14} /> Add project
        </button>
        <ListField
          label="Certifications"
          hint="one per line"
          rows={3}
          value={value.certifications.map(c => c.name).join('\n')}
          onChange={v => edit(d => {
            const existing = new Map(d.certifications.map(c => [c.name, c]));
            d.certifications = v.split('\n').map(name => existing.get(name) ?? { name, issuer: '', year: '' });
          })}
        />
        <TextField label="Languages (comma separated)" value={value.languages.join(',')} onChange={v => edit(d => { d.languages = splitComma(v); })} />
      </fieldset>
    </div>
  );

  const renderDetail = (resume: ResumeProfile) => (
    <>
      <div className="aa-resume-detail-head">
        <div>
          <h2 className="aa-resume-detail-title">{resume.label}</h2>
          <p className="aa-label-hint">
            {resume.source === 'cvmind' ? 'Built in CVMind' : `Uploaded ${resume.originalFileRef?.filename || 'file'}`} · updated {formatDate(resume.updatedAt)}
            {resume.userEdited && ' · edited by you'}
          </p>
          {resume.derived && resume.status === 'ready' && (
            <div className="aa-resume-chips">
              <span className="aa-resume-chip">{resume.derived.totalYearsExperience} yrs experience</span>
              <span className="aa-resume-chip">{resume.derived.seniority} level</span>
              <span className="aa-resume-chip">{resume.derived.normalizedSkillSet.length} skills</span>
              <span className="aa-resume-chip">{resume.embeddedBullets} bullets indexed</span>
            </div>
          )}
        </div>
        <div className="aa-resume-actions">
          {!resume.isDefault && <button className="aa-btn-ghost aa-btn-sm" disabled={!!busy} onClick={() => run('default', async () => { await setDefaultResume(resume.id); await refresh(); })}><Star size={14} /> Make default</button>}
          <button className="aa-btn-ghost aa-btn-sm" disabled={!!busy || resume.status === 'queued' || resume.status === 'parsing'} onClick={() => onReparse(resume)}><RefreshCw size={14} /> Re-parse</button>
          {resume.source === 'upload' && <button className="aa-btn-ghost aa-btn-sm" disabled={!!busy} onClick={() => onDownload(resume)}><Download size={14} /> Original</button>}
          <button className="aa-btn-ghost aa-btn-sm aa-resume-danger" disabled={!!busy} onClick={() => onDelete(resume)}><Trash2 size={14} /> Delete</button>
        </div>
      </div>

      {resume.outOfDate && (
        <div className="aa-resume-warning">
          <AlertCircle size={16} /> You changed this resume in the CVMind builder since it was imported.
          <button className="aa-btn-primary aa-btn-sm" disabled={!!busy} onClick={() => resume.originalFileRef?.workId && onImport(resume.originalFileRef.workId)}>Re-sync</button>
        </div>
      )}
      {resume.sourceMissing && <div className="aa-resume-warning"><AlertCircle size={16} /> The CVMind resume this was imported from has been deleted.</div>}

      {(resume.status === 'queued' || resume.status === 'parsing') && (
        <div className="aa-empty"><RefreshCw size={28} className="aa-spin" /><p>Reading your resume and building a structured profile…</p></div>
      )}
      {resume.status === 'failed' && (
        <div className="aa-error">
          <AlertCircle size={16} /> {resume.parseError || 'We could not parse this resume.'}
          <button className="aa-btn-ghost aa-btn-sm" disabled={!!busy} onClick={() => onReparse(resume)}>Try again</button>
        </div>
      )}
      {resume.status === 'ready' && draft && renderEditor(draft)}

      {dirty && (
        <div className="aa-resume-savebar">
          <span>You have unsaved changes</span>
          <button className="aa-btn-ghost aa-btn-sm" disabled={!!busy} onClick={() => setEdits(null)}>Discard</button>
          <button className="aa-btn-primary aa-btn-sm" disabled={!!busy} onClick={onSave}>
            {busy === 'save' ? <RefreshCw size={14} className="aa-spin" /> : <Save size={14} />} Save changes
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="aa-resume-tab">
      <div className="aa-resume-header">
        <div>
          <h1 className="aa-agent-tab-title">Agent resumes</h1>
          <p className="aa-profile-hub-desc">Upload a resume or import one you built in CVMind. The agent turns it into a structured profile it uses to score, tailor and fill applications.</p>
        </div>
        <div className="aa-resume-actions">
          <input ref={fileRef} type="file" hidden accept={RESUME_FILE_TYPES} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) onUpload(file); }} />
          <button className="aa-btn-primary" disabled={!!busy} onClick={() => fileRef.current?.click()}>
            {busy === 'upload' ? <RefreshCw size={15} className="aa-spin" /> : <Upload size={15} />} Upload resume
          </button>
          <button className="aa-btn-ghost" disabled={!!busy} onClick={() => run('works', async () => setWorks(await listCvmindResumes()))}>
            <FileText size={15} /> Import from CVMind
          </button>
        </div>
      </div>

      {error && <div className="aa-error"><AlertCircle size={16} /> {error}</div>}
      {notice && <div className="aa-resume-notice"><CheckCircle2 size={16} /> {notice}</div>}

      {works && (
        <div className="aa-resume-picker">
          <div className="aa-resume-picker-head">
            <strong>Your CVMind resumes</strong>
            <button className="aa-btn-ghost aa-btn-sm" aria-label="Close" onClick={() => setWorks(null)}><X size={14} /></button>
          </div>
          {works.length === 0 ? (
            <p className="aa-label-hint">You haven't saved any resumes in the CVMind builder yet.</p>
          ) : (
            <ul>
              {works.map(work => (
                <li key={work.id}>
                  <span>{work.title}<small>Updated {formatDate(work.updatedAt)}</small></span>
                  <button className="aa-btn-primary aa-btn-sm" disabled={!!busy} onClick={() => onImport(work.id)}>Import</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!loaded ? (
        <div className="aa-empty"><RefreshCw size={28} className="aa-spin" /></div>
      ) : resumes.length === 0 ? (
        <div className="aa-empty">
          <FileText size={36} />
          <p>No resumes yet. Upload a PDF, DOCX or TXT file, or import a resume from the CVMind builder.</p>
        </div>
      ) : (
        <div className="aa-resume-layout">
          <ul className="aa-resume-list">
            {resumes.map(resume => (
              <li key={resume.id}>
                <button className={`aa-resume-item ${resume.id === selectedId ? 'active' : ''}`} onClick={() => selectResume(resume.id)}>
                  <span className="aa-resume-item-label">
                    {resume.isDefault && <Star size={13} className="aa-resume-star" />} {resume.label}
                  </span>
                  <span className="aa-resume-item-meta">
                    <span className={`aa-resume-status is-${resume.status}`}>{STATUS_LABEL[resume.status]}</span>
                    {resume.source === 'cvmind' ? 'CVMind' : 'Upload'}
                    {resume.outOfDate && ' · out of date'}
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
