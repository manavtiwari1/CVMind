import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Coins, Crown, IndianRupee, Plus, Receipt, Search, Users } from 'lucide-react';
import { api } from '../api';
import { useAction, useAdmin, useApi, useDebounced } from '../hooks';
import { count, date, dateTime, money } from '../format';
import { Badge, Card, ConfirmDialog, DataTable, Empty, Modal, PageHeader, Person, SearchInput, Segment, Spinner, StatCard, Tabs } from '../ui';
import type { Tone } from '../ui';

interface PlanInfo { key: string; label: string; price: number; days: number }
interface Sub {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  planLabel: string;
  amount: number;
  source: string;
  orderId: string;
  startsAt: string;
  expiresAt: string;
  createdAt: string;
  grantedBy: string;
  note: string;
  status: 'active' | 'upcoming' | 'expired' | 'cancelled';
}
interface Order {
  id: string; orderId: string; email: string; plan: string; planLabel: string; listPrice: number; amount: number;
  couponCode: string; discount: number; status: string; paymentMethod: string; createdAt: string; paidAt: string | null;
}
interface Grant { id: string; tokens: number; expiresAt: string; createdAt: string; grantedBy: string; note: string }
interface Usage {
  pro: boolean;
  expiresAt: string | null;
  tokens: { used: number; limit: number; base: number; bonus: number; resetsAt: string | null };
  grants: Grant[];
  weekly: Record<string, { label: string; limit: number; used: number }>;
}

const STATUS_TONE: Record<Sub['status'], Tone> = { active: 'green', upcoming: 'blue', expired: 'gray', cancelled: 'red' };
const SOURCE_LABEL: Record<string, string> = { cashfree: 'Cashfree', admin: 'Admin', coupon: 'Coupon' };
const ORDER_TONE: Record<string, Tone> = { paid: 'green', created: 'amber', failed: 'red' };
const ORDER_LABEL: Record<string, string> = { paid: 'Paid', created: 'Not paid', failed: 'Failed' };

type View = 'subscriptions' | 'orders' | 'usage';

export default function Subscriptions() {
  const [view, setView] = useState<View>('subscriptions');
  return (
    <>
      <PageHeader title="Subscriptions" description="Who has CVMind Pro and until when, Cashfree orders, and each account's AI tokens and weekly free uses." />
      <Tabs tabs={[{ id: 'subscriptions' as View, label: 'Subscriptions' }, { id: 'orders' as View, label: 'Cashfree orders' }, { id: 'usage' as View, label: 'Look up usage' }]} active={view} onChange={setView} />
      {view === 'subscriptions' && <SubscriptionList />}
      {view === 'orders' && <OrderList />}
      {view === 'usage' && <UsageLookup />}
    </>
  );
}

