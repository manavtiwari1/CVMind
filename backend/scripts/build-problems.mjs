/**
 * Builds the problem bank.
 *
 *   node scripts/build-problems.mjs            verify every authored problem, then write both data files
 *   node scripts/build-problems.mjs --check    verify only, write nothing
 *
 * Authored problems live in scripts/problems/*.mjs. For each one this script
 *   1. computes expected outputs from the reference implementation (so tests cannot disagree with it),
 *   2. runs the real judge with the JavaScript solution and requires every test to pass,
 *   3. runs the judge with an empty solution and requires that it does NOT pass,
 * and only then writes backend/src/data/curatedProblems.js (with hidden tests) and
 * frontend/src/data/codingProblems.ts (without them).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runJudgeSubmission } from '../src/services/codeJudge.js';
import { buildStarters, deepClone, fmt, runDesign } from './problems/_lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BACKEND_FILE = path.join(ROOT, 'src', 'data', 'curatedProblems.js');
const FRONTEND_FILE = path.resolve(ROOT, '..', 'frontend', 'src', 'data', 'codingProblems.ts');
const CHECK_ONLY = process.argv.includes('--check');

/** JSON with two-space indentation, but arrays that hold no objects stay on one line (test data is large). */
function toJson(value, indent = '') {
  const isFlat = (v) => v === null || typeof v !== 'object' || (Array.isArray(v) && v.every(isFlat));
  const NL = String.fromCharCode(10);
  if (Array.isArray(value)) {
    if (value.every(isFlat)) return JSON.stringify(value);
    const inner = indent + '  ';
    return '[' + NL + value.map((v) => inner + toJson(v, inner)).join(',' + NL) + NL + indent + ']';
  }
  if (value && typeof value === 'object') {
    const inner = indent + '  ';
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    return '{' + NL + entries.map(([k, v]) => inner + JSON.stringify(k) + ': ' + toJson(v, inner)).join(',' + NL) + NL + indent + '}';
  }
  return JSON.stringify(value);
}

function readBackendArray() {
  const text = fs.readFileSync(BACKEND_FILE, 'utf8');
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  return JSON.parse(text.slice(start, end + 1));
}

async function loadSpecs() {
  const dir = path.join(HERE, 'problems');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mjs') && !f.startsWith('_')).sort();
  const specs = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(path.join(dir, f)).href);
    for (const s of mod.default) specs.push({ ...s, file: f });
  }
  return specs;
}

function expectedFor(spec, args) {
  if (spec.meta?.kind === 'design') return runDesign(spec.ref, deepClone(args[0]), deepClone(args[1]));
  const out = spec.ref(...deepClone(args));
  return out === undefined ? null : out;
}

function exampleInput(spec, args) {
  if (spec.meta?.kind === 'design') return `operations = ${fmt(args[0])}, arguments = ${fmt(args[1])}`;
  if (spec.meta?.adapter === 'cyclic-list') return `${spec.params[0]} = ${fmt(args[0])}, pos = ${fmt(args[1])}`;
  return spec.params.map((p, i) => `${p} = ${fmt(args[i])}`).join(', ');
}

function build(spec, existing) {
  const meta = spec.meta || {};
  const samples = Math.min(spec.samples ?? 2, 3);
  const tests = spec.tests.map((args) => ({ input: deepClone(args), expected: expectedFor(spec, args) }));

  if (meta.kind !== 'design') {
    tests.forEach((t, i) => {
      if (t.expected === null) throw new Error(`${spec.id}: test ${i + 1} expects null, which the judge treats as a custom run. Return a real value.`);
    });
  }

  // answers I know independently (for example the classic textbook cases) must match the reference
  (spec.known || []).forEach((k, i) => {
    if (fmt(tests[i].expected) !== fmt(k)) throw new Error(`${spec.id}: test ${i + 1} gave ${fmt(tests[i].expected)} but the known answer is ${fmt(k)}`);
  });

  const examples = tests.slice(0, samples).map((t, i) => {
    const ex = { input: exampleInput(spec, t.input), output: fmt(t.expected) };
    if (spec.explain?.[i]) ex.explanation = spec.explain[i];
    return ex;
  });

  const functionName = meta.kind === 'design' ? spec.design.className : spec.functionName || existing.functionName;
  const { starterCode, cppSpec } = buildStarters(spec, functionName, tests);

  const entry = {
    id: existing.id,
    title: spec.title || existing.title,
    slug: spec.slug || existing.slug,
    difficulty: existing.difficulty,
    category: existing.category,
    // company tags had no source behind them, so none are shipped
    companies: [],
    acceptanceRate: '',
    description: spec.statement.trim(),
    constraints: spec.constraints,
    examples,
    functionName,
    params: meta.kind === 'design' ? undefined : spec.params,
    kind: meta.kind,
    adapter: meta.adapter,
    argTypes: meta.argTypes,
    returnType: meta.returnType,
    compare: meta.compare,
    starterCode,
    cppSpec,
    sampleTestCases: tests.slice(0, samples),
    hiddenTestCases: tests.slice(samples),
  };
  Object.keys(entry).forEach((k) => entry[k] === undefined && delete entry[k]);
  return entry;
}

