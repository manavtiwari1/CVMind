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
Given the root of a binary tree, **invert the tree** (swap the left and right child of every node) and return its root.

${T}
`,
    params: ['root'],
    meta: { argTypes: ['tree'], returnType: 'tree' },
    constraints: ['The number of nodes is in the range [0, 100]', '-100 <= Node.val <= 100'],
    explain: ['Every node swaps its children.', 'The two children of the root swap.', 'An empty tree stays empty.'],
    samples: 3,
    known: [[4, 7, 2, 9, 6, 3, 1], [2, 3, 1], []],
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
    tests: [[[4, 2, 7, 1, 3, 6, 9]], [[2, 1, 3]], [[]], [[1]], [[1, 2]], [[1, null, 2]], [randomTree(61, 80)]],
  }),

  problem('maximum-depth-of-binary-tree', {
    statement: `
Given the root of a binary tree, return its **maximum depth**: the number of nodes along the longest path from the root down to the farthest leaf.

${T}
`,
    params: ['root'],
    meta: { argTypes: ['tree'] },
    constraints: ['The number of nodes is in the range [0, 10^4]', '-100 <= Node.val <= 100'],
    explain: ['The longest path is 3 -> 20 -> 15 (or 7), which has 3 nodes.', 'The longest path is 1 -> 2, which has 2 nodes.'],
    known: [3, 2],
    ref: (root) => { const d = (n) => (n ? 1 + Math.max(d(n.left), d(n.right)) : 0); return d(toTree(root)); },
    sol: function maxDepth(root) {
      if (!root) return 0;
      return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
    },
    tests: [[[3, 9, 20, null, null, 15, 7]], [[1, null, 2]], [[]], [[0]], [[1, 2, 3, 4, 5]], [skewedRight(800)], [bigTree]],
  }),

  problem('diameter-of-binary-tree', {
    statement: `
Given the root of a binary tree, return the length of its **diameter**: the number of **edges** on the longest path between any two nodes. The path may or may not pass through the root.

${T}
`,
    params: ['root'],
    meta: { argTypes: ['tree'] },
    constraints: ['The number of nodes is in the range [1, 10^4]', '-100 <= Node.val <= 100'],
    explain: ['The longest path is 4 -> 2 -> 1 -> 3 (or 5 -> 2 -> 1 -> 3), which has 3 edges.', 'The two nodes are joined by a single edge.'],
    known: [3, 1],
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
    tests: [[[1, 2, 3, 4, 5]], [[1, 2]], [[1]], [[1, 2, null, 3, null, 4]], [[1, 2, 3, 4, null, null, 5, 6, null, null, 7]], [skewedRight(500)], [bigTree]],
  }),

  problem('balanced-binary-tree', {
    statement: `
Given the root of a binary tree, determine whether it is **height-balanced**: for every node, the heights of its left and right subtrees differ by **at most one**.

${T}
`,
    params: ['root'],
    meta: { argTypes: ['tree'] },
    constraints: ['The number of nodes is in the range [0, 5000]', '-10^4 <= Node.val <= 10^4'],
    explain: ['Every node is balanced.', 'At the root, the left subtree is two levels taller than the right subtree, so the tree is not balanced.', 'An empty tree is balanced.'],
    samples: 3,
    known: [true, false, true],
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
    tests: [[[3, 9, 20, null, null, 15, 7]], [[1, 2, 2, 3, 3, null, null, 4, 4]], [[]], [[1]], [[1, 2, null, 3]], [[1, 2, 3, 4, 5, 6, 7]], [randomTree(62, 60)], [skewedRight(400)]],
  }),

  problem('same-tree', {
    statement: `
