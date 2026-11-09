import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createSiteHandler, serveMissing } from '../../../sites/lib/site.js';

// The Vercel function in front of published portfolios, against a stand-in backend

let backend;
let requests = [];
let answer = () => ({ status: 200, body: '<!DOCTYPE html><html><body>Ada</body></html>' });
const previousUrl = process.env.BACKEND_URL;

before(async () => {
  backend = http.createServer((req, res) => {
    requests.push(req.url);
    const reply = answer(req);
    if (!reply) return;
    res.writeHead(reply.status, reply.headers || {});
    res.end(reply.body || '');
  });
  await new Promise((resolve) => { backend.listen(0, resolve); });
  process.env.BACKEND_URL = `http://127.0.0.1:${backend.address().port}/`;
});

after(() => {
  backend.closeAllConnections();
  backend.close();
  if (previousUrl === undefined) delete process.env.BACKEND_URL;
  else process.env.BACKEND_URL = previousUrl;
});

beforeEach(() => {
  requests = [];
  answer = () => ({ status: 200, body: '<!DOCTYPE html><html><body>Ada</body></html>' });
});

async function visit(host, { method = 'GET', handler = createSiteHandler(), forwarded } = {}) {
  const headers = {};
  let body;
  let statusCode;
  const res = {
    set statusCode(v) { statusCode = v; },
    setHeader(name, value) { headers[name.toLowerCase()] = value; },
    end(text) { body = text; }
  };
  await handler({ method, headers: { host, ...(forwarded ? { 'x-forwarded-host': forwarded } : {}) } }, res);
  return { status: statusCode, headers, body };
}

const assertSafe = (r) => {
  assert.match(r.headers['content-security-policy'], /default-src 'none'/);
  assert.doesNotMatch(r.headers['content-security-policy'], /script-src/);
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  assert.equal(r.headers['x-robots-tag'], 'noindex');
};

test('the subdomain picks the page, and it goes out cached for a minute with the safety policy', async () => {
  const r = await visit('ada-l.portfolio.cvmind.in');
  assert.deepEqual(requests, ['/sites/ada-l']);
  assert.equal(r.status, 200);
  assert.ok(r.body.includes('Ada'));
  assert.equal(r.headers['cache-control'], 'public, max-age=0, s-maxage=60');
  assertSafe(r);
});

test('the safety policy is applied whatever the backend sends', async () => {
  answer = () => ({ status: 200, body: 'x', headers: { 'Content-Security-Policy': "script-src 'unsafe-inline'", 'Set-Cookie': 'a=b' } });
  const r = await visit('ada.portfolio.cvmind.in');
  assertSafe(r);
  assert.equal(r.headers['set-cookie'], undefined);
});

test('the forwarded host counts, in any case and with a port', async () => {
  await visit('internal.vercel.app', { forwarded: 'ADA.portfolio.cvmind.in:443' });
  assert.deepEqual(requests, ['/sites/ada']);
});

test('other hosts never reach the backend', async () => {
  for (const host of ['portfolio.cvmind.in', 'a.b.portfolio.cvmind.in', 'ada.portfolio.cvmind.in.evil.example', 'www.cvmind.in', '../x.portfolio.cvmind.in', '']) {
    const r = await visit(host);
    assert.equal(r.status, 404, host);
    assertSafe(r);
  }
  assert.deepEqual(requests, []);
});

test('a missing site gets the friendly page; a backend problem is not cached', async () => {
  answer = () => ({ status: 404, body: 'nope' });
  const missing = await visit('ghost.portfolio.cvmind.in');
  assert.equal(missing.status, 404);
  assert.match(missing.body, /isn't here/);
  assert.equal(missing.headers['cache-control'], 'public, max-age=0, s-maxage=60');

  answer = () => ({ status: 503, body: 'down' });
  const down = await visit('ada.portfolio.cvmind.in');
  assert.equal(down.status, 503);
  assert.equal(down.headers['cache-control'], 'no-store');
  assertSafe(down);
});

test('a backend redirect is not followed', async () => {
  answer = () => ({ status: 302, headers: { Location: 'https://evil.example/' } });
  const r = await visit('ada.portfolio.cvmind.in');
  assert.equal(r.status, 503);
  assert.deepEqual(requests, ['/sites/ada']);
});

test('a backend that never answers ends in a retry page', async () => {
  answer = () => null;
  const r = await visit('ada.portfolio.cvmind.in', { handler: createSiteHandler({ timeoutMs: 60 }) });
  assert.equal(r.status, 503);
  assert.equal(r.headers['cache-control'], 'no-store');
  assert.match(r.body, /refresh/);
});

test('HEAD has no body, and writes are refused without calling the backend', async () => {
  const head = await visit('ada.portfolio.cvmind.in', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.body, undefined);

  requests = [];
  const post = await visit('ada.portfolio.cvmind.in', { method: 'POST' });
  assert.equal(post.status, 405);
  assert.deepEqual(requests, []);
});

test('with no backend address it fails closed, and other paths are not found', async () => {
  const saved = process.env.BACKEND_URL;
  delete process.env.BACKEND_URL;
  const r = await visit('ada.portfolio.cvmind.in');
  process.env.BACKEND_URL = saved;
  assert.equal(r.status, 503);

  const r2 = await visit('ada.portfolio.cvmind.in', { handler: serveMissing });
  assert.equal(r2.status, 404);
  assertSafe(r2);
  assert.deepEqual(requests, []);
});
