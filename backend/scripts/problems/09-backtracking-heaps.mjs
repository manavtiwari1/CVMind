import { problem, rng, randInt, DESIGN_NOTE } from './_lib.mjs';

const ints = (seed, n, lo, hi) => {
  const r = rng(seed);
  return Array.from({ length: n }, () => randInt(r, lo, hi));
};

export default [
  problem('subsets', {
    statement: `
The values in \`nums\` are all different. List **every possible selection** of them, from picking nothing to picking everything.

Each selection should appear once. Selections, and the values inside them, can be in any order.
`,
    params: ['nums'],
    meta: { compare: 'unordered-deep' },
    constraints: ['1 <= nums.length <= 10', '-10 <= nums[i] <= 10', 'Values in nums are distinct'],
    explain: ['Two values give four selections: none, either one, or both.', 'One value: take it or leave it.'],
    known: [[[], [4], [6], [4, 6]], [[], [-1]]],
    ref: function subsets(nums) {
      const out = [[]];
      for (const n of nums) for (const s of [...out]) out.push([...s, n]);
      return out;
    },
    tests: [[[4, 6]], [[-1]], [[5, -5, 1]], [[1, 2, 3, 4]], [[-3, 7, 2, 9, 0]], [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]]],
  }),

  problem('combination-sum', {
    statement: `
Each value in \`candidates\` is different, and **any value may be used as many times as you like**. Find every multiset of values that **adds up to \`target\`** and return them all.

Two answers are the same if they use the same values the same number of times, so list each one once. Order does not matter.
`,
    params: ['candidates', 'target'],
    meta: { compare: 'unordered-deep' },
    constraints: ['1 <= candidates.length <= 30', '2 <= candidates[i] <= 40', 'Values in candidates are distinct', '1 <= target <= 40'],
    explain: ['3 + 3 + 3 and 4 + 5 both make 9.', 'Five 2s, or 2 + 2 + 6.', 'Only multiples of 4 can be built.'],
    samples: 3,
    known: [[[3, 3, 3], [4, 5]], [[2, 2, 2, 2, 2], [2, 2, 6]], []],
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
    tests: [[[3, 4, 5], 9], [[2, 6], 10], [[4], 3], [[7, 3, 2], 18], [[3, 5, 8], 11], [[2, 4, 6, 8], 40], [[5, 10, 15], 5], [[2, 3, 4, 5, 6, 7], 30]],
  }),

  problem('permutations', {
    statement: `
\`nums\` holds distinct integers. Return **every ordering** of all of them, in any order.
`,
    params: ['nums'],
    meta: { compare: 'unordered' },
    constraints: ['1 <= nums.length <= 6', '-10 <= nums[i] <= 10', 'Values in nums are distinct'],
    explain: ['Three values can be lined up in 3 x 2 x 1 = 6 ways.', 'Two values, two orderings.'],
    known: [[[5, 6, 8], [5, 8, 6], [6, 5, 8], [6, 8, 5], [8, 5, 6], [8, 6, 5]], [[4, 7], [7, 4]]],
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
    tests: [[[5, 6, 8]], [[4, 7]], [[9]], [[-1, 4, 2, 9]], [[1, 2, 3, 4, 5]], [[3, 1, 4, 1 + 4, 9, 2]]],
  }),

  problem('subsets-ii', {
    statement: `
\`nums\` **may contain repeated values**. List every distinct selection of its elements (including picking none), where selections that contain the same values the same number of times count as one.

Return them in any order.
`,
    params: ['nums'],
    meta: { compare: 'unordered-deep' },
    constraints: ['1 <= nums.length <= 10', '-10 <= nums[i] <= 10'],
    explain: ['The two 3s are interchangeable, so there are six distinct selections, not eight.', 'Take the 7 or leave it.'],
    known: [[[], [1], [1, 3], [1, 3, 3], [3], [3, 3]], [[], [7]]],
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
    tests: [[[3, 3, 1]], [[7]], [[4, 4, 4, 1, 4]], [[1, 1, 2, 2, 3, 3]], [[-1, 1, -1, 2]], [[2, 2, 2, 2, 2, 2, 2, 2, 2, 2]]],
  }),

  problem('combination-sum-ii', {
    statement: `
\`candidates\` may contain repeated values, and **each entry can be used at most once**. Return every distinct group of entries that **adds up to \`target\`**.

Groups with the same values count as one, so list each only once. Order does not matter.
`,
    params: ['candidates', 'target'],
    meta: { compare: 'unordered-deep' },
    constraints: ['1 <= candidates.length <= 100', '1 <= candidates[i] <= 50', '1 <= target <= 30'],
    explain: ['1 + 1 + 3, 1 + 4 and 2 + 3 all make 5.', '3 + 3 uses both 3s once each; 6 stands alone.'],
    known: [[[1, 1, 3], [1, 4], [2, 3]], [[3, 3], [6]]],
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
    tests: [[[4, 1, 3, 1, 2], 5], [[6, 3, 3], 6], [[1], 1], [[2], 1], [[1, 1, 1, 1, 1, 1], 3], [[3, 1, 3, 5, 1, 1], 8], [ints(201, 24, 1, 12), 20]],
  }),

  problem('word-search', {
    statement: `
Can \`word\` be traced on the letter grid \`board\`? A trace starts on any cell and moves to a **side neighbour** (up, down, left or right) for each next letter, and **may not revisit a cell**.

Return \`true\` if such a trace spells \`word\`, otherwise \`false\`.
`,
    params: ['board', 'word'],
    constraints: ['m == board.length, n == board[i].length', '1 <= m, n <= 6', '1 <= word.length <= 15', 'board and word use only English letters'],
    explain: ['C down to O, right to R, right to E.', 'T down to E, down to G.', 'No C touches the R.'],
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
      [[['C', 'A', 'T'], ['O', 'R', 'E'], ['D', 'O', 'G']], 'CORE'],
      [[['C', 'A', 'T'], ['O', 'R', 'E'], ['D', 'O', 'G']], 'TEG'],
      [[['C', 'A', 'T'], ['O', 'R', 'E'], ['D', 'O', 'G']], 'CARC'],
      [[['A']], 'A'],
      [[['A']], 'B'],
      [[['a', 'a']], 'aaa'],
      [[['X', 'Y', 'Y'], ['Y', 'Y', 'Y'], ['Z', 'X', 'W']], 'YYZ'],
      [[['a', 'a', 'a', 'a'], ['a', 'a', 'a', 'a'], ['a', 'a', 'a', 'a']], 'aaaaaaaaaaaab'],
    ],
  }),

  problem('n-queens', {
    statement: `
Place \`n\` queens on an \`n x n\` chessboard so that **none of them can capture another**: no two share a row, a column or a diagonal.

Return **all such placements**. Write each placement as \`n\` strings, one per row, using \`"Q"\` for a queen and \`"."\` for an empty square. Placements may be listed in any order.
`,
    params: ['n'],
    meta: { compare: 'unordered' },
    constraints: ['1 <= n <= 8'],
    explain: ['A 4 x 4 board has exactly two placements, mirror images of each other.', 'One queen on one square.'],
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
A leaderboard receives scores one at a time and must always report the score in **position \`k\`** when sorted from highest to lowest (duplicates each take a position).

Implement the \`KthLargest\` class:

- \`KthLargest(k, nums)\` sets up the board with \`k\` and the scores already in \`nums\`.
- \`add(val)\` records a new score and returns the current \`k\`th highest score.

${DESIGN_NOTE}
`,
    meta: { kind: 'design' },
    design: { className: 'KthLargest', ctor: ['k', 'nums'], methods: [['add', ['val']]] , cpp: { ctor: ['int', 'vector<int>'], methods: [{ name: 'add', args: ['int'], names: ['val'], ret: 'int' }] } },
    constraints: ['1 <= k <= 10^4', '0 <= nums.length <= 10^4', '-10^4 <= nums[i], val <= 10^4', 'At most 10^4 calls to add', 'At least k scores exist whenever add returns'],
    explain: ['With k = 2 and scores 6, 1, 9, the 2nd highest is 6. Adding 4 changes nothing; 7 lifts it to 7; 10 lifts it to 9; 2 changes nothing.'],
    samples: 1,
    known: [[null, 6, 7, 9, 9]],
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
      [['KthLargest', 'add', 'add', 'add', 'add'], [[2, [6, 1, 9]], [4], [7], [10], [2]]],
      [['KthLargest', 'add', 'add', 'add', 'add', 'add'], [[1, []], [5], [-2], [8], [0], [3]]],
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
    title: 'Crushing Rocks',
    slug: 'crushing-rocks',
    statement: `
A rock crusher repeatedly takes the **two heaviest rocks** from the pile \`stones\` and crushes them together. With weights \`x <= y\`, equal rocks both turn to dust; otherwise only a rock of weight \`y - x\` goes back on the pile.

When at most one rock is left, return its weight, or \`0\` if the pile is empty.
`,
    params: ['stones'],
    constraints: ['1 <= stones.length <= 30', '1 <= stones[i] <= 1000'],
    explain: ['6 and 4 leave 2; then 3 and 2 leave 1; then 2 and 1 leave 1.', 'The two 5s cancel, then the two 3s cancel.'],
    known: [1, 0],
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
    tests: [[[6, 3, 4, 2]], [[5, 5, 3, 3]], [[9]], [[2, 2]], [[3, 7, 2]], [[1, 1, 1, 1]], [ints(204, 30, 1, 1000)]],
  }),

  problem('k-closest-points-to-origin', {
    statement: `
\`points\` lists map locations as \`[x, y]\`. Return the **\`k\` locations nearest to \`(0, 0)\`** by straight-line distance, in any order.

The inputs guarantee there is no tie at the cut-off.
`,
    params: ['points', 'k'],
    meta: { compare: 'unordered' },
    constraints: ['1 <= k <= points.length <= 10^4', '-10^4 <= x, y <= 10^4', 'The k nearest points are uniquely determined'],
    explain: ['[2, -1] is sqrt(5) away and [0, 3] is 3 away.', 'Squared distances are 32, 5 and 10, so the last two win.'],
    known: [[[2, -1]], [[1, -2], [-3, 1]]],
    ref: function kClosest(points, k) {
      return [...points].sort((a, b) => a[0] * a[0] + a[1] * a[1] - (b[0] * b[0] + b[1] * b[1])).slice(0, k);
    },
    tests: [
      [[[2, -1], [0, 3]], 1],
      [[[4, 4], [1, -2], [-3, 1]], 2],
      [[[0, 1], [1, 0]], 2],
      [[[1, 1]], 1],
      [[[2, 2], [2, 2], [3, 3]], 2],
      [(() => { const r = rng(205); const seen = new Set(); const pts = []; while (pts.length < 3000) { const p = [randInt(r, -10000, 10000), randInt(r, -10000, 10000)]; const d = p[0] * p[0] + p[1] * p[1]; if (seen.has(d)) continue; seen.add(d); pts.push(p); } return [pts, 25]; })()][0],
    ],
  }),

  problem('kth-largest-element-in-an-array', {
    statement: `
Return the value that would be in **position \`k\` if \`nums\` were sorted from largest to smallest** (repeated values each take a position).

Try to beat a full sort.
`,
    params: ['nums', 'k'],
    constraints: ['1 <= k <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4'],
    explain: ['Largest first: 9, 7, 4, 2. Position 2 is 7.', 'Largest first: 8, 8, 5, 3, 1. Both 8s count.'],
    known: [7, 8],
    ref: function findKthLargest(nums, k) {
      return [...nums].sort((a, b) => b - a)[k - 1];
    },
    tests: [[[7, 2, 9, 4], 2], [[5, 8, 8, 1, 3], 2], [[1], 1], [[2, 1], 2], [[-1, -1], 2], [[7, 6, 5, 4, 3, 2, 1], 5], [[ints(206, 8000, -10000, 10000), 4000][0], 4000]],
  }),

  problem('task-scheduler', {
    title: 'Jobs With a Cooldown',
    slug: 'jobs-with-a-cooldown',
    statement: `
A machine runs jobs one per time slot. \`tasks\` lists the jobs, each a capital letter naming its type, and jobs may run in any order. After running a job, the machine must wait **at least \`n\` slots before running another job of the same type**; it can run other jobs or sit idle meanwhile.

Return the **fewest slots** needed to finish every job.
`,
    params: ['tasks', 'n'],
    constraints: ['1 <= tasks.length <= 10^4', 'Each task is a capital English letter', '0 <= n <= 100'],
    explain: ['X Y idle X: the second X waits two slots.', 'P Q P Q R fits with no idle slot.', 'M N M idle M.'],
    samples: 3,
    known: [4, 5, 5],
    ref: function leastInterval(tasks, n) {
      const count = new Array(26).fill(0);
      for (const t of tasks) count[t.charCodeAt(0) - 65]++;
      const max = Math.max(...count);
      const withMax = count.filter((c) => c === max).length;
      return Math.max(tasks.length, (max - 1) * (n + 1) + withMax);
    },
    tests: [[['X', 'X', 'Y'], 2], [['P', 'Q', 'P', 'Q', 'R'], 1], [['M', 'M', 'M', 'N'], 1], [['A'], 5], [['K', 'K', 'K', 'K', 'L', 'M', 'N', 'O'], 3], [['A', 'B', 'C'], 0], [['A', 'A', 'B', 'B', 'C', 'C'], 100]],
  }),

  problem('find-median-from-data-stream', {
    statement: `
Numbers arrive one at a time, and at any moment you may be asked for the **median** of everything received so far: the middle value once sorted, or the mean of the two middle values when the count is even.

Implement the \`MedianFinder\` class:

- \`MedianFinder()\` starts empty.
- \`addNum(num)\` receives another integer.
- \`findMedian()\` returns the current median. Answers within \`10^-5\` are accepted.

${DESIGN_NOTE}
`,
    meta: { kind: 'design' },
    design: { className: 'MedianFinder', ctor: [], methods: [['addNum', ['num']], ['findMedian', []]] , cpp: { ctor: [], methods: [{ name: 'addNum', args: ['int'], names: ['num'], ret: 'void' }, { name: 'findMedian', args: [], ret: 'double' }] } },
    constraints: ['-10^5 <= num <= 10^5', 'findMedian is only called after at least one number arrived', 'At most 5 * 10^4 calls in total'],
    explain: ['After 4 and 10 the median is 7. Adding 6 makes it 6, and adding 1 makes it (4 + 6) / 2 = 5.'],
    samples: 1,
    known: [[null, null, null, 7, null, 6, null, 5]],
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
      [['MedianFinder', 'addNum', 'addNum', 'findMedian', 'addNum', 'findMedian', 'addNum', 'findMedian'], [[], [4], [10], [], [6], [], [1], []]],
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
