import { useState } from 'react';
import type { FormEvent } from 'react';
import { KeyRound, Plus } from 'lucide-react';
import { api } from '../api';
import { useAction, useAdmin, useApi } from '../hooks';
import { date } from '../format';
import { Badge, Card, ConfirmDialog, DataTable, Empty, PageHeader, Spinner, Tabs } from '../ui';

type ListKey = 'auto-apply' | 'job-finder';

const LISTS: Record<ListKey, { title: string; description: string }> = {
  'auto-apply': { title: 'Auto Apply access', description: 'Auto Apply is in early access. Only these emails can use it; everyone else sees "coming soon".' },
  'job-finder': { title: 'Job finder whitelist', description: 'Emails that always get full Job finder access.' }
};

interface Entry { email: string; addedAt: string | null; source: string }

export default function AccessLists() {
  const { can } = useAdmin();
  const [list, setList] = useState<ListKey>('auto-apply');
  const { data, error, loading, reload } = useApi<{ data: Entry[] }>(`/users/access/${list}`);
  const { busy, run } = useAction();
  const [email, setEmail] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) return;
    const ok = await run('add', () => api(`/users/access/${list}`, { method: 'POST', body: { email: value } }), `${value} added`);
    if (ok !== undefined) { setEmail(''); reload(); }
  };

  return (
    <>
      <PageHeader title="Access lists" description="Give specific people early access to features that aren't open to everyone yet." />
      <Tabs tabs={[{ id: 'auto-apply' as ListKey, label: 'Auto Apply' }, { id: 'job-finder' as ListKey, label: 'Job finder' }]} active={list} onChange={setList} />
      <Card title={LISTS[list].title} description={LISTS[list].description} bodyClass={false}>
        {can('users.manage') && (
          <form className="ad-toolbar" onSubmit={add}>
            <input className="ad-input" style={{ maxWidth: 360 }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" aria-label="Email to add" />
            <button className="ad-btn primary" type="submit" disabled={!email.trim() || busy === 'add'}>
              {busy === 'add' ? <Spinner size={14} /> : <Plus size={15} />} Add email
            </button>
          </form>
        )}
        <DataTable
          rows={data?.data}
          loading={loading}
          error={error}
          onRetry={reload}
          rowKey={(r) => r.email}
          empty={<Empty icon={<KeyRound size={20} />} title="Nobody on this list yet" text="Add an email above to give that person access." />}
          columns={[
            { key: 'email', header: 'Email', render: (r) => <span className="ad-cell-title">{r.email}</span> },
            { key: 'source', header: 'Source', render: (r) => r.source === 'database' ? <Badge tone="gray">Added here</Badge> : <Badge tone="blue">Server config</Badge> },
            { key: 'added', header: 'Added', render: (r) => <span className="muted">{date(r.addedAt)}</span> },
            { key: 'actions', header: '', className: 'actions', render: (r) => can('users.manage') && r.source === 'database' && (
              <button type="button" className="ad-btn sm danger-outline" onClick={() => setRemoving(r.email)}>Remove</button>
            ) }
          ]}
        />
      </Card>
      {removing && (
        <ConfirmDialog
          title={`Remove ${removing}?`}
          description="They lose access the next time the page checks."
          confirmLabel="Remove"
          danger
          busy={busy === 'remove'}
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            const ok = await run('remove', () => api(`/users/access/${list}/${encodeURIComponent(removing)}`, { method: 'DELETE' }), 'Removed');
            setRemoving(null);
            if (ok !== undefined) reload();
          }}
        />
      )}
    </>
  );
}
