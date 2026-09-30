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
You are given an \`m x n\` integer matrix with two properties:

- each row is sorted in ascending order, and
- the first integer of each row is greater than the last integer of the previous row.

Return \`true\` if \`target\` is in the matrix and \`false\` otherwise. Your solution should run in **O(log(m * n))** time.
`,
    params: ['matrix', 'target'],
    constraints: ['m == matrix.length, n == matrix[i].length', '1 <= m, n <= 100', '-10^4 <= matrix[i][j], target <= 10^4'],
    explain: ['3 is in the first row.', '13 is not in the matrix.'],
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
      [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 3],
      [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 13],
      [[[1]], 1],
      [[[1]], 2],
      [[[1, 3]], 3],
      [[[1], [3]], 3],
      [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 60],
      [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 0],
      [bigMatrix, bigMatrix[37][21]],
    ],
  }),

  problem('koko-eating-bananas', {
    statement: `
Koko loves bananas. There are \`n\` piles, and pile \`i\` holds \`piles[i]\` bananas. The guards will be away for \`h\` hours.

Koko picks an eating speed of \`k\` bananas per hour. Each hour she chooses one pile and eats up to \`k\` bananas from it. If the pile has fewer than \`k\` bananas she eats them all and does nothing else that hour.

Return the **minimum integer speed \`k\`** that lets her finish all the bananas within \`h\` hours.
`,
    params: ['piles', 'h'],
    constraints: ['1 <= piles.length <= 10^4', 'piles.length <= h <= 10^9', '1 <= piles[i] <= 10^9'],
    explain: ['At speed 4 the piles take 1 + 2 + 2 + 3 = 8 hours.', 'Only five hours for five piles means she must finish each pile in one hour.', 'At speed 23 the piles take 2 + 1 + 1 + 1 + 1 = 6 hours.'],
    samples: 3,
    known: [4, 30, 23],
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
      [[3, 6, 7, 11], 8],
      [[30, 11, 23, 4, 20], 5],
      [[30, 11, 23, 4, 20], 6],
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
An array of **unique** integers that was sorted in ascending order has been **rotated** between 1 and \`n\` times. For example, \`[0,1,2,4,5,6,7]\` may become \`[4,5,6,7,0,1,2]\`.

Return the **minimum element** of the rotated array. Your solution must run in **O(log n)** time.
`,
    params: ['nums'],
    constraints: ['1 <= nums.length <= 5000', '-5000 <= nums[i] <= 5000', 'All integers of nums are unique', 'nums is sorted and rotated between 1 and n times'],
    explain: ['The original array was [1,2,3,4,5], rotated 3 times.', 'The original array was [0,1,2,4,5,6,7], rotated 4 times.', 'The array was rotated 4 times, which leaves it unchanged.'],
    samples: 3,
    known: [1, 0, 11],
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
      [[3, 4, 5, 1, 2]],
      [[4, 5, 6, 7, 0, 1, 2]],
      [[11, 13, 15, 17]],
      [[1]],
      [[2, 1]],
      [[5, 1, 2, 3, 4]],
      [rotate(sortedUnique(14, 4000, 5000), 1234)],
      [rotate(sortedUnique(15, 4000, 5000), 3999)],
    ],
  }),

  problem('search-in-rotated-sorted-array', {
    statement: `
An array of **distinct** integers that was sorted in ascending order has been rotated at an unknown pivot. For example, \`[0,1,2,4,5,6,7]\` may become \`[4,5,6,7,0,1,2]\`.

Given the rotated array \`nums\` and an integer \`target\`, return the index of \`target\`, or \`-1\` if it is not in the array. Your solution must run in **O(log n)** time.
`,
    params: ['nums', 'target'],
    constraints: ['1 <= nums.length <= 5000', '-10^4 <= nums[i] <= 10^4', 'All values of nums are unique', '-10^4 <= target <= 10^4'],
    explain: ['0 is at index 4.', '3 is not in the array.', 'The array has one element and it is not 0.'],
    samples: 3,
    known: [4, -1, -1],
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
      [[4, 5, 6, 7, 0, 1, 2], 0],
      [[4, 5, 6, 7, 0, 1, 2], 3],
      [[1], 0],
      [[1], 1],
      [[3, 1], 1],
      [[5, 1, 3], 5],
      [[4, 5, 6, 7, 0, 1, 2], 7],
      (() => { const a = rotate(sortedUnique(16, 4000, 10000), 777); return [a, a[3456]]; })(),
      (() => { const a = rotate(sortedUnique(17, 4000, 10000), 2500); return [a, 10001]; })(),
    ],
  }),

  problem('time-based-key-value-store', {
    statement: `
Design a key-value store that keeps **multiple values for the same key at different timestamps** and can return the value a key had at a given time.

Implement the \`TimeMap\` class:

- \`TimeMap()\` creates the store.
- \`set(key, value, timestamp)\` stores \`value\` for \`key\` at the given \`timestamp\`.
- \`get(key, timestamp)\` returns the value that was set with the **largest timestamp that is less than or equal to** the requested one. If there is no such value, it returns \`""\`.

${DESIGN_NOTE}
`,
    meta: { kind: 'design' },
    design: { className: 'TimeMap', ctor: [], methods: [['set', ['key', 'value', 'timestamp']], ['get', ['key', 'timestamp']]] , cpp: { ctor: [], methods: [{ name: 'set', args: ['string', 'string', 'int'], names: ['key', 'value', 'timestamp'], ret: 'void' }, { name: 'get', args: ['string', 'int'], names: ['key', 'timestamp'], ret: 'string' }] } },
    constraints: ['1 <= key.length, value.length <= 100', 'key and value consist of lowercase letters and digits', '1 <= timestamp <= 10^7', 'All timestamps passed to set for the same key are strictly increasing', 'At most 2 * 10^5 calls are made'],
    explain: ['The value set at time 1 is returned for times 1 and 3. After "bar2" is set at time 4, it is returned for times 4 and 5.'],
    samples: 1,
    known: [[null, null, 'bar', 'bar', null, 'bar2', 'bar2']],
    ref: class TimeMap {
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
      [['TimeMap', 'set', 'get', 'get', 'set', 'get', 'get'], [[], ['foo', 'bar', 1], ['foo', 1], ['foo', 3], ['foo', 'bar2', 4], ['foo', 4], ['foo', 5]]],
      [['TimeMap', 'get', 'set', 'get'], [[], ['a', 5], ['a', 'x', 10], ['a', 9]]],
      [['TimeMap', 'set', 'set', 'get', 'get', 'get'], [[], ['k1', 'v1', 1], ['k2', 'w1', 2], ['k1', 2], ['k2', 1], ['k2', 2]]],
      [['TimeMap', 'set', 'set', 'set', 'get', 'get', 'get', 'get'], [[], ['love', 'high', 10], ['love', 'low', 20], ['love', 'mid', 30], ['love', 5], ['love', 10], ['love', 15], ['love', 25]]],
      (() => {
        const r = rng(19);
        const ops = ['TimeMap'];
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
You are given two sorted arrays \`nums1\` and \`nums2\` of sizes \`m\` and \`n\`. Return the **median** of the two arrays combined.

The median is the middle value of the sorted combined values, or the average of the two middle values when the total count is even. The overall run time should be **O(log(m + n))**.
`,
    params: ['nums1', 'nums2'],
    meta: { compare: 'float' },
    constraints: ['0 <= m, n <= 1000', '1 <= m + n <= 2000', '-10^6 <= nums1[i], nums2[i] <= 10^6'],
    explain: ['Merged array = [1,2,3] and the median is 2.', 'Merged array = [1,2,3,4] and the median is (2 + 3) / 2 = 2.5.'],
    known: [2, 2.5],
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
      [[1, 3], [2]],
      [[1, 2], [3, 4]],
      [[0, 0], [0, 0]],
      [[], [1]],
      [[2], []],
      [[1, 1, 1], [1, 1]],
      [[-5, 3, 6, 12, 15], [-12, -10, -6, -3, 4, 10]],
      [sortedUnique(21, 900, 1000000), sortedUnique(22, 1000, 1000000)],
    ],
  }),

  problem('peak-index-in-a-mountain-array', {
    statement: `
An array \`arr\` is a **mountain** if its length is at least 3 and there is an index \`i\` with \`0 < i < arr.length - 1\` such that

- \`arr[0] < arr[1] < ... < arr[i]\`, and
- \`arr[i] > arr[i + 1] > ... > arr[arr.length - 1]\`.

Given a mountain array, return the index \`i\` of its peak. Your solution must run in **O(log n)** time.
`,
    params: ['arr'],
    constraints: ['3 <= arr.length <= 10^5', '0 <= arr[i] <= 10^6', 'arr is guaranteed to be a mountain array'],
    explain: ['The peak is 1 at index 1.', 'The peak is 2 at index 1.'],
    known: [1, 1],
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
      [[0, 1, 0]],
      [[0, 2, 1, 0]],
      [[0, 10, 5, 2]],
      [[3, 4, 5, 1]],
      [[24, 69, 100, 99, 79, 78, 67, 36, 26, 19]],
      [[1, 2, 3, 4, 5, 4]],
      [[0, 1, 2, 3, 4, 5, 6, 5]],
      [bigMountain],
    ],
  }),
];
