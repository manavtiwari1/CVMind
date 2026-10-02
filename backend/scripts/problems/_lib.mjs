/**
 * Helpers for authoring problems.
 *
 * A problem spec is written once and everything else is derived from it:
 *   - `ref` computes the expected output of every test input, so tests can never disagree with the reference
 *   - `sol` is the self-contained JavaScript solution that build-problems.mjs runs through the real judge
 *   - examples, starter code for three languages and the parameter names come from the same spec
 */

export const LIST_NOTE =
  'The linked list is given as an array of node values in order (an empty array is an empty list). Your function receives the head node, which has `val` and `next`, and must return the head of the resulting list.';

export const TREE_NOTE =
  'The binary tree is given in level-order as an array, where `null` marks a missing child. Your function receives the root node, which has `val`, `left` and `right`.';

export const DESIGN_NOTE =
  'The judge creates your class and calls its methods in order. `operations` holds the class name followed by the method names, and `arguments` holds the arguments of each call (the first entry is for the constructor). The output lists what each call returned, with `null` for calls that return nothing.';

const JS_LIST_DEF = `/**
 * function ListNode(val, next) {
 *   this.val = val === undefined ? 0 : val;
 *   this.next = next === undefined ? null : next;
 * }
 */`;

const JS_TREE_DEF = `/**
 * function TreeNode(val, left, right) {
 *   this.val = val === undefined ? 0 : val;
 *   this.left = left === undefined ? null : left;
 *   this.right = right === undefined ? null : right;
 * }
 */`;

const PY_LIST_DEF = `# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next`;

const PY_TREE_DEF = `# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right`;

export const fmt = (v) => JSON.stringify(v);

export function deepClone(v) {
  return v === undefined ? v : JSON.parse(JSON.stringify(v));
}

// ── C++ signatures ───────────────────────────────────────────
// The C++ judge needs the parameter and return types of every solution. They are inferred from the test data
// (scanning all tests, so an empty first test cannot mislead) and can be overridden with `cpp: { args, ret }`.

const INT_MAX = 2147483647;

function shapeOf(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'number') return Number.isInteger(v) ? (Math.abs(v) > INT_MAX ? 'long long' : 'int') : 'double';
  if (typeof v === 'string') return 'string';
  if (Array.isArray(v)) {
    for (const e of v) {
      const t = shapeOf(e);
      if (t) return `vector<${t}>`;
    }
    return null;
  }
  return null;
}

function mergeShapes(a, b) {
  if (!a) return b;
  if (!b || a === b) return a;
  const numeric = ['int', 'long long', 'double'];
  if (numeric.includes(a) && numeric.includes(b)) return numeric[Math.max(numeric.indexOf(a), numeric.indexOf(b))];
  if (a.startsWith('vector<') && b.startsWith('vector<')) return `vector<${mergeShapes(a.slice(7, -1), b.slice(7, -1))}>`;
  return a;
}

function inferShape(values) {
  let t = null;
  for (const v of values) t = mergeShapes(t, shapeOf(v));
  if (t) return t;
  return values.some(Array.isArray) ? 'vector<int>' : 'int';
}

const STRUCT_ARG = { list: 'ListNode*', tree: 'TreeNode*', lists: 'vector<ListNode*>' };

function cppParam(type, name) {
  return type.startsWith('vector<') ? `${type}& ${name}` : `${type} ${name}`;
}

/** Types for a plain function problem: { method, ret, args: [{ type, name }] }. */
function inferFunctionSpec(spec, functionName, tests) {
  const meta = spec.meta || {};
  const params = spec.params || [];
  const override = spec.cpp || {};
  const args = params.map((name, i) => {
    let type = override.args?.[i];
    if (!type && meta.adapter === 'cyclic-list') type = 'ListNode*';
    if (!type && STRUCT_ARG[(meta.argTypes || [])[i]]) type = STRUCT_ARG[meta.argTypes[i]];
    if (!type) type = inferShape(tests.map((t) => t.input[i]));
    return { type, name };
  });
  let ret = override.ret || (meta.returnType === 'list' ? 'ListNode*' : meta.returnType === 'tree' ? 'TreeNode*' : null);
  if (!ret) ret = inferShape(tests.map((t) => t.expected));
  return { kind: 'function', method: functionName, ret, args };
}

function designSpec(spec) {
  const d = spec.design;
  if (!d.cpp) throw new Error(`${spec.id}: design problems need design.cpp (constructor and method types)`);
  return { kind: 'design', className: d.className, ctor: d.cpp.ctor, methods: d.cpp.methods };
}

