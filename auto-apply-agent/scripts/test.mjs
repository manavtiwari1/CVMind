// Runs every test/**/*.test.js. Node 20 does not expand globs passed to --test, and a shell glob
// does not work on Windows, so the files are listed here instead.
import { readdirSync } from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { pathToFileURL } from 'url';

const files = readdirSync('test', { recursive: true })
  .map(String)
  .filter((file) => file.endsWith('.test.js'))
  .sort()
  .map((file) => path.join('test', file));

// TEST_DATABASE=tidb runs the same suites on the TiDB test database (one file at a time, they share it)
const onTidb = process.env.TEST_DATABASE === 'tidb';
const env = { ...process.env };
const extra = [];
if (onTidb) {
  const hook = pathToFileURL(path.resolve('..', 'tidb-store', 'test-support', 'register.mjs')).href;
  env.NODE_OPTIONS = `${env.NODE_OPTIONS || ''} --import=${hook}`.trim();
  extra.push('--test-concurrency=1');
}

const result = spawnSync(process.execPath, ['--test', ...extra, ...process.argv.slice(2), ...files], { stdio: 'inherit', env });
process.exit(result.status ?? 1);
