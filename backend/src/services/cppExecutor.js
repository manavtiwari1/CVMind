import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildCppSource } from './cppHarness.js';
import { computeFinalVerdict, valuesMatch } from './judgeShared.js';

/**
 * Compiles and runs C++ solutions with the local g++ (or clang++).
 *
 * IMPORTANT: like the Python executor this is NOT sandboxed. The compiled program runs with the server's
 * privileges, so offer it only to trusted users or run the judge inside a container.
 */

const COMPILE_MS = 60000;
const RUN_MS = 10000;
const MAX_PARALLEL_COMPILES = 2;

let compiler; // cached command, or null when none is installed

async function canRun(cmd) {
  return new Promise((resolve) => {
    const p = spawn(cmd, ['--version']);
    p.on('error', () => resolve(false));
    p.on('close', (c) => resolve(c === 0));
  });
}

export async function detectCompiler() {
  if (compiler !== undefined) return compiler;
  for (const cmd of ['g++', 'clang++']) {
    if (await canRun(cmd)) { compiler = cmd; return cmd; }
  }
  compiler = null;
  return null;
}

// a tiny counting semaphore so a burst of submissions cannot start dozens of compilers at once
let active = 0;
const waiting = [];
async function acquire() {
  if (active < MAX_PARALLEL_COMPILES) { active++; return; }
  await new Promise((resolve) => waiting.push(resolve));
  active++;
}
function release() {
  active--;
  const next = waiting.shift();
  if (next) next();
}

function run(cmd, args, options, limitBytes = 4_000_000) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { ...options, windowsHide: true });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, options.timeoutMs);
    child.stdout.on('data', (d) => { if (stdout.length < limitBytes) stdout += d.toString(); });
    child.stderr.on('data', (d) => { if (stderr.length < limitBytes) stderr += d.toString(); });
    child.on('error', (err) => { clearTimeout(timer); resolve({ code: -1, stdout, stderr: String(err.message), timedOut }); });
    child.on('close', (code, signal) => { clearTimeout(timer); resolve({ code, signal, stdout, stderr, timedOut }); });
  });
}

function failure(verdict, error, total, extra = {}) {
  return { verdict, error, passedTests: 0, totalTests: total, runtimeMs: 0, results: [], ...extra };
}

export async function executeCpp({ code, testCases, functionName, meta = {} }) {
  const cmd = await detectCompiler();
  if (!cmd) return { unavailable: true, reason: 'No C++ compiler (g++ or clang++) is installed on the judge server, so C++ cannot be run here.' };
  if (!meta.cppSpec) return { unavailable: true, reason: 'C++ is not available for this problem.' };

  let source;
  try {
    source = buildCppSource(code, meta.cppSpec, meta);
  } catch (err) {
    return { unavailable: true, reason: err.message };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cvmind_cpp_'));
  const exe = path.join(dir, process.platform === 'win32' ? 'solution.exe' : 'solution');
  try {
    fs.writeFileSync(path.join(dir, 'solution.cpp'), source, 'utf8');
    fs.writeFileSync(path.join(dir, 'input.json'), JSON.stringify(testCases.map((t) => (Array.isArray(t.input) ? t.input : [t.input]))), 'utf8');

    await acquire();
    let compiled;
    try {
      compiled = await run(cmd, ['-std=c++14', '-O1', '-pipe', '-o', exe, 'solution.cpp'], { cwd: dir, timeoutMs: COMPILE_MS });
    } finally {
      release();
    }
    if (compiled.timedOut) return failure('Compilation Error', 'Compilation took too long.', testCases.length);
    if (compiled.code !== 0) {
      const text = (compiled.stderr || compiled.stdout || 'Compilation failed.')
        .split(dir).join('')
        .split('\\solution.cpp').join('solution.cpp')
        .split('\n')
        .filter((l) => !/^In file included|^\s+from /.test(l))
        .slice(0, 14)
        .join('\n')
        .trim();
      return failure('Compilation Error', text, testCases.length);
    }

    const ran = await run(exe, ['input.json'], { cwd: dir, timeoutMs: RUN_MS });
    const rows = [];
    for (const line of ran.stdout.split('\n')) {
      if (!line.startsWith('\u0001CVM\t')) continue;
      const [, ok, ms, payload, log] = line.split('\t');
      rows.push({ ok: ok === '1', ms: Number(ms), payload: payload ?? '', log: log ?? '' });
    }

    const results = [];
    let totalRuntime = 0;
    for (let i = 0; i < rows.length; i++) {
      const tc = testCases[i];
      const custom = tc.expected === null || tc.expected === undefined;
      const row = rows[i];
      if (!row.ok) {
        results.push({ testCaseIndex: i + 1, input: tc.input, expected: tc.expected ?? null, actual: null, error: row.payload, stdout: row.log, passed: false, custom });
        break;
      }
      let actual;
      try { actual = JSON.parse(row.payload); } catch { actual = row.payload; }
      totalRuntime += row.ms;
      results.push({
        testCaseIndex: i + 1,
        input: tc.input,
        expected: tc.expected ?? null,
        actual,
        stdout: row.log,
        passed: custom ? true : valuesMatch(actual, tc.expected, meta.compare),
        custom,
        runtimeMs: Math.round(row.ms * 100) / 100,
      });
    }

    if (ran.timedOut) {
      const at = results.length + 1;
      results.push({ testCaseIndex: at, input: testCases[at - 1]?.input, expected: testCases[at - 1]?.expected ?? null, actual: null, error: 'Time limit exceeded', passed: false, isTimeout: true });
    } else if (results.length < testCases.length && !results.some((r) => r.error)) {
      // the program ended early without reporting: it crashed
      const at = results.length + 1;
      results.push({ testCaseIndex: at, input: testCases[at - 1]?.input, expected: testCases[at - 1]?.expected ?? null, actual: null, error: 'The program crashed (for example a segmentation fault or an invalid memory access).', passed: false });
    }
    return computeFinalVerdict(results, testCases.length, totalRuntime);
  } catch (err) {
    return failure('Runtime Error', `Could not run the program: ${err.message}`, testCases.length);
  } finally {
    fs.rm(dir, { recursive: true, force: true }, () => undefined);
  }
}
