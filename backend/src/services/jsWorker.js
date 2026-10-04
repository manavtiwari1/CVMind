import { parentPort, workerData } from 'node:worker_threads';
import { runJavaScriptTests } from './jsRunner.js';

// Runs one submission and reports the verdict to the host. The host terminates this thread if it never answers.
try {
  parentPort.postMessage({ ok: true, result: runJavaScriptTests(workerData) });
} catch (err) {
  parentPort.postMessage({ ok: false, error: String(err && err.message ? err.message : err) });
}
