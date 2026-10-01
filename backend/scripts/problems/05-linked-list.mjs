import { problem, rng, randInt, LIST_NOTE, DESIGN_NOTE } from './_lib.mjs';

const values = (seed, n, lo, hi) => {
  const r = rng(seed);
  return Array.from({ length: n }, () => randInt(r, lo, hi));
};
const sorted = (seed, n, lo, hi) => values(seed, n, lo, hi).sort((a, b) => a - b);

export default [
  problem('reverse-linked-list', {
    statement: `
Given the head of a singly linked list, **reverse the list** and return the new head.

${LIST_NOTE}
`,
    params: ['head'],
    meta: { argTypes: ['list'], returnType: 'list' },
    constraints: ['The number of nodes is in the range [0, 5000]', '-5000 <= Node.val <= 5000'],
    explain: ['The list 1 -> 2 -> 3 -> 4 -> 5 becomes 5 -> 4 -> 3 -> 2 -> 1.', 'Two nodes swap places.', 'An empty list stays empty.'],
    samples: 3,
    known: [[5, 4, 3, 2, 1], [2, 1], []],
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
    tests: [[[1, 2, 3, 4, 5]], [[1, 2]], [[]], [[7]], [[-1, 0, 1]], [values(31, 3000, -5000, 5000)]],
  }),

  problem('merge-two-sorted-lists', {
    statement: `
You are given the heads of two **sorted** linked lists, \`list1\` and \`list2\`. Merge them into one sorted list by splicing together the nodes of the two lists, and return the head of the merged list.

${LIST_NOTE}
`,
    params: ['list1', 'list2'],
    meta: { argTypes: ['list', 'list'], returnType: 'list' },
    constraints: ['The number of nodes in each list is in the range [0, 50]', '-100 <= Node.val <= 100', 'Both lists are sorted in non-decreasing order'],
    explain: ['Merging the two lists gives 1 -> 1 -> 2 -> 3 -> 4 -> 4.', 'Both lists are empty.', 'One list is empty, so the result is the other one.'],
    samples: 3,
    known: [[1, 1, 2, 3, 4, 4], [], [0]],
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
    tests: [[[1, 2, 4], [1, 3, 4]], [[], []], [[], [0]], [[5], []], [[1, 1, 1], [1, 1]], [[-100, 0, 100], [-50, 50]], [sorted(32, 50, -100, 100), sorted(33, 50, -100, 100)]],
  }),

  problem('reorder-list', {
    statement: `
You are given the head of a singly linked list \`L0 -> L1 -> ... -> Ln-1 -> Ln\`. **Reorder** it into the form

\`L0 -> Ln -> L1 -> Ln-1 -> L2 -> Ln-2 -> ...\`

You may not change the values in the nodes; only the nodes themselves may be rearranged. Return the head of the reordered list.

${LIST_NOTE}
`,
    params: ['head'],
    meta: { argTypes: ['list'], returnType: 'list' },
    constraints: ['The number of nodes is in the range [1, 5 * 10^4]', '1 <= Node.val <= 1000'],
    explain: ['The last node goes after the first, the second to last after the second.', 'The middle node stays in the middle.'],
    known: [[1, 4, 2, 3], [1, 5, 2, 4, 3]],
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
    tests: [[[1, 2, 3, 4]], [[1, 2, 3, 4, 5]], [[1]], [[1, 2]], [[1, 2, 3]], [values(34, 5000, 1, 1000)], [values(35, 4999, 1, 1000)]],
  }),

  problem('remove-nth-node-from-end-of-list', {
    statement: `
Given the head of a linked list and an integer \`n\`, **remove the \`n\`th node from the end** of the list and return the head.

${LIST_NOTE}
`,
    params: ['head', 'n'],
    meta: { argTypes: ['list'], returnType: 'list' },
    constraints: ['The number of nodes is sz, with 1 <= sz <= 30', '0 <= Node.val <= 100', '1 <= n <= sz'],
    explain: ['The second node from the end is 4, so it is removed.', 'The only node is removed and the list becomes empty.', 'The last node is removed.'],
    samples: 3,
    known: [[1, 2, 3, 5], [], [1]],
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
    tests: [[[1, 2, 3, 4, 5], 2], [[1], 1], [[1, 2], 1], [[1, 2], 2], [[1, 2, 3], 3], [[10, 20, 30, 40], 4], [values(36, 30, 0, 100), 17]],
  }),

  problem('add-two-numbers', {
    statement: `
You are given two non-empty linked lists representing two non-negative integers. The digits are stored in **reverse order**, so the head holds the ones digit, and each node holds a single digit.

Add the two numbers and return the sum as a linked list in the same format. The numbers have no leading zeros, except for the number 0 itself.

${LIST_NOTE}
`,
    params: ['l1', 'l2'],
    meta: { argTypes: ['list', 'list'], returnType: 'list' },
    constraints: ['The number of nodes in each list is in the range [1, 100]', '0 <= Node.val <= 9', 'The lists represent numbers without leading zeros'],
    explain: ['342 + 465 = 807.', '0 + 0 = 0.', '9999999 + 9999 = 10009998.'],
    samples: 3,
    known: [[7, 0, 8], [0], [8, 9, 9, 9, 0, 0, 0, 1]],
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
    tests: [[[2, 4, 3], [5, 6, 4]], [[0], [0]], [[9, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9]], [[1], [9, 9]], [[5], [5]], [values(37, 100, 0, 9).map((d, i, a) => (i === a.length - 1 && d === 0 ? 1 : d)), values(38, 60, 0, 9).map((d, i, a) => (i === a.length - 1 && d === 0 ? 1 : d))]],
  }),

  problem('linked-list-cycle', {
    statement: `
Given \`head\`, the head of a linked list, determine whether the list has a **cycle**: a node that can be reached again by following \`next\` pointers.

The judge builds the list from the \`head\` array and connects the tail to the node at index \`pos\`, or leaves it unconnected when \`pos\` is \`-1\`. Your function only receives the head node and must not depend on \`pos\`. Return \`true\` if there is a cycle, otherwise \`false\`.

${LIST_NOTE}
`,
    params: ['head'],
    meta: { adapter: 'cyclic-list' },
    constraints: ['The number of nodes is in the range [0, 10^4]', '-10^5 <= Node.val <= 10^5', 'pos is -1 or a valid index of the list'],
    explain: ['The tail connects back to the node at index 1.', 'The tail connects back to the node at index 0.', 'There is a single node and it points to nothing.'],
    samples: 3,
    known: [true, true, false],
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
    tests: [[[3, 2, 0, -4], 1], [[1, 2], 0], [[1], -1], [[], -1], [[1, 2, 3, 4, 5], -1], [[1, 2, 3, 4, 5], 4], [values(39, 8000, -100000, 100000), 4000], [values(40, 8000, -100000, 100000), -1]],
  }),

  problem('find-the-duplicate-number', {
    statement: `
You are given an array \`nums\` of \`n + 1\` integers where every integer is in the range \`[1, n]\`. There is **exactly one repeated number**, although it may appear more than twice.

Return the repeated number. Try to solve it **without modifying \`nums\`** and using only constant extra space.
`,
    params: ['nums'],
    constraints: ['1 <= n <= 10^5', 'nums.length == n + 1', '1 <= nums[i] <= n', 'Exactly one integer appears two or more times; every other integer appears once'],
    explain: ['2 appears twice.', '3 appears twice.', '3 fills the whole array.'],
    samples: 3,
    known: [2, 3, 3],
    ref: function findDuplicate(nums) {
      const seen = new Set();
      for (const x of nums) {
        if (seen.has(x)) return x;
        seen.add(x);
      }
      return -1;
    },
    tests: [
      [[1, 3, 4, 2, 2]],
      [[3, 1, 3, 4, 2]],
      [[3, 3, 3, 3, 3]],
      [[1, 1]],
      [[1, 1, 2]],
      [[2, 2, 2, 2, 2]],
      (() => { const n = 20000; const a = Array.from({ length: n }, (_, i) => i + 1); a.push(13337); const r = rng(41); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return [a]; })(),
    ],
  }),

  problem('lru-cache', {
    statement: `
Design a data structure that follows the rules of a **Least Recently Used (LRU) cache**.

Implement the \`LRUCache\` class:

- \`LRUCache(capacity)\` creates a cache that holds at most \`capacity\` entries.
- \`get(key)\` returns the value of \`key\` if it is in the cache, otherwise \`-1\`. A successful \`get\` makes the key the most recently used one.
- \`put(key, value)\` inserts or updates the value. If the cache is already full, it first evicts the **least recently used** key. An update also makes the key the most recently used one.

Both \`get\` and \`put\` must run in **O(1)** average time.

${DESIGN_NOTE}
`,
    meta: { kind: 'design' },
    design: { className: 'LRUCache', ctor: ['capacity'], methods: [['get', ['key']], ['put', ['key', 'value']]] , cpp: { ctor: ['int'], methods: [{ name: 'get', args: ['int'], names: ['key'], ret: 'int' }, { name: 'put', args: ['int', 'int'], names: ['key', 'value'], ret: 'void' }] } },
    constraints: ['1 <= capacity <= 3000', '0 <= key <= 10^4', '0 <= value <= 10^5', 'At most 2 * 10^5 calls are made'],
    explain: ['After put(1), put(2) and get(1), key 2 is least recently used. Adding key 3 evicts 2, so get(2) is -1. Adding key 4 then evicts 1.'],
    samples: 1,
    known: [[null, null, null, 1, null, -1, null, -1, 3, 4]],
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
      [['LRUCache', 'put', 'put', 'get', 'put', 'get', 'put', 'get', 'get', 'get'], [[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]],
      [['LRUCache', 'put', 'get', 'put', 'get', 'get'], [[1], [2, 1], [2], [3, 2], [2], [3]]],
      [['LRUCache', 'put', 'put', 'put', 'get', 'get'], [[2], [2, 1], [2, 2], [1, 1], [2], [1]]],
      [['LRUCache', 'put', 'put', 'get', 'put', 'put', 'get'], [[2], [2, 1], [1, 1], [2], [4, 1], [1, 2], [2]]],
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
You are given an array of \`k\` linked lists \`lists\`, each sorted in ascending order. **Merge all the lists into one sorted linked list** and return its head.

Every list in \`lists\` is given as an array of node values; your function receives an array of head nodes (an empty list is \`null\`).

${LIST_NOTE}
`,
    params: ['lists'],
    meta: { argTypes: ['lists'], returnType: 'list' },
    constraints: ['k == lists.length', '0 <= k <= 10^4', '0 <= lists[i].length <= 500', '-10^4 <= lists[i][j] <= 10^4', 'Each lists[i] is sorted in ascending order', 'The total number of nodes does not exceed 10^4'],
    explain: ['Merging the three lists gives 1 -> 1 -> 2 -> 3 -> 4 -> 4 -> 5 -> 6.', 'There are no lists.', 'The only list is empty.'],
    samples: 3,
    known: [[1, 1, 2, 3, 4, 4, 5, 6], [], []],
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
      [[[1, 4, 5], [1, 3, 4], [2, 6]]],
      [[]],
      [[[]]],
      [[[1], [0]]],
      [[[-2, -1], [], [5]]],
      [[[2], [2], [2]]],
      [Array.from({ length: 40 }, (_, i) => sorted(50 + i, 100, -10000, 10000))],
    ],
  }),
];
