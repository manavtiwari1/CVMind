import { useEffect, useState } from 'react';
import { LEO_POSES, type LeoPose } from '../lib/leoPoses';

// Leo, alive: a gentle float, and a pose that follows what Leo is doing.
//   idle     — cycles hello → thumbs → idea (the welcome screen)
//   thinking — waiting for the first word
//   typing   — writing the reply
//   still    — a fixed pose (past messages), no cycling
// Poses cross-fade, so it reads like a short GIF but stays sharp at any size.
export type LeoMood = 'idle' | 'thinking' | 'typing' | 'still';

const IDLE_CYCLE: LeoPose[] = ['hello', 'thumbs', 'idea'];

export default function LeoAvatar({ mood = 'still', size = 32, pose = 'hello' }: { mood?: LeoMood; size?: number; pose?: LeoPose }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (mood !== 'idle' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setTick((t) => t + 1), 2600);
    return () => clearInterval(id);
  }, [mood]);

  const current: LeoPose = mood === 'idle' ? IDLE_CYCLE[tick % IDLE_CYCLE.length]
    : mood === 'thinking' ? 'thinking'
      : mood === 'typing' ? 'typing'
        : pose;
  // Every pose that can show is stacked; only the current one is opaque
  const layers: LeoPose[] = mood === 'idle' ? IDLE_CYCLE : [current];

  return (
    <span
      className={`lx-leo-pfp ${mood === 'still' ? '' : 'is-live'} ${mood === 'thinking' ? 'is-thinking' : ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {layers.map((p) => (
        <img key={p} src={LEO_POSES[p]} alt="" draggable={false} className={p === current ? 'is-on' : ''} />
      ))}
    </span>
  );
}
