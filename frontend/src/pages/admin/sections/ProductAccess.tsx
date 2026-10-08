import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { KeyRound, Lock, Plus } from 'lucide-react';
import { api } from '../api';
import { useAction, useAdmin, useApi } from '../hooks';
import { date } from '../format';
import { Badge, Card, ConfirmDialog, DataTable, Empty, Modal, Notice, Person, SearchInput, Segment, Select, Spinner, Switch } from '../ui';

interface Product { key: string; label: string; description: string; locked: boolean; activeGrants: number }
interface Grant {
  id: string;
  email: string;
  name: string | null;
  product: string;
  expiresAt: string | null;
  note: string;
  grantedBy: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

type Duration = '7' | '30' | '90' | '365' | 'lifetime' | 'custom';
const DURATIONS: Array<{ value: Duration; label: string }> = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
  { value: 'lifetime', label: 'Lifetime' },
  { value: 'custom', label: 'Pick a date' }
];

const DAY_MS = 24 * 60 * 60 * 1000;
const today = () => new Date().toISOString().slice(0, 10);

// The expiry to send: null for lifetime, otherwise the end of the chosen day
function expiryFor(duration: Duration, custom: string): string | null {
  if (duration === 'lifetime') return null;
  if (duration === 'custom') return custom ? new Date(`${custom}T23:59:59`).toISOString() : '';
  return new Date(Date.now() + Number(duration) * DAY_MS).toISOString();
}

