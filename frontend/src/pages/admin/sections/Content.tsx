import { useState } from 'react';
import type { FormEvent } from 'react';
import { Megaphone, Pencil, Plus } from 'lucide-react';
import { api } from '../api';
import { useAction, useApi } from '../hooks';
import { dateTime } from '../format';
import { Badge, Card, ConfirmDialog, DataTable, Empty, Modal, Notice, PageHeader, Spinner, StatusBadge, Switch, Tabs } from '../ui';

type Slot = 'announcement' | 'home-banner' | 'promo' | 'faq';
type Tone = 'info' | 'success' | 'warning' | 'promo';

interface Block {
  id: string;
  slot: Slot;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  tone: Tone;
  order: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  updatedBy: string;
  updatedAt: string;
}

const SLOTS: Record<Slot, { label: string; help: string }> = {
  announcement: { label: 'Announcement bar', help: 'A thin bar at the very top of every page. Only the first live one shows.' },
  'home-banner': { label: 'Home banner', help: 'A banner under the hero on the home page. Only the first live one shows.' },
  promo: { label: 'Promo strip', help: 'An offer strip on the Pricing page. Only the first live one shows.' },
  faq: { label: 'FAQ entries', help: 'Extra questions shown at the top of the FAQ page, in order.' }
};

const TONES: Record<Tone, string> = { info: 'Info (blue)', success: 'Good news (green)', warning: 'Heads-up (amber)', promo: 'Promo (brand gradient)' };

function liveState(b: Block) {
  const now = Date.now();
  if (!b.active) return 'paused';
  if (b.startsAt && new Date(b.startsAt).getTime() > now) return 'scheduled';
  if (b.endsAt && new Date(b.endsAt).getTime() <= now) return 'expired';
  return 'live';
}

export default function Content() {
  const [slot, setSlot] = useState<Slot>('announcement');
  const { data, error, loading, reload } = useApi<{ data: Block[] }>('/content/blocks');
  const { busy, run } = useAction();
  const [editing, setEditing] = useState<Block | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Block | null>(null);
  const blocks = (data?.data || []).filter((b) => b.slot === slot);
  const countFor = (s: Slot) => (data?.data || []).filter((b) => b.slot === s).length;

  return (
    <>
      <PageHeader
        title="Site content"
        description="Change banners, announcements and FAQ entries on cvmind.in without a new release. Changes show within a minute."
        actions={<button type="button" className="ad-btn primary" onClick={() => setEditing('new')}><Plus size={15} /> Add content</button>}
      />
      <Tabs<Slot> active={slot} onChange={setSlot} tabs={(Object.keys(SLOTS) as Slot[]).map((s) => ({ id: s, label: SLOTS[s].label, count: countFor(s) }))} />
      <Card title={SLOTS[slot].label} description={SLOTS[slot].help} bodyClass={false}>
        <DataTable
          rows={data ? blocks : undefined}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(b) => b.id}
          empty={<Empty icon={<Megaphone size={20} />} title="Nothing here yet" text="The site shows its built-in content until you add something." action={<button type="button" className="ad-btn primary" onClick={() => setEditing('new')}><Plus size={15} /> Add content</button>} />}
          columns={[
            { key: 'title', header: 'Content', render: (b) => <div style={{ maxWidth: 420 }}><div className="ad-cell-title">{b.title}</div>{b.body && <div className="ad-cell-sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.body}</div>}</div> },
            { key: 'state', header: 'Status', render: (b) => <StatusBadge status={liveState(b)} /> },
            { key: 'when', header: 'Schedule', render: (b) => <span className="muted ad-small">{b.startsAt || b.endsAt ? `${b.startsAt ? dateTime(b.startsAt) : 'Now'} → ${b.endsAt ? dateTime(b.endsAt) : 'no end'}` : 'Always'}</span> },
            { key: 'order', header: 'Order', className: 'num', render: (b) => b.order },
            { key: 'updated', header: 'Last edit', render: (b) => <span className="muted ad-small">{dateTime(b.updatedAt)}{b.updatedBy && ` · ${b.updatedBy}`}</span> },
            { key: 'active', header: 'On', render: (b) => <Switch label={`${b.title} on`} checked={b.active} disabled={busy === b.id} onChange={(active) => run(b.id, () => api(`/content/blocks/${b.id}`, { method: 'PATCH', body: { active } }), active ? 'Turned on' : 'Turned off').then((ok) => ok !== undefined && reload())} /> },
            { key: 'actions', header: '', className: 'actions', render: (b) => (
              <span style={{ display: 'inline-flex', gap: 6 }}>
                <button type="button" className="ad-btn sm icon" aria-label={`Edit ${b.title}`} onClick={() => setEditing(b)}><Pencil size={14} /></button>
                <button type="button" className="ad-btn sm danger-outline" onClick={() => setDeleting(b)}>Delete</button>
              </span>
            ) }
          ]}
        />
      </Card>
      {editing && <BlockForm block={editing === 'new' ? null : editing} slot={slot} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      {deleting && (
        <ConfirmDialog
          title={`Delete "${deleting.title}"?`}
          description="It's removed from the site within a minute."
          confirmLabel="Delete"
          danger
          busy={busy === 'delete'}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const ok = await run('delete', () => api(`/content/blocks/${deleting.id}`, { method: 'DELETE' }), 'Deleted');
            setDeleting(null);
            if (ok !== undefined) reload();
          }}
        />
      )}
    </>
  );
}

const toLocalInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

function BlockForm({ block, slot, onClose, onSaved }: { block: Block | null; slot: Slot; onClose: () => void; onSaved: () => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState({
    slot: block?.slot || slot,
    title: block?.title || '',
    body: block?.body || '',
    ctaLabel: block?.ctaLabel || '',
    ctaUrl: block?.ctaUrl || '',
    tone: block?.tone || 'info' as Tone,
    order: String(block?.order ?? 0),
    active: block?.active ?? true,
    startsAt: toLocalInput(block?.startsAt || null),
    endsAt: toLocalInput(block?.endsAt || null)
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isFaq = form.slot === 'faq';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = {
      ...form,
      order: Number(form.order) || 0,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null
    };
    const ok = await run('save', () => block ? api(`/content/blocks/${block.id}`, { method: 'PATCH', body }) : api('/content/blocks', { method: 'POST', body }), block ? 'Saved' : 'Added');
    if (ok !== undefined) onSaved();
  };

  return (
    <Modal
      title={block ? 'Edit content' : 'Add content'}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
          <button type="submit" form="ad-block-form" className="ad-btn primary" disabled={busy === 'save' || !form.title.trim()}>{busy === 'save' && <Spinner size={14} />} {block ? 'Save' : 'Add'}</button>
        </>
      }
    >
      <form id="ad-block-form" onSubmit={submit}>
        <div className="ad-form-row">
          <div className="ad-field">
            <label htmlFor="b-slot">Where</label>
            <select id="b-slot" className="ad-select" value={form.slot} onChange={set('slot')}>
              {(Object.keys(SLOTS) as Slot[]).map((s) => <option key={s} value={s}>{SLOTS[s].label}</option>)}
            </select>
          </div>
          {!isFaq && (
            <div className="ad-field">
              <label htmlFor="b-tone">Style</label>
              <select id="b-tone" className="ad-select" value={form.tone} onChange={set('tone')}>
                {(Object.keys(TONES) as Tone[]).map((t) => <option key={t} value={t}>{TONES[t]}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="ad-field" style={{ marginTop: 14 }}>
          <label htmlFor="b-title">{isFaq ? 'Question' : 'Headline'}</label>
          <input id="b-title" className="ad-input" value={form.title} onChange={set('title')} maxLength={160} autoFocus />
        </div>
        <div className="ad-field">
          <label htmlFor="b-body">{isFaq ? 'Answer' : 'Text (optional)'}</label>
          <textarea id="b-body" className="ad-textarea" value={form.body} onChange={set('body')} maxLength={4000} />
        </div>
        {!isFaq && (
          <div className="ad-form-row">
            <div className="ad-field">
              <label htmlFor="b-cta">Button text (optional)</label>
              <input id="b-cta" className="ad-input" value={form.ctaLabel} onChange={set('ctaLabel')} maxLength={40} placeholder="Try it free" />
            </div>
            <div className="ad-field">
              <label htmlFor="b-url">Button link</label>
              <input id="b-url" className="ad-input" value={form.ctaUrl} onChange={set('ctaUrl')} placeholder="/tailor or https://…" />
            </div>
          </div>
        )}
        <div className="ad-form-row">
          <div className="ad-field">
            <label htmlFor="b-start">Show from (optional)</label>
            <input id="b-start" className="ad-input" type="datetime-local" value={form.startsAt} onChange={set('startsAt')} />
          </div>
          <div className="ad-field">
            <label htmlFor="b-end">Hide after (optional)</label>
            <input id="b-end" className="ad-input" type="datetime-local" value={form.endsAt} onChange={set('endsAt')} />
          </div>
        </div>
        <div className="ad-form-row">
          <div className="ad-field">
            <label htmlFor="b-order">Order</label>
            <input id="b-order" className="ad-input" type="number" value={form.order} onChange={set('order')} />
            <span className="ad-hint">Lower numbers show first.</span>
          </div>
          <div className="ad-field" style={{ justifyContent: 'center' }}>
            <label className="ad-check"><input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} /> On</label>
          </div>
        </div>
      </form>

      {!isFaq && form.title && (
        <>
          <div className="ad-section-title" style={{ marginTop: 20 }}>Preview</div>
          <div className={`ad-banner-preview ${form.tone}`}>
            <span><strong>{form.title}</strong>{form.body && <> · {form.body}</>}</span>
            {form.ctaLabel && <span className="cta">{form.ctaLabel} →</span>}
          </div>
        </>
      )}
      {isFaq && <div style={{ marginTop: 16 }}><Notice>FAQ entries appear above the built-in questions on the FAQ page.</Notice></div>}
      {block && <p className="ad-hint" style={{ marginTop: 12 }}><Badge tone="gray">Last edited {dateTime(block.updatedAt)}{block.updatedBy && ` by ${block.updatedBy}`}</Badge></p>}
    </Modal>
  );
}
