import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assertIdentifier, computeFinalVerdict } from './judgeShared.js';

/**
 * Runs Python solutions in a child process.
 *
 * IMPORTANT: unlike the JavaScript executor this is NOT sandboxed. The child runs with the server's
 * privileges, so it must only be exposed to trusted users or be moved into a container / jail before
 * being offered publicly. See the note in the project hand-off.
 */

let pythonCommand; // cached: 'python3', 'python' or null

async function canRun(cmd) {
  return new Promise((resolve) => {
    const p = spawn(cmd, ['--version']);
    p.on('error', () => resolve(false));
    p.on('close', (c) => resolve(c === 0));
  });
}

export async function detectPython() {
  if (pythonCommand !== undefined) return pythonCommand;
  for (const cmd of ['python3', 'python']) {
    if (await canRun(cmd)) { pythonCommand = cmd; return cmd; }
  }
  pythonCommand = null;
  return null;
}

// Python harness. `code` is the user's solution; CFG is JSON (problem meta and test cases).
const HARNESS = String.raw`
import sys, json, time, inspect, traceback

true = True
false = False
null = None

class _LN:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class _TN:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

# names class-based solutions expect; user code may redefine them
ListNode = _LN
TreeNode = _TN

__USER_CODE__

def _build_list(arr):
    head = None
    for v in reversed(arr):
        n = _LN(v); n.next = head; head = n
    return head

def _build_cyclic(arr, pos):
    nodes = [_LN(v) for v in arr]
    for i in range(len(nodes) - 1):
        nodes[i].next = nodes[i + 1]
    if nodes and pos >= 0:
        nodes[-1].next = nodes[pos]
    return nodes[0] if nodes else None

def _build_tree(arr):
    if not arr or arr[0] is None:
        return None
    root = _TN(arr[0]); queue = [root]; i = 1
    while queue and i < len(arr):
        node = queue.pop(0)
        if i < len(arr) and arr[i] is not None:
            node.left = _TN(arr[i]); queue.append(node.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            node.right = _TN(arr[i]); queue.append(node.right)
        i += 1
    return root

def _dump_list(h):
    out = []; n = h; guard = 0
    while n is not None and guard < 100000:
        out.append(n.val); n = n.next; guard += 1
    return out

def _dump_tree(root):
    if root is None:
        return []
    out = []; queue = [root]; guard = 0
    while queue and guard < 100000:
        n = queue.pop(0); guard += 1
        if n is None:
            out.append(None); continue
        out.append(n.val); queue.append(n.left); queue.append(n.right)
    while out and out[-1] is None:
        out.pop()
    return out

def _build(v, t):
    if t == 'list': return _build_list(v)
    if t == 'tree': return _build_tree(v)
    if t == 'lists': return [_build_list(x) for x in v]
    return v

def _dump(v, t):
    if t == 'list': return _dump_list(v)
    if t == 'tree': return _dump_tree(v)
    return v

def _plain(val):
    if isinstance(val, tuple): return [_plain(x) for x in val]
    if isinstance(val, set): return sorted([_plain(x) for x in val], key=lambda x: json.dumps(x))
    if isinstance(val, list): return [_plain(x) for x in val]
    if isinstance(val, dict): return {k: _plain(x) for k, x in val.items()}
    return val

def _key(x):
    return json.dumps(x, sort_keys=True)

def _canonical(v, mode):
    if mode == 'unordered' and isinstance(v, list):
        return sorted(v, key=_key)
    if mode == 'unordered-deep' and isinstance(v, list):
        inner = [sorted(x, key=_key) if isinstance(x, list) else x for x in v]
        return sorted(inner, key=_key)
    return v

def _match(actual, expected, mode):
    if mode == 'float' and isinstance(actual, (int, float)) and isinstance(expected, (int, float)) and not isinstance(actual, bool):
        return abs(actual - expected) <= 1e-5 * max(1, abs(expected))
    return _key(_canonical(actual, mode)) == _key(_canonical(expected, mode))

def _find_callable(name):
    g = globals()
    if name in g and inspect.isfunction(g[name]):
        return ('fn', g[name])
    sol = g.get('Solution')
    if inspect.isclass(sol) and hasattr(sol, name):
        return ('method', sol)
    return None

def main():
    cfg = json.loads(__CFG__)
    meta = cfg['meta']
    fn_name = cfg['fn']
    results = []

    kind = meta.get('kind', 'function')
    if kind == 'design':
        cls = globals().get(fn_name)
        if not inspect.isclass(cls):
            print('__CVMIND_OUTPUT_START__')
            print(json.dumps({'error': 'Define a class named ' + fn_name + '.'}))
            print('__CVMIND_OUTPUT_END__')
            return
        target = None
    else:
        target = _find_callable(fn_name)
        if target is None:
            print('__CVMIND_OUTPUT_START__')
            print(json.dumps({'error': 'Define a function named ' + fn_name + ' or a Solution class with that method.'}))
            print('__CVMIND_OUTPUT_END__')
            return

    for i, tc in enumerate(cfg['tests']):
        raw = tc.get('input')
        args = raw if isinstance(raw, list) else [raw]
        expected = tc.get('expected')
        custom = expected is None
        start = time.perf_counter()
        try:
            if kind == 'design':
                ops, argv = args[0], args[1]
                inst = cls(*argv[0])
                out = [None]
                for j in range(1, len(ops)):
                    m = getattr(inst, ops[j], None)
                    if not callable(m):
                        raise AttributeError('Your class has no method named ' + str(ops[j]) + '.')
                    out.append(m(*argv[j]))
                actual = _plain(out)
            else:
                if meta.get('adapter') == 'cyclic-list':
                    call_args = [_build_cyclic(args[0], args[1])]
                else:
                    types = meta.get('argTypes') or []
                    call_args = [_build(a, types[k] if k < len(types) else None) for k, a in enumerate(args)]
                if target[0] == 'fn':
                    res = target[1](*call_args)
                else:
                    res = getattr(target[1](), fn_name)(*call_args)
                actual = _plain(_dump(res, meta.get('returnType')))
            elapsed = (time.perf_counter() - start) * 1000
            passed = True if custom else _match(actual, expected, meta.get('compare', 'exact'))
            results.append({'testCaseIndex': i + 1, 'input': raw, 'expected': expected, 'actual': actual, 'passed': passed, 'custom': custom, 'runtimeMs': round(elapsed, 2)})
        except Exception as e:
            results.append({'testCaseIndex': i + 1, 'input': raw, 'expected': expected, 'error': type(e).__name__ + ': ' + str(e), 'passed': False, 'custom': custom})
            break

    print('__CVMIND_OUTPUT_START__')
    print(json.dumps({'results': results}))
    print('__CVMIND_OUTPUT_END__')

if __name__ == '__main__':
    main()
`;

