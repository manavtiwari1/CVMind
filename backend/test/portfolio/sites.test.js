import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { startTestMongo } from '../helpers/mongo.js';
import { PortfolioSite, cleanPortfolioHtml, usernameProblem, checkUsername, publishSite, unpublishSite, createSiteServer } from '../../src/portfolio/sites.js';

const page = (body, head = '') => `<!DOCTYPE html><html lang="en"><head><title>Ada</title>${head}</head><body>${body}</body></html>`;

test('cleanPortfolioHtml removes anything that can run', () => {
  const attacks = [
    '<script>alert(1)</script>',
    '<script src="https://evil.example/x.js">',
    '<img src="https://a.example/a.png" onerror="alert(1)">',
    '<a href="javascript:alert(1)">x</a>',
    '<a href="JaVa&#115;cript:alert(1)">x</a>',
    '<iframe src="https://evil.example"></iframe>',
    '<svg><animate onbegin="alert(1)" attributeName="x"/></svg>',
    '<svg><use href="https://evil.example/x.svg#a"/></svg>',
    '<form action="https://evil.example"><input name="password"></form>'
  ];
  for (const attack of attacks) {
    const out = cleanPortfolioHtml(page(attack)).toLowerCase();
    for (const banned of ['<script', 'onerror', 'onbegin', 'javascript:', '<iframe', '<animate', '<use', '<form', '<input']) {
      assert.ok(!out.includes(banned), `${attack} left ${banned}`);
    }
  }
});

test('cleanPortfolioHtml defuses markup hidden in an svg style block', () => {
  const out = cleanPortfolioHtml(page('<svg><style><img src=x onerror=alert(1)></style></svg>'));
  assert.ok(!/<style[^>]*>[^<]*<img/i.test(out), out);
});

test('cleanPortfolioHtml blocks redirects and outside stylesheets', () => {
  const out = cleanPortfolioHtml(page('', '<meta http-equiv="refresh" content="0;url=https://evil.example"><link rel="stylesheet" href="https://evil.example/a.css">'));
  assert.ok(!out.includes('http-equiv'));
  assert.ok(!out.includes('evil.example/a.css'));
});

test('cleanPortfolioHtml keeps the design of a generated page', () => {
  const out = cleanPortfolioHtml(page(
    '<main class="hero" style="color:red"><a href="mailto:ada@example.com">Mail</a><a href="https://github.com/ada" target="_blank">GitHub</a><svg viewBox="0 0 10 10"><path d="M0 0L10 10" stroke-width="2"/></svg></main>',
    '<meta name="viewport" content="width=device-width"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter"><style>.hero > a { color: #fff }</style>'
  ));
  assert.ok(out.startsWith('<!DOCTYPE html>'));
  for (const kept of ['class="hero"', 'style="color:red"', 'mailto:ada@example.com', 'https://github.com/ada', 'viewbox="0 0 10 10"', 'stroke-width="2"', 'name="viewport"', 'fonts.googleapis.com', '.hero > a']) {
    assert.ok(out.includes(kept), `lost ${kept}: ${out}`);
  }
});

test('usernameProblem allows normal names and refuses trusted ones', () => {
  assert.equal(usernameProblem('ada-lovelace'), null);
  for (const bad of ['ab', 'Ada', '-ada', 'ada_x', 'ada.x', 'admin', 'www', 'team', 'placements', 'cvmind-support', 'xn--abc', 'ns1']) {
    assert.ok(usernameProblem(bad), `${bad} should be refused`);
  }
});

let mongo;
before(async () => { mongo = await startTestMongo([PortfolioSite]); });
after(async () => { await mongo.stop(); });
beforeEach(async () => { await mongo.reset(); });

const works = (body = '<h1>Ada</h1>', extra = {}) => async (workId, userId) => (workId === 'w1' && userId === 'u1'
  ? { htmlContent: JSON.stringify({ portfolioHTML: page(`${body}<script>alert(1)</script>`) }), ...extra }
  : null);

test('publishing stores a cleaned copy, and updating keeps the username', async () => {
  const first = await publishSite({ userId: 'u1', workId: 'w1', username: 'Ada-L', loadWork: works() });
  assert.equal(first.site.username, 'ada-l');
  const saved = await PortfolioSite.findOne({ userId: 'u1' }).lean();
  assert.ok(saved.html.includes('<h1>Ada</h1>'));
  assert.ok(!saved.html.includes('<script'));

  const second = await publishSite({ userId: 'u1', workId: 'w1', username: 'other-name', loadWork: works('<h1>New</h1>') });
  assert.equal(second.site.username, 'ada-l');
  assert.ok((await PortfolioSite.findOne({ userId: 'u1' }).lean()).html.includes('<h1>New</h1>'));
  assert.equal(await PortfolioSite.countDocuments(), 1);
});

test('nobody can publish another account\'s work or take a used name', async () => {
  assert.equal((await publishSite({ userId: 'u2', workId: 'w1', username: 'ada-l', loadWork: works() })).status, 404);
  await publishSite({ userId: 'u1', workId: 'w1', username: 'ada-l', loadWork: works() });
  const taken = await publishSite({ userId: 'u2', workId: 'w2', username: 'ada-l', loadWork: async () => ({ htmlContent: JSON.stringify({ portfolioHTML: page('x') }) }) });
  assert.equal(taken.status, 409);
  assert.equal((await checkUsername('ada-l', 'u2')).available, false);
  assert.equal((await checkUsername('ada-l', 'u1')).available, true);
});

function get(port, path, host) {
  return new Promise((resolve, reject) => {
    http.get({ port, path, headers: { host } }, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });
}

test('published pages are served by host and path with a script-blocking CSP', async () => {
  await publishSite({ userId: 'u1', workId: 'w1', username: 'ada-l', loadWork: works() });
  const app = express();
  app.use(createSiteServer());
  app.use((req, res) => res.status(418).send('fell through'));
  const server = app.listen(0);
  const { port } = server.address();
  try {
    for (const res of [await get(port, '/', 'ada-l.portfolio.lvh.me:5000'), await get(port, '/sites/ada-l', 'backend.example')]) {
      assert.equal(res.status, 200);
      assert.ok(res.body.includes('<h1>Ada</h1>'));
      assert.match(res.headers['content-security-policy'], /default-src 'none'/);
      assert.doesNotMatch(res.headers['content-security-policy'], /script-src/);
      assert.equal(res.headers['x-robots-tag'], 'noindex');
    }
    assert.equal((await get(port, '/', 'nobody-here.portfolio.lvh.me')).status, 404);
    assert.equal((await get(port, '/api/x', 'www.lvh.me')).status, 418);

    await unpublishSite('u1');
    assert.equal((await get(port, '/', 'ada-l.portfolio.lvh.me')).status, 404);

    await publishSite({ userId: 'u1', workId: 'w1', loadWork: works() });
    assert.equal((await get(port, '/', 'ada-l.portfolio.lvh.me')).status, 200);

    await PortfolioSite.updateOne({ userId: 'u1' }, { hidden: true });
    assert.equal((await get(port, '/', 'ada-l.portfolio.lvh.me')).status, 404);
    assert.equal((await publishSite({ userId: 'u1', workId: 'w1', loadWork: works() })).status, 403);
  } finally {
    server.close();
  }
});
