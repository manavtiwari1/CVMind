import { useState } from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { api, renewingToken, replaceSessionToken } from './api';
import { useAction } from './hooks';
import MyPasswordForm from './MyPasswordForm';
import { Badge } from './ui';

export default function SecurityModal({ onDone }: { onDone?: () => void }) {
  const { busy, run } = useAction();
  const [tab, setTab] = useState<'security' | 'password'>('security');

  const revokeOthers = async () => {
    await run('revoke', () => renewingToken(async () => {
      const res = await api<{ token?: string }>('/me/revoke-sessions', { method: 'POST' });
      replaceSessionToken(res.token);
      return res;
    }), 'All other active admin sessions signed out.');
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
        <button type="button" className={`ad-btn sm ${tab === 'security' ? 'primary' : ''}`} onClick={() => setTab('security')}>
          <ShieldCheck size={14} /> 2FA & Sessions
        </button>
        <button type="button" className={`ad-btn sm ${tab === 'password' ? 'primary' : ''}`} onClick={() => setTab('password')}>
          Change Password
        </button>
      </div>

      {tab === 'security' && (
        <div>
          <div className="ad-notice green" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={16} />
              <div>
                <strong>Two-Factor Authentication Active</strong>
                <div>2FA verification is required for every administrator sign-in.</div>
              </div>
            </div>
            <Badge tone="green">Enabled</Badge>
          </div>

          <div style={{ paddingTop: 12, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span className="ad-hint" style={{ margin: 0 }}>End sessions on all other devices</span>
            <button type="button" className="ad-btn sm" onClick={revokeOthers} disabled={busy === 'revoke'}>
              <LogOut size={13} /> Sign out everywhere else
            </button>
          </div>
        </div>
      )}

      {tab === 'password' && <MyPasswordForm onDone={onDone} />}
    </div>
  );
}