// number of harness lines that come before the user's code
const USER_LINE_OFFSET = HARNESS.slice(0, HARNESS.indexOf('__USER_CODE__')).split('\n').length - 1;

export async function executePython({ code, testCases, functionName = 'solution', meta = {}, timeoutMs = 5000 }) {
  const fn = assertIdentifier(functionName);
  const cmd = await detectPython();
  if (!cmd) return { unavailable: true };

  const cfg = { fn, meta, tests: testCases };
  // the user's code is placed verbatim; the config travels as a Python string literal holding JSON
  const script = HARNESS.replace('__USER_CODE__', () => String(code ?? '')).replace('__CFG__', () => JSON.stringify(JSON.stringify(cfg)));
  const scriptPath = path.join(os.tmpdir(), `cvmind_py_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.py`);

  try {
    fs.writeFileSync(scriptPath, script, 'utf8');
  } catch (err) {
    return { verdict: 'Runtime Error', error: `Could not prepare the run: ${err.message}`, passedTests: 0, totalTests: testCases.length, results: [] };
  }

  return new Promise((resolve) => {
    const started = Date.now();
    const py = spawn(cmd, ['-I', scriptPath], { timeout: timeoutMs, killSignal: 'SIGKILL' });
    let out = '';
    let err = '';
    py.stdout.on('data', (d) => { if (out.length < 2_000_000) out += d.toString(); });
    py.stderr.on('data', (d) => { if (err.length < 200_000) err += d.toString(); });

    const cleanup = () => { try { fs.unlinkSync(scriptPath); } catch { /* already gone */ } };

    py.on('error', (e) => {
      cleanup();
      resolve({ verdict: 'Runtime Error', error: e.message, passedTests: 0, totalTests: testCases.length, results: [] });
    });

    py.on('close', (exitCode, signal) => {
      cleanup();
      const elapsed = Date.now() - started;
      const S = '__CVMIND_OUTPUT_START__';
      const E = '__CVMIND_OUTPUT_END__';
      const s = out.indexOf(S);
      const e = out.indexOf(E);

      if (signal === 'SIGKILL' || (elapsed >= timeoutMs && exitCode !== 0)) {
        resolve({ verdict: 'Time Limit Exceeded', error: 'Time limit exceeded', passedTests: 0, totalTests: testCases.length, runtimeMs: elapsed, results: [] });
        return;
      }

      if (s !== -1 && e !== -1) {
        try {
          const parsed = JSON.parse(out.slice(s + S.length, e).trim());
          const stdout = (out.slice(0, s) + out.slice(e + E.length)).trim().slice(0, 4000);
          if (parsed.error) {
            resolve({ verdict: 'Runtime Error', error: parsed.error, passedTests: 0, totalTests: testCases.length, runtimeMs: 0, results: [] });
            return;
          }
          const rows = (parsed.results || []).map((r) => ({ ...r, stdout }));
          resolve(computeFinalVerdict(rows, testCases.length, rows.reduce((a, r) => a + (r.runtimeMs || 0), 0)));
          return;
        } catch {
          // fall through to the generic error below
        }
      }

      const isSyntax = /SyntaxError|IndentationError|TabError/.test(err);
      // report line numbers relative to the user's code and hide the temp file path
      const cleaned = err
        .replace(/File "[^"]*cvmind_py_[^"]*", line (\d+)/g, (_m, n) => `Line ${Math.max(1, Number(n) - USER_LINE_OFFSET)}`)
        .trim();
      resolve({
        verdict: isSyntax ? 'Compilation Error' : 'Runtime Error',
        error: (cleaned || `Python exited with code ${exitCode}`).split('\n').slice(-6).join('\n'),
        passedTests: 0,
        totalTests: testCases.length,
        runtimeMs: 0,
        results: [],
      });
    });
  });
}
