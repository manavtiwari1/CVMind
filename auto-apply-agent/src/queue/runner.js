import { claim, heartbeat, complete, fail, releaseLeases, makeWorkerId } from './queue.js';
import { FatalError } from '../errors.js';
import { POLL_INTERVAL } from '../config.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Polls one queue with N concurrent slots; handlers are looked up by job.type
export class QueueRunner {
  constructor({ queue, handlers, concurrency = 1, leaseMs = 120000, workerId = makeWorkerId(), pollMinMs = POLL_INTERVAL.minMs, pollMaxMs = POLL_INTERVAL.maxMs, onDead, logger = console }) {
    Object.assign(this, { queue, handlers, concurrency, leaseMs, workerId, pollMinMs, pollMaxMs, onDead, logger });
    this.running = false;
    this.slots = [];
  }

  start() {
    if (this.running) return this;
    this.running = true;
    this.slots = Array.from({ length: this.concurrency }, () => this.loop());
    return this;
  }

  async loop() {
    let idleMs = this.pollMinMs;
    while (this.running) {
      let job = null;
      try {
        job = await claim(this.queue, { workerId: this.workerId, leaseMs: this.leaseMs });
      } catch (err) {
        this.logger.error(`[queue:${this.queue}] claim failed:`, err.message);
      }
      if (!job) {
        await sleep(idleMs);
        idleMs = Math.min(idleMs * 2, this.pollMaxMs);
        continue;
      }
      idleMs = this.pollMinMs;
      await this.run(job);
    }
  }

  async run(job) {
    const controller = new AbortController();
    const beat = setInterval(() => {
      heartbeat(job, this.workerId, this.leaseMs)
        .then((stillOwned) => { if (!stillOwned) controller.abort(new Error('Lease lost')); })
        .catch(() => {});
    }, Math.max(10, Math.floor(this.leaseMs / 3)));
    beat.unref?.();

    try {
      // A job reclaimed after repeated crashes can exceed its attempts without ever reaching fail()
      if (job.attempts > job.maxAttempts) throw new FatalError('Exceeded max attempts.', { code: 'MAX_ATTEMPTS' });
      const handler = this.handlers[job.type];
      if (!handler) throw new FatalError(`No handler registered for job type "${job.type}".`, { code: 'NO_HANDLER' });

      await handler(job, { signal: controller.signal, workerId: this.workerId });
      if (!controller.signal.aborted) await complete(job, this.workerId);
    } catch (err) {
      // Another worker owns a job whose lease we lost, so its outcome is not ours to record
      if (controller.signal.aborted) return;
      try {
        const result = await fail(job, this.workerId, err);
        if (result.outcome !== 'deferred') this.logger.warn(`[queue:${this.queue}] ${job.type} ${result.outcome}: ${err.message}`);
        if (result.outcome === 'dead' && result.owned && this.onDead) await this.onDead(job, err);
      } catch (failErr) {
        this.logger.error(`[queue:${this.queue}] failed to record job failure:`, failErr.message);
      }
    } finally {
      clearInterval(beat);
    }
  }

  async stop({ timeoutMs = 30000 } = {}) {
    this.running = false;
    await Promise.race([Promise.all(this.slots), sleep(timeoutMs)]);
    await releaseLeases(this.workerId);
  }
}
