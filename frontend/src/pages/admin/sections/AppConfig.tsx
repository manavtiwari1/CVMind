import { useState } from 'react';
import { Construction, Smartphone, ToggleRight } from 'lucide-react';
import { api } from '../api';
import { useAction, useAdmin, useApi } from '../hooks';
import { Card, ConfirmDialog, ErrorState, Notice, PageHeader, Spinner, Switch, Tabs } from '../ui';

interface VersionEntry { minVersion: string; latestVersion: string; message: string; updateUrl: string }
interface Settings {
  features: Record<string, boolean>;
  maintenance: { enabled: boolean; message: string };
  versions: Record<string, VersionEntry>;
}
interface SettingsResponse {
  data: Settings;
  features: Array<{ key: string; label: string; description: string }>;
  clients: Array<{ key: string; label: string }>;
  canSave: boolean;
}

type View = 'features' | 'maintenance' | 'versions';

// What each client currently ships, so the owner knows what "minimum" means today
const SHIPPED: Record<string, string> = { android: '1.0', extension: '1.1.0' };

export default function AppConfig() {
  const { can } = useAdmin();
  const [view, setView] = useState<View>('features');
  const { data, error, reload } = useApi<SettingsResponse>('/system/settings');
  const editable = can('settings.manage') && !!data?.canSave;

  return (
    <>
      <PageHeader title="App config" description="Turn features on or off, put the site in maintenance mode, and require app updates, without a new release. Changes apply within 30 seconds." />
      <Tabs<View> active={view} onChange={setView} tabs={[{ id: 'features', label: 'Feature switches' }, { id: 'maintenance', label: 'Maintenance mode' }, { id: 'versions', label: 'App versions' }]} />
      {data && !data.canSave && <div style={{ marginTop: 16 }}><Notice tone="amber">Settings can't be saved without MongoDB. The site is using the defaults.</Notice></div>}
      {data && can('settings.view') && !can('settings.manage') && <div style={{ marginTop: 16 }}><Notice>Your role can view these settings but not change them.</Notice></div>}
      {error && !data ? <Card><ErrorState message={error} onRetry={reload} /></Card> : !data ? <Card><div className="ad-skeleton" style={{ height: 240 }} /></Card> : (
        view === 'features' ? <Features data={data} editable={editable} onSaved={reload} />
          : view === 'maintenance' ? <Maintenance key={JSON.stringify(data.data.maintenance)} data={data} editable={editable} onSaved={reload} />
            : <Versions key={JSON.stringify(data.data.versions)} data={data} editable={editable} onSaved={reload} />
      )}
    </>
  );
}

function Features({ data, editable, onSaved }: { data: SettingsResponse; editable: boolean; onSaved: () => void }) {
  const { busy, run } = useAction();
  const [turningOff, setTurningOff] = useState<{ key: string; label: string } | null>(null);
  const off = data.features.filter((f) => data.data.features[f.key] === false);

  const save = async (key: string, value: boolean, label: string) => {
    const ok = await run(key, () => api('/system/settings/features', { method: 'PUT', body: { [key]: value } }), `${label} turned ${value ? 'on' : 'off'}`);
    setTurningOff(null);
    if (ok !== undefined) onSaved();
  };

  return (
    <>
      {off.length > 0 && <div style={{ marginTop: 16 }}><Notice tone="amber"><strong>{off.length} {off.length === 1 ? 'feature is' : 'features are'} off:</strong> {off.map((f) => f.label).join(', ')}. Visitors see a "turned off for now" message.</Notice></div>}
      <Card title="Feature switches" description="Turning a feature off blocks its API right away, so it also stops spending AI credits." bodyClass={false}>
        {data.features.map((f) => (
          <div className="ad-setting" key={f.key}>
            <div className="ad-setting-text">
              <strong>{f.label}</strong>
              <span>{f.description}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {busy === f.key && <Spinner size={14} />}
              <Switch
                label={f.label}
                checked={data.data.features[f.key] !== false}
                disabled={!editable || busy === f.key}
                onChange={(v) => (v ? save(f.key, true, f.label) : setTurningOff(f))}
              />
            </div>
          </div>
        ))}
      </Card>
      {turningOff && (
        <ConfirmDialog
          title={`Turn off ${turningOff.label}?`}
          description="Anyone using it gets a 'turned off for now' message until you turn it back on."
          confirmLabel="Turn off"
          danger
          busy={busy === turningOff.key}
          onClose={() => setTurningOff(null)}
          onConfirm={() => save(turningOff.key, false, turningOff.label)}
        />
      )}
    </>
  );
}

function Maintenance({ data, editable, onSaved }: { data: SettingsResponse; editable: boolean; onSaved: () => void }) {
  const current = data.data.maintenance;
  const [message, setMessage] = useState(current.message);
  const [confirm, setConfirm] = useState<boolean | null>(null);
  const { busy, run } = useAction();

  const save = async (enabled: boolean) => {
    const ok = await run('save', () => api('/system/settings/maintenance', { method: 'PUT', body: { enabled, message } }), enabled ? 'Maintenance mode is on' : current.enabled ? 'The site is back online' : 'Message saved');
    setConfirm(null);
    if (ok !== undefined) onSaved();
  };

  return (
    <>
      {current.enabled && <div style={{ marginTop: 16 }}><Notice tone="red"><strong>Maintenance mode is on.</strong> Visitors can't use CVMind. The admin panel still works.</Notice></div>}
      <Card title="Maintenance mode" description="Blocks the whole site and API for everyone except the admin panel. Use it for migrations or emergencies.">
        <div className="ad-field">
          <label htmlFor="m-msg">Message visitors see</label>
          <textarea id="m-msg" className="ad-textarea" value={message} maxLength={300} onChange={(e) => setMessage(e.target.value)} disabled={!editable} />
          <span className="ad-hint">{message.length}/300</span>
        </div>
        <div className="ad-actions-row" style={{ marginTop: 16 }}>
          {current.enabled ? (
            <button type="button" className="ad-btn primary" disabled={!editable || busy === 'save'} onClick={() => setConfirm(false)}>Turn off maintenance mode</button>
          ) : (
            <button type="button" className="ad-btn danger" disabled={!editable || busy === 'save' || !message.trim()} onClick={() => setConfirm(true)}><Construction size={15} /> Turn on maintenance mode</button>
          )}
          {message !== current.message && <button type="button" className="ad-btn" disabled={!editable || busy === 'save'} onClick={() => save(current.enabled)}>Save message</button>}
        </div>
      </Card>
      {confirm !== null && (
        <ConfirmDialog
          title={confirm ? 'Take CVMind offline?' : 'Bring CVMind back online?'}
          description={confirm ? 'Every visitor sees your message and nothing else works until you turn this off.' : 'Everyone can use the site again right away.'}
          confirmLabel={confirm ? 'Turn on' : 'Turn off'}
          danger={confirm}
          busy={busy === 'save'}
          onClose={() => setConfirm(null)}
          onConfirm={() => save(confirm)}
        />
      )}
    </>
  );
}

function Versions({ data, editable, onSaved }: { data: SettingsResponse; editable: boolean; onSaved: () => void }) {
  const [form, setForm] = useState<Record<string, VersionEntry>>(data.data.versions);
  const { busy, run } = useAction();
  const dirty = JSON.stringify(form) !== JSON.stringify(data.data.versions);
  const set = (client: string, field: keyof VersionEntry) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [client]: { ...f[client], [field]: e.target.value } }));

  const save = async () => {
    const ok = await run('save', () => api('/system/settings/versions', { method: 'PUT', body: form }), 'Version rules saved');
    if (ok !== undefined) onSaved();
  };

  return (
    <>
      <div style={{ marginTop: 16 }}>
        <Notice>
          Apps below the <strong>minimum</strong> version are blocked until they update. Apps below the <strong>latest</strong> version see a "new version available" prompt. Leave a field empty to switch that rule off.
        </Notice>
      </div>
      <div className="ad-grid cols-2">
        {data.clients.map((c) => (
          <Card key={c.key} title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{c.key === 'android' ? <Smartphone size={16} /> : <ToggleRight size={16} />}{c.label}</span>} description={SHIPPED[c.key] ? `Current release in the code: ${SHIPPED[c.key]}` : undefined}>
            <div className="ad-form-row">
              <div className="ad-field">
                <label htmlFor={`${c.key}-min`}>Minimum version</label>
                <input id={`${c.key}-min`} className="ad-input" value={form[c.key]?.minVersion || ''} onChange={set(c.key, 'minVersion')} placeholder="e.g. 1.1.0" disabled={!editable} />
              </div>
              <div className="ad-field">
                <label htmlFor={`${c.key}-latest`}>Latest version</label>
                <input id={`${c.key}-latest`} className="ad-input" value={form[c.key]?.latestVersion || ''} onChange={set(c.key, 'latestVersion')} placeholder="e.g. 1.2.0" disabled={!editable} />
              </div>
            </div>
            <div className="ad-field" style={{ marginTop: 14 }}>
              <label htmlFor={`${c.key}-msg`}>Update message</label>
              <input id={`${c.key}-msg`} className="ad-input" value={form[c.key]?.message || ''} onChange={set(c.key, 'message')} placeholder="We fixed an important bug. Please update to continue." disabled={!editable} maxLength={300} />
            </div>
            <div className="ad-field">
              <label htmlFor={`${c.key}-url`}>Update link</label>
              <input id={`${c.key}-url`} className="ad-input" value={form[c.key]?.updateUrl || ''} onChange={set(c.key, 'updateUrl')} placeholder={c.key === 'android' ? 'https://play.google.com/store/apps/details?id=…' : 'https://chromewebstore.google.com/detail/…'} disabled={!editable} />
            </div>
          </Card>
        ))}
      </div>
      {editable && (
        <div className="ad-actions-row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
          {dirty && <button type="button" className="ad-btn" onClick={() => setForm(data.data.versions)}>Discard</button>}
          <button type="button" className="ad-btn primary" disabled={!dirty || busy === 'save'} onClick={save}>{busy === 'save' && <Spinner size={14} />} Save version rules</button>
        </div>
      )}
    </>
  );
}
