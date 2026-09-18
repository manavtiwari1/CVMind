import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { requireMongo } from '../../src/agent/auth.js';

const originalUri = process.env.MONGODB_URI;
afterEach(() => {
  if (originalUri === undefined) delete process.env.MONGODB_URI;
  else process.env.MONGODB_URI = originalUri;
});

function run(middleware) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ status: this.statusCode, body }); }
    };
    middleware({}, res, () => resolve({ next: true }));
  });
}

test('requireMongo rejects when MONGODB_URI is missing', async () => {
  delete process.env.MONGODB_URI;
  const out = await run(requireMongo());
  assert.equal(out.status, 503);
  assert.equal(out.body.code, 'AGENT_REQUIRES_MONGODB');
});

test('requireMongo rejects when configured but not connected', async () => {
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/unused';
  const out = await run(requireMongo({ waitMs: 0 }));
  assert.equal(out.status, 503);
  assert.equal(out.body.code, 'AGENT_DB_UNAVAILABLE');
});