export function buildStarters(spec, functionName, tests) {
  const meta = spec.meta || {};
  const list = (meta.argTypes || []).includes('list') || (meta.argTypes || []).includes('lists') || meta.returnType === 'list' || meta.adapter === 'cyclic-list';
  const tree = (meta.argTypes || []).includes('tree') || meta.returnType === 'tree';

  // design problems: a class with the listed methods
  if (meta.kind === 'design') {
    const d = spec.design;
    const cpp = designSpec(spec);
    const jsMethods = d.methods.map(([name, ps]) => `  ${name}(${ps.join(', ')}) {\n  }`).join('\n\n');
    const pyMethods = d.methods.map(([name, ps]) => `    def ${name}(self${ps.map((p) => `, ${p}`).join('')}):\n        pass`).join('\n\n');
    const cppMethods = cpp.methods.map((m) => `    ${m.ret} ${m.name}(${m.args.map((t, i) => cppParam(t, m.names?.[i] || `arg${i + 1}`)).join(', ')}) {\n    }`).join('\n\n');
    const ctorArgs = cpp.ctor.map((t, i) => cppParam(t, (d.ctor || [])[i] || `arg${i + 1}`)).join(', ');
    return {
      starterCode: {
        javascript: `class ${d.className} {\n  constructor(${(d.ctor || []).join(', ')}) {\n  }\n\n${jsMethods}\n}`,
        python: `class ${d.className}:\n    def __init__(self${(d.ctor || []).map((p) => `, ${p}`).join('')}):\n        pass\n\n${pyMethods}`,
        cpp: `class ${d.className} {\npublic:\n    ${d.className}(${ctorArgs}) {\n    }\n\n${cppMethods}\n};`,
      },
      cppSpec: cpp,
    };
  }

  const params = spec.params || [];
  const cpp = inferFunctionSpec(spec, functionName, tests);
  const jsHead = [list ? JS_LIST_DEF : '', tree ? JS_TREE_DEF : ''].filter(Boolean).join('\n');
  const pyHead = [list ? PY_LIST_DEF : '', tree ? PY_TREE_DEF : ''].filter(Boolean).join('\n');

  return {
    starterCode: {
      javascript: `${jsHead ? `${jsHead}\n` : ''}function ${functionName}(${params.join(', ')}) {\n  // Write your solution here\n}`,
      python: `${pyHead ? `${pyHead}\n` : ''}class Solution:\n    def ${functionName}(self${params.map((p) => `, ${p}`).join('')}):\n        # Write your solution here\n        pass`,
      cpp: `class Solution {\npublic:\n    ${cpp.ret} ${functionName}(${cpp.args.map((a) => cppParam(a.type, a.name)).join(', ')}) {\n        // Write your solution here\n    }\n};`,
    },
    cppSpec: cpp,
  };
}

/** Runs a design class against an operation list, the same way the judge does. */
export function runDesign(Cls, ops, argv) {
  const inst = new Cls(...argv[0]);
  const out = [null];
  for (let i = 1; i < ops.length; i++) {
    const r = inst[ops[i]](...argv[i]);
    out.push(r === undefined ? null : r);
  }
  return out;
}

// ── Trees ────────────────────────────────────────────────────

function TreeNodeRef(val) { this.val = val; this.left = null; this.right = null; }

/** Level-order array (null for a missing child) to nodes. */
export function toTree(arr) {
  if (!arr.length || arr[0] === null) return null;
  const root = new TreeNodeRef(arr[0]);
  const queue = [root];
  let i = 1;
  while (queue.length && i < arr.length) {
    const node = queue.shift();
    if (i < arr.length && arr[i] !== null) { node.left = new TreeNodeRef(arr[i]); queue.push(node.left); }
    i++;
    if (i < arr.length && arr[i] !== null) { node.right = new TreeNodeRef(arr[i]); queue.push(node.right); }
    i++;
  }
  return root;
}

/** Nodes back to a level-order array without trailing nulls. */
export function fromTree(root) {
  if (!root) return [];
  const out = [];
  const queue = [root];
  while (queue.length) {
    const n = queue.shift();
    if (!n) { out.push(null); continue; }
    out.push(n.val);
    queue.push(n.left, n.right);
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}

/** A random binary tree as a level-order array. With `bst`, values are unique and ordered like a binary search tree. */
export function randomTree(seed, size, { bst = false, lo = -100, hi = 100 } = {}) {
  const r = rng(seed);
  const used = new Set();
  const next = () => {
    let v = randInt(r, lo, hi);
    while (bst && used.has(v)) v = randInt(r, lo, hi);
    used.add(v);
    return v;
  };
  const root = new TreeNodeRef(next());
  const slots = [root];
  for (let i = 1; i < size; i++) {
    if (bst) {
      const v = next();
      let cur = root;
      for (;;) {
        if (v < cur.val) { if (cur.left) cur = cur.left; else { cur.left = new TreeNodeRef(v); break; } }
        else if (cur.right) cur = cur.right;
        else { cur.right = new TreeNodeRef(v); break; }
      }
    } else {
      const idx = randInt(r, 0, slots.length - 1);
      const parent = slots[idx];
      const side = !parent.left && (parent.right || r() < 0.5) ? 'left' : !parent.right ? 'right' : 'left';
      if (parent[side]) { slots.splice(idx, 1); i--; continue; }
      const node = new TreeNodeRef(next());
      parent[side] = node;
      slots.push(node);
      if (parent.left && parent.right) slots.splice(slots.indexOf(parent), 1);
    }
  }
  return fromTree(root);
}

/** Small deterministic random generator so large tests are identical on every build. */
export function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export const randInt = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

export function problem(id, spec) {
  return { id, ...spec };
}
