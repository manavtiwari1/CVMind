import vm from 'node:vm';
import { assertIdentifier, computeFinalVerdict, valuesMatch } from './judgeShared.js';

/**
 * Runs JavaScript solutions in a fresh V8 context per test case.
 *
 * Hardening notes (node:vm is NOT a complete security boundary, so this reduces the attack surface rather than removing it):
 *  - the context's global is built from a null-prototype object. With a normal {} sandbox,
 *    this.constructor.constructor("return process")() hands user code the host Function constructor, which is a full escape
 *  - eval / new Function / WebAssembly compilation are disabled inside the context
 *  - the whole run happens in a worker thread that the host kills on timeout, which also stops promise/microtask loops
 *  - inputs go in as a JSON string and come out as a JSON string
 */

const PRELUDE = [
  'globalThis.ListNode = function ListNode(val, next) { this.val = val === undefined ? 0 : val; this.next = next === undefined ? null : next; };',
  'globalThis.TreeNode = function TreeNode(val, left, right) { this.val = val === undefined ? 0 : val; this.left = left === undefined ? null : left; this.right = right === undefined ? null : right; };',
  'var __logs = [];',
  'function __fmt(a) { try { return typeof a === "object" ? JSON.stringify(a) : String(a); } catch (e) { return String(a); } }',
  'globalThis.console = {',
  '  log: function () { __logs.push(Array.prototype.map.call(arguments, __fmt).join(" ")); },',
  '  error: function () { __logs.push("[error] " + Array.prototype.map.call(arguments, __fmt).join(" ")); },',
  '  warn: function () { __logs.push("[warn] " + Array.prototype.map.call(arguments, __fmt).join(" ")); },',
  '};',
].join('\n');

function runnerSource(fn, cfg) {
  return [
    '(function () {',
    `  var cfg = JSON.parse(${JSON.stringify(JSON.stringify(cfg))});`,
    '  function LN(v) { this.val = v; this.next = null; }',
    '  function TN(v) { this.val = v; this.left = null; this.right = null; }',
    '  function buildList(arr) { var head = null; for (var i = arr.length - 1; i >= 0; i--) { var n = new LN(arr[i]); n.next = head; head = n; } return head; }',
    '  function buildCyclic(arr, pos) {',
    '    var nodes = arr.map(function (v) { return new LN(v); });',
    '    for (var i = 0; i + 1 < nodes.length; i++) nodes[i].next = nodes[i + 1];',
    '    if (nodes.length && pos >= 0) nodes[nodes.length - 1].next = nodes[pos];',
    '    return nodes.length ? nodes[0] : null;',
    '  }',
    '  function buildTree(arr) {',
    '    if (!arr.length || arr[0] === null) return null;',
    '    var root = new TN(arr[0]); var queue = [root]; var i = 1;',
    '    while (queue.length && i < arr.length) {',
    '      var node = queue.shift();',
    '      if (i < arr.length && arr[i] !== null) { node.left = new TN(arr[i]); queue.push(node.left); } i++;',
    '      if (i < arr.length && arr[i] !== null) { node.right = new TN(arr[i]); queue.push(node.right); } i++;',
    '    }',
    '    return root;',
    '  }',
    '  function dumpList(h) { var out = []; var n = h; var guard = 0; while (n && guard++ < 100000) { out.push(n.val); n = n.next; } return out; }',
    '  function dumpTree(root) {',
    '    if (!root) return [];',
    '    var out = []; var queue = [root]; var guard = 0;',
    '    while (queue.length && guard++ < 100000) { var n = queue.shift(); if (n === null || n === undefined) { out.push(null); continue; } out.push(n.val); queue.push(n.left || null); queue.push(n.right || null); }',
    '    while (out.length && out[out.length - 1] === null) out.pop();',
    '    return out;',
    '  }',
    '  function build(v, t) { if (t === "list") return buildList(v); if (t === "tree") return buildTree(v); if (t === "lists") return v.map(buildList); return v; }',
    '  function dump(v, t) { if (t === "list") return dumpList(v); if (t === "tree") return dumpTree(v); return v; }',
    '  function done(v) { return JSON.stringify({ v: v === undefined ? null : v }); }',
    '',
    '  if (cfg.kind === "design") {',
    `    var Cls = typeof ${fn} !== "undefined" ? ${fn} : undefined;`,
    '    if (typeof Cls !== "function") throw new Error("Define a class named ' + fn + '.");',
    '    var ops = cfg.args[0]; var argv = cfg.args[1];',
    '    var inst = new Cls(...argv[0]);',
    '    var out = [null];',
    '    for (var i = 1; i < ops.length; i++) {',
    '      if (typeof inst[ops[i]] !== "function") throw new Error("Your class has no method named " + ops[i] + ".");',
    '      var r = inst[ops[i]].apply(inst, argv[i]);',
    '      out.push(r === undefined ? null : r);',
    '    }',
    '    return done(out);',
    '  }',
    '',
    '  var args;',
    '  if (cfg.adapter === "cyclic-list") args = [buildCyclic(cfg.args[0], cfg.args[1])];',
    '  else args = cfg.args.map(function (a, i) { return build(a, (cfg.argTypes || [])[i]); });',
    '  var res;',
    `  if (typeof ${fn} === "function") res = ${fn}.apply(null, args);`,
    `  else if (typeof Solution === "function" && typeof Solution.prototype.${fn} === "function") res = new Solution().${fn}.apply(new Solution(), args);`,
    '  else throw new Error("Define a function named ' + fn + '.");',
    '  if (res && typeof res.then === "function") throw new Error("Async functions are not supported.");',
    '  return done(dump(res, cfg.returnType));',
    '})()',
  ].join('\n');
}