export default function ProductAccess() {
  const { can } = useAdmin();
  const { data, error, loading, reload } = useApi<{ products: Product[]; data: Grant[] }>('/product-access');
  const { busy, run } = useAction();
  const [q, setQ] = useState('');
  const [product, setProduct] = useState('');
  const [status, setStatus] = useState<'active' | 'expired' | 'all'>('active');
  const [granting, setGranting] = useState(false);
  const [editing, setEditing] = useState<Grant | null>(null);
  const [revoking, setRevoking] = useState<Grant | null>(null);
  const [locking, setLocking] = useState<Product | null>(null);

  const products = useMemo(() => data?.products || [], [data]);
  const labelOf = useMemo(() => new Map(products.map((p) => [p.key, p.label])), [products]);
  const locked = products.filter((p) => p.locked);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.data || []).filter((g) =>
      (!product || g.product === product)
      && (status === 'all' || (status === 'active') === g.active)
      && (!needle || g.email.includes(needle) || (g.name || '').toLowerCase().includes(needle))
    );
  }, [data, q, product, status]);

  const setLock = async (p: Product, value: boolean) => {
    const ok = await run(p.key, () => api(`/product-access/locks/${p.key}`, { method: 'PUT', body: { locked: value } }), value ? `${p.label} now needs access` : `${p.label} is open to everyone`);
    setLocking(null);
    if (ok !== undefined) reload();
  };

  return (
    <>
      <Notice tone={locked.length ? 'amber' : 'blue'}>
        {locked.length
          ? <><strong>{locked.length} locked:</strong> {locked.map((p) => p.label).join(', ')}. Only the people below can use {locked.length === 1 ? 'it' : 'them'}; everyone else gets a "you don't have access" message.</>
          : 'Every product is open to everyone right now. Lock a product to limit it to the people you give access to.'}
      </Notice>

      <Card title="Products" description="A locked product only works for accounts with active access. Access you give to an unlocked product is kept for when you lock it." bodyClass={false}>
        {loading && !data ? <div style={{ padding: 20 }}><Spinner /></div> : products.map((p) => (
          <div className="ad-setting" key={p.key}>
            <div className="ad-setting-text">
              <strong>{p.locked && <Lock size={13} style={{ marginRight: 6, verticalAlign: -1 }} />}{p.label}</strong>
              <span>{p.description} · {p.activeGrants} with access</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {busy === p.key && <Spinner size={14} />}
              {p.locked ? <Badge tone="amber">Needs access</Badge> : <Badge tone="green">Open</Badge>}
              <Switch
                label={`Lock ${p.label}`}
                checked={p.locked}
                disabled={!can('settings.manage') || busy === p.key}
                onChange={(v) => (v ? setLocking(p) : setLock(p, false))}
              />
            </div>
          </div>
        ))}
      </Card>

      <Card
        title="People with access"
        description="Access ends on its own at the expiry date. Giving access again to someone who has it replaces the old expiry."
        bodyClass={false}
        actions={can('users.manage') && (
          <button type="button" className="ad-btn primary" onClick={() => setGranting(true)}><Plus size={15} /> Give access</button>
        )}
      >
        <div className="ad-toolbar">
          <SearchInput value={q} onChange={setQ} placeholder="Search name or email…" />
          <Select label="Product" value={product} onChange={setProduct} options={[{ value: '', label: 'All products' }, ...products.map((p) => ({ value: p.key, label: p.label }))]} />
          <Segment value={status} onChange={setStatus} options={[{ value: 'active', label: 'Active' }, { value: 'expired', label: 'Expired' }, { value: 'all', label: 'All' }]} />
        </div>
        <DataTable
          rows={data ? rows : undefined}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(g) => g.id}
          empty={<Empty icon={<KeyRound size={20} />} title={data?.data.length ? 'No matches' : 'Nobody has been given access yet'} text={data?.data.length ? 'Try another search or filter.' : 'Use "Give access" to add people.'} />}
          columns={[
            { key: 'person', header: 'Person', render: (g) => <Person name={g.name || undefined} email={g.email} /> },
            { key: 'product', header: 'Product', render: (g) => <Badge tone="purple">{labelOf.get(g.product) || g.product}</Badge> },
            { key: 'expires', header: 'Expires', render: (g) => (
              !g.active ? <Badge tone="red">Expired {date(g.expiresAt)}</Badge>
                : g.expiresAt ? <span>{date(g.expiresAt)}</span>
                : <Badge tone="green">Lifetime</Badge>
            ) },
            { key: 'by', header: 'Given by', render: (g) => <span className="muted">{g.grantedBy || '—'} · {date(g.updatedAt)}</span> },
            { key: 'note', header: 'Note', render: (g) => <span className="muted">{g.note || '—'}</span> },
            { key: 'actions', header: '', className: 'actions', render: (g) => can('users.manage') && (
              <div className="ad-actions-row" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="ad-btn sm" onClick={() => setEditing(g)}>{g.active ? 'Change' : 'Renew'}</button>
                <button type="button" className="ad-btn sm danger-outline" onClick={() => setRevoking(g)}>Revoke</button>
              </div>
            ) }
          ]}
        />
      </Card>

      {granting && <GrantModal products={products} onClose={() => setGranting(false)} onDone={() => { setGranting(false); reload(); }} />}
      {editing && <GrantModal products={products} grant={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} />}

      {revoking && (
        <ConfirmDialog
          title={`Revoke ${labelOf.get(revoking.product) || revoking.product} for ${revoking.email}?`}
          description="If the product is locked, they lose access on their next request."
          confirmLabel="Revoke"
          danger
          busy={busy === 'revoke'}
          onClose={() => setRevoking(null)}
          onConfirm={async () => {
            const ok = await run('revoke', () => api(`/product-access/${revoking.id}`, { method: 'DELETE' }), 'Access revoked');
            setRevoking(null);
            if (ok !== undefined) reload();
          }}
        />
      )}
      {locking && (
        <ConfirmDialog
          title={`Lock ${locking.label}?`}
          description={<>Everyone without access is shut out of {locking.label} right away, including signed-out visitors. {locking.activeGrants === 1 ? '1 person has' : `${locking.activeGrants} people have`} access.</>}
          confirmLabel="Lock product"
          danger
          busy={busy === locking.key}
          onClose={() => setLocking(null)}
          onConfirm={() => setLock(locking, true)}
        />
      )}
    </>
  );
}