Given the roots of two binary trees \`p\` and \`q\`, return \`true\` if they are the **same tree**: they have the same structure and every pair of corresponding nodes holds the same value.

${T}
`,
    params: ['p', 'q'],
    meta: { argTypes: ['tree', 'tree'] },
    constraints: ['The number of nodes in both trees is in the range [0, 100]', '-10^4 <= Node.val <= 10^4'],
    explain: ['Both trees are identical.', 'The second tree has its child on the other side, so the structures differ.', 'The values of the two leaves are swapped.'],
    samples: 3,
    known: [true, false, false],
    ref: (p, q) => JSON.stringify(fromTree(toTree(p))) === JSON.stringify(fromTree(toTree(q))),
    sol: function isSameTree(p, q) {
      if (!p && !q) return true;
      if (!p || !q || p.val !== q.val) return false;
      return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
    },
    tests: [[[1, 2, 3], [1, 2, 3]], [[1, 2], [1, null, 2]], [[1, 2, 1], [1, 1, 2]], [[], []], [[], [1]], [[0], [0]], [randomTree(63, 70), randomTree(63, 70)], [randomTree(64, 70), randomTree(65, 70)]],
  }),

  problem('subtree-of-another-tree', {
    statement: `
Given the roots of two binary trees \`root\` and \`subRoot\`, return \`true\` if there is a node in \`root\` whose subtree has **exactly the same structure and node values** as \`subRoot\`, and \`false\` otherwise.

A subtree of a tree is a node together with all of its descendants.

${T}
`,
    params: ['root', 'subRoot'],
    meta: { argTypes: ['tree', 'tree'] },
    constraints: ['The number of nodes in root is in the range [1, 2000]', 'The number of nodes in subRoot is in the range [1, 1000]', '-10^4 <= root.val, subRoot.val <= 10^4'],
    explain: ['The subtree rooted at 4 matches subRoot.', 'The subtree rooted at 4 has an extra node 0, so it does not match.'],
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
      [[3, 4, 5, 1, 2], [4, 1, 2]],
      [[3, 4, 5, 1, 2, null, null, null, null, 0], [4, 1, 2]],
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
Given a **binary search tree** and two values \`p\` and \`q\` that are present in it, return the **value of their lowest common ancestor** (LCA).

The LCA of two nodes is the lowest node that has both of them as descendants, where a node may be a descendant of itself.

${T}
`,
    params: ['root', 'p', 'q'],
    meta: { argTypes: ['tree'] },
    constraints: ['The number of nodes is in the range [2, 10^5]', '-10^9 <= Node.val <= 10^9', 'All Node.val are unique', 'p != q, and both p and q exist in the BST'],
    explain: ['The LCA of 2 and 8 is 6.', 'The LCA of 2 and 4 is 2, because a node can be its own descendant.', 'The LCA of 2 and 1 is 2.'],
    samples: 3,
    known: [6, 2, 2],
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
      [[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 2, 8],
      [[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 2, 4],
      [[2, 1], 2, 1],
      [[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 3, 5],
      [[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 0, 9],
      [[5, 3, 8, 1, 4, 7, 9], 1, 4],
      [bigBst, bigBst.filter((v) => v !== null)[10], bigBst.filter((v) => v !== null)[900]],
    ],
  }),

  problem('binary-tree-level-order-traversal', {
    statement: `
Given the root of a binary tree, return the **level-order traversal** of its nodes' values: from left to right, level by level, as an array of arrays.

${T}
`,
    params: ['root'],
    meta: { argTypes: ['tree'] },
    constraints: ['The number of nodes is in the range [0, 2000]', '-1000 <= Node.val <= 1000'],
    explain: ['Level 0 is [3], level 1 is [9, 20] and level 2 is [15, 7].', 'A single node gives a single level.', 'An empty tree has no levels.'],
    samples: 3,
    known: [[[3], [9, 20], [15, 7]], [[1]], []],
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
    tests: [[[3, 9, 20, null, null, 15, 7]], [[1]], [[]], [[1, 2, 3, 4, 5, 6, 7]], [[1, null, 2, null, 3]], [bigTree]],
  }),

  problem('binary-tree-right-side-view', {
    statement: `
Imagine standing on the **right side** of a binary tree. Return the values of the nodes you can see, ordered from top to bottom.

${T}
`,
    params: ['root'],
    meta: { argTypes: ['tree'] },
    constraints: ['The number of nodes is in the range [0, 100]', '-100 <= Node.val <= 100'],
    explain: ['From the right you see 1, then 3, then 4.', 'You see 1 and 3.'],
    known: [[1, 3, 4], [1, 3]],
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
    tests: [[[1, 2, 3, null, 5, null, 4]], [[1, null, 3]], [[]], [[1]], [[1, 2]], [[1, 2, 3, 4]], [randomTree(66, 90)]],
  }),

  problem('count-good-nodes-in-binary-tree', {
    statement: `
In a binary tree, a node \`X\` is **good** if no node on the path from the root to \`X\` has a value greater than \`X\`'s value.

Given the root of a binary tree, return the number of good nodes.

${T}
`,
    params: ['root'],
    meta: { argTypes: ['tree'] },
    constraints: ['The number of nodes is in the range [1, 10^5]', '-10^4 <= Node.val <= 10^4'],
    explain: ['The good nodes are 3 (the root), 4, 5 and the 3 below the 1.', 'The good nodes are 3 (the root), 3 and 4.', 'The root is always good.'],
    samples: 3,
    known: [4, 3, 1],
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
    tests: [[[3, 1, 4, 3, null, 1, 5]], [[3, 3, null, 4, 2]], [[1]], [[9, null, 3, 6]], [[2, null, 4, 10, 8, null, null, 4]], [bigTree]],
  }),

  problem('validate-binary-search-tree', {
    statement: `
Given the root of a binary tree, determine whether it is a **valid binary search tree** (BST).

In a valid BST, for every node:

- all values in its **left** subtree are **strictly less** than the node's value,
- all values in its **right** subtree are **strictly greater** than the node's value, and
- both subtrees are themselves valid BSTs.

${T}
`,
    params: ['root'],
    meta: { argTypes: ['tree'] },
    constraints: ['The number of nodes is in the range [1, 10^4]', '-2^31 <= Node.val <= 2^31 - 1'],
    explain: ['Every node respects the ordering.', 'The root is 5, but its right child 4 is smaller than 5, so the tree is not a BST.'],
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
    tests: [[[2, 1, 3]], [[5, 1, 4, null, null, 3, 6]], [[1]], [[2, 2, 2]], [[5, 4, 6, null, null, 3, 7]], [[0, -1]], [[2147483647]], [bigBst], [bigTree]],
  }),

  problem('kth-smallest-element-in-a-bst', {
    statement: `
Given the root of a **binary search tree** and an integer \`k\`, return the **\`k\`th smallest value** (1-indexed) among all node values in the tree.

${T}
`,
    params: ['root', 'k'],
    meta: { argTypes: ['tree'] },
    constraints: ['The number of nodes is n, with 1 <= k <= n <= 10^4', '0 <= Node.val <= 10^4'],
    explain: ['The smallest value is 1.', 'The values in order are 1, 2, 3, 4, 5, 6, so the third smallest is 3.'],
    known: [1, 3],
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
    tests: [[[3, 1, 4, null, 2], 1], [[5, 3, 6, 2, 4, null, null, 1], 3], [[1], 1], [[2, 1], 2], [[5, 3, 6, 2, 4, null, null, 1], 6], [kBst, 700]],
  }),
];
