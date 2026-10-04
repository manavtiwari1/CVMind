import { problem, rng, randInt, LIST_NOTE, DESIGN_NOTE } from './_lib.mjs';

const values = (seed, n, lo, hi) => {
  const r = rng(seed);
  return Array.from({ length: n }, () => randInt(r, lo, hi));
};
const sorted = (seed, n, lo, hi) => values(seed, n, lo, hi).sort((a, b) => a - b);

export default [
  problem('reverse-linked-list', {
    statement: `
**Flip the direction of every link** in a singly linked list, so the last node becomes the first, and return the new first node.

${LIST_NOTE}
`,
    params: ['head'],
    meta: { argTypes: ['list'], returnType: 'list' },
    constraints: ['0 to 5000 nodes', '-5000 <= Node.val <= 5000'],
    explain: ['8 -> 3 -> 6 turns into 6 -> 3 -> 8.', 'An empty list has nothing to flip.'],
    known: [[6, 3, 8], []],
    // the reference works on plain arrays; the solution below works on real nodes and is what the judge runs
    ref: function reverseList(head) { return [...head].reverse(); },
    sol: function reverseList(head) {
      let prev = null;
      while (head) {
        const next = head.next;
        head.next = prev;
        prev = head;
        head = next;
      }
      return prev;
    },
    tests: [[[8, 3, 6]], [[]], [[7]], [[4, 9]], [[-1, 0, 1]], [values(31, 3000, -5000, 5000)]],
  }),

  problem('merge-two-sorted-lists', {
    statement: `
\`list1\` and \`list2\` are linked lists whose values never decrease. **Weave their nodes into a single list that also never decreases**, reusing the existing nodes, and return its first node.

${LIST_NOTE}
`,
    params: ['list1', 'list2'],
    meta: { argTypes: ['list', 'list'], returnType: 'list' },
    constraints: ['Each list has 0 to 50 nodes', '-100 <= Node.val <= 100', 'Both lists are in non-decreasing order'],
    explain: ['The nodes interleave as 2 -> 3 -> 5 -> 5 -> 9.', 'With one list empty, the other is the answer.'],
    known: [[2, 3, 5, 5, 9], [7]],
    ref: function mergeTwoLists(list1, list2) { return [...list1, ...list2].sort((a, b) => a - b); },
    sol: function mergeTwoLists(list1, list2) {
      const dummy = { next: null };
      let tail = dummy;
      while (list1 && list2) {
        if (list1.val <= list2.val) { tail.next = list1; list1 = list1.next; }
        else { tail.next = list2; list2 = list2.next; }
        tail = tail.next;
      }
      tail.next = list1 || list2;
      return dummy.next;
    },
    tests: [[[2, 5, 9], [3, 5]], [[], [7]], [[4], [1]], [[], []], [[5], []], [[1, 1, 1], [1, 1]], [[-100, 0, 100], [-50, 50]], [sorted(32, 50, -100, 100), sorted(33, 50, -100, 100)]],
  }),

  problem('reorder-list', {
    statement: `
Rearrange a linked list so it **alternates between the front and the back**: first node, last node, second node, second-to-last node, and so on until the two ends meet. Return the first node.

Move the nodes themselves; do not rewrite their values.

${LIST_NOTE}
`,
    params: ['head'],
    meta: { argTypes: ['list'], returnType: 'list' },
    constraints: ['1 to 5 * 10^4 nodes', '1 <= Node.val <= 1000'],
    explain: ['Front and back alternate: 10, 60, 20, 50, 30, 40.', 'With three nodes the middle one ends up last.'],
    known: [[10, 60, 20, 50, 30, 40], [7, 9, 8]],
    ref: function reorderList(head) {
      const out = [];
      let i = 0;
      let j = head.length - 1;
      while (i <= j) {
        out.push(head[i++]);
        if (i <= j) out.push(head[j--]);
      }
      return out;
    },
    sol: function reorderList(head) {
      if (!head || !head.next) return head;
      let slow = head;
      let fast = head;
      while (fast.next && fast.next.next) { slow = slow.next; fast = fast.next.next; }
      let prev = null;
      let cur = slow.next;
      slow.next = null;
      while (cur) { const next = cur.next; cur.next = prev; prev = cur; cur = next; }
      let a = head;
      let b = prev;
      while (b) {
        const an = a.next;
        const bn = b.next;
        a.next = b;
        b.next = an;
        a = an;
        b = bn;
      }
      return head;
    },
    tests: [[[10, 20, 30, 40, 50, 60]], [[7, 8, 9]], [[1]], [[1, 2]], [[4, 3, 2, 1, 5]], [values(34, 5000, 1, 1000)], [values(35, 4999, 1, 1000)]],
  }),

  problem('remove-nth-node-from-end-of-list', {
    statement: `
Counting backwards from the tail (the tail is number 1), **unlink node number \`n\`** from the list and return the list's first node.

Try to do it in a single pass.

${LIST_NOTE}
`,
    params: ['head', 'n'],
    meta: { argTypes: ['list'], returnType: 'list' },
    constraints: ['The list has sz nodes, 1 <= sz <= 30', '0 <= Node.val <= 100', '1 <= n <= sz'],
    explain: ['Third from the tail is 7.', 'n = 1 removes the tail.'],
    known: [[6, 8, 9], [5]],
    ref: function removeNthFromEnd(head, n) {
      const out = [...head];
      out.splice(out.length - n, 1);
      return out;
    },
    sol: function removeNthFromEnd(head, n) {
      const dummy = { next: head };
      let fast = dummy;
      let slow = dummy;
      for (let i = 0; i < n; i++) fast = fast.next;
      while (fast.next) { fast = fast.next; slow = slow.next; }
      slow.next = slow.next.next;
      return dummy.next;
    },
    tests: [[[6, 7, 8, 9], 3], [[5, 1], 1], [[4], 1], [[1, 2], 2], [[1, 2, 3], 3], [[10, 20, 30, 40], 4], [values(36, 30, 0, 100), 17]],
  }),

  problem('add-two-numbers', {
    title: 'Add Digit Lists',
    slug: 'add-digit-lists',
    statement: `
Big numbers are stored as linked lists of single digits, **ones digit first**: \`3 -> 1 -> 5\` stands for 513. Given two such numbers \`l1\` and \`l2\`, return their **sum** in the same format.

Neither input has extra zeros at its high end (except the number 0, which is a single \`0\` node).

${LIST_NOTE}
`,
    params: ['l1', 'l2'],
    meta: { argTypes: ['list', 'list'], returnType: 'list' },
    constraints: ['Each list has 1 to 100 nodes', '0 <= Node.val <= 9', 'No extra zeros at the high end'],
    explain: ['513 + 28 = 541, stored as 1 -> 4 -> 5.', '99 + 1 = 100: the carry adds a new digit.'],
    known: [[1, 4, 5], [0, 0, 1]],
    ref: function addTwoNumbers(l1, l2) {
      const out = [];
      let carry = 0;
      for (let i = 0; i < Math.max(l1.length, l2.length) || carry; i++) {
        const sum = (l1[i] || 0) + (l2[i] || 0) + carry;
        out.push(sum % 10);
        carry = Math.floor(sum / 10);
      }
      return out;
    },
    sol: function addTwoNumbers(l1, l2) {
      const dummy = { next: null };
      let tail = dummy;
      let carry = 0;
      while (l1 || l2 || carry) {
        const sum = (l1 ? l1.val : 0) + (l2 ? l2.val : 0) + carry;
        tail.next = new ListNode(sum % 10);
        tail = tail.next;
        carry = Math.floor(sum / 10);
        l1 = l1 ? l1.next : null;
        l2 = l2 ? l2.next : null;
      }
      return dummy.next;
    },
    tests: [[[3, 1, 5], [8, 2]], [[9, 9], [1]], [[0], [7]], [[8, 9, 9, 9, 9], [2, 9]], [[1], [9, 9]], [[5], [5]], [values(37, 100, 0, 9).map((d, i, a) => (i === a.length - 1 && d === 0 ? 1 : d)), values(38, 60, 0, 9).map((d, i, a) => (i === a.length - 1 && d === 0 ? 1 : d))]],
  }),

  problem('linked-list-cycle', {
    statement: `
Return \`true\` if following \`next\` pointers from \`head\` **eventually loops back to a node you already visited**, and \`false\` if it reaches the end.

To build the test, the judge takes the values in \`head\` and, if \`pos\` is not \`-1\`, points the last node back at the node in position \`pos\`. Your function sees only the head node, not \`pos\`. Can you do it with O(1) extra memory?

${LIST_NOTE}
`,
    params: ['head'],
    meta: { adapter: 'cyclic-list' },
    constraints: ['0 to 10^4 nodes', '-10^5 <= Node.val <= 10^5', 'pos is -1 or a valid position in the list'],
    explain: ['The last node points back at 15, so walking never ends.', 'The last node points nowhere.'],
    known: [true, false],
    ref: function hasCycle(head, pos) { return head.length > 0 && pos >= 0; },
    sol: function hasCycle(head) {
      let slow = head;
      let fast = head;
      while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow === fast) return true;
      }
      return false;
    },
    tests: [[[4, 8, 15, 16], 2], [[6, 1, 9], -1], [[5], 0], [[], -1], [[1, 2, 3, 4, 5], -1], [[1, 2, 3, 4, 5], 4], [values(39, 8000, -100000, 100000), 4000], [values(40, 8000, -100000, 100000), -1]],
  }),

  problem('find-the-duplicate-number', {
    statement: `
\`nums\` has \`n + 1\` entries, each between \`1\` and \`n\`, so some value must repeat. **Exactly one value repeats** (possibly more than twice). Return it.

For the full challenge, leave \`nums\` unchanged and use only O(1) extra memory.
`,
    params: ['nums'],
    constraints: ['1 <= n <= 10^5', 'nums.length == n + 1', '1 <= nums[i] <= n', 'One value appears two or more times; no other value repeats'],
    explain: ['Six entries, values 1 to 5: the 5 shows up twice.', '4 shows up three times.'],
    known: [5, 4],
    ref: function findDuplicate(nums) {
      const seen = new Set();
      for (const x of nums) {
        if (seen.has(x)) return x;
        seen.add(x);
      }
      return -1;
    },
    tests: [
      [[2, 5, 1, 3, 4, 5]],
      [[4, 2, 1, 4, 3, 4]],
      [[2, 2, 2]],
      [[1, 1]],
      [[1, 1, 2]],
      [[2, 2, 2, 2, 2]],
      (() => { const n = 20000; const a = Array.from({ length: n }, (_, i) => i + 1); a.push(13337); const r = rng(41); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return [a]; })(),
    ],
  }),

  problem('lru-cache', {
    statement: `
Build a fixed-size cache that, when full, **throws out the entry that has gone unused the longest** (an LRU cache).

Implement the \`LRUCache\` class:

- \`LRUCache(capacity)\` makes an empty cache with room for \`capacity\` entries.
- \`get(key)\` returns the stored value for \`key\`, or \`-1\` if it is not cached. Reading a key counts as using it.
- \`put(key, value)\` stores or overwrites \`key\`, which also counts as using it. If this adds a new key to a full cache, first drop the least recently used key.

Make both operations **O(1)** on average.

${DESIGN_NOTE}
`,
    meta: { kind: 'design' },
    design: { className: 'LRUCache', ctor: ['capacity'], methods: [['get', ['key']], ['put', ['key', 'value']]] , cpp: { ctor: ['int'], methods: [{ name: 'get', args: ['int'], names: ['key'], ret: 'int' }, { name: 'put', args: ['int', 'int'], names: ['key', 'value'], ret: 'void' }] } },
    constraints: ['1 <= capacity <= 3000', '0 <= key <= 10^4', '0 <= value <= 10^5', 'At most 2 * 10^5 calls in total'],
    explain: ['Reading 6 leaves 5 as the stalest key, so adding 7 drops 5. Rewriting 6 then makes 7 the stalest, so adding 8 drops 7.'],
    samples: 1,
    known: [[null, null, null, 60, null, -1, 70, null, null, -1, 61]],
    ref: class LRUCache {
      constructor(capacity) { this.capacity = capacity; this.map = new Map(); }
      get(key) {
        if (!this.map.has(key)) return -1;
        const v = this.map.get(key);
        this.map.delete(key);
        this.map.set(key, v);
        return v;
      }
      put(key, value) {
        if (this.map.has(key)) this.map.delete(key);
        else if (this.map.size >= this.capacity) this.map.delete(this.map.keys().next().value);
        this.map.set(key, value);
      }
    },
    tests: [
      [['LRUCache', 'put', 'put', 'get', 'put', 'get', 'get', 'put', 'put', 'get', 'get'], [[2], [5, 50], [6, 60], [6], [7, 70], [5], [7], [6, 61], [8, 80], [7], [6]]],
      [['LRUCache', 'put', 'get', 'put', 'get', 'get'], [[1], [4, 9], [4], [5, 3], [4], [5]]],
      [['LRUCache', 'put', 'put', 'put', 'get', 'get'], [[2], [3, 1], [3, 2], [1, 1], [3], [1]]],
      [['LRUCache', 'put', 'put', 'get', 'put', 'put', 'get'], [[2], [3, 1], [1, 1], [3], [6, 1], [1, 2], [3]]],
      (() => {
        const r = rng(42);
        const ops = ['LRUCache'];
        const args = [[5]];
        for (let i = 0; i < 500; i++) {
          if (r() < 0.55) { ops.push('put'); args.push([randInt(r, 0, 9), randInt(r, 0, 1000)]); }
          else { ops.push('get'); args.push([randInt(r, 0, 9)]); }
        }
        return [ops, args];
      })(),
    ],
  }),

  problem('merge-k-sorted-lists', {
    statement: `
\`lists\` holds \`k\` linked lists, each already in increasing order. **Combine all of their nodes into one list in increasing order** and return its first node.

In the tests each list is written as an array of values; your function receives an array of first nodes, with \`null\` for an empty list.

${LIST_NOTE}
`,
    params: ['lists'],
    meta: { argTypes: ['lists'], returnType: 'list' },
    constraints: ['k == lists.length', '0 <= k <= 10^4', '0 <= lists[i].length <= 500', '-10^4 <= lists[i][j] <= 10^4', 'Each list is in increasing order', 'At most 10^4 nodes in total'],
    explain: ['All six values end up in one sorted chain.', 'An empty list contributes nothing.'],
    known: [[1, 3, 4, 8, 9, 10], [2, 2]],
    ref: function mergeKLists(lists) { return lists.flat().sort((a, b) => a - b); },
    sol: function mergeKLists(lists) {
      const nodes = [];
      for (let node of lists) {
        while (node) { nodes.push(node); node = node.next; }
      }
      nodes.sort((a, b) => a.val - b.val);
      for (let i = 0; i < nodes.length; i++) nodes[i].next = nodes[i + 1] || null;
      return nodes.length ? nodes[0] : null;
    },
    tests: [
      [[[3, 8], [1, 9, 10], [4]]],
      [[[], [2, 2]]],
      [[]],
      [[[]]],
      [[[1], [0]]],
      [[[-2, -1], [], [5]]],
      [[[2], [2], [2]]],
      [Array.from({ length: 40 }, (_, i) => sorted(50 + i, 100, -10000, 10000))],
    ],
  }),
];
