import { useEffect, useState } from 'react';
import { getWorkerStatus } from './agentApi';

// Reading a resume or a job normally takes well under a minute
const SLOW_AFTER_MS = 2 * 60 * 1000;
const TICK_MS = 15 * 1000;

/**
 * Shown under a "working on it" spinner once the work has waited longer than usual, so the screen
 * explains itself instead of spinning forever. `since` is when the work was queued or last moved on.
 */
export default function SlowWaitNotice({ since }: { since?: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  const [workerRunning, setWorkerRunning] = useState<boolean | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const startedAt = since ? Date.parse(since) : NaN;
  const slow = Number.isFinite(startedAt) && now - startedAt > SLOW_AFTER_MS;

  useEffect(() => {
    if (!slow) return;
    let cancelled = false;
    getWorkerStatus()
      .then(status => { if (!cancelled) setWorkerRunning(status.running); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slow]);

  if (!slow) return null;
  return (
    <p className="aa-label-hint" role="status">
      {workerRunning === false
        ? 'CVMind is busy right now, so this is waiting its turn. It is saved and will finish on its own, so you can leave this page and come back later.'
        : 'This is taking longer than usual. It is still in progress and will finish on its own, so you can leave this page and come back later.'}
    </p>
  );
}