function SubscriptionList() {
  const { can } = useAdmin();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'active' | 'ended' | 'all'>('active');
  const search = useDebounced(q);
  const { data, error, loading, reload } = useApi<{ data: Sub[]; plans: PlanInfo[]; stats: { activeSubscribers: number; revenueThisMonth: number; paymentsThisMonth: number; byPlan: Record<string, number> } }>(
    '/subscriptions', { q: search, status: status === 'all' ? '' : status }
  );
  const { busy, run } = useAction();
  const [adding, setAdding] = useState(false);
  const [cancelling, setCancelling] = useState<Sub | null>(null);
  const plans = useMemo(() => data?.plans || [], [data]);
  const stats = data?.stats;
  const planLabel = useMemo(() => new Map(plans.map((p) => [p.key, p.label])), [plans]);

  return (
    <>
      <div className="ad-grid cols-3">
        <StatCard label="Pro accounts now" icon={<Users size={16} />} loading={!stats} value={count(stats?.activeSubscribers || 0)} foot="With an active subscription" />
        <StatCard label="Cashfree revenue this month" icon={<IndianRupee size={16} />} loading={!stats} value={money(stats?.revenueThisMonth || 0)} foot={`${count(stats?.paymentsThisMonth || 0)} paid ${stats?.paymentsThisMonth === 1 ? 'order' : 'orders'}`} />
        <StatCard label="Active by plan" tone="purple" icon={<Crown size={16} />} loading={!stats}
          value={count(Object.values(stats?.byPlan || {}).reduce((a, b) => a + b, 0))}
          foot={Object.entries(stats?.byPlan || {}).map(([k, n]) => `${planLabel.get(k) || k}: ${n}`).join(' · ') || 'None yet'} />
      </div>

      <Card
        title="Subscriptions"
        description="Plans bought or given while one is running start when the current one ends."
        bodyClass={false}
        actions={can('payments.manage') && <button type="button" className="ad-btn primary" onClick={() => setAdding(true)}><Plus size={15} /> Give Pro</button>}
      >
        <div className="ad-toolbar">
          <SearchInput value={q} onChange={setQ} placeholder="Search email…" />
          <Segment value={status} onChange={setStatus} options={[{ value: 'active', label: 'Active' }, { value: 'ended', label: 'Ended' }, { value: 'all', label: 'All' }]} />
        </div>
        <DataTable
          rows={data?.data}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(s) => s.id}
          empty={<Empty icon={<Crown size={20} />} title="No subscriptions here" text={status === 'active' ? 'Nobody has Pro right now.' : 'Try another filter.'} />}
          columns={[
            { key: 'person', header: 'Account', render: (s) => <Person name={s.name || undefined} email={s.email} /> },
            { key: 'plan', header: 'Plan', render: (s) => <span><strong>{s.planLabel}</strong>{s.amount > 0 && <span className="muted"> · {money(s.amount)}</span>}</span> },
            { key: 'status', header: 'Status', render: (s) => <Badge tone={STATUS_TONE[s.status]}>{s.status[0].toUpperCase() + s.status.slice(1)}</Badge> },
            { key: 'period', header: 'Period', render: (s) => <span className="muted">{date(s.startsAt)} → {date(s.expiresAt)}</span> },
            { key: 'source', header: 'Source', render: (s) => <span className="muted" title={s.note || s.orderId}>{SOURCE_LABEL[s.source] || s.source}{s.grantedBy ? ` · ${s.grantedBy}` : ''}</span> },
            { key: 'actions', header: '', className: 'actions', render: (s) => can('payments.manage') && (s.status === 'active' || s.status === 'upcoming') && (
              <button type="button" className="ad-btn sm danger-outline" onClick={() => setCancelling(s)}>Cancel</button>
            ) }
          ]}
        />
      </Card>

      {adding && <GiveProModal plans={plans} onClose={() => setAdding(false)} onDone={() => { setAdding(false); reload(); }} />}
      {cancelling && (
        <ConfirmDialog
          title={`Cancel ${cancelling.planLabel} for ${cancelling.email}?`}
          description={cancelling.source === 'cashfree'
            ? 'Pro ends now for this plan. This does not refund the payment; refund it from the Cashfree dashboard if needed.'
            : 'Pro ends now for this plan. Any later plan moves up to start today.'}
          reason={{ label: 'Reason (kept in the audit log)', placeholder: 'e.g. Refunded on request' }}
          confirmLabel="Cancel subscription"
          danger
          busy={busy === 'cancel'}
          onClose={() => setCancelling(null)}
          onConfirm={async (reason) => {
            const ok = await run('cancel', () => api(`/subscriptions/${cancelling.id}/cancel`, { method: 'POST', body: { reason } }), 'Subscription cancelled');
            setCancelling(null);
            if (ok !== undefined) reload();
          }}
        />
      )}
    </>
  );
}

function GiveProModal({ plans, onClose, onDone }: { plans: PlanInfo[]; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState('monthly');
  const [days, setDays] = useState('14');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const length = plan === 'custom' ? Number(days) : plans.find((p) => p.key === plan)?.days || 0;
  const ready = /^\S+@\S+\.\S+$/.test(email.trim()) && length >= 1;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    const ok = await run('give', () => api('/subscriptions', {
      method: 'POST',
      body: { email: email.trim(), plan, days: plan === 'custom' ? Number(days) : undefined, amount: Number(amount) || 0, note }
    }), `Pro given to ${email.trim()}`);
    if (ok !== undefined) onDone();
  };

  return (
    <Modal
      title="Give CVMind Pro"
      description="For payments taken outside Cashfree (UPI, cash) or as a gift. If the account already has Pro, the days are added after it ends."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ad-btn" onClick={onClose} disabled={busy === 'give'}>Cancel</button>
          <button type="submit" form="ad-give-pro" className="ad-btn primary" disabled={!ready || busy === 'give'}>{busy === 'give' && <Spinner size={14} />}Give Pro</button>
        </>
      }
    >
      <form id="ad-give-pro" onSubmit={submit}>
        <div className="ad-field">
          <label htmlFor="gp-email">Email</label>
          <input id="gp-email" className="ad-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoFocus />
          <p className="ad-hint">Works before they sign up too; Pro applies to the account with this email.</p>
        </div>
        <div className="ad-field" style={{ marginTop: 14 }}>
          <label htmlFor="gp-plan">Plan</label>
          <select id="gp-plan" className="ad-select" value={plan} onChange={(e) => setPlan(e.target.value)} style={{ maxWidth: 260 }}>
            {plans.map((p) => <option key={p.key} value={p.key}>{p.label} · ₹{p.price} · {p.days} days</option>)}
            <option value="custom">Custom number of days</option>
          </select>
          {plan === 'custom' && (
            <input className="ad-input" type="number" min={1} max={3650} value={days} onChange={(e) => setDays(e.target.value)} aria-label="Number of days" style={{ maxWidth: 160, marginTop: 8 }} />
          )}
          <p className="ad-hint">{length >= 1 ? `${length} ${length === 1 ? 'day' : 'days'} of Pro.` : 'Enter the number of days.'}</p>
        </div>
        <div className="ad-form-row" style={{ marginTop: 14 }}>
          <div className="ad-field">
            <label htmlFor="gp-amount">Amount received (₹, optional)</label>
            <input id="gp-amount" className="ad-input" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </div>
          <div className="ad-field">
            <label htmlFor="gp-note">Note (optional)</label>
            <input id="gp-note" className="ad-input" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Paid by UPI, ref 4821" />
          </div>
        </div>
      </form>
    </Modal>
  );
}