function describeSyntaxError(err) {
  const line = /solution\.js:(\d+)/.exec(err.stack || '');
  return `${err.name}: ${err.message}${line ? ` (line ${line[1]})` : ''}`;
}

export function runJavaScriptTests({ code, testCases, functionName = 'solution', meta = {}, timeoutMs = 2500 }) {
  const fn = assertIdentifier(functionName);

  let userScript;
  try {
    userScript = new vm.Script(String(code ?? ''), { filename: 'solution.js' });
  } catch (err) {
    return {
      verdict: 'Compilation Error',
      error: describeSyntaxError(err),
      passedTests: 0,
      totalTests: testCases.length,
      runtimeMs: 0,
      results: [],
    };
  }
  const preludeScript = new vm.Script(PRELUDE, { filename: 'prelude.js' });

  const results = [];
  let totalRuntime = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    let parsedInput = tc.input;
    if (typeof parsedInput === 'string') {
      try { parsedInput = JSON.parse(parsedInput); } catch { /* keep the raw string */ }
    }
    const args = Array.isArray(parsedInput) ? parsedInput : [parsedInput];
    const custom = tc.expected === null || tc.expected === undefined;

    const context = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
    const readLogs = () => {
      try { return String(vm.runInContext('__logs.join("\\n")', context, { timeout: 200 })).slice(0, 4000); } catch { return ''; }
    };

    try {
      preludeScript.runInContext(context, { timeout: timeoutMs });
      userScript.runInContext(context, { timeout: timeoutMs });

      const cfg = { kind: meta.kind || 'function', adapter: meta.adapter, argTypes: meta.argTypes, returnType: meta.returnType, args };
      const runner = new vm.Script(runnerSource(fn, cfg), { filename: 'runner.js' });

      const start = process.hrtime.bigint();
      const raw = runner.runInContext(context, { timeout: timeoutMs });
      const runtimeMs = Number(process.hrtime.bigint() - start) / 1e6;
      totalRuntime += runtimeMs;

      const actual = JSON.parse(raw).v;
      const passed = custom ? true : valuesMatch(actual, tc.expected, meta.compare);
      results.push({
        testCaseIndex: i + 1,
        input: tc.input,
        expected: tc.expected ?? null,
        actual,
        stdout: readLogs(),
        passed,
        custom,
        runtimeMs: Math.round(runtimeMs * 100) / 100,
      });
    } catch (err) {
      const isTimeout = err?.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' || /timed out/i.test(err?.message || '');
      results.push({
        testCaseIndex: i + 1,
        input: tc.input,
        expected: tc.expected ?? null,
        actual: null,
        error: isTimeout ? 'Time limit exceeded' : `${err?.name || 'Error'}: ${err?.message || err}`,
        stdout: readLogs(),
        passed: false,
        isTimeout,
        custom,
      });
      break; // stop at the first runtime error or timeout
    }
  }

  return computeFinalVerdict(results, testCases.length, totalRuntime);
}
