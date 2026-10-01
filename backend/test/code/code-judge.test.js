import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runJudgeSubmission } from '../../src/services/codeJudge.js';

const run = (code, functionName, testCases, extra = {}) =>
  runJudgeSubmission({ code, language: extra.language || 'javascript', functionName, testCases, meta: extra.meta || {} });

test('accepts a correct solution and rejects a wrong one', async () => {
  const ok = await run('function add(a,b){return a+b;}', 'add', [{ input: [1, 2], expected: 3 }, { input: [-5, 5], expected: 0 }]);
  assert.equal(ok.verdict, 'Accepted');
  assert.equal(ok.passedTests, 2);

  const bad = await run('function add(a,b){return a-b;}', 'add', [{ input: [1, 2], expected: 3 }]);
  assert.equal(bad.verdict, 'Wrong Answer');
});

test('reports syntax errors, runtime errors and infinite loops', async () => {
  assert.equal((await run('function f(){ return [;', 'f', [{ input: [], expected: 1 }])).verdict, 'Compilation Error');
  assert.equal((await run('function f(a){ return a.x.y; }', 'f', [{ input: [1], expected: 1 }])).verdict, 'Runtime Error');
  assert.equal((await run('function f(){ while (true) {} }', 'f', [{ input: [], expected: 1 }])).verdict, 'Time Limit Exceeded');
});

test('a promise callback that never ends cannot hang the server', async () => {
  // the answer is returned first; the runaway callback only spins inside the worker, which is then terminated
  const started = Date.now();
  const r = await run('function f(){ Promise.resolve().then(() => { while (true) {} }); return 1; }', 'f', [{ input: [], expected: 1 }]);
  assert.ok(['Accepted', 'Time Limit Exceeded'].includes(r.verdict));
  assert.ok(Date.now() - started < 10000, 'the judge must answer promptly');
});

test('a solution that runs out of memory is stopped', async () => {
  const r = await run('function f(){ const a = []; while (true) a.push(new Array(1e6).fill(1)); }', 'f', [{ input: [], expected: 1 }]);
  assert.ok(['Memory Limit Exceeded', 'Time Limit Exceeded', 'Runtime Error'].includes(r.verdict), `got ${r.verdict}`);
});

test('user code cannot reach the host process or compile code from strings', async () => {
  const probe = 'function f(){ return [typeof process, typeof require].join(","); }';
  assert.equal((await run(probe, 'f', [{ input: [], expected: 'undefined,undefined' }])).verdict, 'Accepted');

  // the classic vm escape: reach the host Function constructor through the global object
  const escape = 'function f(){ try { return this.constructor.constructor("return typeof process")(); } catch (e) { return "blocked"; } }';
  assert.equal((await run(escape, 'f', [{ input: [], expected: 'blocked' }])).verdict, 'Accepted');

  const viaLiteral = 'function f(){ try { return (function(){}).constructor("return 1")(); } catch (e) { return "blocked"; } }';
  assert.equal((await run(viaLiteral, 'f', [{ input: [], expected: 'blocked' }])).verdict, 'Accepted');
});

test('linked lists and trees are converted from arrays and back', async () => {
  const reverse = 'function reverseList(h){let p=null;while(h){const n=h.next;h.next=p;p=h;h=n;}return p;}';
  const list = await run(reverse, 'reverseList', [{ input: [[1, 2, 3]], expected: [3, 2, 1] }, { input: [[]], expected: [] }], { meta: { argTypes: ['list'], returnType: 'list' } });
  assert.equal(list.verdict, 'Accepted');

  const depth = 'function maxDepth(r){return r?1+Math.max(maxDepth(r.left),maxDepth(r.right)):0;}';
  const tree = await run(depth, 'maxDepth', [{ input: [[3, 9, 20, null, null, 15, 7]], expected: 3 }], { meta: { argTypes: ['tree'] } });
  assert.equal(tree.verdict, 'Accepted');

  const cycle = 'function hasCycle(h){let s=h,f=h;while(f&&f.next){s=s.next;f=f.next.next;if(s===f)return true;}return false;}';
  const cyc = await run(cycle, 'hasCycle', [{ input: [[3, 2, 0, -4], 1], expected: true }, { input: [[1, 2], -1], expected: false }], { meta: { adapter: 'cyclic-list' } });
  assert.equal(cyc.verdict, 'Accepted');
});

test('design problems drive a class with a list of operations', async () => {
  const code = 'class Counter{constructor(s){this.n=s;}inc(){this.n++;}get(){return this.n;}}';
  const r = await run(code, 'Counter', [{ input: [['Counter', 'inc', 'inc', 'get'], [[5], [], [], []]], expected: [null, null, null, 7] }], { meta: { kind: 'design' } });
  assert.equal(r.verdict, 'Accepted');
});

test('comparison modes accept any allowed answer order', async () => {
  const perms = await run('function f(){return [[2,1],[1,2]];}', 'f', [{ input: [], expected: [[1, 2], [2, 1]] }], { meta: { compare: 'unordered' } });
  assert.equal(perms.verdict, 'Accepted');
  const subsets = await run('function f(){return [[3,1],[2]];}', 'f', [{ input: [], expected: [[2], [1, 3]] }], { meta: { compare: 'unordered-deep' } });
  assert.equal(subsets.verdict, 'Accepted');
  const strict = await run('function f(){return [[2,1],[1,2]];}', 'f', [{ input: [], expected: [[1, 2], [2, 1]] }]);
  assert.equal(strict.verdict, 'Wrong Answer');
  const float = await run('function f(){return 1024.000000001;}', 'f', [{ input: [], expected: 1024 }], { meta: { compare: 'float' } });
  assert.equal(float.verdict, 'Accepted');
});