function OrderList() {
  const { data, error, loading, reload } = useApi<{ data: Order[] }>('/subscriptions/orders');
  return (
    <Card title="Cashfree orders" description="Every checkout started from the pricing page. 'Not paid' means the buyer left Cashfree before paying, or the payment is still being confirmed." bodyClass={false}>
      <DataTable
        rows={data?.data}
        loading={loading}
        error={error}
        onRetry={reload}
        rowKey={(o) => o.id}
        empty={<Empty icon={<Receipt size={20} />} title="No orders yet" text="Orders appear here when someone starts a checkout." />}
        columns={[
          { key: 'when', header: 'Started', render: (o) => <span className="muted">{dateTime(o.createdAt)}</span> },
          { key: 'email', header: 'Email', render: (o) => <span className="ad-cell-title">{o.email}</span> },
          { key: 'plan', header: 'Plan', render: (o) => o.planLabel },
          { key: 'amount', header: 'Amount', render: (o) => <span>{money(o.amount)}{o.couponCode && <span className="muted"> · {o.couponCode} (−{money(o.discount)})</span>}</span> },
          { key: 'status', header: 'Status', render: (o) => <Badge tone={ORDER_TONE[o.status] || 'gray'}>{ORDER_LABEL[o.status] || o.status}</Badge> },
          { key: 'method', header: 'Method', render: (o) => <span className="muted">{o.paymentMethod || '—'}</span> },
          { key: 'id', header: 'Order ID', render: (o) => <code className="muted" style={{ fontSize: 12 }}>{o.orderId}</code> }
        ]}
      />
    </Card>
  );
}

