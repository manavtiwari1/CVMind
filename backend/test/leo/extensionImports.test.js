import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// db.js connects to MONGODB_URI as soon as it is imported, and gemini.js loads .env. The extension
// routes are used by tests on a throwaway database, so importing them must do neither.
test('importing the extension routes does not connect to a database or load .env', () => {
  const script = `
    import('./src/routes/agentExtension.js').then(async () => {
      const mongoose = (await import('mongoose')).default;
      console.log(JSON.stringify({ state: mongoose.connection.readyState, uri: Boolean(process.env.MONGODB_URI) }));
      process.exit(0);
    });
  `;
  const env = { ...process.env };
  delete env.MONGODB_URI;
  const output = execFileSync(process.execPath, ['-e', script], { env, encoding: 'utf8', timeout: 60000 });
  assert.deepEqual(JSON.parse(output.trim().split('\n').at(-1)), { state: 0, uri: false });
});
