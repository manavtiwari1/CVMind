import { useEffect, useRef, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { api } from './api';
import type { TeamAccount } from './api';
import { useTeam } from './store';

// Pick a status like Teams: Available (automatic), Busy, Do not disturb (no push notifications) or Away,
// for a while or until changed. "In a meeting" is shown automatically during a call.
const OPTIONS: Array<{ value: TeamAccount['availability']; label: string; hint: string }> = [
  { value: 'auto', label: 'Available', hint: 'Online or away, by activity' },
  { value: 'busy', label: 'Busy', hint: 'People see you are busy' },
  { value: 'dnd', label: 'Do not disturb', hint: 'No push notifications' },
  { value: 'away', label: 'Appear away', hint: '' }
];
const DURATIONS = [{ minutes: 60, label: '1 hour' }, { minutes: 240, label: '4 hours' }, { minutes: 0, label: 'Until I change it' }];

export function StatusMenu() {
  const { me, setMe, toast } = useTeam();
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(60);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const pick = async (availability: TeamAccount['availability']) => {
    try {
      const r = await api<{ admin: TeamAccount }>('/me', { method: 'PATCH', body: { availability, forMinutes: availability === 'auto' ? 0 : minutes } });
      setMe(r.admin);
      setOpen(false);
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };
  const current = OPTIONS.find((o) => o.value === (me.availability || 'auto')) || OPTIONS[0];
  const until = me.availabilityUntil && me.availability !== 'auto' ? new Date(me.availabilityUntil).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '';

  return (
    <div className="tm-status" ref={box}>
      <button type="button" className="tm-status-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu">
        <span className={`tm-status-dot ${current.value}`} /> {current.label}{until && ` until ${until}`} <ChevronUp size={13} />
      </button>
      {open && (
        <div className="tm-status-menu" role="menu">
          {OPTIONS.map((o) => (
            <button key={o.value} type="button" role="menuitemradio" aria-checked={o.value === current.value} onClick={() => pick(o.value)}>
              <span className={`tm-status-dot ${o.value}`} /> <span><strong>{o.label}</strong>{o.hint && <small>{o.hint}</small>}</span>
            </button>
          ))}
          <label className="tm-status-for">For
            <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>{DURATIONS.map((d) => <option key={d.minutes} value={d.minutes}>{d.label}</option>)}</select>
          </label>
        </div>
      )}
    </div>
  );
}
