import { useEffect, useState } from 'react';
import {
  ArrowLeft, User, CreditCard, FileText, Crown, Wand2, ListPlus, Files, BadgeCheck,
  Camera, Loader2, Edit3, Globe, Trash2, AlertCircle, X,
} from 'lucide-react';
import { API_BASE } from '../lib/apiBase';
import { authFetch } from '../lib/authFetch';
import { readUser, saveUser, isProUser, USER_CHANGE_EVENT } from '../lib/currentUser';
import { getErrorMessage } from '../utils/errors';
import type { LoadedWork, SavedWork, StoredUser } from '../types/api';
import './Account.css';

type Tab = 'profile' | 'billing' | 'documents';
type ListedWork = SavedWork & { _id: string; createdAt: string };

interface AccountProps {
  setCurrentPage: (page: string) => void;
  handleSignOut: () => void;
  setLoadedWork: (work: LoadedWork | null) => void;
}

const WORK_LABELS: Record<string, string> = {
  'cover-letter': 'Cover Letter',
  linkedin: 'LinkedIn Audit',
  'linkedin-bio': 'LinkedIn Bio',
  'linkedin-outreach': 'Outreach DM',
  'career-courses': 'Skill Gaps',
  'elevator-pitch': 'Elevator Pitch',
  'career-roadmap': 'Roadmap AI',
  prep: 'AI Prep',
};

// Tool pages that can reopen their own saved work; everything else opens in the resume builder
const WORK_PAGES = ['linkedin', 'linkedin-bio', 'linkedin-outreach', 'career-courses', 'elevator-pitch', 'career-roadmap', 'prep'];

const PRO_PERKS = [
  { icon: Crown, text: 'Pro resume sections' },
  { icon: ListPlus, text: 'Unlimited section items' },
  { icon: Wand2, text: 'Resume Tailor & Portfolio Generator' },
  { icon: Files, text: '300 resumes and cover letters' },
  { icon: BadgeCheck, text: 'No branding' },
];

