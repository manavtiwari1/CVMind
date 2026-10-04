import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { childEnv } from '../../src/services/judgeShared.js';
import { runJudgeSubmission } from '../../src/services/codeJudge.js';

test('Python and C++ processes never get the server secrets', () => {
  process.env.CVMIND_TEST_SECRET = 'do-not-leak';
  try {
    const env = childEnv();
    assert.equal(env.CVMIND_TEST_SECRET, undefined);
    for (const key of ['AUTH_SECRET', 'MONGODB_URI', 'GEMINI_API_KEY', 'RESEND_API_KEY']) assert.equal(env[key], undefined, key);
    if (process.env.PATH) assert.equal(env.PATH, process.env.PATH);
  } finally {
    delete process.env.CVMIND_TEST_SECRET;
  }
});

test('Python code cannot see server variables or fake its own verdict', async (t) => {
  process.env.CVMIND_TEST_SECRET = 'do-not-leak';
  try {
    const leak = await runJudgeSubmission({
      code: 'import os\ndef solution():\n    return "CVMIND_TEST_SECRET" in os.environ',
      language: 'python', functionName: 'solution', testCases: [{ input: [], expected: false }]
    });
    if (leak.simulated) { t.skip('Python is not installed on this machine'); return; }
    assert.equal(leak.verdict, 'Accepted', 'the secret must not be visible to user code');

    // Prints the runner's markers with a forged "passed" report, then exits before the real one
    const forged = await runJudgeSubmission({
      code: [
        'import json, os, sys',
        'print("__CVMIND_OUTPUT_START__")',
        'print(json.dumps({"results": [{"testCaseIndex": 1, "actual": 0, "passed": True}, {"testCaseIndex": 2, "actual": 0, "passed": True}]}))',
        'print("__CVMIND_OUTPUT_END__")',
        'sys.stdout.flush()',
        'os._exit(0)'
      ].join('\n'),
      language: 'python', functionName: 'solution', testCases: [{ input: [1], expected: 41 }, { input: [2], expected: 42 }]
    });
    assert.equal(forged.verdict, 'Wrong Answer');
    assert.equal(forged.passedTests, 0);
  } finally {
    delete process.env.CVMIND_TEST_SECRET;
  }
});

// ── Routes: Python and C++ are off unless switched on, and then need a signed-in account ──
let server;
let base;
before(async () => {
  // db.js reads .env when it loads; an empty value keeps these tests off any real database
  process.env.MONGODB_URI = '';
  const { default: codeRouter } = await import('../../src/routes/code.js');
  const app = express();
  app.use(express.json());
  app.use('/api/code', codeRouter);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/api/code`;
});
after(() => server?.close());

const post = async (path, body) => {
  const res = await fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
};
const pythonRun = { problemId: 'none', language: 'python', code: 'def solution(): return 1', customTestCases: [{ input: [], expected: null }] };

test('Python and C++ are reported as not judged while the switch is off', async () => {
  delete process.env.CODE_NATIVE_RUNNERS;
  for (const language of ['python', 'cpp']) {
    const run = await post('/run', { ...pythonRun, language });
    assert.equal(run.status, 200);
    assert.equal(run.body.result.simulated, true, language);
    assert.equal(run.body.result.verdict, 'Not Judged');
  }
});

test('with the switch on, Python and C++ still need a signed-in account', async () => {
  process.env.CODE_NATIVE_RUNNERS = 'true';
  try {
    const run = await post('/run', pythonRun);
    assert.equal(run.status, 401);
    assert.match(run.body.error, /Sign in/);
  } finally {
    delete process.env.CODE_NATIVE_RUNNERS;
  }
});