test('a custom run with no expected value completes instead of failing', async () => {
  const r = await run('function f(a){return a*2;}', 'f', [{ input: [21], expected: null }]);
  assert.equal(r.verdict, 'Completed');
});

test('C++ without a signature spec is reported as not judged instead of inventing a verdict', async () => {
  const r = await runJudgeSubmission({ code: 'int main(){}', language: 'cpp', functionName: 'f', testCases: [{ input: [1], expected: 1 }] });
  assert.equal(r.simulated, true);
  assert.equal(r.verdict, 'Not Judged');
  assert.deepEqual(r.results, []);
});

test('C++ solutions are compiled and judged, including errors, lists and design classes', async (t) => {
  const meta = { cppSpec: { kind: 'function', method: 'add', ret: 'int', args: [{ type: 'int', name: 'a' }, { type: 'int', name: 'b' }] } };
  const probe = await runJudgeSubmission({ code: 'class Solution { public: int add(int a, int b) { return a + b; } };', language: 'cpp', functionName: 'add', testCases: [{ input: [1, 2], expected: 3 }], meta });
  if (probe.simulated) { t.skip('No C++ compiler on this machine'); return; }
  assert.equal(probe.verdict, 'Accepted');

  const wrong = await runJudgeSubmission({ code: 'class Solution { public: int add(int a, int b) { return a - b; } };', language: 'cpp', functionName: 'add', testCases: [{ input: [1, 2], expected: 3 }], meta });
  assert.equal(wrong.verdict, 'Wrong Answer');

  const broken = await runJudgeSubmission({ code: 'class Solution { public: int add(int a, int b) { return ; } };', language: 'cpp', functionName: 'add', testCases: [{ input: [1, 2], expected: 3 }], meta });
  assert.equal(broken.verdict, 'Compilation Error');
  assert.match(broken.error, /solution\.cpp:1/, 'errors should point at the user\'s own line numbers');

  const crash = await runJudgeSubmission({ code: 'class Solution { public: int add(int a, int b) { int* p = nullptr; return *p; } };', language: 'cpp', functionName: 'add', testCases: [{ input: [1, 2], expected: 3 }], meta });
  assert.equal(crash.verdict, 'Runtime Error');

  const listMeta = { argTypes: ['list'], returnType: 'list', cppSpec: { kind: 'function', method: 'reverseList', ret: 'ListNode*', args: [{ type: 'ListNode*', name: 'head' }] } };
  const list = await runJudgeSubmission({ code: 'class Solution { public: ListNode* reverseList(ListNode* h) { ListNode* p = nullptr; while (h) { ListNode* n = h->next; h->next = p; p = h; h = n; } return p; } };', language: 'cpp', functionName: 'reverseList', testCases: [{ input: [[1, 2, 3]], expected: [3, 2, 1] }, { input: [[]], expected: [] }], meta: listMeta });
  assert.equal(list.verdict, 'Accepted');

  const designMeta = { kind: 'design', cppSpec: { kind: 'design', className: 'Counter', ctor: ['int'], methods: [{ name: 'inc', args: [], ret: 'void' }, { name: 'get', args: [], ret: 'int' }] } };
  const design = await runJudgeSubmission({ code: 'class Counter { int n; public: Counter(int s) : n(s) {} void inc() { n++; } int get() { return n; } };', language: 'cpp', functionName: 'Counter', testCases: [{ input: [['Counter', 'inc', 'get'], [[1], [], []]], expected: [null, null, 2] }], meta: designMeta });
  assert.equal(design.verdict, 'Accepted');
});

test('function names are validated before being placed in generated code', async () => {
  await assert.rejects(() => run('function f(){}', 'f(){};process.exit();function g', [{ input: [], expected: 1 }]), /Invalid function name/);
});

test('python solutions run, including lists, trees and design classes', async (t) => {
  const py = await run('def add(a, b):\n    return a + b', 'add', [{ input: [1, 2], expected: 3 }], { language: 'python' });
  if (py.simulated) { t.skip('Python is not installed on this machine'); return; }
  assert.equal(py.verdict, 'Accepted');

  const rev = await run('def reverseList(head):\n    prev=None\n    while head:\n        nxt=head.next; head.next=prev; prev=head; head=nxt\n    return prev', 'reverseList', [{ input: [[1, 2, 3]], expected: [3, 2, 1] }], { language: 'python', meta: { argTypes: ['list'], returnType: 'list' } });
  assert.equal(rev.verdict, 'Accepted');

  const design = await run('class C:\n    def __init__(self, s):\n        self.n = s\n    def inc(self):\n        self.n += 1\n    def get(self):\n        return self.n', 'C', [{ input: [['C', 'inc', 'get'], [[1], [], []]], expected: [null, null, 2] }], { language: 'python', meta: { kind: 'design' } });
  assert.equal(design.verdict, 'Accepted');

  const syntax = await run('def f(:\n  pass', 'f', [{ input: [], expected: 1 }], { language: 'python' });
  assert.equal(syntax.verdict, 'Compilation Error');
  assert.ok(!/cvmind_py_/.test(syntax.error), 'the temp file path should not leak into the message');
});
