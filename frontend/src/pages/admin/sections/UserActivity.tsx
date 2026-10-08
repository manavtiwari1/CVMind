import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Ban, Mail, MoonStar, PauseCircle, PlayCircle, Trash2, UserCheck, UserX, Users } from 'lucide-react';
import { api } from '../api';
import { useAction, useAdmin, useApi, useDebounced, useToast } from '../hooks';
import { ago, count, date } from '../format';
import { Badge, Card, ConfirmDialog, DataTable, Empty, Modal, Notice, PageHeader, Person, SearchInput, Segment, Select, Spinner, StatCard, StatusBadge } from '../ui';
import type { Tone } from '../ui';

type Activity = 'active' | 'inactive' | 'never';
interface Row {
  id: string;
  name: string;
  email: string;
  avatar: string;
  status: string;
  emailVerified: boolean;
  createdAt: string;
  lastActiveAt: string | null;
  activity: Activity;
}
interface Result {
  days: number;
  trackingSince: string | null;
  emailConfigured: boolean;
  stats: { total: number; active: number; inactive: number; never: number };
  data: Row[];
}
type BulkAction = 'suspend' | 'ban' | 'reactivate' | 'delete' | 'email';

const ACTIVITY: Record<Activity, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'green' },
  inactive: { label: 'Inactive', tone: 'amber' },
  never: { label: 'No activity', tone: 'gray' }
};

const STATUS_WORDS: Record<'suspend' | 'ban' | 'reactivate', { verb: string; done: string; danger: boolean }> = {
  suspend: { verb: 'Suspend', done: 'suspended', danger: true },
  ban: { verb: 'Ban', done: 'banned', danger: true },
  reactivate: { verb: 'Reactivate', done: 'reactivated', danger: false }
};

