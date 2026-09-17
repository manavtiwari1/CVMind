import { FatalError } from './errors.js';

// One shared Chromium per worker process; every job gets its own context, always closed afterwards
let browserPromise = null;

export async function getBrowser() {
  if (!browserPromise) {
    browserPromise = import('playwright')
      .then(({ chromium }) => chromium.launch({ args: ['--no-sandbox'] }))
      .catch((err) => {
        browserPromise = null;
        if (/Executable doesn't exist|playwright install/i.test(err.message)) {
          throw new FatalError('Browser automation is unavailable on this server (Chromium is not installed).', { cause: err, code: 'BROWSER_UNAVAILABLE' });
        }
        throw err;
      });
  }
  return browserPromise;
}

export async function withContext(fn, options = {}) {
  const browser = await getBrowser();
  const context = await browser.newContext(options);
  try {
    return await fn(context);
  } finally {
    await context.close();
  }
}

export async function closeBrowser() {
  if (!browserPromise) return;
  const pending = browserPromise;
  browserPromise = null;
  const browser = await pending.catch(() => null);
  await browser?.close();
}