// Gives new access (several emails and products at once), or changes one grant's expiry and note
function GrantModal({ products, grant, onClose, onDone }: { products: Product[]; grant?: Grant; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [emails, setEmails] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [duration, setDuration] = useState<Duration>(grant && grant.active && !grant.expiresAt ? 'lifetime' : '30');
  const [custom, setCustom] = useState('');
  const [note, setNote] = useState(grant?.note || '');

  const emailList = emails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
  const expiresAt = expiryFor(duration, custom);
  const ready = expiresAt !== '' && (grant || (emailList.length > 0 && picked.length > 0));
  const productLabel = grant && (products.find((p) => p.key === grant.product)?.label || grant.product);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    const ok = grant
      ? await run('save', () => api(`/product-access/${grant.id}`, { method: 'PATCH', body: { expiresAt, note } }), 'Access updated')
      : await run('save', () => api('/product-access', { method: 'POST', body: { emails: emailList, products: picked, expiresAt, note } }), emailList.length * picked.length === 1 ? 'Access given' : `Access given (${emailList.length} ${emailList.length === 1 ? 'person' : 'people'} × ${picked.length} ${picked.length === 1 ? 'product' : 'products'})`);
    if (ok !== undefined) onDone();
  };

  return (
    <Modal
      title={grant ? `${grant.active ? 'Change' : 'Renew'} access` : 'Give access'}
      description={grant ? <>{productLabel} for <strong>{grant.email}</strong></> : 'Works for people who haven\'t signed up yet too; access applies to the account with that email.'}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="ad-btn" onClick={onClose} disabled={busy === 'save'}>Cancel</button>
          <button type="submit" form="ad-grant-form" className="ad-btn primary" disabled={!ready || busy === 'save'}>
            {busy === 'save' && <Spinner size={14} />}{grant ? 'Save' : 'Give access'}
          </button>
        </>
      }
    >
      <form id="ad-grant-form" onSubmit={submit}>
        {!grant && (
          <>
            <div className="ad-field">
              <label htmlFor="ad-grant-emails">Emails</label>
              <textarea id="ad-grant-emails" className="ad-textarea" style={{ minHeight: 70 }} value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="name@example.com, another@example.com" autoFocus />
              <p className="ad-hint">Separate several with commas or new lines.{emailList.length > 1 && ` ${emailList.length} emails.`}</p>
            </div>
            <div className="ad-field" style={{ marginTop: 14 }}>
              <label>Products</label>
              <div className="ad-chips" style={{ gap: '8px 16px' }}>
                {products.map((p) => (
                  <label className="ad-check" key={p.key}>
                    <input type="checkbox" checked={picked.includes(p.key)} onChange={(e) => setPicked((cur) => (e.target.checked ? [...cur, p.key] : cur.filter((k) => k !== p.key)))} />
                    {p.label}{p.locked && <Lock size={12} />}
                  </label>
                ))}
              </div>
              <div className="ad-actions-row" style={{ marginTop: 8 }}>
                <button type="button" className="ad-btn sm" onClick={() => setPicked(products.map((p) => p.key))}>Select all</button>
                {picked.length > 0 && <button type="button" className="ad-btn sm" onClick={() => setPicked([])}>Clear</button>}
              </div>
            </div>
          </>
        )}
        <div className="ad-field" style={{ marginTop: grant ? 0 : 14 }}>
          <label>How long</label>
          <Segment value={duration} onChange={setDuration} options={DURATIONS} />
          {duration === 'custom' && (
            <input className="ad-input" type="date" min={today()} value={custom} onChange={(e) => setCustom(e.target.value)} aria-label="Expiry date" style={{ maxWidth: 200, marginTop: 8 }} />
          )}
          <p className="ad-hint">{expiresAt === null ? 'Access never expires.' : expiresAt ? `Access ends ${date(expiresAt)}.` : 'Pick the last day of access.'}</p>
        </div>
        <div className="ad-field" style={{ marginTop: 14 }}>
          <label htmlFor="ad-grant-note">Note (optional)</label>
          <input id="ad-grant-note" className="ad-input" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Paid by UPI on 8 Oct, beta tester" />
        </div>
      </form>
    </Modal>
  );
}
