import { useState } from 'react';
import type { FormEvent } from 'react';
import { Archive, HardDrive, Laptop, Pencil, Plus, UserRoundCheck } from 'lucide-react';
import { api } from '../api';
import { useAction, useAdmin, useApi } from '../hooks';
import { money } from '../format';
import { Badge, Card, DataTable, Empty, Modal, PageHeader, Segment, Spinner, StatCard } from '../ui';
import { day, todayIso } from '../erp';

// ERP → Assets: laptops and phones given to people, and domains, hosting and SaaS paid for on repeat.
// Passwords and API keys are never stored here, only who holds each login.

interface Holder { id: string; name: string; active: boolean }
interface Asset {
  id: string; kind: 'physical' | 'digital'; name: string; category: string; serialNumber: string; condition: string; assignedTo: Holder | null;
  provider: string; plan: string; billingCard: string; loginHolders: Holder[]; cost: number; billing: 'once' | 'monthly' | 'yearly';
  purchaseDate: string; renewalDate: string; daysToRenewal: number | null; owner: Holder | null; status: 'active' | 'retired'; notes: string;
  history: Array<{ at: string; text: string; byName: string }>;
}
interface ListResponse { data: Asset[]; categories: { physical: string[]; digital: string[] }; summary: { physical: number; digital: number; renewingIn30Days: number; yearlyCost: number } }
interface Person { id: string; name: string; active: boolean }

const CAT_LABEL: Record<string, string> = { laptop: 'Laptop', phone: 'Phone', monitor: 'Monitor', accessory: 'Accessory', domain: 'Domain', hosting: 'Hosting', database: 'Database', ai_api: 'AI API', email: 'Email', software: 'Software', other: 'Other' };
const BILLING: Record<string, string> = { once: 'One-time', monthly: 'a month', yearly: 'a year' };

export default function ErpAssets() {
  const { can } = useAdmin();
  const [kind, setKind] = useState<'' | 'physical' | 'digital'>('');
  const [status, setStatus] = useState<'active' | 'retired'>('active');
  const { data, error, loading, reload } = useApi<ListResponse>('/erp/assets', { kind, status });
  const [editing, setEditing] = useState<Asset | 'physical' | 'digital' | null>(null);
  const [assigning, setAssigning] = useState<Asset | null>(null);
  const manage = can('hr.manage');

  return (
    <>
      <PageHeader
        title="Assets & subscriptions"
        description="What CVMind owns or pays for on repeat, who has it, and when it renews. Renewals remind the owner and leadership 14 and 3 days before, then show up as a draft in Expenses."
        actions={manage && <span style={{ display: 'inline-flex', gap: 8 }}>
          <button type="button" className="ad-btn" onClick={() => setEditing('physical')}><Laptop size={14} /> Add device</button>
          <button type="button" className="ad-btn primary" onClick={() => setEditing('digital')}><Plus size={14} /> Add subscription</button>
        </span>}
      />
      <div className="ad-grid cols-4" style={{ marginBottom: 16 }}>
        <StatCard label="Devices" value={data?.summary.physical ?? '—'} loading={loading && !data} />
        <StatCard label="Subscriptions & domains" value={data?.summary.digital ?? '—'} tone="blue" />
        <StatCard label="Renewing in 30 days" value={data?.summary.renewingIn30Days ?? 0} tone="amber" />
        <StatCard label="Repeat costs a year" value={money(data?.summary.yearlyCost)} tone="purple" />
      </div>
      <Card bodyClass={false}>
        <div className="ad-toolbar">
          <Segment<'' | 'physical' | 'digital'> value={kind} onChange={setKind} options={[{ value: '', label: 'All' }, { value: 'physical', label: 'Devices' }, { value: 'digital', label: 'Subscriptions' }]} />
          <Segment<'active' | 'retired'> value={status} onChange={setStatus} options={[{ value: 'active', label: 'In use' }, { value: 'retired', label: 'Retired' }]} />
        </div>
        <DataTable
          rows={data?.data}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(a) => a.id}
          empty={<Empty icon={<HardDrive size={20} />} title="Nothing here yet" text="Add the laptops you've given out and the services you pay for (domains, Render, TiDB, Vercel, AI APIs)." />}
          columns={[
            { key: 'name', header: 'Asset', render: (a) => <span><strong>{a.name}</strong><br /><span className="muted">{CAT_LABEL[a.category] || a.category}{a.provider ? ` · ${a.provider}` : ''}{a.plan ? ` · ${a.plan}` : ''}{a.serialNumber ? ` · ${a.serialNumber}` : ''}</span></span> },
            { key: 'who', header: 'With', render: (a) => a.kind === 'physical'
              ? (a.assignedTo ? <span>{a.assignedTo.name}{!a.assignedTo.active && <> <Badge tone="red">left</Badge></>}</span> : <span className="muted">In stock</span>)
              : (a.loginHolders.length ? <span>{a.loginHolders.map((h) => h.name).join(', ')}{a.loginHolders.some((h) => !h.active) && <> <Badge tone="red">someone left</Badge></>}</span> : <span className="muted">No one listed</span>) },
            { key: 'cost', header: 'Cost', render: (a) => a.cost ? <span>{money(a.cost)} <span className="muted">{BILLING[a.billing]}</span></span> : <span className="muted">—</span> },
            { key: 'renew', header: 'Renews', render: (a) => a.renewalDate ? <span>{day(a.renewalDate)}{a.daysToRenewal !== null && a.daysToRenewal <= 30 && a.daysToRenewal >= 0 && <><br /><Badge tone="amber">in {a.daysToRenewal} days</Badge></>}</span> : <span className="muted">—</span> },
            { key: 'owner', header: 'Owner', render: (a) => a.owner?.name || <span className="muted">—</span> },
            { key: 'actions', header: '', className: 'actions', render: (a) => manage && (
              <span style={{ display: 'inline-flex', gap: 6 }}>
                {a.kind === 'physical' && a.status === 'active' && <button type="button" className="ad-btn sm" onClick={() => setAssigning(a)}><UserRoundCheck size={13} /> {a.assignedTo ? 'Return / reassign' : 'Give out'}</button>}
                <button type="button" className="ad-btn sm" onClick={() => setEditing(a)} aria-label={`Edit ${a.name}`}><Pencil size={13} /></button>
              </span>
            ) }
          ]}
        />
      </Card>
      {editing && <AssetForm row={typeof editing === 'string' ? null : editing} kind={typeof editing === 'string' ? editing : editing.kind} categories={data?.categories} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} />}
      {assigning && <AssignForm asset={assigning} onClose={() => setAssigning(null)} onDone={() => { setAssigning(null); reload(); }} />}
    </>
  );
}