export default function Account({ setCurrentPage, handleSignOut, setLoadedWork }: AccountProps) {
  const [tab, setTab] = useState<Tab>('profile');
  const [user, setUser] = useState<StoredUser | null>(readUser);
  const isPro = isProUser(user);
  const userId = user?.id || user?._id;

  // Profile details
  const [name, setName] = useState(user?.name || '');
  const [address, setAddress] = useState(user?.address || '');
  const [detailsMsg, setDetailsMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);

  // Email
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);

  // Password
  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // Photo
  const [photoMsg, setPhotoMsg] = useState('');

  // Documents
  const [works, setWorks] = useState<ListedWork[]>([]);
  const [worksLoading, setWorksLoading] = useState(false);
  const [worksError, setWorksError] = useState('');

  // Delete account
  const [showDelete, setShowDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const sync = () => setUser(readUser());
    window.addEventListener(USER_CHANGE_EVENT, sync);
    return () => window.removeEventListener(USER_CHANGE_EVENT, sync);
  }, []);

  const detailsDirty = name.trim() !== (user?.name || '') || address.trim() !== (user?.address || '');

  // Every profile change goes through the same endpoint, which needs the full record
  const updateProfile = async (patch: Partial<StoredUser>) => {
    const body = {
      name: user?.name || '',
      email: user?.email || '',
      address: user?.address || '',
      avatar: user?.avatar || '',
      ...patch,
    };
    const res = await authFetch(`${API_BASE}/api/user/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...body }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update profile.');
    // Response carries a fresh session token for the (possibly changed) email
    saveUser(data.user);
    setUser(data.user);
    return data.user as StoredUser;
  };

  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setDetailsMsg({ ok: false, text: 'Please enter your name.' });
      return;
    }
    setSavingDetails(true);
    setDetailsMsg(null);
    try {
      await updateProfile({ name: name.trim(), address: address.trim() });
      setDetailsMsg({ ok: true, text: 'Saved.' });
    } catch (err) {
      setDetailsMsg({ ok: false, text: getErrorMessage(err) || 'Could not save your details.' });
    } finally {
      setSavingDetails(false);
    }
  };

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailMsg({ ok: false, text: 'Please enter a valid email address.' });
      return;
    }
    setSavingEmail(true);
    setEmailMsg(null);
    try {
      await updateProfile({ email });
      setEditingEmail(false);
      setEmailMsg({ ok: true, text: 'Email address updated.' });
    } catch (err) {
      setEmailMsg({ ok: false, text: getErrorMessage(err) || 'Could not update your email.' });
    } finally {
      setSavingEmail(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordMsg({ ok: false, text: 'Password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ ok: false, text: 'Passwords do not match.' });
      return;
    }
    setSavingPassword(true);
    setPasswordMsg(null);
    try {
      const res = await authFetch(`${API_BASE}/api/user/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          currentPassword: user?.isGoogleUser ? 'google-oauth-bypass' : currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password.');

      if (user?.isGoogleUser) {
        const updated = { ...user, isGoogleUser: false };
        saveUser(updated);
        setUser(updated);
      }
      setEditingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg({ ok: true, text: data.message || 'Password updated.' });
    } catch (err) {
      setPasswordMsg({ ok: false, text: getErrorMessage(err) || 'Could not update your password.' });
    } finally {
      setSavingPassword(false);
    }
  };

  const changePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setPhotoMsg('Profile picture must be less than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      setPhotoMsg('');
      try {
        await updateProfile({ avatar: String(reader.result) });
      } catch (err) {
        setPhotoMsg(getErrorMessage(err) || 'Could not update your photo.');
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = async () => {
    setPhotoMsg('');
    try {
      await updateProfile({ avatar: '' });
    } catch (err) {
      setPhotoMsg(getErrorMessage(err) || 'Could not remove your photo.');
    }
  };

  const fetchWorks = async () => {
    if (!userId) return;
    setWorksLoading(true);
    setWorksError('');
    try {
      const res = await authFetch(`${API_BASE}/api/user/work/${userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch documents.');
      setWorks(data.data || []);
    } catch (err) {
      setWorksError(getErrorMessage(err) || 'Failed to load your documents.');
    } finally {
      setWorksLoading(false);
    }
  };

  const deleteWork = async (workId: string) => {
    if (!userId || !window.confirm('Delete this document permanently?')) return;
    try {
      const res = await authFetch(`${API_BASE}/api/user/work/${userId}/${workId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete document.');
      setWorks(prev => prev.filter(w => (w.id || w._id) !== workId));
      setLoadedWork({ deleted: true, workId });
    } catch (err) {
      alert(getErrorMessage(err) || 'Failed to delete document.');
    }
  };

  const openWork = (w: ListedWork) => {
    setLoadedWork(w);
    setCurrentPage(WORK_PAGES.includes(w.type) ? w.type : 'resume-builder');
  };

  const shareWork = (workId: string) => {
    const url = `${window.location.origin}/portfolio/${workId}`;
    navigator.clipboard.writeText(url);
    window.open(url, '_blank');
  };

  const deleteAccount = async () => {
    if (!userId) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await authFetch(`${API_BASE}/api/user/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete account.');
      setShowDelete(false);
      handleSignOut();
    } catch (err) {
      setDeleteError(getErrorMessage(err) || 'Something went wrong. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const selectTab = (t: Tab) => {
    setTab(t);
    if (t === 'documents') fetchWorks();
  };

  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else setCurrentPage('dashboard');
  };

  const monogram = String(user?.name || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="acct-page">
      <div className="acct-layout">
        {/* Left: section nav */}
        <nav className="acct-nav" aria-label="Account sections">
          <button className="acct-nav-back" onClick={goBack}>
            <ArrowLeft size={16} /> Back
          </button>
          <div className="acct-nav-list">
            <button className={`acct-nav-item${tab === 'profile' ? ' active' : ''}`} onClick={() => selectTab('profile')}>
              <User size={17} /> Your Profile
            </button>
            <button className={`acct-nav-item${tab === 'billing' ? ' active' : ''}`} onClick={() => selectTab('billing')}>
              <CreditCard size={17} /> Billing
            </button>
            <button className={`acct-nav-item${tab === 'documents' ? ' active' : ''}`} onClick={() => selectTab('documents')}>
              <FileText size={17} /> My Documents
            </button>
          </div>
        </nav>

        {/* Middle: active section */}
        <section className="acct-main">
          {tab === 'profile' && (
            <>
              <h1 className="acct-title">Your Profile</h1>

              <div className="acct-photo-row">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="acct-photo" />
                ) : (
                  <div className="acct-photo acct-photo-monogram">{monogram}</div>
                )}
                <div className="acct-photo-actions">
                  <label className="acct-link">
                    <Camera size={14} /> {user?.avatar ? 'Change photo' : 'Upload photo'}
                    <input type="file" accept="image/*" onChange={changePhoto} hidden />
                  </label>
                  {user?.avatar && (
                    <button type="button" className="acct-link muted" onClick={removePhoto}>Remove</button>
                  )}
                  {photoMsg && <span className="acct-msg error">{photoMsg}</span>}
                </div>
              </div>

              <form onSubmit={saveDetails}>
                <div className="acct-field">
                  <label className="acct-label" htmlFor="acct-name">Your full name</label>
                  <input id="acct-name" className="acct-input" value={name} onChange={e => { setName(e.target.value); setDetailsMsg(null); }} />
                </div>
                <div className="acct-field">
                  <label className="acct-label" htmlFor="acct-location">Location</label>
                  <input id="acct-location" className="acct-input" value={address} placeholder="New Delhi, India" onChange={e => { setAddress(e.target.value); setDetailsMsg(null); }} />
                </div>
                {(detailsDirty || detailsMsg) && (
                  <div className="acct-actions">
                    {detailsDirty && (
                      <button type="submit" className="acct-btn" disabled={savingDetails}>
                        {savingDetails ? <Loader2 size={15} className="acct-spin" /> : 'Save changes'}
                      </button>
                    )}
                    {detailsMsg && <span className={`acct-msg ${detailsMsg.ok ? 'ok' : 'error'}`}>{detailsMsg.text}</span>}
                  </div>
                )}
              </form>

              <div className="acct-field">
                <span className="acct-label">Email</span>
                {editingEmail ? (
                  <form className="acct-inline-form" onSubmit={saveEmail}>
                    <input
                      className="acct-input"
                      type="email"
                      value={newEmail}
                      placeholder="New email address"
                      onChange={e => setNewEmail(e.target.value)}
                      autoFocus
                    />
                    <div className="acct-actions">
                      <button type="submit" className="acct-btn" disabled={savingEmail}>
                        {savingEmail ? <Loader2 size={15} className="acct-spin" /> : 'Save'}
                      </button>
                      <button type="button" className="acct-btn ghost" onClick={() => { setEditingEmail(false); setEmailMsg(null); }}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <span className="acct-value">{user?.email}</span>
                    <button className="acct-link" onClick={() => { setNewEmail(user?.email || ''); setEmailMsg(null); setEditingEmail(true); }}>
                      Change Email Address
                    </button>
                  </>
                )}
                {emailMsg && <span className={`acct-msg ${emailMsg.ok ? 'ok' : 'error'}`}>{emailMsg.text}</span>}
              </div>

              <div className="acct-field">
                <span className="acct-label">Password</span>
                {editingPassword ? (
                  <form className="acct-inline-form" onSubmit={savePassword}>
                    {!user?.isGoogleUser && (
                      <input className="acct-input" type="password" placeholder="Current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required autoFocus />
                    )}
                    <input className="acct-input" type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required autoFocus={user?.isGoogleUser} />
                    <input className="acct-input" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                    <div className="acct-actions">
                      <button type="submit" className="acct-btn" disabled={savingPassword}>
                        {savingPassword ? <Loader2 size={15} className="acct-spin" /> : user?.isGoogleUser ? 'Set password' : 'Update password'}
                      </button>
                      <button type="button" className="acct-btn ghost" onClick={() => { setEditingPassword(false); setPasswordMsg(null); }}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <span className="acct-value">{user?.isGoogleUser ? 'No password set' : '••••••••'}</span>
                    <button className="acct-link" onClick={() => { setPasswordMsg(null); setEditingPassword(true); }}>
                      {user?.isGoogleUser ? 'Set a Password' : 'Change Password'}
                    </button>
                  </>
                )}
                {passwordMsg && <span className={`acct-msg ${passwordMsg.ok ? 'ok' : 'error'}`}>{passwordMsg.text}</span>}
              </div>

              <div className="acct-field">
                <label className="acct-label" htmlFor="acct-language">Language</label>
                <select id="acct-language" className="acct-input acct-select" value="en" onChange={() => {}}>
                  <option value="en">English</option>
                </select>
                <span className="acct-hint"><Globe size={13} /> More languages are coming soon.</span>
              </div>

              <div className="acct-field">
                <span className="acct-label">Account</span>
                <button className="acct-link" onClick={handleSignOut}>Log out</button>
                <button className="acct-link" onClick={() => { setDeleteText(''); setDeleteError(''); setShowDelete(true); }}>
                  Delete account
                </button>
              </div>
            </>
          )}

          {tab === 'billing' && (
            <>
              <h1 className="acct-title">Billing</h1>
              <div className="acct-plan">
                <div>
                  <span className="acct-label">Current plan</span>
                  <div className="acct-plan-name">
                    {isPro ? <><Crown size={18} className="acct-crown" /> CV Mind Pro</> : 'Free'}
                  </div>
                  <p className="acct-plan-desc">
                    {isPro
                      ? 'You have access to every Pro feature.'
                      : 'Build, check and download resumes for free. Upgrade any time for Pro sections, unlimited items and every AI tool.'}
                  </p>
                </div>
                {!isPro && (
                  <button className="acct-btn" onClick={() => setCurrentPage('pricing')}>See plans</button>
                )}
              </div>
              <p className="acct-billing-note">
                New Pro subscriptions come with a 7-day money-back guarantee. Read the{' '}
                <button className="acct-link inline" onClick={() => setCurrentPage('refund-policy')}>refund policy</button>{' '}
                for details.
              </p>
            </>
          )}

          {tab === 'documents' && (
            <>
              <h1 className="acct-title">My Documents</h1>
              {worksLoading ? (
                <div className="acct-empty"><Loader2 size={22} className="acct-spin" /> Loading your documents…</div>
              ) : worksError ? (
                <div className="acct-empty error"><AlertCircle size={18} /> {worksError}</div>
              ) : works.length === 0 ? (
                <div className="acct-empty">
                  <FileText size={28} />
                  <span>You haven't saved any documents yet.</span>
                  <button className="acct-btn" onClick={() => setCurrentPage('resume-builder')}>Create a resume</button>
                </div>
              ) : (
                <ul className="acct-docs">
                  {works.map(w => {
                    const id = w.id || w._id;
                    return (
                      <li key={id} className="acct-doc">
                        <div className="acct-doc-info">
                          <span className="acct-doc-title" title={w.title}>{w.title}</span>
                          <span className="acct-doc-meta">
                            {WORK_LABELS[w.type] || 'Resume'} ·{' '}
                            {new Date(w.updatedAt || w.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="acct-doc-actions">
                          <button className="acct-icon-btn" title="Open" onClick={() => openWork(w)}><Edit3 size={15} /></button>
                          {w.type === 'resume' && (
                            <button className="acct-icon-btn" title="Share portfolio link" onClick={() => shareWork(id)}><Globe size={15} /></button>
                          )}
                          <button className="acct-icon-btn danger" title="Delete" onClick={() => deleteWork(id)}><Trash2 size={15} /></button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </section>

        {/* Right: upsell (free users only) */}
        {!isPro && (
          <aside className="acct-side">
            <div className="acct-pro">
              <div className="acct-pro-head">
                <span className="acct-pro-title">Get more with Pro</span>
                <button className="acct-upgrade" onClick={() => setCurrentPage('pricing')}>Upgrade</button>
              </div>
              <p className="acct-pro-price">Starting from ₹108.33 a month</p>
              <ul className="acct-pro-perks">
                {PRO_PERKS.map(({ icon: Icon, text }) => (
                  <li key={text}><Icon size={16} /> {text}</li>
                ))}
              </ul>
            </div>
          </aside>
        )}
      </div>

      {showDelete && (
        <div className="acct-modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="acct-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <button className="acct-modal-close" onClick={() => setShowDelete(false)} aria-label="Close"><X size={18} /></button>
            <h2 className="acct-modal-title">Delete account</h2>
            <p className="acct-modal-text">
              This is <strong>permanent</strong>. Your profile, saved documents and history will be deleted and can't be recovered.
            </p>
            <label className="acct-label" htmlFor="acct-delete">Type <strong>DELETE</strong> to confirm</label>
            <input id="acct-delete" className="acct-input" value={deleteText} onChange={e => setDeleteText(e.target.value)} autoComplete="off" />
            {deleteError && <span className="acct-msg error">{deleteError}</span>}
            <div className="acct-actions end">
              <button className="acct-btn ghost" onClick={() => setShowDelete(false)}>Cancel</button>
              <button className="acct-btn danger" disabled={deleteText !== 'DELETE' || deleteLoading} onClick={deleteAccount}>
                {deleteLoading ? <Loader2 size={15} className="acct-spin" /> : 'Delete my account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
