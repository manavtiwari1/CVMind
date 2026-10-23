import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Bell, BellOff, Camera, Shield, Trash2 } from 'lucide-react';
import { disablePush, enablePush, isInstalled, isIos, pushState } from '../push';
import { PhotoDialog } from '../../components/ResumePhoto';
import { api, saveSession, loadSession } from '../api';
import { confirmDialog } from '../confirm';
import type { TeamAccount } from '../api';
import { useTeam } from '../store';
import { Avatar, Spinner } from '../ui';
import { fileUrl, uploadFile } from '../upload';

// Grey circle with initials, shown in the photo dialog when there is no photo yet
const placeholder = (name: string) => {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#e5e7eb"/><text x="50%" y="54%" font-family="Inter,Arial,sans-serif" font-size="72" font-weight="700" fill="#6b7280" text-anchor="middle" dominant-baseline="middle">${initials.replace(/[<&>]/g, '')}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

// The dialog hands back a cropped JPEG as a data URL; upload it like any other file
async function dataUrlToFile(dataUrl: string) {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' });
}

export default function Profile() {
  const { me, setMe, person, toast, reloadPeople } = useTeam();
  const [name, setName] = useState(me.name);
  const [statusText, setStatusText] = useState(me.statusText);
  const [email, setEmail] = useState(me.email);
  const [notifyEmail, setNotifyEmail] = useState(me.notifyEmail);
  const [busy, setBusy] = useState('');
  const [photoDialog, setPhotoDialog] = useState<string | null>(null);

  const apply = (admin: TeamAccount) => {
    setMe(admin);
    const session = loadSession();
    if (session) saveSession({ ...session, admin });
    reloadPeople().catch(() => {});
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy('profile');
    try {
      const { admin } = await api<{ admin: TeamAccount }>('/me', { method: 'PATCH', body: { name, statusText, notifyEmail, email } });
      apply(admin);
      toast('Profile saved');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save.', 'error');
    } finally {
      setBusy('');
    }
  };

  // Same flow as the resume builder: preview → upload → drag and zoom to crop → accept → save
  const openPhoto = async () => {
    let current = placeholder(me.name);
    if (me.avatarFileId) current = await fileUrl(me.avatarFileId).catch(() => current);
    setPhotoDialog(current);
  };

  const savePhoto = async (dataUrl: string) => {
    setPhotoDialog(null);
    setBusy('photo');
    try {
      const uploaded = await uploadFile(await dataUrlToFile(dataUrl), { scope: 'avatar' });
      const { admin } = await api<{ admin: TeamAccount }>('/me', { method: 'PATCH', body: { avatarFileId: uploaded.id } });
      apply(admin);
      toast('Photo updated');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not upload the photo.', 'error');
    } finally {
      setBusy('');
    }
  };

  const removePhoto = async () => {
    if (!(await confirmDialog({ title: 'Remove your profile photo?', message: 'Your initials will show instead. You can add a new photo any time.', confirmLabel: 'Remove photo', danger: true }))) return;
    setBusy('remove');
    try {
      const { admin } = await api<{ admin: TeamAccount }>('/me', { method: 'PATCH', body: { avatarFileId: null } });
      apply(admin);
      toast('Photo removed');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not remove the photo.', 'error');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="tm-page narrow">
      <header className="tm-page-head"><h1>Profile and settings</h1></header>
      <form className="tm-card pad tm-form" onSubmit={save}>
        <div className="tm-profile-photo">
          <Avatar person={person(me.id)} size={72} />
          <div className="tm-photo-actions">
            <button type="button" className="tm-btn sm" onClick={openPhoto} disabled={!!busy}>{busy === 'photo' ? <Spinner size={14} /> : <Camera size={14} />} {me.avatarFileId ? 'Change photo' : 'Add photo'}</button>
            {me.avatarFileId && <button type="button" className="tm-btn sm ghost tm-danger" onClick={removePhoto} disabled={!!busy}>{busy === 'remove' ? <Spinner size={14} /> : <Trash2 size={14} />} Remove photo</button>}
          </div>
          <span className="tm-hint">JPG, PNG or WebP. You can drag and zoom to fit it in the circle.</span>
        </div>
        <div className="tm-field">
          <label htmlFor="pf-name">Display name</label>
          <input id="pf-name" className="tm-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </div>
        <div className="tm-field">
          <label htmlFor="pf-status">Status</label>
          <input id="pf-status" className="tm-input" value={statusText} onChange={(e) => setStatusText(e.target.value)} maxLength={80} placeholder="🏖 On leave till Friday" />
        </div>
        <div className="tm-field">
          <label htmlFor="pf-email">Email</label>
          <input id="pf-email" type="email" className="tm-input" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} placeholder="you@cvmind.in" autoComplete="email" />
          <span className="tm-hint">Notifications, reminders and announcements are sent here. You can also sign in with it.</span>
        </div>
        <div className="tm-field">
          <span className="tm-label">Account</span>
          <p className="tm-muted">@{me.username} · {me.roleLabel}</p>
        </div>
        <label className="tm-check"><input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} /> <span><strong>Email me</strong> about mentions, messages and tasks I haven't seen for 30 minutes</span></label>
        <div><button type="submit" className="tm-btn primary" disabled={busy === 'profile'}>{busy === 'profile' && <Spinner size={14} />} Save</button></div>
      </form>
      <PushCard onAccount={apply} />
      <PasswordCard />
      <PrivacyCard />
      {photoDialog && <PhotoDialog currentSrc={photoDialog} onSave={savePhoto} onClose={() => setPhotoDialog(null)} />}
    </div>
  );
}