function AssetForm({ row, kind, categories, onClose, onDone }: { row: Asset | null; kind: 'physical' | 'digital'; categories?: ListResponse['categories']; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const people = useApi<{ data: Person[] }>('/erp/people');
  const active = (people.data?.data || []).filter((p) => p.active);
  const [form, setForm] = useState({
    name: row?.name || '', category: row?.category || (kind === 'physical' ? 'laptop' : 'software'), serialNumber: row?.serialNumber || '', condition: row?.condition || '',
    provider: row?.provider || '', plan: row?.plan || '', billingCard: row?.billingCard || '', cost: row ? String(row.cost || '') : '',
    billing: row?.billing || (kind === 'physical' ? 'once' : 'monthly'), purchaseDate: row?.purchaseDate || (row ? '' : todayIso()), renewalDate: row?.renewalDate || '',
    ownerId: row?.owner?.id || '', notes: row?.notes || ''
  });
  const [holders, setHolders] = useState<string[]>(row?.loginHolders.map((h) => h.id) || []);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = { ...form, kind, cost: Number(form.cost) || 0, ...(kind === 'digital' ? { loginHolderIds: holders } : {}) };
    const ok = await run('save', () => api(row ? `/erp/assets/${row.id}` : '/erp/assets', { method: row ? 'PATCH' : 'POST', body }), 'Saved');
    if (ok !== undefined) onDone();
  };
  const retire = async () => {
    const ok = await run('retire', () => api(`/erp/assets/${row!.id}`, { method: 'PATCH', body: { status: row!.status === 'active' ? 'retired' : 'active' } }), row!.status === 'active' ? 'Retired' : 'Back in use');
    if (ok !== undefined) onDone();
  };
  return (
    <Modal title={row ? `Edit ${row.name}` : kind === 'physical' ? 'Add a device' : 'Add a subscription or domain'} description={kind === 'digital' ? 'Never type passwords or API keys here. List who holds the login instead.' : undefined} onClose={onClose} wide footer={<>
      {row && <button type="button" className="ad-btn" disabled={busy === 'retire'} onClick={retire} style={{ marginRight: 'auto' }}><Archive size={14} /> {row.status === 'active' ? 'Retire' : 'Put back in use'}</button>}
      <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
      <button type="submit" form="erp-asset" className="ad-btn primary" disabled={busy === 'save'}>{busy === 'save' && <Spinner size={14} />} Save</button>
    </>}>
      <form id="erp-asset" onSubmit={submit}>
        <div className="ad-form-row">
          <div className="ad-field"><label htmlFor="as-name">Name</label><input id="as-name" className="ad-input" value={form.name} onChange={set('name')} maxLength={100} required placeholder={kind === 'physical' ? 'MacBook Air M3' : 'cvmind.in'} /></div>
          <div className="ad-field"><label htmlFor="as-cat">Category</label><select id="as-cat" className="ad-select" value={form.category} onChange={set('category')}>{(categories?.[kind] || []).map((c) => <option key={c} value={c}>{CAT_LABEL[c] || c}</option>)}</select></div>
        </div>
        {kind === 'physical' ? (
          <div className="ad-form-row" style={{ marginTop: 14 }}>
            <div className="ad-field"><label htmlFor="as-sn">Serial number</label><input id="as-sn" className="ad-input ad-mono" value={form.serialNumber} onChange={set('serialNumber')} maxLength={80} /></div>
            <div className="ad-field"><label htmlFor="as-cond">Condition</label><input id="as-cond" className="ad-input" value={form.condition} onChange={set('condition')} maxLength={80} placeholder="New" /></div>
          </div>
        ) : (
          <>
            <div className="ad-form-row" style={{ marginTop: 14 }}>
              <div className="ad-field"><label htmlFor="as-prov">Provider</label><input id="as-prov" className="ad-input" value={form.provider} onChange={set('provider')} maxLength={80} placeholder="GoDaddy" /></div>
              <div className="ad-field"><label htmlFor="as-plan">Plan</label><input id="as-plan" className="ad-input" value={form.plan} onChange={set('plan')} maxLength={80} /></div>
              <div className="ad-field"><label htmlFor="as-card">Paid with</label><input id="as-card" className="ad-input" value={form.billingCard} onChange={set('billingCard')} maxLength={40} placeholder="HDFC card ••1234" /></div>
            </div>
            <div className="ad-field" style={{ marginTop: 14 }}>
              <span className="ad-label">Who holds the login</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>{active.map((p) => <label key={p.id} className="ad-check"><input type="checkbox" checked={holders.includes(p.id)} onChange={(e) => setHolders(e.target.checked ? [...holders, p.id] : holders.filter((x) => x !== p.id))} /> {p.name}</label>)}</div>
            </div>
          </>
        )}
        <div className="ad-form-row" style={{ marginTop: 14 }}>
          <div className="ad-field"><label htmlFor="as-cost">Cost (₹)</label><input id="as-cost" type="number" min={0} step="0.01" className="ad-input" value={form.cost} onChange={set('cost')} /></div>
          <div className="ad-field"><label htmlFor="as-bill">Paid</label><select id="as-bill" className="ad-select" value={form.billing} onChange={set('billing')}><option value="once">Once</option><option value="monthly">Every month</option><option value="yearly">Every year</option></select></div>
          <div className="ad-field"><label htmlFor="as-buy">Bought on</label><input id="as-buy" type="date" className="ad-input" value={form.purchaseDate} onChange={set('purchaseDate')} /></div>
          {(form.billing !== 'once' || kind === 'digital') && <div className="ad-field"><label htmlFor="as-ren">Next renewal</label><input id="as-ren" type="date" className="ad-input" value={form.renewalDate} onChange={set('renewalDate')} required={form.billing !== 'once'} /></div>}
        </div>
        <div className="ad-form-row" style={{ marginTop: 14 }}>
          <div className="ad-field"><label htmlFor="as-owner">Owner</label><select id="as-owner" className="ad-select" value={form.ownerId} onChange={set('ownerId')}><option value="">No one</option>{active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><span className="ad-hint">Gets the renewal reminders, with leadership.</span></div>
          <div className="ad-field"><label htmlFor="as-notes">Notes</label><input id="as-notes" className="ad-input" value={form.notes} onChange={set('notes')} maxLength={1000} /></div>
        </div>
        {row && row.history.length > 0 && (
          <>
            <div className="ad-section-title" style={{ marginTop: 18 }}>History</div>
            <ul className="ad-list">{[...row.history].reverse().slice(0, 8).map((h, i) => <li key={i}><div className="ad-cell-title">{h.text}</div><div className="ad-cell-sub">{new Date(h.at).toLocaleDateString('en-IN')} · {h.byName}</div></li>)}</ul>
          </>
        )}
      </form>
    </Modal>
  );
}

function AssignForm({ asset, onClose, onDone }: { asset: Asset; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const people = useApi<{ data: Person[] }>('/erp/people');
  const [adminId, setAdminId] = useState(asset.assignedTo?.active ? asset.assignedTo.id : '');
  const [condition, setCondition] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run('assign', () => api(`/erp/assets/${asset.id}/assign`, { method: 'POST', body: { adminId: adminId || null, condition } }), adminId ? 'Handed out' : 'Returned to stock');
    if (ok !== undefined) onDone();
  };
  return (
    <Modal title={asset.name} description={asset.assignedTo ? `Now with ${asset.assignedTo.name}.` : 'In stock.'} onClose={onClose} footer={<>
      <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
      <button type="submit" form="erp-assign" className="ad-btn primary" disabled={busy === 'assign'}>{busy === 'assign' && <Spinner size={14} />} Save</button>
    </>}>
      <form id="erp-assign" onSubmit={submit}>
        <div className="ad-field"><label htmlFor="ag-to">Give to</label><select id="ag-to" className="ad-select" value={adminId} onChange={(e) => setAdminId(e.target.value)}><option value="">No one (back in stock)</option>{(people.data?.data || []).filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div className="ad-field" style={{ marginTop: 14 }}><label htmlFor="ag-cond">Condition now</label><input id="ag-cond" className="ad-input" value={condition} onChange={(e) => setCondition(e.target.value)} maxLength={80} placeholder="Good, small scratch on lid" /></div>
      </form>
    </Modal>
  );
}
