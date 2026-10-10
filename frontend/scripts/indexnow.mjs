// Tells Bing, Yandex and other IndexNow engines about every page in the live sitemap.
// Run after a deploy that changes public pages: npm run indexnow
// The key file is public/03f69385d7dd39d2d2ef73d363bbf0eb.txt (served at https://www.cvmind.in/03f69385d7dd39d2d2ef73d363bbf0eb.txt).
const KEY = '03f69385d7dd39d2d2ef73d363bbf0eb';
const HOST = 'www.cvmind.in';

const sitemap = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!urlList.length) throw new Error('No URLs found in the sitemap.');

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList })
});
console.log(`IndexNow: sent ${urlList.length} URLs, response ${res.status} ${res.statusText}`);
if (!res.ok && res.status !== 202) process.exit(1);