export default function UserActivity() {
  const { can, go } = useAdmin();
  const [view, setView] = useState<'inactive' | 'active' | 'never' | 'all'>('inactive');
  const [days, setDays] = useState('30');
  const [status, setStatus] = useState('');
  const [verified, setVerified] = useState('');
  const [q, setQ] = useState('');
  const search = useDebounced(q);
  const { data, error, loading, reload } = useApi<Result>('/user-activity', { activity: view === 'all' ? '' : view, days, status, verified, q: search });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<BulkAction | null>(null);
  const { busy, run } = useAction();
  const toast = useToast();

  const rows = useMemo(() => data?.data, [data]);
  // Only rows still on screen count as selected
  const picked = useMemo(() => (rows || []).filter((r) => selected.has(r.id)), [rows, selected]);
  const allOn = !!rows?.length && picked.length === rows.length;
  const toggle = (id: string) => setSelected((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setSelected(allOn ? new Set() : new Set((rows || []).map((r) => r.id)));
  const stats = data?.stats;

  const bulk = async (body: object, success: (d: Record<string, number>, coupon: string | null) => string) => {
    const result = await run('bulk', () => api<{ data: Record<string, number>; coupon?: string | null }>('/user-activity/bulk', { method: 'POST', body: { ids: picked.map((r) => r.id), ...body } }));
    if (result === undefined) return;
    setAction(null);
    setSelected(new Set());
    reload();
    toast(success(result.data, result.coupon || null));
  };

  return (
    <>
      <PageHeader title="User activity" description="Find active and inactive accounts, then suspend, ban, reactivate, email or delete them in bulk." />

      {data?.trackingSince && (
        <Notice tone="amber">
          Activity is recorded from {date(data.trackingSince)}. Accounts marked "No activity" haven't signed in or used the site since then; they may have been active before.
        </Notice>
      )}

      <div className="ad-grid cols-4" style={{ marginTop: 16 }}>
        <StatCard label="All accounts" icon={<Users size={16} />} loading={!stats} value={count(stats?.total || 0)} foot="Matching the filters" />
        <StatCard label={`Active (${days} days)`} icon={<UserCheck size={16} />} loading={!stats} value={count(stats?.active || 0)} foot="Used the site or joined recently" />
        <StatCard label="Inactive" tone="amber" icon={<MoonStar size={16} />} loading={!stats} value={count(stats?.inactive || 0)} foot={`Seen before, not in ${days} days`} />
        <StatCard label="No activity recorded" tone="purple" icon={<UserX size={16} />} loading={!stats} value={count(stats?.never || 0)} foot="Never seen since tracking began" />
      </div>

      <Card title="Accounts" bodyClass={false}>
        <div className="ad-toolbar">
          <SearchInput value={q} onChange={setQ} placeholder="Search name or email…" />
          <Segment value={view} onChange={(v) => { setView(v); setSelected(new Set()); }} options={[
            { value: 'inactive', label: 'Inactive' }, { value: 'never', label: 'No activity' }, { value: 'active', label: 'Active' }, { value: 'all', label: 'All' }
          ]} />
          <Select label="Inactive for" value={days} onChange={setDays} options={[
            { value: '7', label: 'Inactive 7+ days' }, { value: '14', label: 'Inactive 14+ days' }, { value: '30', label: 'Inactive 30+ days' },
            { value: '60', label: 'Inactive 60+ days' }, { value: '90', label: 'Inactive 90+ days' }
          ]} />
          <Select label="Status" value={status} onChange={setStatus} options={[{ value: '', label: 'All statuses' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }, { value: 'banned', label: 'Banned' }]} />
          <Select label="Verification" value={verified} onChange={setVerified} options={[{ value: '', label: 'Verified or not' }, { value: 'true', label: 'Verified' }, { value: 'false', label: 'Not verified' }]} />
        </div>

        {picked.length > 0 && (
          <div className="ad-bulkbar" role="toolbar" aria-label="Actions for selected users">
            <strong>{count(picked.length)} selected</strong>
            <button type="button" className="ad-btn sm ghost" onClick={() => setSelected(new Set())}>Clear</button>
            <span className="ad-bulkbar-gap" />
            {can('notifications.send') && <button type="button" className="ad-btn sm" onClick={() => setAction('email')}><Mail size={14} /> Email</button>}
            {can('users.manage') && (
              <>
                <button type="button" className="ad-btn sm" onClick={() => setAction('reactivate')}><PlayCircle size={14} /> Reactivate</button>
                <button type="button" className="ad-btn sm danger-outline" onClick={() => setAction('suspend')}><PauseCircle size={14} /> Suspend</button>
                <button type="button" className="ad-btn sm danger-outline" onClick={() => setAction('ban')}><Ban size={14} /> Ban</button>
              </>
            )}
            {can('users.delete') && <button type="button" className="ad-btn sm danger" onClick={() => setAction('delete')}><Trash2 size={14} /> Delete</button>}
          </div>
        )}

        <DataTable
          rows={rows}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(r) => r.id}
          onRowClick={(r) => go('users', { id: r.id })}
          empty={<Empty icon={<UserCheck size={20} />} title="No accounts here" text="Try another filter." />}
          columns={[
            {
              key: 'pick',
              className: 'ad-col-check',
              header: <input type="checkbox" aria-label="Select all shown" checked={allOn} onChange={toggleAll} />,
              render: (r) => <input type="checkbox" aria-label={`Select ${r.email}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
            },
            { key: 'person', header: 'Account', render: (r) => <Person name={r.name} email={r.email} avatar={r.avatar} /> },
            { key: 'activity', header: 'Activity', render: (r) => <Badge tone={ACTIVITY[r.activity].tone} dot>{ACTIVITY[r.activity].label}</Badge> },
            { key: 'last', header: 'Last active', render: (r) => <span className="muted" title={r.lastActiveAt ? date(r.lastActiveAt) : undefined}>{r.lastActiveAt ? ago(r.lastActiveAt) : '—'}</span> },
            { key: 'joined', header: 'Joined', render: (r) => <span className="muted">{date(r.createdAt)}</span> },
            { key: 'verified', header: 'Email', render: (r) => r.emailVerified ? <Badge tone="green">Verified</Badge> : <Badge tone="gray">Not verified</Badge> },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }
          ]}
        />
      </Card>

      {(action === 'suspend' || action === 'ban' || action === 'reactivate') && (
        <ConfirmDialog
          title={`${STATUS_WORDS[action].verb} ${count(picked.length)} ${picked.length === 1 ? 'account' : 'accounts'}?`}
          description={action === 'reactivate'
            ? 'They can sign in and use CVMind again.'
            : `They are signed out and can't sign in until reactivated. Accounts that are already ${STATUS_WORDS[action].done} are skipped.`}
          reason={action === 'reactivate' ? undefined : { label: 'Reason (shown to the user when they try to sign in)', placeholder: 'e.g. Spam sign-ups', required: true }}
          confirmLabel={STATUS_WORDS[action].verb}
          danger={STATUS_WORDS[action].danger}
          busy={busy === 'bulk'}
          onClose={() => setAction(null)}
          onConfirm={(reason) => bulk({ action, reason }, (d) => `${count(d.done)} ${STATUS_WORDS[action].done}${d.unchanged ? `, ${count(d.unchanged)} already were` : ''}`)}
        />
      )}

      {action === 'delete' && (
        <ConfirmDialog
          title={`Delete ${count(picked.length)} ${picked.length === 1 ? 'account' : 'accounts'} for good?`}
          description="Their accounts, saved work and sessions are removed. This can't be undone."
          typeToConfirm={`DELETE ${picked.length}`}
          confirmLabel="Delete accounts"
          danger
          busy={busy === 'bulk'}
          onClose={() => setAction(null)}
          onConfirm={() => bulk({ action: 'delete', confirm: `DELETE ${picked.length}` }, (d) => `${count(d.done)} deleted${d.failed ? `, ${count(d.failed)} failed` : ''}`)}
        />
      )}

      {action === 'email' && (
        <EmailModal
          users={picked}
          emailConfigured={!!data?.emailConfigured}
          busy={busy === 'bulk'}
          onClose={() => setAction(null)}
          onSend={(body) => bulk({ action: 'email', ...body }, (d, coupon) => `Email sent to ${count(d.sent)}${d.failed ? `, ${count(d.failed)} failed` : ''}${d.skipped ? `, ${count(d.skipped)} skipped (not verified)` : ''}${coupon ? ` with code ${coupon}` : ''}`)}
        />
      )}
    </>
  );
}


type Template = 'reminder' | 'discount' | 'custom';
interface EmailBody { subject: string; body: string; link: string; offer?: { percent: number; days: number } }

// {code}, {discount} and {expires} are filled in by the server once the coupon exists
const TEMPLATES: Record<Template, { subject: string; body: string; link: string }> = {
  reminder: {
    subject: 'Your CVMind account is waiting',
    body: "It's been a while since you last used CVMind. Your resumes and saved work are still in your account.\n\nIf you're applying for jobs, you can check your resume against a job description in about a minute and see exactly what to fix.",
    link: '/'
  },
  discount: {
    subject: '{discount} off CVMind Pro for you',
    body: "You haven't used CVMind in a while, so here's {discount} off any CVMind Pro plan.\n\nUse code {code} at checkout. It works once on your account and expires on {expires}.\n\nPro gives you every resume template, unlimited Resume Tailor and interview practice, and more AI tokens.",
    link: '/pricing'
  },
  custom: { subject: '', body: '', link: '/' }
};

function EmailModal({ users, emailConfigured, busy, onClose, onSend }: {
  users: Row[];
  emailConfigured: boolean;
  busy: boolean;
  onClose: () => void;
  onSend: (body: EmailBody) => void;
}) {
  const { can } = useAdmin();
  const canOffer = can('coupons.manage');
  const [template, setTemplate] = useState<Template>('reminder');
  const [subject, setSubject] = useState(TEMPLATES.reminder.subject);
  const [body, setBody] = useState(TEMPLATES.reminder.body);
  const [link, setLink] = useState(TEMPLATES.reminder.link);
  const [percent, setPercent] = useState('30');
  const [days, setDays] = useState('7');
  const reachable = users.filter((u) => u.emailVerified).length;
  const offer = template === 'discount';
  const pct = Number(percent);
  const len = Number(days);
  const offerOk = !offer || (Number.isInteger(pct) && pct >= 5 && pct <= 90 && Number.isInteger(len) && len >= 1 && len <= 60);
  const ready = emailConfigured && reachable > 0 && subject.trim() && body.trim() && offerOk;
  const [openedAt] = useState(() => Date.now());
  const expires = new Date(openedAt + (len || 0) * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const preview = (text: string) => offer ? text.replaceAll('{code}', 'COMEBACK••••••').replaceAll('{discount}', `${pct || 0}%`).replaceAll('{expires}', expires) : text;

  const pick = (t: Template) => {
    setTemplate(t);
    setSubject(TEMPLATES[t].subject);
    setBody(TEMPLATES[t].body);
    setLink(TEMPLATES[t].link);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (ready) onSend({ subject: subject.trim(), body: body.trim(), link: link.trim(), ...(offer ? { offer: { percent: pct, days: len } } : {}) });
  };

  return (
    <Modal
      title={`Email ${count(users.length)} ${users.length === 1 ? 'user' : 'users'}`}
      description={reachable === users.length
        ? 'Each person gets their own copy, starting with "Hi <name>".'
        : `${count(reachable)} of them have a verified email and will get it. Unverified addresses are skipped so cvmind.in's emails don't land in spam.`}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="ad-btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" form="ad-ua-email" className="ad-btn primary" disabled={!ready || busy}>{busy ? <Spinner size={14} /> : <Mail size={14} />} Send to {count(reachable)}</button>
        </>
      }
    >
      {!emailConfigured && <Notice tone="red">Email isn't set up on this server (RESEND_API_KEY is missing).</Notice>}
      <form id="ad-ua-email" onSubmit={submit}>
        <div className="ad-field">
          <label>Type of email</label>
          <Segment<Template> value={template} onChange={pick} options={[
            { value: 'reminder', label: 'Inactivity reminder' },
            ...(canOffer ? [{ value: 'discount' as Template, label: 'Special discount' }] : []),
            { value: 'custom', label: 'Custom' }
          ]} />
          {!canOffer && <p className="ad-hint">Discount emails need the coupons permission.</p>}
        </div>

        {offer && (
          <div className="ad-form-row" style={{ marginTop: 14 }}>
            <div className="ad-field">
              <label htmlFor="ua-pct">Discount on any Pro plan (%)</label>
              <input id="ua-pct" className="ad-input" type="number" min={5} max={90} value={percent} onChange={(e) => setPercent(e.target.value)} />
            </div>
            <div className="ad-field">
              <label htmlFor="ua-days">Offer lasts (days)</label>
              <input id="ua-days" className="ad-input" type="number" min={1} max={60} value={days} onChange={(e) => setDays(e.target.value)} />
            </div>
          </div>
        )}
        {offer && (
          <p className="ad-hint" style={{ marginTop: 8 }}>
            A new code is created when you send. Only these {count(reachable)} {reachable === 1 ? 'person' : 'people'} can use it, once each, until {expires}. It appears under Coupons, where you can retire it early.
            Use {'{code}'}, {'{discount}'} and {'{expires}'} in the text; they're filled in for you.
          </p>
        )}

        <div className="ad-field" style={{ marginTop: 14 }}>
          <label htmlFor="ua-subject">Subject</label>
          <input id="ua-subject" className="ad-input" value={subject} maxLength={120} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="ad-field" style={{ marginTop: 14 }}>
          <label htmlFor="ua-body">Message</label>
          <textarea id="ua-body" className="ad-textarea" style={{ minHeight: 150 }} value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} />
          <p className="ad-hint">Blank lines start a new paragraph.</p>
        </div>
        <div className="ad-field" style={{ marginTop: 14 }}>
          <label htmlFor="ua-link">Button link (optional)</label>
          <input id="ua-link" className="ad-input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="/pricing or https://…" />
          <p className="ad-hint">Adds an "Open CVMind" button. Leave empty for no button.</p>
        </div>

        {subject.trim() && body.trim() && (
          <div className="ad-email-preview" aria-label="Preview">
            <div className="ad-section-title">Preview</div>
            <strong>{preview(subject)}</strong>
            <p>Hi {users.find((u) => u.emailVerified)?.name || 'there'},</p>
            {preview(body).split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
            {link.trim() && <span className="ad-email-preview-btn">Open CVMind</span>}
          </div>
        )}
      </form>
    </Modal>
  );
}
