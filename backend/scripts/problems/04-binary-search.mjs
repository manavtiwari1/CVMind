import { problem, rng, randInt, DESIGN_NOTE } from './_lib.mjs';

const sortedUnique = (seed, n, span) => {
  const r = rng(seed);
  const set = new Set();
  while (set.size < n) set.add(randInt(r, -span, span));
  return [...set].sort((a, b) => a - b);
};

const rotate = (arr, k) => [...arr.slice(k), ...arr.slice(0, k)];

const bigMatrix = (() => {
  const a = sortedUnique(4, 2500, 9000);
  const rows = [];
  for (let i = 0; i < 50; i++) rows.push(a.slice(i * 50, i * 50 + 50));
  return rows;
})();

const bigPiles = (() => {
  const r = rng(10);
  return Array.from({ length: 2000 }, () => randInt(r, 1, 1000000));
})();

// strictly increasing, then strictly decreasing
const bigMountain = [
  ...Array.from({ length: 30000 }, (_, i) => i * 3),
  90005,
  ...Array.from({ length: 40000 }, (_, i) => (40000 - i) * 2),
];

export default [
  problem('search-a-2d-matrix', {
    statement: `
Read the grid \`matrix\` row by row, left to right, and the numbers **only ever increase**: each row is increasing, and every row starts above where the previous row ended.

Return \`true\` if \`target\` appears in the grid, otherwise \`false\`. Aim for **O(log(m * n))** time.
`,
    params: ['matrix', 'target'],
    constraints: ['m == matrix.length, n == matrix[i].length', '1 <= m, n <= 100', '-10^4 <= matrix[i][j], target <= 10^4'],
    explain: ['15 sits in the middle row.', '9 would fall between 8 and 12, but it is not there.'],
    known: [true, false],
    ref: function searchMatrix(matrix, target) {
      const rows = matrix.length;
      const cols = matrix[0].length;
      let lo = 0;
      let hi = rows * cols - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const v = matrix[Math.floor(mid / cols)][mid % cols];
        if (v === target) return true;
        if (v < target) lo = mid + 1;
        else hi = mid - 1;
      }
      return false;
    },
    tests: [
      [[[2, 4, 8], [12, 15, 19], [25, 31, 40]], 15],
      [[[2, 4, 8], [12, 15, 19], [25, 31, 40]], 9],
      [[[1]], 1],
      [[[1]], 2],
      [[[1, 3]], 3],
      [[[1], [3]], 3],
      [[[2, 4, 8], [12, 15, 19], [25, 31, 40]], 40],
      [[[2, 4, 8], [12, 15, 19], [25, 31, 40]], 1],
      [bigMatrix, bigMatrix[37][21]],
    ],
  }),

  problem('koko-eating-bananas', {
    title: 'Slowest Reading Pace',
    slug: 'slowest-reading-pace',
    statement: `
A student must read a stack of reports before an exam in \`h\` hours; report \`i\` has \`piles[i]\` pages. They pick a pace of \`k\` pages per hour. In each hour they read up to \`k\` pages of **one** report, and if that report ends early they rest for the rest of the hour.

Return the **smallest whole-number pace \`k\`** that gets every report read within \`h\` hours.
`,
    params: ['piles', 'h'],
    constraints: ['1 <= piles.length <= 10^4', 'piles.length <= h <= 10^9', '1 <= piles[i] <= 10^9'],
    explain: ['At 5 pages an hour the reports take 1 + 2 + 1 + 3 = 7 hours; at 4 they would take 9.', 'Three hours for three reports: each must be read in one hour, so the pace must cover the longest.'],
    known: [5, 14],
    ref: function minEatingSpeed(piles, h) {
      let lo = 1;
      let hi = Math.max(...piles);
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        let hours = 0;
        for (const p of piles) hours += Math.ceil(p / mid);
        if (hours <= h) hi = mid;
        else lo = mid + 1;
      }
      return lo;
    },
    tests: [
      [[5, 9, 2, 12], 7],
      [[14, 6, 9], 3],
      [[14, 6, 9], 4],
      [[1], 1],
      [[1000000000], 2],
      [[1000000000, 1000000000], 3],
      [[312884470], 312884469],
      [[5, 5, 5, 5], 8],
      [bigPiles, 3000],
    ],
  }),

  problem('find-minimum-in-rotated-sorted-array', {
    statement: `
\`nums\` started as distinct integers in increasing order, then some number of elements were **moved from the front to the back** (possibly none, or all of them). For instance \`[2,4,6,8,9]\` could have become \`[6,8,9,2,4]\`.

Return the **smallest value** in \`nums\` in **O(log n)** time.
`,
    params: ['nums'],
    constraints: ['1 <= nums.length <= 5000', '-5000 <= nums[i] <= 5000', 'Values are distinct', 'nums is an increasing array after such a rotation'],
    explain: ['The sorted order restarts at 2.', 'Nothing was moved, so the first value is the smallest.'],
    known: [2, 10],
    ref: function findMin(nums) {
      let lo = 0;
      let hi = nums.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (nums[mid] > nums[hi]) lo = mid + 1;
        else hi = mid;
      }
      return nums[lo];
    },
    tests: [
      [[6, 8, 9, 2, 4]],
      [[10, 20, 30]],
      [[7, 9, 11, 13, 1, 3]],
      [[1]],
      [[2, 1]],
      [[5, 1, 2, 3, 4]],
      [rotate(sortedUnique(14, 4000, 5000), 1234)],
      [rotate(sortedUnique(15, 4000, 5000), 3999)],
    ],
  }),

  problem('search-in-rotated-sorted-array', {
    statement: `
\`nums\` is an increasing list of distinct integers that has been **cut at some point and had its two halves swapped**, so \`[3,7,9,12,15,19]\` might now read \`[12,15,19,3,7,9]\`.

Return the position of \`target\` in \`nums\`, or \`-1\` if it is absent, in **O(log n)** time.
`,
    params: ['nums', 'target'],
    constraints: ['1 <= nums.length <= 5000', '-10^4 <= nums[i], target <= 10^4', 'Values are distinct'],
    explain: ['7 is at position 4, in the second half.', '10 is not in the list.'],
    known: [4, -1],
    ref: function search(nums, target) {
      let lo = 0;
      let hi = nums.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (nums[mid] === target) return mid;
        if (nums[lo] <= nums[mid]) {
          if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
          else lo = mid + 1;
        } else if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
        else hi = mid - 1;
      }
      return -1;
    },
    tests: [
      [[12, 15, 19, 3, 7, 9], 7],
      [[12, 15, 19, 3, 7, 9], 10],
      [[8], 2],
      [[1], 1],
      [[3, 1], 1],
      [[5, 1, 3], 5],
      [[12, 15, 19, 3, 7, 9], 19],
      (() => { const a = rotate(sortedUnique(16, 4000, 10000), 777); return [a, a[3456]]; })(),
      (() => { const a = rotate(sortedUnique(17, 4000, 10000), 2500); return [a, 10001]; })(),
    ],
  }),

  problem('time-based-key-value-store', {
    title: 'Settings History',
    slug: 'settings-history',
    statement: `
An app saves every change to its settings, so you can later ask **what a setting was at any moment in the past**.

Implement the \`SettingsHistory\` class:

- \`SettingsHistory()\` starts with no saved changes.
- \`set(key, value, timestamp)\` records that setting \`key\` changed to \`value\` at time \`timestamp\`.
- \`get(key, timestamp)\` returns the value \`key\` held at time \`timestamp\`: the value from its **latest change at or before that time**, or \`""\` if it had not been set yet.

${DESIGN_NOTE}
`,
    meta: { kind: 'design' },
    design: { className: 'SettingsHistory', ctor: [], methods: [['set', ['key', 'value', 'timestamp']], ['get', ['key', 'timestamp']]] , cpp: { ctor: [], methods: [{ name: 'set', args: ['string', 'string', 'int'], names: ['key', 'value', 'timestamp'], ret: 'void' }, { name: 'get', args: ['string', 'int'], names: ['key', 'timestamp'], ret: 'string' }] } },
    constraints: ['1 <= key.length, value.length <= 100', 'Keys and values use lowercase letters and digits', '1 <= timestamp <= 10^7', 'Each key is set with strictly increasing timestamps', 'At most 2 * 10^5 calls in total'],
    explain: ['"theme" was unset at time 1 and "dark" at time 6. After it changes to "light" at time 7, time 8 sees "light".'],
    samples: 1,
    known: [[null, null, '', 'dark', null, 'light']],
    ref: class SettingsHistory {
      constructor() { this.store = new Map(); }
      set(key, value, timestamp) {
        if (!this.store.has(key)) this.store.set(key, []);
        this.store.get(key).push([timestamp, value]);
      }
      get(key, timestamp) {
        const list = this.store.get(key);
        if (!list) return '';
        let lo = 0;
        let hi = list.length - 1;
        let answer = '';
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          if (list[mid][0] <= timestamp) { answer = list[mid][1]; lo = mid + 1; }
          else hi = mid - 1;
        }
        return answer;
      }
    },
    tests: [
      [['SettingsHistory', 'set', 'get', 'get', 'set', 'get'], [[], ['theme', 'dark', 2], ['theme', 1], ['theme', 6], ['theme', 'light', 7], ['theme', 8]]],
      [['SettingsHistory', 'get', 'set', 'get'], [[], ['a', 5], ['a', 'x', 10], ['a', 9]]],
      [['SettingsHistory', 'set', 'set', 'get', 'get', 'get'], [[], ['k1', 'v1', 1], ['k2', 'w1', 2], ['k1', 2], ['k2', 1], ['k2', 2]]],
      [['SettingsHistory', 'set', 'set', 'set', 'get', 'get', 'get', 'get'], [[], ['mode', 'eco', 10], ['mode', 'sport', 20], ['mode', 'normal', 30], ['mode', 5], ['mode', 10], ['mode', 15], ['mode', 25]]],
      (() => {
        const r = rng(19);
        const ops = ['SettingsHistory'];
        const args = [[]];
        let t = 0;
        for (let i = 0; i < 300; i++) {
          if (r() < 0.6) { t += randInt(r, 1, 5); ops.push('set'); args.push(['key' + randInt(r, 1, 3), 'v' + i, t]); }
          else { ops.push('get'); args.push(['key' + randInt(r, 1, 3), randInt(r, 1, Math.max(1, t + 3))]); }
        }
        return [ops, args];
      })(),
    ],
  }),

  problem('median-of-two-sorted-arrays', {
    statement: `
Two sorted lists of exam scores, \`nums1\` and \`nums2\`, come from two classrooms. Return the **median score across both classrooms together**: the middle score once everything is pooled and sorted, or the mean of the two middle scores if the pooled count is even.

Aim for **O(log(m + n))** time, where \`m\` and \`n\` are the two lengths.
`,
    params: ['nums1', 'nums2'],
    meta: { compare: 'float' },
    constraints: ['0 <= m, n <= 1000', '1 <= m + n <= 2000', '-10^6 <= nums1[i], nums2[i] <= 10^6'],
    explain: ['Pooled: [2, 4, 6], so the median is 4.', 'Pooled: [1, 3, 7, 9], so the median is (3 + 7) / 2 = 5.'],
    known: [4, 5],
    ref: function findMedianSortedArrays(nums1, nums2) {
      const merged = [];
      let i = 0;
      let j = 0;
      while (i < nums1.length || j < nums2.length) {
        if (j >= nums2.length || (i < nums1.length && nums1[i] <= nums2[j])) merged.push(nums1[i++]);
        else merged.push(nums2[j++]);
      }
      const mid = merged.length >> 1;
      return merged.length % 2 ? merged[mid] : (merged[mid - 1] + merged[mid]) / 2;
    },
    tests: [
      [[2, 6], [4]],
      [[1, 7], [3, 9]],
      [[5, 5], [5, 5]],
      [[], [1]],
      [[2], []],
      [[1, 1, 1], [1, 1]],
      [[-5, 3, 6, 12, 15], [-12, -10, -6, -3, 4, 10]],
      [sortedUnique(21, 900, 1000000), sortedUnique(22, 1000, 1000000)],
    ],
  }),

  problem('peak-index-in-a-mountain-array', {
    statement: `
A hiking trail's altitude readings \`arr\` **climb strictly to a single summit and then descend strictly** to the end; the summit is never the first or last reading.

Return the position of the summit in **O(log n)** time.
`,
    params: ['arr'],
    constraints: ['3 <= arr.length <= 10^5', '0 <= arr[i] <= 10^6', 'arr always rises then falls as described'],
    explain: ['The trail tops out at 9, position 2.', 'The summit 8 is at position 1.'],
    known: [2, 1],
    ref: function peakIndexInMountainArray(arr) {
      let lo = 0;
      let hi = arr.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (arr[mid] < arr[mid + 1]) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    },
    tests: [
      [[1, 4, 9, 6, 2]],
      [[3, 8, 5]],
      [[2, 9, 7, 4]],
      [[1, 3, 6, 10, 2]],
      [[15, 40, 72, 88, 61, 50, 33, 20, 11, 5]],
      [[1, 2, 3, 4, 5, 4]],
      [[0, 1, 2, 3, 4, 5, 6, 5]],
      [bigMountain],
    ],
  }),
];
