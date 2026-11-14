import { useCallback, useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { getSocket } from './socket';
import { hrefFor, useTeam, useTeamEvent } from './store';
import { Avatar } from './ui';

// A direct call rings like a phone: this screen shows who is calling, with Accept and Decline.
// It closes when the caller gives up, when it's answered on another device, or after the ring time.
interface Ring { meetingId: string; channelId: string; from: { id: string; name: string }; ringMs: number }

// A soft two-tone ring through Web Audio; browsers may block it until the page has been used once
function useRingtone(on: boolean) {
  useEffect(() => {
    if (!on) return;
    let ctx: AudioContext | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    try {
      ctx = new AudioContext();
      const ring = () => {
        if (!ctx) return;
        for (const [freq, at] of [[880, 0], [660, 0.25]] as const) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.0001, ctx.currentTime + at);
          gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + at + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.22);
          osc.connect(gain).connect(ctx.destination);
          osc.start(ctx.currentTime + at);
          osc.stop(ctx.currentTime + at + 0.24);
        }
      };
      ring();
      timer = setInterval(ring, 2000);
    } catch {
      /* no audio */
    }
    return () => {
      if (timer) clearInterval(timer);
      ctx?.close().catch(() => {});
    };
  }, [on]);
}

export function IncomingCall() {
  const { person, toast } = useTeam();
  const [ring, setRing] = useState<Ring | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setRing(null);
  }, []);

  useTeamEvent('call.ringing', (p) => {
    const r = p as unknown as Ring;
    // Already in that call (or another one): don't interrupt
    if (window.location.hash.startsWith('#/meet/')) return;
    setRing(r);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setRing(null), r.ringMs || 30000);
  });
  useTeamEvent('call.stopped', (p) => { if ((p as { meetingId: string }).meetingId === ring?.meetingId) stop(); });
  useTeamEvent('call.declined', (p) => toast(`${(p as unknown as { by: { name: string } }).by.name} declined the call`));
  useRingtone(!!ring);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (!ring) return null;
  const accept = () => { stop(); window.location.hash = hrefFor('meet', ring.meetingId); };
  const decline = () => { getSocket()?.emit('call:decline', { meetingId: ring.meetingId }); stop(); };

  return (
    <div className="tm-call-ring" role="alertdialog" aria-labelledby="tm-call-title" aria-live="assertive">
      <Avatar person={person(ring.from.id)} size={56} />
      <div>
        <strong id="tm-call-title">{ring.from.name}</strong>
        <span>is calling you</span>
      </div>
      <div className="tm-call-actions">
        <button type="button" className="tm-call-btn decline" onClick={decline} aria-label="Decline call"><PhoneOff size={20} /></button>
        <button type="button" className="tm-call-btn accept" onClick={accept} aria-label="Accept call" autoFocus><Phone size={20} /></button>
      </div>
    </div>
  );
}
