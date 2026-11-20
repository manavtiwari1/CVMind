import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { visitorIpFromHeaders } from '../../src/services/visitorIp.js';

let mongod;
let server;
let base;
let mongoose;

before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  process.env.MONGODB_URI = mongod.getUri('cvmind_visitor_ip_test');
  process.env.NODE_ENV = 'test';
  process.env.RESEND_API_KEY = '';

  mongoose = (await import('mongoose')).default;
  const app = (await import('../../src/index.js')).default;
  while (mongoose.connection.readyState !== 1) await new Promise((r) => setTimeout(r, 50));
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  delete process.env.RENDER;
  server?.close();
  await mongoose?.disconnect();
  await mongod?.stop();
});

test('on Render the visitor address comes from Cloudflare, not from the proxy hop', () => {
  const render = { RENDER: 'true' };
  assert.equal(visitorIpFromHeaders({ 'cf-connecting-ip': '203.0.113.7' }, render), '203.0.113.7');
  assert.equal(visitorIpFromHeaders({ 'cf-connecting-ip': ' 2001:db8::1 ' }, render), '2001:db8::1');
  assert.equal(visitorIpFromHeaders({ 'cf-connecting-ip': 'not-an-ip' }, render), null);
  assert.equal(visitorIpFromHeaders({}, render), null);
});

test('away from Render the Cloudflare header is ignored, since anyone could send it', () => {
  assert.equal(visitorIpFromHeaders({ 'cf-connecting-ip': '203.0.113.7' }, {}), null);
  assert.equal(visitorIpFromHeaders({ 'cf-connecting-ip': '203.0.113.7' }, { RENDER: 'false' }), null);
});

// Requests left in the per-IP AI limit (20 a minute) after this request
async function remaining(headers) {
  const res = await fetch(`${base}/api/leo/access`, { headers });
  assert.equal(res.status, 200);
  return Number(/remaining=(\d+)/.exec(res.headers.get('ratelimit') || '')?.[1]);
}

test('on Render each visitor has their own limits, whichever proxy hop their request came through', async () => {
  process.env.RENDER = 'true';
  try {
    // One visitor through two different hops: one count
    assert.equal(await remaining({ 'cf-connecting-ip': '203.0.113.10', 'x-forwarded-for': '203.0.113.10, 198.51.100.1' }), 19);
    assert.equal(await remaining({ 'cf-connecting-ip': '203.0.113.10', 'x-forwarded-for': '203.0.113.10, 198.51.100.2' }), 18);
    // Another visitor through the same hop: a count of their own
    assert.equal(await remaining({ 'cf-connecting-ip': '203.0.113.11', 'x-forwarded-for': '203.0.113.11, 198.51.100.1' }), 19);
  } finally {
    delete process.env.RENDER;
  }
});

test('away from Render a forged Cloudflare header does not get a visitor a fresh limit', async () => {
  const hop = { 'x-forwarded-for': '198.51.100.9' };
  const first = await remaining({ ...hop, 'cf-connecting-ip': '203.0.113.20' });
  const second = await remaining({ ...hop, 'cf-connecting-ip': '203.0.113.21' });
  assert.equal(second, first - 1);
});
