import { problem, TREE_NOTE, toTree, fromTree, randomTree } from './_lib.mjs';

const T = TREE_NOTE;

// A few shapes reused by several problems.
const skewedRight = (n) => { const a = []; for (let i = 1; i <= n; i++) { a.push(i); if (i < n) a.push(null); } return a; };
const bigBst = randomTree(77, 1500, { bst: true, lo: -100000, hi: 100000 });
const bigTree = randomTree(78, 2000);
const midTree = randomTree(79, 900);
const kBst = randomTree(80, 1500, { bst: true, lo: 0, hi: 10000 });

export default [
  problem('invert-binary-tree', {
    statement: `
Turn a binary tree into its **mirror image**: at every node, the left child and the right child trade places. Return the root.

${T}
`,
    params: ['root'],
    meta: { argTypes: ['tree'], returnType: 'tree' },
    constraints: ['0 to 100 nodes', '-100 <= Node.val <= 100'],
    explain: ['8 moves to the left of 5, and below 3 the children 1 and 4 trade places.', 'An empty tree is its own mirror.'],
    known: [[5, 8, 3, null, null, 4, 1], []],
    ref: (root) => {
      const flip = (n) => { if (!n) return null; const l = flip(n.left); const r = flip(n.right); n.left = r; n.right = l; return n; };
      return fromTree(flip(toTree(root)));
    },
    sol: function invertTree(root) {
      if (!root) return null;
      const left = invertTree(root.left);
      const right = invertTree(root.right);
      root.left = right;
      root.right = left;
      return root;
    },
    tests: [[[5, 3, 8, 1, 4]], [[]], [[6, 2, 9]], [[1]], [[1, 2]], [[1, null, 2]], [randomTree(61, 80)]],
  }),

  problem('maximum-depth-of-binary-tree', {
    statement: `
How many levels does a binary tree have? Return the **number of nodes on the longest downward path** from the root to any leaf (an empty tree has depth 0).

${T}
`,
    params: ['root'],
    meta: { argTypes: ['tree'] },
    constraints: ['0 to 10^4 nodes', '-100 <= Node.val <= 100'],
    explain: ['The path 8 -> 4 -> 2 -> 7 has four nodes.', 'Root plus one level of children.'],
    known: [4, 2],
    ref: (root) => { const d = (n) => (n ? 1 + Math.max(d(n.left), d(n.right)) : 0); return d(toTree(root)); },
    sol: function maxDepth(root) {
      if (!root) return 0;
      return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
    },
    tests: [[[8, 4, null, 2, null, 7]], [[5, 1, 9]], [[]], [[0]], [[6, 2, 7, 1, 3]], [skewedRight(800)], [bigTree]],
  }),

  problem('diameter-of-binary-tree', {
    statement: `
Treat a binary tree as a network of cables, one per parent-child link. Return the **most cables you would pass through travelling between any two nodes** without backtracking. The route does not have to go through the root.

${T}
`,
    params: ['root'],
    meta: { argTypes: ['tree'] },
    constraints: ['1 to 10^4 nodes', '-100 <= Node.val <= 100'],
    explain: ['5 -> 4 -> 2 -> 1 -> 3 crosses four links.', 'Two nodes, one link.'],
    known: [4, 1],
    ref: (root) => {
      let best = 0;
      const depth = (n) => { if (!n) return 0; const l = depth(n.left); const r = depth(n.right); best = Math.max(best, l + r); return 1 + Math.max(l, r); };
      depth(toTree(root));
      return best;
    },
    sol: function diameterOfBinaryTree(root) {
      let best = 0;
      function depth(node) {
        if (!node) return 0;
        const left = depth(node.left);
        const right = depth(node.right);
        best = Math.max(best, left + right);
        return 1 + Math.max(left, right);
      }
      depth(root);
      return best;
    },
    tests: [[[1, 2, 3, null, 4, null, null, 5, 6]], [[7, null, 3]], [[1]], [[1, 2, null, 3, null, 4]], [[1, 2, 3, 4, null, null, 5, 6, null, null, 7]], [skewedRight(500)], [bigTree]],
  }),

  problem('balanced-binary-tree', {
    statement: `
Return \`true\` if, **at every node** of the binary tree, the depths of the left branch and the right branch **differ by no more than 1**. Otherwise return \`false\`.

${T}
`,
    params: ['root'],
    meta: { argTypes: ['tree'] },
    constraints: ['0 to 5000 nodes', '-10^4 <= Node.val <= 10^4'],
    explain: ['The deepest gap anywhere is one level.', 'At the root the left branch is two levels deep and the right branch is empty.'],
    known: [true, false],
    ref: (root) => {
      const h = (n) => { if (!n) return 0; const l = h(n.left); const r = h(n.right); if (l < 0 || r < 0 || Math.abs(l - r) > 1) return -1; return 1 + Math.max(l, r); };
      return h(toTree(root)) >= 0;
    },
    sol: function isBalanced(root) {
      function height(node) {
        if (!node) return 0;
        const left = height(node.left);
        const right = height(node.right);
        if (left < 0 || right < 0 || Math.abs(left - right) > 1) return -1;
        return 1 + Math.max(left, right);
      }
      return height(root) >= 0;
    },
    tests: [[[4, 2, 6, 1]], [[4, 2, null, 1]], [[]], [[1]], [[1, 2, null, 3]], [[1, 2, 3, 4, 5, 6, 7]], [randomTree(62, 60)], [skewedRight(400)]],
  }),

  problem('same-tree', {
    statement: `
Return \`true\` if the binary trees \`p\` and \`q\` are **exact copies**: the same shape, with equal values in matching positions. Otherwise return \`false\`.

${T}
`,
    params: ['p', 'q'],
    meta: { argTypes: ['tree', 'tree'] },
    constraints: ['Each tree has 0 to 100 nodes', '-10^4 <= Node.val <= 10^4'],
    explain: ['Same shape, same values.', 'Same shape, but 7 and 1 sit on opposite sides.'],
    known: [true, false],
    ref: (p, q) => JSON.stringify(fromTree(toTree(p))) === JSON.stringify(fromTree(toTree(q))),
    sol: function isSameTree(p, q) {
      if (!p && !q) return true;
      if (!p || !q || p.val !== q.val) return false;
      return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
    },
    tests: [[[4, 7, 1], [4, 7, 1]], [[4, 7, 1], [4, 1, 7]], [[3, 5], [3, null, 5]], [[], []], [[], [1]], [[0], [0]], [randomTree(63, 70), randomTree(63, 70)], [randomTree(64, 70), randomTree(65, 70)]],
  }),

  problem('subtree-of-another-tree', {
    statement: `
Pick any node of \`root\` and take it **together with everything below it**. Return \`true\` if some such piece is an exact copy of the tree \`subRoot\` (same shape, same values), otherwise \`false\`.

${T}
`,
    params: ['root', 'subRoot'],
    meta: { argTypes: ['tree', 'tree'] },
    constraints: ['root has 1 to 2000 nodes', 'subRoot has 1 to 1000 nodes', '-10^4 <= Node.val <= 10^4'],
    explain: ['The piece hanging from 5 is exactly 5 -> (2, 6).', 'Below 5 the 2 now has a child 1, so it no longer matches.'],
    known: [true, false],
    ref: (root, sub) => {
      const same = (a, b) => (!a && !b) || (!!a && !!b && a.val === b.val && same(a.left, b.left) && same(a.right, b.right));
      const walk = (n, target) => !!n && (same(n, target) || walk(n.left, target) || walk(n.right, target));
      return walk(toTree(root), toTree(sub));
    },
    sol: function isSubtree(root, subRoot) {
      function same(a, b) {
        if (!a && !b) return true;
        if (!a || !b || a.val !== b.val) return false;
        return same(a.left, b.left) && same(a.right, b.right);
      }
      function walk(node) {
        if (!node) return false;
        return same(node, subRoot) || walk(node.left) || walk(node.right);
      }
      return walk(root);
    },
    tests: [
      [[8, 5, 9, 2, 6], [5, 2, 6]],
      [[8, 5, 9, 2, 6, null, null, 1], [5, 2, 6]],
      [[1], [1]],
      [[1, 1], [1]],
      [[1, 2, 3], [2]],
      [[1, 2, 3], [3, 4]],
      [bigTree, [bigTree[0]]],
      [bigTree, midTree],
    ],
  }),

  problem('lowest-common-ancestor-of-a-bst', {
    statement: `
\`root\` is a **binary search tree** (smaller values to the left, larger to the right) that contains the values \`p\` and \`q\`. Return the value of the **deepest node that has both \`p\` and \`q\` beneath it**, counting a node as being beneath itself.

${T}
`,
    params: ['root', 'p', 'q'],
    meta: { argTypes: ['tree'] },
    constraints: ['2 to 10^5 nodes', '-10^9 <= Node.val <= 10^9', 'Values are distinct', 'p != q, and both are in the tree'],
    explain: ['2 lies left of 10 and 20 lies right of it, so they split at 10.', '8 is beneath 5, and 5 counts as beneath itself.'],
    known: [10, 5],
    ref: (root, p, q) => {
      let n = toTree(root);
      while (n) {
        if (p < n.val && q < n.val) n = n.left;
        else if (p > n.val && q > n.val) n = n.right;
        else return n.val;
      }
      return -1;
    },
    sol: function lowestCommonAncestor(root, p, q) {
      let node = root;
      while (node) {
        if (p < node.val && q < node.val) node = node.left;
        else if (p > node.val && q > node.val) node = node.right;
        else return node.val;
      }
      return -1;
    },
    tests: [
      [[10, 5, 15, 2, 7, 12, 20, null, null, 6, 8], 2, 20],
      [[10, 5, 15, 2, 7, 12, 20, null, null, 6, 8], 5, 8],
      [[4, 3], 4, 3],
      [[10, 5, 15, 2, 7, 12, 20, null, null, 6, 8], 6, 8],
      [[10, 5, 15, 2, 7, 12, 20, null, null, 6, 8], 12, 20],
      [[5, 3, 8, 1, 4, 7, 9], 1, 4],
      [bigBst, bigBst.filter((v) => v !== null)[10], bigBst.filter((v) => v !== null)[900]],
    ],
  }),

  problem('binary-tree-level-order-traversal', {
    statement: `
Group the values of a binary tree **by depth**: one array for the root's level, one for its children, one for its grandchildren, and so on. Within a level, list values from left to right.

${T}
`,
    params: ['root'],
    meta: { argTypes: ['tree'] },
    constraints: ['0 to 2000 nodes', '-1000 <= Node.val <= 1000'],
    explain: ['Depth 0 holds 8, depth 1 holds 4 and 11, depth 2 holds 5 and 9.', 'One node, one level.'],
    known: [[[8], [4, 11], [5, 9]], [[6]]],
    ref: (root) => {
      const out = [];
      let level = toTree(root) ? [toTree(root)] : [];
      while (level.length) {
        out.push(level.map((n) => n.val));
        level = level.flatMap((n) => [n.left, n.right]).filter(Boolean);
      }
      return out;
    },
    sol: function levelOrder(root) {
      const out = [];
      let level = root ? [root] : [];
      while (level.length) {
        out.push(level.map((n) => n.val));
        const next = [];
        for (const n of level) {
          if (n.left) next.push(n.left);
          if (n.right) next.push(n.right);
        }
        level = next;
      }
      return out;
    },
    tests: [[[8, 4, 11, null, 5, 9]], [[6]], [[]], [[1, 2, 3, 4, 5, 6, 7]], [[1, null, 2, null, 3]], [bigTree]],
  }),

  problem('binary-tree-right-side-view', {
    statement: `
For each level of a binary tree, take the **rightmost node on that level**. Return those values from the top level down.

${T}
`,
    params: ['root'],
    meta: { argTypes: ['tree'] },
    constraints: ['0 to 100 nodes', '-100 <= Node.val <= 100'],
    explain: ['The rightmost nodes are 6, then 9, then 2.', 'Each level has a single node, even though they lean left.'],
    known: [[6, 9, 2], [1, 2, 3]],
    ref: (root) => {
      const out = [];
      let level = toTree(root) ? [toTree(root)] : [];
      while (level.length) {
        out.push(level[level.length - 1].val);
        level = level.flatMap((n) => [n.left, n.right]).filter(Boolean);
      }
      return out;
    },
    sol: function rightSideView(root) {
      const out = [];
      let level = root ? [root] : [];
      while (level.length) {
        out.push(level[level.length - 1].val);
        const next = [];
        for (const n of level) {
          if (n.left) next.push(n.left);
          if (n.right) next.push(n.right);
        }
        level = next;
      }
      return out;
    },
    tests: [[[6, 3, 9, 2]], [[1, 2, null, 3]], [[]], [[1]], [[1, 2]], [[1, 2, 3, 4]], [randomTree(66, 90)]],
  }),

  problem('count-good-nodes-in-binary-tree', {
    title: 'Nodes Without a Bigger Ancestor',
    slug: 'nodes-without-a-bigger-ancestor',
    statement: `
Walk down a binary tree from the root. Count the nodes whose value is **at least as large as every value above them** on their path from the root. The root always counts.

${T}
`,
    params: ['root'],
    meta: { argTypes: ['tree'] },
    constraints: ['1 to 10^5 nodes', '-10^4 <= Node.val <= 10^4'],
    explain: ['5, 6, 8 and 9 qualify; 3 sits below 5 and 7 sits below 8.', 'A tie with an ancestor still counts, so both 2s qualify.'],
    known: [4, 2],
    ref: (root) => {
      const walk = (n, max) => (n ? (n.val >= max ? 1 : 0) + walk(n.left, Math.max(max, n.val)) + walk(n.right, Math.max(max, n.val)) : 0);
      const r = toTree(root);
      return walk(r, -Infinity);
    },
    sol: function goodNodes(root) {
      function walk(node, max) {
        if (!node) return 0;
        const good = node.val >= max ? 1 : 0;
        const next = Math.max(max, node.val);
        return good + walk(node.left, next) + walk(node.right, next);
      }
      return walk(root, -Infinity);
    },
    tests: [[[5, 3, 8, 6, null, 7, 9]], [[2, 2, 1]], [[1]], [[9, null, 3, 6]], [[2, null, 4, 10, 8, null, null, 4]], [bigTree]],
  }),

  problem('validate-binary-search-tree', {
    statement: `
Check whether a binary tree is a **binary search tree**: for every node, **everything** in its left branch must be strictly smaller than it and **everything** in its right branch strictly larger. Return \`true\` or \`false\`.

Comparing a node only with its direct children is not enough.

${T}
`,
    params: ['root'],
    meta: { argTypes: ['tree'] },
    constraints: ['1 to 10^4 nodes', '-2^31 <= Node.val <= 2^31 - 1'],
    explain: ['3 < 8 < 10.', '6 is in the right branch of 8 but smaller than 8.'],
    known: [true, false],
    ref: (root) => {
      const ok = (n, lo, hi) => !n || (n.val > lo && n.val < hi && ok(n.left, lo, n.val) && ok(n.right, n.val, hi));
      return ok(toTree(root), -Infinity, Infinity);
    },
    sol: function isValidBST(root) {
      function check(node, low, high) {
        if (!node) return true;
        if (node.val <= low || node.val >= high) return false;
        return check(node.left, low, node.val) && check(node.right, node.val, high);
      }
      return check(root, -Infinity, Infinity);
    },
    tests: [[[8, 3, 10]], [[8, 3, 10, null, null, 6, 12]], [[1]], [[2, 2, 2]], [[10, 5, 15, null, null, 6, 20]], [[0, -1]], [[2147483647]], [bigBst], [bigTree]],
  }),

  problem('kth-smallest-element-in-a-bst', {
    statement: `
\`root\` is a binary search tree. If you listed all its values from smallest to largest, **which value would be in position \`k\`** (counting from 1)?

${T}
`,
    params: ['root', 'k'],
    meta: { argTypes: ['tree'] },
    constraints: ['n nodes, with 1 <= k <= n <= 10^4', '0 <= Node.val <= 10^4'],
    explain: ['Sorted: 2, 4, 6, 8. Position 2 holds 4.', 'Sorted: 3, 4, 5, 7, 9. Position 4 holds 7.'],
    known: [4, 7],
    ref: (root, k) => {
      const out = [];
      const walk = (n) => { if (!n) return; walk(n.left); out.push(n.val); walk(n.right); };
      walk(toTree(root));
      return out[k - 1];
    },
    sol: function kthSmallest(root, k) {
      const stack = [];
      let node = root;
      while (node || stack.length) {
        while (node) { stack.push(node); node = node.left; }
        node = stack.pop();
        if (--k === 0) return node.val;
        node = node.right;
      }
      return -1;
    },
    tests: [[[6, 2, 8, null, 4], 2], [[7, 4, 9, 3, 5], 4], [[1], 1], [[2, 1], 2], [[7, 4, 9, 3, 5], 5], [kBst, 700]],
  }),
];
