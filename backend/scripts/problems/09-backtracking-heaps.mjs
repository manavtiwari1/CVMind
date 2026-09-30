import { problem, rng, randInt, DESIGN_NOTE } from './_lib.mjs';

const ints = (seed, n, lo, hi) => {
  const r = rng(seed);
  return Array.from({ length: n }, () => randInt(r, lo, hi));
};

export default [
  problem('subsets', {
    statement: `
Given an integer array \`nums\` of **unique** elements, return **all possible subsets** (the power set).

The solution must not contain duplicate subsets. You may return the subsets and the numbers inside each subset in any order.
`,
    params: ['nums'],
    meta: { compare: 'unordered-deep' },
    constraints: ['1 <= nums.length <= 10', '-10 <= nums[i] <= 10', 'All the numbers of nums are unique'],
    explain: ['There are 2^3 = 8 subsets, from the empty one to the whole array.', 'The empty subset and the subset with the single element.'],
    known: [[[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]], [[], [0]]],
    ref: function subsets(nums) {
      const out = [[]];
      for (const n of nums) for (const s of [...out]) out.push([...s, n]);
      return out;
    },
    tests: [[[1, 2, 3]], [[0]], [[5, -5]], [[1, 2, 3, 4]], [[-3, 7, 2, 9, 0]], [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]]],
  }),

  problem('combination-sum', {
    statement: `
Given an array of **distinct** integers \`candidates\` and a target integer \`target\`, return **every unique combination** of candidates that sums to \`target\`. You may return the combinations in any order.

The same number may be used **an unlimited number of times**. Two combinations are different if the frequency of at least one chosen number differs.
`,
    params: ['candidates', 'target'],
    meta: { compare: 'unordered-deep' },
    constraints: ['1 <= candidates.length <= 30', '2 <= candidates[i] <= 40', 'All the elements of candidates are distinct', '1 <= target <= 40'],
    explain: ['2 + 2 + 3 = 7 and 7 = 7 are the only combinations.', 'Three combinations reach 8.', 'No combination of 2s makes 1.'],
    samples: 3,
    known: [[[2, 2, 3], [7]], [[2, 2, 2, 2], [2, 3, 3], [3, 5]], []],
    ref: function combinationSum(candidates, target) {
      const nums = [...candidates].sort((a, b) => a - b);
      const out = [];
      const walk = (start, left, path) => {
        if (left === 0) { out.push([...path]); return; }
        for (let i = start; i < nums.length && nums[i] <= left; i++) {
          path.push(nums[i]);
          walk(i, left - nums[i], path);
          path.pop();
        }
      };
      walk(0, target, []);
      return out;
    },
    tests: [[[2, 3, 6, 7], 7], [[2, 3, 5], 8], [[2], 1], [[7, 3, 2], 18], [[3, 5, 8], 11], [[2, 4, 6, 8], 40], [[5, 10, 15], 5], [[2, 3, 4, 5, 6, 7], 30]],
  }),

  problem('permutations', {
    statement: `
Given an array \`nums\` of **distinct** integers, return **all the possible permutations**. You may return the answer in any order.
`,
    params: ['nums'],
    meta: { compare: 'unordered' },
    constraints: ['1 <= nums.length <= 6', '-10 <= nums[i] <= 10', 'All the integers of nums are unique'],
    explain: ['Six arrangements of three numbers.', 'Two arrangements.', 'One number has one arrangement.'],
    samples: 3,
    known: [[[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]], [[0, 1], [1, 0]], [[1]]],
    ref: function permute(nums) {
      const out = [];
      const used = new Array(nums.length).fill(false);
      const path = [];
      const walk = () => {
        if (path.length === nums.length) { out.push([...path]); return; }
        for (let i = 0; i < nums.length; i++) {
          if (used[i]) continue;
          used[i] = true;
          path.push(nums[i]);
          walk();
          path.pop();
          used[i] = false;
        }
      };
      walk();
      return out;
    },
    tests: [[[1, 2, 3]], [[0, 1]], [[1]], [[-1, 4, 2, 9]], [[1, 2, 3, 4, 5]], [[3, 1, 4, 1 + 4, 9, 2]]],
  }),

  problem('subsets-ii', {
    statement: `
Given an integer array \`nums\` that **may contain duplicates**, return **all possible subsets** (the power set).

The solution must not contain duplicate subsets. You may return the subsets and the numbers inside each subset in any order.
`,
    params: ['nums'],
    meta: { compare: 'unordered-deep' },
    constraints: ['1 <= nums.length <= 10', '-10 <= nums[i] <= 10'],
    explain: ['Only six distinct subsets exist, because the two 2s are interchangeable.', 'The empty subset and the subset with the single element.'],
    known: [[[], [1], [1, 2], [1, 2, 2], [2], [2, 2]], [[], [0]]],
    ref: function subsetsWithDup(nums) {
      const sorted = [...nums].sort((a, b) => a - b);
      const out = [];
      const walk = (start, path) => {
        out.push([...path]);
        for (let i = start; i < sorted.length; i++) {
          if (i > start && sorted[i] === sorted[i - 1]) continue;
          path.push(sorted[i]);
          walk(i + 1, path);
          path.pop();
        }
      };
      walk(0, []);
      return out;
    },
    tests: [[[1, 2, 2]], [[0]], [[4, 4, 4, 1, 4]], [[1, 1, 2, 2, 3, 3]], [[-1, 1, -1, 2]], [[2, 2, 2, 2, 2, 2, 2, 2, 2, 2]]],
  }),

  problem('combination-sum-ii', {
    statement: `
Given a collection of candidate numbers \`candidates\` (which may contain duplicates) and a \`target\`, return **every unique combination** that sums to \`target\`.

Each number in \`candidates\` may be used **at most once**. The answer must not contain duplicate combinations, and you may return them in any order.
`,
    params: ['candidates', 'target'],
    meta: { compare: 'unordered-deep' },
    constraints: ['1 <= candidates.length <= 100', '1 <= candidates[i] <= 50', '1 <= target <= 30'],
    explain: ['Four unique combinations reach 8.', 'The two combinations that reach 5.'],
    known: [[[1, 1, 6], [1, 2, 5], [1, 7], [2, 6]], [[1, 2, 2], [5]]],
    ref: function combinationSum2(candidates, target) {
      const nums = [...candidates].sort((a, b) => a - b);
      const out = [];
      const walk = (start, left, path) => {
        if (left === 0) { out.push([...path]); return; }
        for (let i = start; i < nums.length && nums[i] <= left; i++) {
          if (i > start && nums[i] === nums[i - 1]) continue;
          path.push(nums[i]);
          walk(i + 1, left - nums[i], path);
          path.pop();
        }
      };
      walk(0, target, []);
      return out;
    },
    tests: [[[10, 1, 2, 7, 6, 1, 5], 8], [[2, 5, 2, 1, 2], 5], [[1], 1], [[2], 1], [[1, 1, 1, 1, 1, 1], 3], [[3, 1, 3, 5, 1, 1], 8], [ints(201, 24, 1, 12), 20]],
  }),

  problem('word-search', {
    statement: `
Given an \`m x n\` grid of characters \`board\` and a string \`word\`, return \`true\` if \`word\` exists in the grid.

The word is built from letters of **sequentially adjacent** cells (horizontally or vertically neighbouring). The same cell may **not be used more than once** in a word.
`,
    params: ['board', 'word'],
    constraints: ['m == board.length, n == board[i].length', '1 <= m, n <= 6', '1 <= word.length <= 15', 'board and word consist of only lowercase and uppercase English letters'],
    explain: ['The path A-B-C-C-E-D exists.', 'The path S-E-E exists.', 'The second B would need a cell that is already used.'],
    samples: 3,
    known: [true, true, false],
    ref: function exist(board, word) {
      const rows = board.length;
      const cols = board[0].length;
      const used = board.map((row) => row.map(() => false));
      const walk = (r, c, i) => {
        if (i === word.length) return true;
        if (r < 0 || c < 0 || r >= rows || c >= cols || used[r][c] || board[r][c] !== word[i]) return false;
        used[r][c] = true;
        const found = walk(r + 1, c, i + 1) || walk(r - 1, c, i + 1) || walk(r, c + 1, i + 1) || walk(r, c - 1, i + 1);
        used[r][c] = false;
        return found;
      };
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (walk(r, c, 0)) return true;
      return false;
    },
    tests: [
      [[['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], 'ABCCED'],
      [[['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], 'SEE'],
      [[['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], 'ABCB'],
      [[['A']], 'A'],
      [[['A']], 'B'],
      [[['a', 'a']], 'aaa'],
      [[['C', 'A', 'A'], ['A', 'A', 'A'], ['B', 'C', 'D']], 'AAB'],
      [[['a', 'a', 'a', 'a'], ['a', 'a', 'a', 'a'], ['a', 'a', 'a', 'a']], 'aaaaaaaaaaaab'],
    ],
  }),

  problem('n-queens', {
    statement: `
The **n-queens puzzle** asks you to place \`n\` chess queens on an \`n x n\` board so that **no two queens attack each other**: no two share a row, a column or a diagonal.

Given \`n\`, return **every distinct solution**. Each solution is a board written as an array of \`n\` strings, where \`"Q"\` is a queen and \`"."\` is an empty square. You may return the solutions in any order.
`,
    params: ['n'],
    meta: { compare: 'unordered' },
    constraints: ['1 <= n <= 8'],
    explain: ['There are two distinct solutions for a 4 x 4 board.', 'A single queen on a 1 x 1 board.'],
    known: [[['.Q..', '...Q', 'Q...', '..Q.'], ['..Q.', 'Q...', '...Q', '.Q..']], [['Q']]],
    ref: function solveNQueens(n) {
      const out = [];
      const cols = new Set();
      const d1 = new Set();
      const d2 = new Set();
      const placed = [];
      const walk = (r) => {
        if (r === n) { out.push(placed.map((c) => '.'.repeat(c) + 'Q' + '.'.repeat(n - c - 1))); return; }
        for (let c = 0; c < n; c++) {
          if (cols.has(c) || d1.has(r - c) || d2.has(r + c)) continue;
          cols.add(c); d1.add(r - c); d2.add(r + c); placed.push(c);
          walk(r + 1);
          cols.delete(c); d1.delete(r - c); d2.delete(r + c); placed.pop();
        }
      };
      walk(0);
      return out;
    },
    tests: [[4], [1], [2], [3], [5], [6], [8]],
  }),

  problem('kth-largest-element-in-a-stream', {
    statement: `
Design a class that finds the **\`k\`th largest element in a stream** of numbers. It is the \`k\`th largest in sorted order, not the \`k\`th distinct element.

Implement the \`KthLargest\` class:

- \`KthLargest(k, nums)\` creates the object with the integer \`k\` and the initial stream \`nums\`.
- \`add(val)\` adds \`val\` to the stream and returns the current \`k\`th largest element.

${DESIGN_NOTE}
`,
    meta: { kind: 'design' },
    design: { className: 'KthLargest', ctor: ['k', 'nums'], methods: [['add', ['val']]] , cpp: { ctor: ['int', 'vector<int>'], methods: [{ name: 'add', args: ['int'], names: ['val'], ret: 'int' }] } },
    constraints: ['1 <= k <= 10^4', '0 <= nums.length <= 10^4', '-10^4 <= nums[i], val <= 10^4', 'At most 10^4 calls are made to add', 'There are at least k elements when add is called'],
    explain: ['With k = 3, the stream 4, 5, 8, 2 and then adds 3, 5, 10, 9, 4 give the third largest after each add: 4, 5, 5, 8, 8.'],
    samples: 1,
    known: [[null, 4, 5, 5, 8, 8]],
    ref: class KthLargest {
      constructor(k, nums) {
        this.k = k;
        this.top = [];
        for (const n of nums) this.add(n);
      }
      add(val) {
        let lo = 0;
        let hi = this.top.length;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (this.top[mid] < val) lo = mid + 1; else hi = mid; }
        this.top.splice(lo, 0, val);
        if (this.top.length > this.k) this.top.shift();
        return this.top[0];
      }
    },
    tests: [
      [['KthLargest', 'add', 'add', 'add', 'add', 'add'], [[3, [4, 5, 8, 2]], [3], [5], [10], [9], [4]]],
      [['KthLargest', 'add', 'add', 'add', 'add', 'add'], [[1, []], [-3], [-2], [-4], [0], [4]]],
      [['KthLargest', 'add', 'add', 'add'], [[2, [0]], [-1], [1], [-2]]],
      (() => {
        const r = rng(202);
        const ops = ['KthLargest'];
        const args = [[7, ints(203, 10, -100, 100)]];
        for (let i = 0; i < 300; i++) { ops.push('add'); args.push([randInt(r, -100, 100)]); }
        return [ops, args];
      })(),
    ],
  }),

  problem('last-stone-weight', {
    statement: `
You are given an array \`stones\` where \`stones[i]\` is the weight of the \`i\`th stone.

Each turn, take the **two heaviest stones** and smash them together. If their weights are \`x <= y\`:

- if \`x == y\`, both stones are destroyed;
- otherwise the stone of weight \`x\` is destroyed and the stone of weight \`y\` becomes \`y - x\`.

Return the weight of the last remaining stone, or \`0\` if no stones are left.
`,
    params: ['stones'],
    constraints: ['1 <= stones.length <= 30', '1 <= stones[i] <= 1000'],
    explain: ['Smashing 8 and 7 leaves 1, then the stones become [2,4,1,1,1], and so on until a single stone of weight 1 remains.', 'A single stone stays as it is.'],
    known: [1, 1],
    ref: function lastStoneWeight(stones) {
      const pile = [...stones].sort((a, b) => a - b);
      while (pile.length > 1) {
        const y = pile.pop();
        const x = pile.pop();
        if (y !== x) {
          const d = y - x;
          let i = pile.length;
          while (i > 0 && pile[i - 1] > d) i--;
          pile.splice(i, 0, d);
        }
      }
      return pile.length ? pile[0] : 0;
    },
    tests: [[[2, 7, 4, 1, 8, 1]], [[1]], [[2, 2]], [[3, 7, 2]], [[1, 1, 1, 1]], [ints(204, 30, 1, 1000)]],
  }),

  problem('k-closest-points-to-origin', {
    statement: `
Given an array \`points\` where \`points[i] = [x, y]\` is a point on the plane, and an integer \`k\`, return the **\`k\` closest points to the origin** \`(0, 0)\`.

Distance is the usual Euclidean distance. You may return the points in any order. The answer is guaranteed to be unique, apart from its order.
`,
    params: ['points', 'k'],
    meta: { compare: 'unordered' },
    constraints: ['1 <= k <= points.length <= 10^4', '-10^4 <= x, y <= 10^4', 'The k closest points are uniquely defined'],
    explain: ['The distance of [1,3] is sqrt(10) and of [-2,2] is sqrt(8), so [-2,2] is closer.', 'The two closest points are [3,3] and [-2,4].'],
    known: [[[-2, 2]], [[3, 3], [-2, 4]]],
    ref: function kClosest(points, k) {
      return [...points].sort((a, b) => a[0] * a[0] + a[1] * a[1] - (b[0] * b[0] + b[1] * b[1])).slice(0, k);
    },
    tests: [
      [[[1, 3], [-2, 2]], 1],
      [[[3, 3], [5, -1], [-2, 4]], 2],
      [[[0, 1], [1, 0]], 2],
      [[[1, 1]], 1],
      [[[2, 2], [2, 2], [3, 3]], 2],
      [(() => { const r = rng(205); const seen = new Set(); const pts = []; while (pts.length < 3000) { const p = [randInt(r, -10000, 10000), randInt(r, -10000, 10000)]; const d = p[0] * p[0] + p[1] * p[1]; if (seen.has(d)) continue; seen.add(d); pts.push(p); } return [pts, 25]; })()][0],
    ],
  }),

  problem('kth-largest-element-in-an-array', {
    statement: `
Given an integer array \`nums\` and an integer \`k\`, return the **\`k\`th largest element** in the array.

It is the \`k\`th largest in sorted order, not the \`k\`th distinct element. Can you solve it without sorting the whole array?
`,
    params: ['nums', 'k'],
    constraints: ['1 <= k <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4'],
    explain: ['The sorted array is [1,2,3,4,5,6]; the second largest is 5.', 'The sorted array is [1,2,2,3,3,4,5,5,6]; the fourth largest is 4.'],
    known: [5, 4],
    ref: function findKthLargest(nums, k) {
      return [...nums].sort((a, b) => b - a)[k - 1];
    },
    tests: [[[3, 2, 1, 5, 6, 4], 2], [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], [[1], 1], [[2, 1], 2], [[-1, -1], 2], [[7, 6, 5, 4, 3, 2, 1], 5], [[ints(206, 8000, -10000, 10000), 4000][0], 4000]],
  }),

  problem('task-scheduler', {
    statement: `
You are given an array \`tasks\` of capital letters, where each letter is a type of task, and a non-negative integer \`n\`. Every task takes **one unit of time**, and each unit you either run a task or stay idle.

Two tasks of the **same type** must be separated by at least \`n\` units of time. Tasks can be run in any order.

Return the **minimum number of time units** needed to finish all the tasks.
`,
    params: ['tasks', 'n'],
    constraints: ['1 <= tasks.length <= 10^4', 'tasks[i] is an uppercase English letter', '0 <= n <= 100'],
    explain: ['One possible schedule is A B idle A B idle A B, which takes 8 units.', 'A C A B D B takes 6 units with one unit between equal tasks.', 'A B idle idle A B idle idle A B takes 10 units.'],
    samples: 3,
    known: [8, 6, 10],
    ref: function leastInterval(tasks, n) {
      const count = new Array(26).fill(0);
      for (const t of tasks) count[t.charCodeAt(0) - 65]++;
      const max = Math.max(...count);
      const withMax = count.filter((c) => c === max).length;
      return Math.max(tasks.length, (max - 1) * (n + 1) + withMax);
    },
    tests: [[['A', 'A', 'A', 'B', 'B', 'B'], 2], [['A', 'C', 'A', 'B', 'D', 'B'], 1], [['A', 'A', 'A', 'B', 'B', 'B'], 3], [['A'], 5], [['A', 'A', 'A', 'A', 'A', 'A', 'B', 'C', 'D', 'E', 'F', 'G'], 2], [['A', 'B', 'C'], 0], [['A', 'A', 'B', 'B', 'C', 'C'], 100]],
  }),

  problem('find-median-from-data-stream', {
    statement: `
The **median** is the middle value of an ordered list of numbers. If the list has an even length, it is the average of the two middle values.

Design a data structure that supports a stream of numbers. Implement the \`MedianFinder\` class:

- \`MedianFinder()\` creates the object.
- \`addNum(num)\` adds an integer to the data structure.
- \`findMedian()\` returns the median of all the numbers added so far. Answers within \`10^-5\` of the real value are accepted.

${DESIGN_NOTE}
`,
    meta: { kind: 'design' },
    design: { className: 'MedianFinder', ctor: [], methods: [['addNum', ['num']], ['findMedian', []]] , cpp: { ctor: [], methods: [{ name: 'addNum', args: ['int'], names: ['num'], ret: 'void' }, { name: 'findMedian', args: [], ret: 'double' }] } },
    constraints: ['-10^5 <= num <= 10^5', 'findMedian is only called after at least one element has been added', 'At most 5 * 10^4 calls are made'],
    explain: ['After adding 1 and 2 the median is 1.5. After adding 3 the median is 2.'],
    samples: 1,
    known: [[null, null, null, 1.5, null, 2]],
    ref: class MedianFinder {
      constructor() { this.values = []; }
      addNum(num) {
        let lo = 0;
        let hi = this.values.length;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (this.values[mid] < num) lo = mid + 1; else hi = mid; }
        this.values.splice(lo, 0, num);
      }
      findMedian() {
        const n = this.values.length;
        const mid = n >> 1;
        return n % 2 ? this.values[mid] : (this.values[mid - 1] + this.values[mid]) / 2;
      }
    },
    tests: [
      [['MedianFinder', 'addNum', 'addNum', 'findMedian', 'addNum', 'findMedian'], [[], [1], [2], [], [3], []]],
      [['MedianFinder', 'addNum', 'findMedian'], [[], [-5], []]],
      [['MedianFinder', 'addNum', 'addNum', 'addNum', 'addNum', 'findMedian'], [[], [5], [5], [5], [5], []]],
      (() => {
        const r = rng(207);
        const ops = ['MedianFinder'];
        const args = [[]];
        let added = 0;
        for (let i = 0; i < 400; i++) {
          if (added === 0 || r() < 0.6) { ops.push('addNum'); args.push([randInt(r, -100000, 100000)]); added++; }
          else { ops.push('findMedian'); args.push([]); }
        }
        return [ops, args];
      })(),
    ],
  }),
];
