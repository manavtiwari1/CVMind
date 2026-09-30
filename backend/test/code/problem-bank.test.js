import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURATED_PROBLEMS } from '../../src/data/curatedProblems.js';
import { runJudgeSubmission } from '../../src/services/codeJudge.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendFile = path.resolve(here, '..', '..', '..', 'frontend', 'src', 'data', 'codingProblems.ts');

test('every problem has a real statement, examples and meaningful tests', () => {
  const ids = new Set();
  for (const p of CURATED_PROBLEMS) {
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`);
    ids.add(p.id);
    assert.ok(p.description.length > 40, `${p.id}: statement is too short`);
    assert.ok(!/Solve the standard|Standard problem input|Expected algorithmic output/.test(p.description + JSON.stringify(p.examples)), `${p.id}: placeholder text`);
    assert.ok(p.examples.length >= 1, `${p.id}: no examples`);
    assert.ok(p.sampleTestCases.length >= 1 && (p.hiddenTestCases || []).length >= 1, `${p.id}: needs sample and hidden tests`);
    const first = p.sampleTestCases[0];
    assert.ok(!(JSON.stringify(first.input) === '[[1,2,3]]' && first.expected === 6), `${p.id}: placeholder test`);
    for (const t of [...p.sampleTestCases, ...p.hiddenTestCases]) {
      if (p.kind !== 'design') assert.notEqual(t.expected, null, `${p.id}: a test expects null, which the judge treats as a custom run`);
    }
    for (const lang of ['javascript', 'python', 'cpp']) assert.ok(p.starterCode[lang], `${p.id}: no ${lang} starter`);
  }
});

test('starter code is a stub, never a finished solution', async () => {
  // Running the untouched starter must not be accepted for any problem.
  for (const p of CURATED_PROBLEMS) {
    const tests = [...p.sampleTestCases, ...p.hiddenTestCases];
    const r = await runJudgeSubmission({
      code: p.starterCode.javascript, language: 'javascript', functionName: p.functionName, testCases: tests,
      meta: { kind: p.kind, adapter: p.adapter, argTypes: p.argTypes, returnType: p.returnType, compare: p.compare },
    });
    assert.notEqual(r.verdict, 'Accepted', `${p.id}: the starter code already passes every test`);
  }
});

test('the browser copy has the same problems and never includes hidden tests', () => {
  const text = fs.readFileSync(frontendFile, 'utf8');
  const start = text.indexOf('export const CODING_PROBLEMS: CodingProblem[] = ') + 'export const CODING_PROBLEMS: CodingProblem[] = '.length;
  const end = text.indexOf('export const TOPICS');
  const frontend = JSON.parse(text.slice(start, end).trim().replace(/;$/, ''));
  assert.deepEqual(frontend.map((p) => p.id), CURATED_PROBLEMS.map((p) => p.id));
  assert.ok(frontend.every((p) => p.hiddenTestCases === undefined), 'hidden tests must not ship to the browser');
});
