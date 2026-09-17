import 'dotenv/config';
import mongoose from 'mongoose';
import { startWorkers } from './agent/queue/workers.js';
import { closeBrowser } from './agent/resume/pdf.js';

// Long-running agent worker process (the API may run serverless, which cannot host polling loops or browsers)
const workers = await startWorkers();

let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`[agent] ${signal} received, draining jobs...`);
  await workers.stop();
  await closeBrowser();
  await mongoose.disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
