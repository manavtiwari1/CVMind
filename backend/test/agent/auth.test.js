import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { requireMongo, requireAgentAccess } from '../../src/middleware/agentAuth.js';
import { signToken } from '../../src/services/authToken.js';

const originalUri = process.env.MONGODB_URI;
afterEach(() => {
  if (originalUri === undefined) delete process.env.MONGODB_URI;
  else process.env.MONGODB_URI = originalUri;
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