// What CVMind Team keeps and who sees it, in plain words
function PrivacyCard() {
  return (
    <section className="tm-card pad tm-privacy">
      <h2 className="tm-h2"><Shield size={16} /> Your data on CVMind Team</h2>
      <ul>
        <li><strong>Check-ins, leave and attendance</strong> are seen by you and by managers only.</li>
        <li><strong>Leo</strong> reads only what you can already see. When someone presses Summarise, Draft task or Progress report, that text is sent to DeepSeek, our AI provider, to write the answer.</li>
        <li><strong>Meetings</strong> go directly between browsers. When live captions are on, your browser turns your speech into text; the text is saved with the meeting and sent to DeepSeek for Leo's notes. You can stop being transcribed from the meeting's ⋮ menu.</li>
        <li><strong>Recordings</strong> are only made by the host, with a banner for everyone, and are visible to the people who could join the meeting.</li>
        <li><strong>Browser notifications</strong> go to the devices you turn them on for, and stop when you sign out there.</li>
      </ul>
    </section>
  );
}

// Browser notifications are per device: each browser or phone is turned on here separately
function PushCard({ onAccount }: { onAccount: (a: TeamAccount) => void }) {
  const { me, toast } = useTeam();
  const [state, setState] = useState<'on' | 'off' | 'denied' | 'unsupported' | 'loading'>('loading');
  const [busy, setBusy] = useState(false);
  useEffect(() => { pushState().then(setState).catch(() => setState('unsupported')); }, []);
  const iosNeedsInstall = isIos() && !isInstalled();

  const turnOn = async () => {
    setBusy(true);
    try {
      await enablePush();
      if (!me.notifyPush) onAccount((await api<{ admin: TeamAccount }>('/me', { method: 'PATCH', body: { notifyPush: true } })).admin);
      setState('on');
      toast('Notifications are on for this browser');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not turn on notifications.', 'error');
      setState(await pushState().catch(() => 'unsupported' as const));
    } finally {
      setBusy(false);
    }
  };
  const turnOff = async () => {
    setBusy(true);
    await disablePush();
    setState('off');
    setBusy(false);
    toast('Notifications are off for this browser');
  };

  return (
    <section className="tm-card pad tm-form">
      <h2 className="tm-h2"><Bell size={16} /> Browser notifications</h2>
      <p className="tm-muted">Get mentions, messages, tasks, check-in reminders and leave decisions on this device, even when CVMind Team is closed.</p>
      {state === 'loading' && <Spinner />}
      {state === 'unsupported' && (iosNeedsInstall
        ? <p className="tm-notice">On iPhone, first add CVMind Team to your Home Screen: tap <strong>Share</strong> in Safari, then <strong>Add to Home Screen</strong>. Open it from there and turn notifications on.</p>
        : <p className="tm-notice">This browser doesn't support notifications. Try Chrome, Edge or Firefox.</p>)}
      {state === 'denied' && <p className="tm-notice amber"><BellOff size={15} /> Notifications are blocked for this site. Allow them in your browser's site settings, then reload.</p>}
      {state === 'off' && <div><button type="button" className="tm-btn primary" disabled={busy} onClick={turnOn}>{busy && <Spinner size={14} />} <Bell size={15} /> Turn on for this browser</button></div>}
      {state === 'on' && (
        <div className="tm-inline">
          <span className="tm-badge status-approved">On for this browser</span>
          <button type="button" className="tm-btn ghost" disabled={busy} onClick={turnOff}><BellOff size={15} /> Turn off</button>
        </div>
      )}
    </section>
  );
}

function PasswordCard() {
  const { toast } = useTeam();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/me/password', { method: 'POST', body: { currentPassword: current, newPassword: next } });
      setCurrent('');
      setNext('');
      toast('Password changed');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not change the password.', 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="tm-card pad tm-form" onSubmit={submit}>
      <h2 className="tm-h2">Change password</h2>
      <div className="tm-form-row">
        <div className="tm-field"><label htmlFor="pw-cur">Current password</label><input id="pw-cur" type="password" className="tm-input" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" /></div>
        <div className="tm-field"><label htmlFor="pw-new">New password</label><input id="pw-new" type="password" className="tm-input" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></div>
      </div>
      <span className="tm-hint">At least 10 characters. This also changes your admin panel password.</span>
      <div><button type="submit" className="tm-btn" disabled={busy || !current || next.length < 10}>{busy && <Spinner size={14} />} Change password</button></div>
    </form>
  );
}
