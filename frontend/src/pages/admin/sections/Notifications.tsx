import { useEffect, useState } from 'react';
import { Bell, Mail, Send, Smartphone, Trash2 } from 'lucide-react';
import { api } from '../api';
import type { Paged } from '../api';
import { useAction, useApi, useDebounced } from '../hooks';
import { count, dateTime } from '../format';
import { Badge, Card, ConfirmDialog, DataTable, Empty, Notice, PageHeader, Pagination } from '../ui';

interface Sent {
  id: string;
  title: string;
  body: string;
  link: string;
  audience: 'all' | 'segment';
  channels: string[];
  recipientCount: number;
  readCount: number;
  emailSent: number;
  emailFailed: number;
  createdBy: string;
  createdAt: string;
}

interface Segment {
  status: string;
  provider: string;
  signedUpFrom: string;
  signedUpTo: string;
  usedFeature: string;
  emails: string;
}

const EMPTY_SEGMENT: Segment = { status: '', provider: '', signedUpFrom: '', signedUpTo: '', usedFeature: '', emails: '' };

export default function Notifications() {
  const [page, setPage] = useState(1);
  const history = useApi<Paged<Sent> & { features: Array<{ key: string; label: string }> }>('/notifications', { page, limit: 15 });
  const { busy, run } = useAction();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [inApp, setInApp] = useState(true);
  const [email, setEmail] = useState(false);
  const [segment, setSegment] = useState<Segment>(EMPTY_SEGMENT);
  const [confirming, setConfirming] = useState(false);
  const [withdrawing, setWithdrawing] = useState<Sent | null>(null);

  const segmentBody = {
    ...segment,
    emails: segment.emails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean)
  };
  const debouncedSegment = useDebounced(JSON.stringify(segmentBody), 400);
  const [preview, setPreview] = useState<{ count: number; sample: Array<{ name: string; email: string }>; emailConfigured: boolean; maxEmailRecipients: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ data: { count: number; sample: Array<{ name: string; email: string }>; emailConfigured: boolean; maxEmailRecipients: number } }>('/notifications/preview', { method: 'POST', body: { segment: JSON.parse(debouncedSegment) } })
      .then((r) => { if (!cancelled) setPreview(r.data); })
      .catch(() => { if (!cancelled) setPreview(null); });
    return () => { cancelled = true; };
  }, [debouncedSegment]);

  const channels = [inApp && 'in-app', email && 'email'].filter(Boolean) as string[];
  const tooManyForEmail = email && preview && preview.count > preview.maxEmailRecipients;
  const canSend = title.trim() && channels.length && preview && preview.count > 0 && !tooManyForEmail && !(email && !preview.emailConfigured);
  const everyone = Object.values(segment).every((v) => !v);

  const send = async () => {
    const ok = await run('send', () => api('/notifications', { method: 'POST', body: { title, body, link, channels, segment: segmentBody } }), 'Notification sent');
    setConfirming(false);
    if (ok !== undefined) {
      setTitle(''); setBody(''); setLink(''); setSegment(EMPTY_SEGMENT); setEmail(false); setInApp(true);
      history.reload();
    }
  };

  const seg = (k: keyof Segment) => (e: { target: { value: string } }) => setSegment((s) => ({ ...s, [k]: e.target.value }));

  return (
    <>
      <PageHeader title="Notifications" description="Send an announcement or offer to everyone or a group of users, in the app, by email, or both." />

      <div className="ad-grid wide-left">
        <Card title="New notification">
          <div className="ad-field">
            <label htmlFor="n-title">Title</label>
            <input id="n-title" className="ad-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="New: tailor your resume in one click" />
          </div>
          <div className="ad-field">
            <label htmlFor="n-body">Message</label>
            <textarea id="n-body" className="ad-textarea" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} placeholder="A short message. Blank lines start a new paragraph in email." />
          </div>
          <div className="ad-field">
            <label htmlFor="n-link">Link (optional)</label>
            <input id="n-link" className="ad-input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="/tailor or https://…" />
            <span className="ad-hint">Where the notification opens. A path like /pricing stays on CVMind.</span>
          </div>

          <div className="ad-section-title" style={{ marginTop: 22 }}>Channels</div>
          <div className="ad-actions-row">
            <label className="ad-check"><input type="checkbox" checked={inApp} onChange={(e) => setInApp(e.target.checked)} /> <Smartphone size={14} /> In-app (bell icon)</label>
            <label className="ad-check"><input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} /> <Mail size={14} /> Email</label>
          </div>
          <p className="ad-hint" style={{ marginTop: 6 }}>Push notifications to the Android app need Firebase, which isn't set up yet.</p>

          <div className="ad-section-title" style={{ marginTop: 22 }}>Audience</div>
          <div className="ad-form-row">
            <div className="ad-field">
              <label htmlFor="n-status">Account status</label>
              <select id="n-status" className="ad-select" value={segment.status} onChange={seg('status')}>
                <option value="">Any</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="ad-field">
              <label htmlFor="n-provider">Sign-in method</label>
              <select id="n-provider" className="ad-select" value={segment.provider} onChange={seg('provider')}>
                <option value="">Any</option>
                <option value="password">Email & password</option>
                <option value="google">Google</option>
                <option value="github">GitHub</option>
                <option value="linkedin">LinkedIn</option>
              </select>
            </div>
          </div>
          <div className="ad-form-row">
            <div className="ad-field">
              <label htmlFor="n-from">Signed up from</label>
              <input id="n-from" className="ad-input" type="date" value={segment.signedUpFrom} onChange={seg('signedUpFrom')} />
            </div>
            <div className="ad-field">
              <label htmlFor="n-to">Signed up until</label>
              <input id="n-to" className="ad-input" type="date" value={segment.signedUpTo} onChange={seg('signedUpTo')} />
            </div>
          </div>
          <div className="ad-field" style={{ marginTop: 14 }}>
            <label htmlFor="n-feature">Has used</label>
            <select id="n-feature" className="ad-select" value={segment.usedFeature} onChange={seg('usedFeature')}>
              <option value="">Any tool or none</option>
              {(history.data?.features || []).map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
          <div className="ad-field">
            <label htmlFor="n-emails">Only these emails (optional)</label>
            <textarea id="n-emails" className="ad-textarea" style={{ minHeight: 64 }} value={segment.emails} onChange={seg('emails')} placeholder="One per line, or separated by commas" />
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <Card title="Who gets it">
            {!preview ? <div className="ad-skeleton" style={{ height: 60 }} /> : (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span className="ad-stat-value" style={{ margin: 0 }}>{count(preview.count)}</span>
                  <span className="ad-muted">{preview.count === 1 ? 'user' : 'users'}{everyone ? ' (everyone)' : ''}</span>
                </div>
                {preview.sample.length > 0 && (
                  <ul className="ad-list" style={{ marginTop: 12 }}>
                    {preview.sample.map((u) => <li key={u.email}><span className="ad-small">{u.name || u.email}</span><span className="ad-muted ad-small">{u.email}</span></li>)}
                  </ul>
                )}
                {email && !preview.emailConfigured && <div style={{ marginTop: 12 }}><Notice tone="amber">Email isn't set up on the server (RESEND_API_KEY).</Notice></div>}
                {tooManyForEmail && <div style={{ marginTop: 12 }}><Notice tone="amber">Email goes to at most {count(preview.maxEmailRecipients)} people at once. Narrow the audience or send in-app only.</Notice></div>}
              </>
            )}
          </Card>
          <Card title="Preview">
            <div className="ad-msg" style={{ display: 'flex', gap: 10 }}>
              <span className="ad-stat-icon" style={{ width: 30, height: 30, flexShrink: 0 }}><Bell size={15} /></span>
              <div style={{ minWidth: 0 }}>
                <div className="ad-cell-title">{title || 'Your title'}</div>
                <div className="ad-small ad-muted" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{body || 'Your message appears here.'}</div>
              </div>
            </div>
            <button type="button" className="ad-btn primary" style={{ width: '100%', marginTop: 16 }} disabled={!canSend} onClick={() => setConfirming(true)}>
              <Send size={15} /> Send to {preview ? count(preview.count) : '…'} {preview?.count === 1 ? 'user' : 'users'}
            </button>
          </Card>
        </div>
      </div>

      <Card title="Sent" bodyClass={false}>
        <DataTable
          rows={history.data?.data}
          loading={history.loading}
          error={history.error}
          onRetry={history.reload}
          rowKey={(n) => n.id}
          empty={<Empty icon={<Bell size={20} />} title="Nothing sent yet" />}
          columns={[
            { key: 'title', header: 'Notification', render: (n) => <div style={{ maxWidth: 360 }}><div className="ad-cell-title">{n.title}</div>{n.body && <div className="ad-cell-sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.body}</div>}</div> },
            { key: 'audience', header: 'Audience', render: (n) => n.audience === 'all' ? <Badge tone="purple">Everyone</Badge> : <Badge tone="blue">Segment</Badge> },
            { key: 'channels', header: 'Channels', render: (n) => <div className="ad-chips">{n.channels.map((c) => <Badge key={c} tone="gray">{c === 'in-app' ? 'In-app' : 'Email'}</Badge>)}</div> },
            { key: 'recipients', header: 'Recipients', className: 'num', render: (n) => count(n.recipientCount) },
            { key: 'read', header: 'Read in app', className: 'num', render: (n) => n.channels.includes('in-app') ? count(n.readCount) : '—' },
            { key: 'email', header: 'Emails', className: 'num', render: (n) => n.channels.includes('email') ? <>{count(n.emailSent)}{n.emailFailed ? <span style={{ color: '#dc2626' }}> ({n.emailFailed} failed)</span> : ''}</> : '—' },
            { key: 'sent', header: 'Sent', render: (n) => <div><div className="muted">{dateTime(n.createdAt)}</div><div className="ad-cell-sub">by {n.createdBy}</div></div> },
            { key: 'actions', header: '', className: 'actions', render: (n) => n.channels.includes('in-app') && (
              <button type="button" className="ad-btn sm icon" title="Withdraw from the app" aria-label="Withdraw" onClick={() => setWithdrawing(n)}><Trash2 size={14} /></button>
            ) }
          ]}
        />
        {history.data && <Pagination page={history.data.page} limit={history.data.limit} total={history.data.total} onPage={setPage} />}
      </Card>

      {confirming && preview && (
        <ConfirmDialog
          title={`Send to ${count(preview.count)} ${preview.count === 1 ? 'user' : 'users'}?`}
          description={<>"{title}" goes out {channels.map((c) => (c === 'in-app' ? 'in the app' : 'by email')).join(' and ')}. {email && 'Emails can’t be unsent.'}</>}
          confirmLabel="Send now"
          busy={busy === 'send'}
          onClose={() => setConfirming(false)}
          onConfirm={send}
        />
      )}
      {withdrawing && (
        <ConfirmDialog
          title="Withdraw this notification?"
          description="It disappears from everyone's bell. Emails already sent can't be recalled."
          confirmLabel="Withdraw"
          danger
          busy={busy === 'withdraw'}
          onClose={() => setWithdrawing(null)}
          onConfirm={async () => {
            const ok = await run('withdraw', () => api(`/notifications/${withdrawing.id}`, { method: 'DELETE' }), 'Notification withdrawn');
            setWithdrawing(null);
            if (ok !== undefined) history.reload();
          }}
        />
      )}
    </>
  );
}
