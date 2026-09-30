import { Worker } from 'node:worker_threads';
import { assertIdentifier } from './judgeShared.js';

/**
 * Runs JavaScript solutions inside a worker thread (see jsRunner.js for the sandbox details).
 * A separate thread means an infinite loop (including one inside a promise callback) or a memory
 * explosion can be stopped by terminating the worker without touching the server.
 */
const WORKER_URL = new URL('./jsWorker.js', import.meta.url);
const PER_TEST_MS = 2500;

export function executeJavaScript({ code, testCases, functionName = 'solution', meta = {}, timeoutMs = PER_TEST_MS }) {
  const fn = assertIdentifier(functionName);
  // generous overall budget: every test may use its own timeout, plus time to start the thread
  const overallMs = Math.min(20000, timeoutMs * 3 + testCases.length * 40 + 1500);

  return new Promise((resolve) => {
    const worker = new Worker(WORKER_URL, {
      workerData: { code: String(code ?? ''), testCases, functionName: fn, meta, timeoutMs },
      resourceLimits: { maxOldGenerationSizeMb: 192, maxYoungGenerationSizeMb: 48, stackSizeMb: 4 },
      env: {}, // the worker must not see the server's environment variables (API keys, database URL)
      stdout: false,
      stderr: false,
    });
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate().catch(() => undefined);
      resolve(value);
    };
    const failure = (verdict, error) => ({ verdict, error, passedTests: 0, totalTests: testCases.length, runtimeMs: 0, results: [] });

    const timer = setTimeout(() => finish(failure('Time Limit Exceeded', 'Time limit exceeded')), overallMs);
    worker.on('message', (m) => finish(m.ok ? m.result : failure('Runtime Error', m.error)));
    worker.on('error', (err) => {
      const memory = /heap|memory|allocation/i.test(err?.message || '') || err?.code === 'ERR_WORKER_OUT_OF_MEMORY';
      finish(failure(memory ? 'Memory Limit Exceeded' : 'Runtime Error', memory ? 'Memory limit exceeded' : String(err?.message || err)));
    });
    worker.on('exit', () => finish(failure('Runtime Error', 'The runner stopped unexpectedly.')));
  });
}