function UsageLookup() {
  const { can } = useAdmin();
  const [email, setEmail] = useState('');
  const [query, setQuery] = useState('');
  const { data, error, loading, reload } = useApi<Usage>(query ? `/subscriptions/usage/${encodeURIComponent(query)}` : null);
  const { busy, run } = useAction();
  const [adding, setAdding] = useState(false);
  const [revoking, setRevoking] = useState<Grant | null>(null);
  return (
    <Card
      title="Look up an account"
      description="Plan, AI tokens used in the last 3 days, and this week's free uses."
      actions={can('payments.manage') && <button type="button" className="ad-btn primary" onClick={() => setAdding(true)}><Coins size={15} /> Add tokens</button>}
    >
      <form className="ad-toolbar" onSubmit={(e) => { e.preventDefault(); setQuery(email.trim().toLowerCase()); }} style={{ padding: 0, marginBottom: 16 }}>
        <input className="ad-input" style={{ maxWidth: 360 }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" aria-label="Email" />
        <button className="ad-btn primary" type="submit" disabled={!email.trim()}><Search size={15} /> Look up</button>
      </form>
      {loading && <Spinner />}
      {error && <p className="muted">{error}</p>}
      {data && !loading && (
        <div className="ad-grid cols-2">
          <div>
            <div className="ad-section-title">Plan</div>
            <p>{data.pro ? <><Badge tone="green">Pro</Badge> until {date(data.expiresAt)}</> : <Badge tone="gray">Free</Badge>}</p>
            <div className="ad-section-title" style={{ marginTop: 16 }}>AI tokens (last 3 days)</div>
            <p><strong>{count(data.tokens.used)}</strong> of {count(data.tokens.limit)}{data.tokens.resetsAt && <span className="muted"> · frees up from {dateTime(data.tokens.resetsAt)}</span>}</p>
            {data.tokens.bonus > 0 && <p className="muted">{count(data.tokens.base)} plan limit + {count(data.tokens.bonus)} extra</p>}
            {data.grants.length > 0 && (
              <>
                <div className="ad-section-title" style={{ marginTop: 16 }}>Extra tokens given</div>
                <ul className="ad-list">
                  {data.grants.map((g) => (
                    <li key={g.id}>
                      <span title={g.note}>+{count(g.tokens)} <span className="muted">until {date(g.expiresAt)}{g.grantedBy ? ` · ${g.grantedBy}` : ''}</span></span>
                      {can('payments.manage') && <button type="button" className="ad-btn sm danger-outline" onClick={() => setRevoking(g)}>Remove</button>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div>
            <div className="ad-section-title">Free uses this week{data.pro && ' (not limited on Pro)'}</div>
            <ul className="ad-list">
              {Object.entries(data.weekly).map(([k, w]) => <li key={k}><span>{w.label}</span><strong>{w.used} / {w.limit}</strong></li>)}
            </ul>
          </div>
        </div>
      )}
      {adding && (
        <AddTokensModal
          initialEmail={query || email.trim()}
          onClose={() => setAdding(false)}
          onDone={(to) => { setAdding(false); setEmail(to); if (to === query) reload(); else setQuery(to); }}
        />
      )}
      {revoking && (
        <ConfirmDialog
          title={`Remove ${count(revoking.tokens)} extra tokens?`}
          description="The account's token limit drops back by this amount now."
          confirmLabel="Remove tokens"
          danger
          busy={busy === 'revoke'}
          onClose={() => setRevoking(null)}
          onConfirm={async () => {
            const ok = await run('revoke', () => api(`/subscriptions/tokens/${revoking.id}`, { method: 'DELETE' }), 'Extra tokens removed');
            setRevoking(null);
            if (ok !== undefined) reload();
          }}
        />
      )}
    </Card>
  );
}

function AddTokensModal({ initialEmail, onClose, onDone }: { initialEmail: string; onClose: () => void; onDone: (email: string) => void }) {
  const { busy, run } = useAction();
  const [email, setEmail] = useState(initialEmail);
  const [tokens, setTokens] = useState('50000');
  const [days, setDays] = useState('3');
  const [note, setNote] = useState('');
  const amount = Number(tokens);
  const length = Number(days);
  const ready = /^\S+@\S+\.\S+$/.test(email.trim()) && Number.isInteger(amount) && amount >= 1 && Number.isInteger(length) && length >= 1 && length <= 365;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    const to = email.trim().toLowerCase();
    const ok = await run('tokens', () => api('/subscriptions/tokens', { method: 'POST', body: { email: to, tokens: amount, days: length, note } }), `${count(amount)} tokens added for ${to}`);
    if (ok !== undefined) onDone(to);
  };

  return (
    <Modal
      title="Add AI tokens"
      description="Raises this account's 3-day AI token limit by the amount below, on top of its Free or Pro limit, until the extra tokens expire."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ad-btn" onClick={onClose} disabled={busy === 'tokens'}>Cancel</button>
          <button type="submit" form="ad-add-tokens" className="ad-btn primary" disabled={!ready || busy === 'tokens'}>{busy === 'tokens' && <Spinner size={14} />}Add tokens</button>
        </>
      }
    >
      <form id="ad-add-tokens" onSubmit={submit}>
        <div className="ad-field">
          <label htmlFor="at-email">Email</label>
          <input id="at-email" className="ad-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoFocus={!initialEmail} />
        </div>
        <div className="ad-form-row" style={{ marginTop: 14 }}>
          <div className="ad-field">
            <label htmlFor="at-tokens">Extra tokens</label>
            <input id="at-tokens" className="ad-input" type="number" min={1} step={1000} value={tokens} onChange={(e) => setTokens(e.target.value)} autoFocus={!!initialEmail} />
          </div>
          <div className="ad-field">
            <label htmlFor="at-days">For how many days</label>
            <input id="at-days" className="ad-input" type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} />
          </div>
        </div>
        <div className="ad-field" style={{ marginTop: 14 }}>
          <label htmlFor="at-note">Note (optional)</label>
          <input id="at-note" className="ad-input" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Support request #182" />
        </div>
      </form>
    </Modal>
  );
}