function judgeMeta(e) {
  return { kind: e.kind, adapter: e.adapter, argTypes: e.argTypes, returnType: e.returnType, compare: e.compare };
}

async function verify(spec, entry) {
  const problems = [];
  const all = [...entry.sampleTestCases, ...entry.hiddenTestCases];
  const source = String(spec.sol || spec.ref);

  const good = await runJudgeSubmission({ code: source, language: 'javascript', testCases: all, functionName: entry.functionName, meta: judgeMeta(entry) });
  if (good.verdict !== 'Accepted') {
    const bad = good.results.find((r) => !r.passed);
    problems.push(`reference solution was not accepted (${good.verdict}${good.error ? `: ${good.error}` : ''}${bad ? `; case ${bad.testCaseIndex} input ${fmt(bad.input).slice(0, 80)} expected ${fmt(bad.expected).slice(0, 60)} got ${fmt(bad.actual).slice(0, 60)}` : ''})`);
  }

  const emptyCode = entry.kind === 'design' ? `class ${entry.functionName} {}` : `function ${entry.functionName}() { return 0; }`;
  const empty = await runJudgeSubmission({ code: emptyCode, language: 'javascript', testCases: all, functionName: entry.functionName, meta: judgeMeta(entry) });
  if (empty.verdict === 'Accepted') problems.push('an empty solution was accepted, so the tests are too weak');

  return problems;
}

async function main() {
  const existing = readBackendArray();
  const byId = new Map(existing.map((p) => [p.id, p]));
  const specs = await loadSpecs();

  const built = new Map();
  const failures = [];
  for (const spec of specs) {
    const base = byId.get(spec.id);
    if (!base) { failures.push(`${spec.id}: not in the existing problem list (${spec.file})`); continue; }
    try {
      const entry = build(spec, base);
      const issues = await verify(spec, entry);
      if (issues.length) failures.push(`${spec.id}: ${issues.join('; ')}`);
      built.set(spec.id, entry);
    } catch (err) {
      failures.push(`${spec.id}: ${err.message}`);
    }
  }

  const dropped = new Set(['copy-list-with-random-pointer', 'clone-graph']);
  console.log(`${specs.length} authored problems, ${built.size} built, ${failures.length} with problems`);
  failures.forEach((f) => console.log('  FAIL', f));
  if (failures.length) process.exitCode = 1;
  if (CHECK_ONLY || failures.length) return;

  // acceptance rates were invented numbers, so none is kept
  const merged = existing.filter((p) => !dropped.has(p.id)).map((p) => ({ ...(built.get(p.id) || p), acceptanceRate: '' }));

  const missingStatements = merged.filter((p) => /Solve the standard|Standard problem input/.test(p.description + JSON.stringify(p.examples)));
  if (missingStatements.length) console.log(`  note: ${missingStatements.length} problems still have placeholder statements:`, missingStatements.map((p) => p.id).join(', '));

  // backend: full data including hidden tests
  fs.writeFileSync(BACKEND_FILE, `// Problem bank for CVMind Code. Generated by scripts/build-problems.mjs: edit the specs in scripts/problems/, not this file.\nexport const CURATED_PROBLEMS = ${toJson(merged)};\n`);

  // frontend: the same problems without hidden tests, so they are never shipped to browsers
  const pub = merged.map(({ hiddenTestCases, cppSpec, ...rest }) => rest);
  const tsText = fs.readFileSync(FRONTEND_FILE, 'utf8');
  const a = tsText.indexOf('export const CODING_PROBLEMS: CodingProblem[] = ') + 'export const CODING_PROBLEMS: CodingProblem[] = '.length;
  const b = tsText.indexOf('export const TOPICS');
  let head = tsText.slice(0, a);
  if (!head.includes('params?: string[]')) head = head.replace('  functionName: string;', '  functionName: string;\n  /** Parameter names of the solution function, in order (used to label inputs). */\n  params?: string[];');
  if (!head.includes('kind?:')) {
    const extra = [
      '  params?: string[];',
      '  /** How the judge maps this problem onto a function: used by the server, listed here so the data type-checks. */',
      "  kind?: 'function' | 'design';",
      '  adapter?: string;',
      '  argTypes?: string[];',
      '  returnType?: string;',
      '  compare?: string;',
    ].join('\n');
    head = head.replace('  params?: string[];', extra);
  }
  fs.writeFileSync(FRONTEND_FILE, `${head}${toJson(pub)};\n\n${tsText.slice(b)}`);
  console.log(`wrote ${merged.length} problems`);
}

main().catch((e) => { console.error(e); process.exit(1); });
