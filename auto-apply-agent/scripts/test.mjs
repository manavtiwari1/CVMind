// Runs every test/**/*.test.js. Node 20 does not expand globs passed to --test, and a shell glob
// does not work on Windows, so the files are listed here instead.
import { readdirSync } from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const files = readdirSync('test', { recursive: true })
  .map(String)
  .filter((file) => file.endsWith('.test.js'))
  .sort()
  .map((file) => path.join('test', file));

const result = spawnSync(process.execPath, ['--test', ...process.argv.slice(2), ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
