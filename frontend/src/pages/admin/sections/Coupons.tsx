import { useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil, Plus, TicketPercent } from 'lucide-react';
import { api } from '../api';
import { useAction, useApi } from '../hooks';
import { count, date, money } from '../format';
import { Card, ConfirmDialog, DataTable, Empty, Modal, PageHeader, Spinner, StatusBadge, Switch } from '../ui';

interface Coupon {
  id: string;
  code: string;
  description: string;
  type: 'percent' | 'flat';
  value: number;
  maxUses: number;
  perUserLimit: number;
  allowedCount: number;
  minAmount: number;
  validFrom: string | null;
  validTo: string | null;
  active: boolean;
  usedCount: number;
  discountGiven: number;
  state: string;
  createdAt: string;
  recentRedemptions: Array<{ email: string; amount: number; discount: number; at: string }>;
}

const STATE_LABELS: Record<string, string> = { live: 'Live', scheduled: 'Scheduled', expired: 'Expired', retired: 'Retired', 'used-up': 'Used up' };

export default function Coupons() {
  const { data, error, loading, reload } = useApi<{ data: Coupon[] }>('/payments/coupons');
  const { busy, run } = useAction();
  const [editing, setEditing] = useState<Coupon | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Coupon | null>(null);

  const toggle = (c: Coupon, active: boolean) =>
    run(c.id, () => api(`/payments/coupons/${c.id}`, { method: 'PATCH', body: { active } }), active ? `${c.code} is active again` : `${c.code} retired`).then((ok) => ok !== undefined && reload());

  return (
    <>
      <PageHeader
        title="Coupons"
        description="Discount codes customers can use at checkout. Schedule them, cap their uses and retire them when a campaign ends."
        actions={<button type="button" className="ad-btn primary" onClick={() => setEditing('new')}><Plus size={15} /> New coupon</button>}
      />
      <Card bodyClass={false}>
        <DataTable
          rows={data?.data}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(c) => c.id}
          empty={<Empty icon={<TicketPercent size={20} />} title="No coupons yet" text="Create a code for a launch, a partner or a festival sale." action={<button type="button" className="ad-btn primary" onClick={() => setEditing('new')}><Plus size={15} /> New coupon</button>} />}
          columns={[
            { key: 'code', header: 'Code', render: (c) => (
              <div>
                <div className="ad-cell-title ad-mono" style={{ fontSize: '0.86rem' }}>{c.code}</div>
                {c.description && <div className="ad-cell-sub">{c.description}</div>}
                {c.allowedCount > 0 && <div className="ad-cell-sub">Only for {c.allowedCount} {c.allowedCount === 1 ? 'account' : 'accounts'}</div>}
              </div>
            ) },
            { key: 'discount', header: 'Discount', render: (c) => <strong>{c.type === 'percent' ? `${c.value}% off` : `${money(c.value)} off`}</strong> },
            { key: 'state', header: 'Status', render: (c) => <StatusBadge status={c.state} label={STATE_LABELS[c.state]} /> },
            { key: 'window', header: 'Valid', render: (c) => <span className="muted">{c.validFrom || c.validTo ? `${c.validFrom ? date(c.validFrom) : 'Now'} – ${c.validTo ? date(c.validTo) : 'no end'}` : 'Always'}</span> },
            { key: 'uses', header: 'Used', className: 'num', render: (c) => <>{count(c.usedCount)}{c.maxUses ? <span className="muted"> / {count(c.maxUses)}</span> : ''}</> },
            { key: 'given', header: 'Discount given', className: 'num', render: (c) => money(c.discountGiven) },
            { key: 'active', header: 'Active', render: (c) => <Switch label={`${c.code} active`} checked={c.active} disabled={busy === c.id} onChange={(v) => toggle(c, v)} /> },
            { key: 'actions', header: '', className: 'actions', render: (c) => (
              <span style={{ display: 'inline-flex', gap: 6 }}>
                <button type="button" className="ad-btn sm icon" onClick={() => setEditing(c)} aria-label={`Edit ${c.code}`}><Pencil size={14} /></button>
                {c.usedCount === 0 && <button type="button" className="ad-btn sm danger-outline" onClick={() => setDeleting(c)}>Delete</button>}
              </span>
            ) }
          ]}
        />
      </Card>

      {editing && <CouponForm coupon={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.code}?`}
          description="It has never been used, so it can be removed completely."
          confirmLabel="Delete"
          danger
          busy={busy === 'delete'}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const ok = await run('delete', () => api(`/payments/coupons/${deleting.id}`, { method: 'DELETE' }), 'Coupon deleted');
            setDeleting(null);
            if (ok !== undefined) reload();
          }}
        />
      )}
    </>
  );
}

const toLocalInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

function CouponForm({ coupon, onClose, onSaved }: { coupon: Coupon | null; onClose: () => void; onSaved: () => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState({
    code: coupon?.code || '',
    description: coupon?.description || '',
    type: coupon?.type || 'percent',
    value: coupon ? String(coupon.value) : '',
    maxUses: coupon ? String(coupon.maxUses || '') : '',
    perUserLimit: coupon ? String(coupon.perUserLimit) : '1',
    minAmount: coupon ? String(coupon.minAmount || '') : '',
    validFrom: toLocalInput(coupon?.validFrom || null),
    validTo: toLocalInput(coupon?.validTo || null)
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = {
      code: form.code,
      description: form.description,
      type: form.type,
      value: Number(form.value),
      maxUses: Number(form.maxUses || 0),
      perUserLimit: Number(form.perUserLimit || 0),
      minAmount: Number(form.minAmount || 0),
      validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : null,
      validTo: form.validTo ? new Date(form.validTo).toISOString() : null
    };
    const ok = await run('save', () => coupon
      ? api(`/payments/coupons/${coupon.id}`, { method: 'PATCH', body })
      : api('/payments/coupons', { method: 'POST', body }), coupon ? 'Coupon saved' : 'Coupon created');
    if (ok !== undefined) onSaved();
  };

  return (
    <Modal
      title={coupon ? `Edit ${coupon.code}` : 'New coupon'}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
          <button type="submit" form="ad-coupon-form" className="ad-btn primary" disabled={busy === 'save' || !form.code || !form.value}>
            {busy === 'save' && <Spinner size={14} />} {coupon ? 'Save changes' : 'Create coupon'}
          </button>
        </>
      }
    >
      <form id="ad-coupon-form" onSubmit={submit}>
        <div className="ad-form-row">
          <div className="ad-field">
            <label htmlFor="c-code">Code</label>
            <input id="c-code" className="ad-input ad-mono" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="DIWALI25" disabled={!!coupon?.usedCount} autoFocus={!coupon} />
            {!!coupon?.usedCount && <span className="ad-hint">Used coupons can't be renamed.</span>}
          </div>
          <div className="ad-field">
            <label htmlFor="c-desc">Note (internal)</label>
            <input id="c-desc" className="ad-input" value={form.description} onChange={set('description')} placeholder="Festival sale" />
          </div>
        </div>
        <div className="ad-form-row">
          <div className="ad-field">
            <label htmlFor="c-type">Discount type</label>
            <select id="c-type" className="ad-select" value={form.type} onChange={set('type')}>
              <option value="percent">Percent off</option>
              <option value="flat">Fixed amount off (₹)</option>
            </select>
          </div>
          <div className="ad-field">
            <label htmlFor="c-value">{form.type === 'percent' ? 'Percent' : 'Amount (₹)'}</label>
            <input id="c-value" className="ad-input" type="number" min={1} max={form.type === 'percent' ? 100 : undefined} value={form.value} onChange={set('value')} />
          </div>
        </div>
        <div className="ad-form-row">
          <div className="ad-field">
            <label htmlFor="c-max">Total uses</label>
            <input id="c-max" className="ad-input" type="number" min={0} value={form.maxUses} onChange={set('maxUses')} placeholder="Unlimited" />
          </div>
          <div className="ad-field">
            <label htmlFor="c-per">Uses per customer</label>
            <input id="c-per" className="ad-input" type="number" min={0} value={form.perUserLimit} onChange={set('perUserLimit')} />
            <span className="ad-hint">0 means no limit.</span>
          </div>
        </div>
        <div className="ad-form-row">
          <div className="ad-field">
            <label htmlFor="c-from">Starts</label>
            <input id="c-from" className="ad-input" type="datetime-local" value={form.validFrom} onChange={set('validFrom')} />
          </div>
          <div className="ad-field">
            <label htmlFor="c-to">Ends</label>
            <input id="c-to" className="ad-input" type="datetime-local" value={form.validTo} onChange={set('validTo')} />
          </div>
        </div>
        <div className="ad-field" style={{ marginTop: 14 }}>
          <label htmlFor="c-min">Minimum order (₹)</label>
          <input id="c-min" className="ad-input" type="number" min={0} value={form.minAmount} onChange={set('minAmount')} placeholder="None" style={{ maxWidth: 200 }} />
        </div>
      </form>
      {coupon && coupon.recentRedemptions.length > 0 && (
        <>
          <div className="ad-section-title" style={{ marginTop: 20 }}>Recent uses</div>
          <ul className="ad-list">
            {coupon.recentRedemptions.map((r, i) => <li key={i}><span>{r.email}</span><span className="ad-muted">−{money(r.discount)} · {date(r.at)}</span></li>)}
          </ul>
        </>
      )}
    </Modal>
  );
}
