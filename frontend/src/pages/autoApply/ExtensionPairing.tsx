import { useEffect, useState } from 'react';
import { AlertCircle, Copy, Puzzle, RefreshCw, Trash2 } from 'lucide-react';
import type { ExtensionDevice, PairCode } from '../../types/agent';
import { createPairCode, listExtensionDevices, revokeExtensionDevice } from '../../lib/agentApi';
import './ExtensionPairing.css';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleString() : 'never');

export default function ExtensionPairing() {
  const [devices, setDevices] = useState<ExtensionDevice[]>([]);
  const [pairCode, setPairCode] = useState<PairCode | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listExtensionDevices()
      .then(list => { if (!cancelled) setDevices(list); })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  // Codes are short-lived, so the card counts down and then asks for a new one
  useEffect(() => {
    if (!pairCode) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.round((new Date(pairCode.expiresAt).getTime() - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [pairCode]);

  const run = async (label: string, action: () => Promise<void>) => {
    setBusy(label); setError('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy('');
    }
  };

  const onCreateCode = () => run('code', async () => {
    setPairCode(await createPairCode());
    setCopied(false);
    setDevices(await listExtensionDevices());
  });

  const onCopy = () => {
    if (!pairCode) return;
    navigator.clipboard.writeText(pairCode.code).then(() => setCopied(true)).catch(() => setError('Could not copy the code.'));
  };

  const onRevoke = (device: ExtensionDevice) => {
    if (!window.confirm(`Disconnect "${device.name}"? That browser will stop filling forms until you connect it again.`)) return;
    run('revoke', async () => {
      await revokeExtensionDevice(device.id);
      setDevices(await listExtensionDevices());
    });
  };

  const expired = pairCode !== null && secondsLeft <= 0;

  return (
    <fieldset className="aa-resume-section aa-pairing">
      <legend className="aa-sandbox-section-title"><Puzzle size={16} /> Browser extension</legend>
      <p className="aa-label-hint">
        The extension fills applications on job sites using this profile. It never submits anything — you press the site's own submit button, and it records that you applied.
      </p>

      {error && <div className="aa-error"><AlertCircle size={16} /> {error}</div>}

      {pairCode && !expired ? (
        <div className="aa-pairing-code">
          <div>
            <span className="aa-label">Enter this code in the extension</span>
            <strong>{pairCode.code}</strong>
            <span className="aa-label-hint">Expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')} · works once</span>
          </div>
          <button type="button" className="aa-btn-ghost aa-btn-sm" onClick={onCopy}><Copy size={14} /> {copied ? 'Copied' : 'Copy'}</button>
        </div>
      ) : (
        <button type="button" className="aa-btn-ghost aa-btn-sm aa-pref-add" disabled={!!busy} onClick={onCreateCode}>
          {busy === 'code' ? <RefreshCw size={14} className="aa-spin" /> : <Puzzle size={14} />}
          {expired ? 'Code expired — create a new one' : 'Create a connection code'}
        </button>
      )}

      {devices.length > 0 && (
        <ul className="aa-pairing-devices">
          {devices.map(device => (
            <li key={device.id}>
              <span>
                {device.name}
                <small>Connected {formatDate(device.createdAt)} · last used {formatDate(device.lastSeenAt)}</small>
              </span>
              <button type="button" className="aa-btn-ghost aa-btn-sm aa-resume-danger" disabled={!!busy} onClick={() => onRevoke(device)}>
                <Trash2 size={14} /> Disconnect
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
