import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { requireMongo, requireAgentAccess } from '../../src/middleware/agentAuth.js';
import { signToken } from '../../src/services/authToken.js';

const DB_VARS = ['MONGODB_URI', 'DATABASE_DRIVER', 'TIDB_DATABASE_URL'];
const originalEnv = Object.fromEntries(DB_VARS.map((k) => [k, process.env[k]]));
afterEach(() => {
  for (const k of DB_VARS) {
    if (originalEnv[k] === undefined) delete process.env[k];
    else process.env[k] = originalEnv[k];
  }
});

function run(middleware, req = { headers: {} }) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ status: this.statusCode, body }); }
    };
    middleware(req, res, () => resolve({ next: true }));
  });
}

test('requireMongo rejects when no database is configured', async () => {
  for (const k of DB_VARS) delete process.env[k];
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

function withToken(email) {
  return { headers: { authorization: `Bearer ${signToken({ sub: 'u1', kind: 'user', email })}` } };
}

test('requireAgentAccess lets allowlisted users through', async () => {
  const out = await run(requireAgentAccess(async (email) => email === 'ok@x.com'), withToken('ok@x.com'));
  assert.equal(out.next, true);
});

test('requireAgentAccess shows coming soon to everyone else', async () => {
  const out = await run(requireAgentAccess(async () => false), withToken('no@x.com'));
  assert.equal(out.status, 403);
  assert.equal(out.body.code, 'AGENT_COMING_SOON');
});

test('requireAgentAccess leaves unauthenticated requests to the route auth', async () => {
  const out = await run(requireAgentAccess(async () => false));
  assert.equal(out.next, true);
});
