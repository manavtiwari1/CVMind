import { useEffect, useState } from 'react';
import { deleteCareerProfile, getCareerProfile, saveCareerProfile, type CareerProfile, type CareerProfileData } from '../chat/chatApi';

// Account page: see, correct or delete what Leo remembers. A field changed here is the user's own,
// so a resume attached later can't overwrite it.

const TEXT_FIELDS: { key: 'fullName' | 'email' | 'phone' | 'location' | 'linkedin' | 'targetRole'; label: string }[] = [
  { key: 'fullName', label: 'Full name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'location', label: 'City' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'targetRole', label: 'Target role' },
];

export default function AccountCareerProfile() {
  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [draft, setDraft] = useState<CareerProfileData | null>(null);
  const [skills, setSkills] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const show = (next: CareerProfile) => {
    setProfile(next);
    setDraft(next.data);
    setSkills(next.data.skills.join(', '));
  };

  // Hidden when Agent Mode is switched off or the request fails
  useEffect(() => { getCareerProfile().then(show).catch(() => {}); }, []);

  if (!profile || !draft) return null;

  const save = async () => {
    setBusy(true);
    setMessage(null);
    try {
      show(await saveCareerProfile({ ...draft, skills: skills.split(',').map((s) => s.trim()).filter(Boolean) }));
      setMessage({ ok: true, text: 'Saved. Leo will use these details.' });
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete your Career Profile? Leo will forget your saved resume and details.')) return;
    setBusy(true);
    setMessage(null);
    try {
      await deleteCareerProfile();
      show(await getCareerProfile());
      setMessage({ ok: true, text: 'Your Career Profile is deleted.' });
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const hasAnything = profile.hasData || !!profile.resumeName;
  const without = <K extends 'education' | 'experience' | 'projects' | 'achievements'>(key: K, index: number) =>
    setDraft({ ...draft, [key]: (draft[key] as unknown[]).filter((_, i) => i !== index) } as CareerProfileData);

  const lists = [
    ...draft.education.map((e, i) => ({ id: `education-${i}`, text: [e.degree, e.university, e.gradYear].filter(Boolean).join(', '), drop: () => without('education', i) })),
    ...draft.experience.map((e, i) => ({ id: `experience-${i}`, text: [e.jobTitle, e.company].filter(Boolean).join(' at '), drop: () => without('experience', i) })),
    ...draft.projects.map((p, i) => ({ id: `projects-${i}`, text: p.name, drop: () => without('projects', i) })),
    ...draft.achievements.map((a, i) => ({ id: `achievements-${i}`, text: a.title, drop: () => without('achievements', i) })),
  ];

  return (
    <div className="acct-field">
      <span className="acct-label">Leo's Career Profile</span>
      {!hasAnything && <span className="acct-hint">Leo hasn't saved anything yet. Attach a resume in the Leo chat, or tell Leo about yourself.</span>}
      {hasAnything && (
        <>
          <span className="acct-hint">Leo uses this in every chat, so you don't have to repeat yourself.{profile.resumeName ? ` Saved resume: ${profile.resumeName}.` : ''}</span>
          {TEXT_FIELDS.map(({ key, label }) => (
            <label key={key} className="acct-career-row">
              <span className="acct-hint">{label}</span>
              <input className="acct-input" value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
            </label>
          ))}
          <label className="acct-career-row">
            <span className="acct-hint">Skills, separated by commas</span>
            <input className="acct-input" value={skills} onChange={(e) => setSkills(e.target.value)} />
          </label>
          {lists.length > 0 && (
            <ul className="acct-career-list">
              {lists.map((item) => (
                <li key={item.id}>
                  <span>{item.text}</span>
                  <button type="button" className="acct-link" onClick={item.drop}>Remove</button>
                </li>
              ))}
            </ul>
          )}
          <div className="acct-career-actions">
            <button type="button" className="acct-btn" disabled={busy} onClick={() => void save()}>Save changes</button>
            <button type="button" className="acct-btn danger" disabled={busy} onClick={() => void remove()}>Delete profile</button>
          </div>
        </>
      )}
      {message && <span className={`acct-msg ${message.ok ? 'ok' : 'error'}`}>{message.text}</span>}
    </div>
  );
}
