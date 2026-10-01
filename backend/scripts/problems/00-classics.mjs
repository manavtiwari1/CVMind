import { problem, rng, randInt } from './_lib.mjs';

const ints = (seed, n, lo, hi) => {
  const r = rng(seed);
  return Array.from({ length: n }, () => randInt(r, lo, hi));
};

/** An array plus a target whose pair of indices is the only pair that reaches the target. */
const uniquePair = (seed, n, { sorted = false } = {}) => {
  for (let attempt = 0; attempt < 200; attempt++) {
    const r = rng(seed + attempt * 7919);
    const values = new Set();
    while (values.size < n) values.add(randInt(r, -1000000, 1000000));
    let a = [...values];
    if (sorted) a.sort((x, y) => x - y);
    else a = a.sort(() => r() - 0.5);
    const i = randInt(r, 0, n - 2);
    const j = randInt(r, i + 1, n - 1);
    const target = a[i] + a[j];
    let count = 0;
    const seen = new Set();
    for (const v of a) { if (seen.has(target - v)) count++; seen.add(v); }
    if (count === 1) return [a, target];
  }
  throw new Error('could not build a test with a unique pair');
};

export default [
  problem('two-sum', {
    statement: `
Given an array of integers \`nums\` and an integer \`target\`, return the **indices of the two numbers** that add up to \`target\`.

You may assume that each input has **exactly one solution**, and you may not use the same element twice. You can return the two indices in any order.
`,
    params: ['nums', 'target'],
    meta: { compare: 'unordered' },
    constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', '-10^9 <= target <= 10^9', 'Exactly one valid answer exists'],
    explain: ['nums[0] + nums[1] = 2 + 7 = 9, so the answer is [0, 1].', 'nums[1] + nums[2] = 2 + 4 = 6.'],
    known: [[0, 1], [1, 2]],
    ref: function twoSum(nums, target) {
      const seen = new Map();
      for (let i = 0; i < nums.length; i++) {
        if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
        seen.set(nums[i], i);
      }
      return [];
    },
    tests: [[[2, 7, 11, 15], 9], [[3, 2, 4], 6], [[3, 3], 6], [[-1, -2, -3, -4, -5], -8], [[0, 4, 3, 0], 0], [[1, 5, 9, 14], 23], uniquePair(11, 400), uniquePair(12, 2000)],
  }),

  problem('valid-anagram', {
    statement: `
Given two strings \`s\` and \`t\`, return \`true\` if \`t\` is an **anagram** of \`s\`, and \`false\` otherwise.

An anagram is a word formed by rearranging the letters of another word, using every original letter exactly once.
`,
    params: ['s', 't'],
    constraints: ['1 <= s.length, t.length <= 5 * 10^4', 's and t consist of lowercase English letters'],
    explain: ['Both words use the same letters the same number of times.', '"rat" has no letter "c".'],
    known: [true, false],
    ref: function isAnagram(s, t) {
      if (s.length !== t.length) return false;
      const count = new Array(26).fill(0);
      for (let i = 0; i < s.length; i++) { count[s.charCodeAt(i) - 97]++; count[t.charCodeAt(i) - 97]--; }
      return count.every((c) => c === 0);
    },
    tests: [['anagram', 'nagaram'], ['rat', 'car'], ['a', 'a'], ['ab', 'a'], ['aacc', 'ccac'], ['listen', 'silent'], ['abc'.repeat(5000), 'cba'.repeat(5000)], ['abc'.repeat(5000), 'cba'.repeat(4999) + 'cbb']],
  }),

  problem('contains-duplicate', {
    statement: `
Given an integer array \`nums\`, return \`true\` if **any value appears at least twice**, and \`false\` if every element is distinct.
`,
    params: ['nums'],
    constraints: ['1 <= nums.length <= 10^5', '-10^9 <= nums[i] <= 10^9'],
    explain: ['The value 1 appears twice.', 'Every element is distinct.'],
    known: [true, false],
    ref: function containsDuplicate(nums) { return new Set(nums).size !== nums.length; },
    tests: [[[1, 2, 3, 1]], [[1, 2, 3, 4]], [[1]], [[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]], [[0, 0]], [[-5, 5, -5]], [Array.from({ length: 8000 }, (_, i) => i * 3 - 4000)], [[...Array.from({ length: 8000 }, (_, i) => i * 3 - 4000), 2999]]],
  }),

  problem('group-anagrams', {
    statement: `
Given an array of strings \`strs\`, **group the anagrams together**. You may return the groups in any order, and the words inside a group in any order.
`,
    params: ['strs'],
    meta: { compare: 'unordered-deep' },
    constraints: ['1 <= strs.length <= 10^4', '0 <= strs[i].length <= 100', 'strs[i] consists of lowercase English letters'],
    explain: ['A single word forms a single group.', 'The empty string forms its own group.', '"eat", "tea" and "ate" are anagrams of each other, and so are "tan" and "nat".'],
    samples: 3,
    ref: function groupAnagrams(strs) {
      const groups = new Map();
      for (const s of strs) {
        const key = s.split('').sort().join('');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(s);
      }
      return [...groups.values()];
    },
    tests: [[['a']], [['']], [['eat', 'tea', 'tan', 'ate', 'nat', 'bat']], [['', '']], [['abc', 'bca', 'cab', 'xyz']], [['ab', 'ba', 'ab', 'ba']], [(() => { const r = rng(21); return Array.from({ length: 1500 }, () => Array.from({ length: randInt(r, 1, 6) }, () => 'abcd'[randInt(r, 0, 3)]).join('')); })()]],
  }),

  problem('top-k-frequent-elements', {
    statement: `
Given an integer array \`nums\` and an integer \`k\`, return the **\`k\` most frequent elements**. You may return the answer in any order.

The answer is guaranteed to be unique: no other element ties with the \`k\`th most frequent one.
`,
    params: ['nums', 'k'],
    meta: { compare: 'unordered' },
    constraints: ['1 <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4', '1 <= k <= the number of distinct elements in nums', 'The answer is unique'],
    explain: ['1 appears three times and 2 appears twice.', 'Only one element exists.'],
    known: [[1, 2], [1]],
    ref: function topKFrequent(nums, k) {
      const count = new Map();
      for (const n of nums) count.set(n, (count.get(n) || 0) + 1);
      return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map((e) => e[0]);
    },
    tests: [
      [[1, 1, 1, 2, 2, 3], 2],
      [[1], 1],
      [[4, 1, -1, 2, -1, 2, 3, -1, 2, 2], 2],
      [[5, 5, 5, 6, 6, 7], 1],
      [[1, 2, 2, 3, 3, 3], 3],
      (() => { const out = []; for (let v = 1; v <= 60; v++) for (let c = 0; c < v; c++) out.push(v * 7 - 200); return [out, 10]; })(),
    ],
  }),

  problem('product-of-array-except-self', {
    statement: `
Given an integer array \`nums\`, return an array \`answer\` where \`answer[i]\` is the **product of all the elements of \`nums\` except \`nums[i]\`**.

Your algorithm must run in **O(n)** time and must not use division.
`,
    params: ['nums'],
    constraints: ['2 <= nums.length <= 10^5', '-30 <= nums[i] <= 30', 'The product of any prefix or suffix of nums fits in a 32-bit integer'],
    explain: ['Each output is the product of the other three numbers.', 'A zero makes every product zero except the one that skips it.'],
    known: [[24, 12, 8, 6], [0, 0, 9, 0, 0]],
    ref: function productExceptSelf(nums) {
      const out = new Array(nums.length).fill(1);
      let left = 1;
      for (let i = 0; i < nums.length; i++) { out[i] = left; left *= nums[i]; }
      let right = 1;
      for (let i = nums.length - 1; i >= 0; i--) { out[i] *= right; right *= nums[i]; }
      return out.map((v) => (v === 0 ? 0 : v));
    },
    tests: [[[1, 2, 3, 4]], [[-1, 1, 0, -3, 3]], [[2, 3]], [[0, 0]], [[1, 1, 1]], [[-2, 5, 0, 4]], [(() => { const r = rng(22); return Array.from({ length: 3000 }, () => (r() < 0.5 ? -1 : 1)); })()]],
  }),

  problem('longest-consecutive-sequence', {
    statement: `
Given an unsorted array of integers \`nums\`, return the **length of the longest run of consecutive integers** that can be formed from its elements.

For example, the elements \`4, 2, 3, 1\` form the run \`1, 2, 3, 4\`. The elements need not be next to each other in the array. Your algorithm must run in **O(n)** time.
`,
    params: ['nums'],
    constraints: ['0 <= nums.length <= 10^5', '-10^9 <= nums[i] <= 10^9'],
    explain: ['The longest run is 1, 2, 3, 4.', 'The longest run is 0 through 8.'],
    known: [4, 9],
    ref: function longestConsecutive(nums) {
      const set = new Set(nums);
      let best = 0;
      for (const n of set) {
        if (set.has(n - 1)) continue;
        let len = 1;
        while (set.has(n + len)) len++;
        best = Math.max(best, len);
      }
      return best;
    },
    tests: [[[100, 4, 200, 1, 3, 2]], [[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]], [[]], [[1, 2, 0, 1]], [[5]], [[-3, -2, -1, 10, 11]], [ints(23, 6000, -5000, 5000)]],
  }),

  problem('maximum-subarray', {
    statement: `
Given an integer array \`nums\`, find the **contiguous non-empty subarray** with the largest sum and return that sum.
`,
    params: ['nums'],
    constraints: ['1 <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4'],
    explain: ['The subarray [4, -1, 2, 1] has the largest sum, 6.', 'A single element is the whole array.'],
    known: [6, 1],
    ref: function maxSubArray(nums) {
      let best = nums[0];
      let cur = nums[0];
      for (let i = 1; i < nums.length; i++) {
        cur = Math.max(nums[i], cur + nums[i]);
        best = Math.max(best, cur);
      }
      return best;
    },
    tests: [[[-2, 1, -3, 4, -1, 2, 1, -5, 4]], [[1]], [[5, 4, -1, 7, 8]], [[-1]], [[-2, -1]], [[0, 0, 0]], [ints(24, 9000, -10000, 10000)]],
  }),

  problem('majority-element', {
    statement: `
Given an array \`nums\` of size \`n\`, return the **majority element**: the element that appears **more than \`floor(n / 2)\` times**.

You may assume the majority element always exists in the array.
`,
    params: ['nums'],
    constraints: ['n == nums.length', '1 <= n <= 5 * 10^4', '-10^9 <= nums[i] <= 10^9', 'A majority element always exists'],
    explain: ['3 appears twice out of three.', '2 appears four times out of seven.'],
    known: [3, 2],
    ref: function majorityElement(nums) {
      let candidate = 0;
      let votes = 0;
      for (const n of nums) {
        if (votes === 0) candidate = n;
        votes += n === candidate ? 1 : -1;
      }
      return candidate;
    },
    tests: [[[3, 2, 3]], [[2, 2, 1, 1, 1, 2, 2]], [[1]], [[6, 6, 6, 7, 7]], [[-1, -1, 2, 3, -1]], (() => { const r = rng(25); const a = Array.from({ length: 4001 }, () => 42); for (let i = 0; i < 3999; i++) a.push(randInt(r, -100, 100)); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return [a]; })()],
  }),

  problem('sort-colors', {
    statement: `
You are given an array \`nums\` of \`n\` objects colored red, white or blue, written as the numbers \`0\`, \`1\` and \`2\`.

Sort them so that objects of the same color are adjacent, in the order red (0), white (1), blue (2), **without using a library sort function**. Return the sorted array.
`,
    params: ['nums'],
    constraints: ['n == nums.length', '1 <= n <= 300', 'nums[i] is 0, 1 or 2'],
    explain: ['The zeros come first, then the ones, then the twos.', 'Each color appears once.'],
    known: [[0, 0, 1, 1, 2, 2], [0, 1, 2]],
    ref: function sortColors(nums) { return [...nums].sort((a, b) => a - b); },
    tests: [[[2, 0, 2, 1, 1, 0]], [[2, 0, 1]], [[0]], [[2, 2, 2]], [[1, 0]], [[2, 1, 0, 2, 1, 0, 2, 1, 0]], [ints(26, 300, 0, 2)]],
  }),

  problem('valid-palindrome', {
    statement: `
A phrase is a **palindrome** if, after converting all uppercase letters to lowercase and removing every character that is not a letter or a digit, it reads the same forwards and backwards.

Given a string \`s\`, return \`true\` if it is a palindrome, and \`false\` otherwise.
`,
    params: ['s'],
    constraints: ['1 <= s.length <= 2 * 10^5', 's consists only of printable ASCII characters'],
    explain: ['After cleaning, the phrase is "amanaplanacanalpanama", which reads the same in both directions.', 'The cleaned phrase "raceacar" is not a palindrome.'],
    known: [true, false],
    ref: function isPalindrome(s) {
      const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleaned === cleaned.split('').reverse().join('');
    },
    tests: [['A man, a plan, a canal: Panama'], ['race a car'], [' '], ['0P'], ['.,'], ['ab_a'], ['No lemon, no melon'], ['a'.repeat(50000) + 'b' + 'a'.repeat(50000)], ['a'.repeat(50000) + 'bc' + 'a'.repeat(50000)]],
  }),

  problem('two-sum-ii-input-array-is-sorted', {
    statement: `
Given a **1-indexed** array of integers \`numbers\` that is already **sorted in non-decreasing order**, find two numbers that add up to \`target\`.

Return the **1-based indices** \`[index1, index2]\` of the two numbers, with \`index1 < index2\`. Each input has exactly one solution and you may not use the same element twice. Use only **constant extra space**.
`,
    params: ['numbers', 'target'],
    constraints: ['2 <= numbers.length <= 3 * 10^4', '-1000 <= numbers[i] <= 1000', 'numbers is sorted in non-decreasing order', '-1000 <= target <= 1000', 'Exactly one solution exists'],
    explain: ['2 + 7 = 9, at positions 1 and 2.', '2 + 4 = 6, at positions 1 and 3.'],
    known: [[1, 2], [1, 3]],
    ref: function twoSum(numbers, target) {
      let lo = 0;
      let hi = numbers.length - 1;
      while (lo < hi) {
        const sum = numbers[lo] + numbers[hi];
        if (sum === target) return [lo + 1, hi + 1];
        if (sum < target) lo++;
        else hi--;
      }
      return [];
    },
    tests: [[[2, 7, 11, 15], 9], [[2, 3, 4], 6], [[-1, 0], -1], [[1, 2, 3, 4, 4, 9, 56, 90], 8], [[5, 25, 75], 100], (() => { const a = Array.from({ length: 1500 }, (_, i) => i - 700); return [a, a[1498] + a[1499]]; })(), (() => { const a = Array.from({ length: 1500 }, (_, i) => i - 700); return [a, a[0] + a[1]]; })()],
  }),

  problem('3sum', {
    statement: `
Given an integer array \`nums\`, return **all the unique triplets** \`[nums[i], nums[j], nums[k]]\` with \`i\`, \`j\` and \`k\` all different and \`nums[i] + nums[j] + nums[k] == 0\`.

The answer must not contain duplicate triplets. You may return the triplets in any order, and the numbers inside a triplet in any order.
`,
    params: ['nums'],
    meta: { compare: 'unordered-deep' },
    constraints: ['3 <= nums.length <= 3000', '-10^5 <= nums[i] <= 10^5'],
    explain: ['No three numbers add up to zero.', 'The only triplet is [0, 0, 0].'],
    known: [[], [[0, 0, 0]]],
    ref: function threeSum(nums) {
      const a = [...nums].sort((x, y) => x - y);
      const out = [];
      for (let i = 0; i < a.length - 2; i++) {
        if (i > 0 && a[i] === a[i - 1]) continue;
        let lo = i + 1;
        let hi = a.length - 1;
        while (lo < hi) {
          const sum = a[i] + a[lo] + a[hi];
          if (sum === 0) {
            out.push([a[i], a[lo], a[hi]]);
            while (lo < hi && a[lo] === a[lo + 1]) lo++;
            while (lo < hi && a[hi] === a[hi - 1]) hi--;
            lo++;
            hi--;
          } else if (sum < 0) lo++;
          else hi--;
        }
      }
      return out;
    },
    tests: [[[0, 1, 1]], [[0, 0, 0]], [[-1, 0, 1, 2, -1, -4]], [[0, 0, 0, 0]], [[-2, 0, 1, 1, 2]], [[3, -2, 1, 0]], [ints(32, 300, -100, 100)], [ints(33, 600, -1000, 1000)]],
  }),

  problem('container-with-most-water', {
    statement: `
You are given an integer array \`height\` of length \`n\`. There are \`n\` vertical lines, where line \`i\` goes from \`(i, 0)\` to \`(i, height[i])\`.

Pick two lines that, together with the x-axis, form a container, and return the **maximum amount of water** a container can store. You may not tilt the container.
`,
    params: ['height'],
    constraints: ['n == height.length', '2 <= n <= 10^5', '0 <= height[i] <= 10^4'],
    explain: ['The best pair is the line of height 8 (index 1) and the line of height 7 (index 8): min(8, 7) x 7 = 49.', 'Two lines of height 1 that are 1 apart hold 1.'],
    known: [49, 1],
    ref: function maxArea(height) {
      let lo = 0;
      let hi = height.length - 1;
      let best = 0;
      while (lo < hi) {
        best = Math.max(best, Math.min(height[lo], height[hi]) * (hi - lo));
        if (height[lo] < height[hi]) lo++;
        else hi--;
      }
      return best;
    },
    tests: [[[1, 8, 6, 2, 5, 4, 8, 3, 7]], [[1, 1]], [[4, 3, 2, 1, 4]], [[1, 2, 1]], [[0, 0]], [[10000, 1, 1, 1, 10000]], [ints(34, 9000, 0, 10000)]],
  }),

  problem('trapping-rain-water', {
    statement: `
Given \`n\` non-negative integers representing an elevation map where the width of each bar is \`1\`, compute **how much water it can trap** after raining.
`,
    params: ['height'],
    constraints: ['n == height.length', '1 <= n <= 2 * 10^4', '0 <= height[i] <= 10^5'],
    explain: ['Six units of water are trapped between the bars.', 'Nine units are trapped in the wide pit in the middle.'],
    known: [6, 9],
    ref: function trap(height) {
      let lo = 0;
      let hi = height.length - 1;
      let leftMax = 0;
      let rightMax = 0;
      let water = 0;
      while (lo < hi) {
        if (height[lo] < height[hi]) {
          leftMax = Math.max(leftMax, height[lo]);
          water += leftMax - height[lo++];
        } else {
          rightMax = Math.max(rightMax, height[hi]);
          water += rightMax - height[hi--];
        }
      }
      return water;
    },
    tests: [[[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], [[4, 2, 0, 3, 2, 5]], [[1]], [[3, 0, 3]], [[5, 4, 3, 2, 1]], [[2, 0, 2, 0, 2]], [ints(35, 9000, 0, 100000)]],
  }),

  problem('move-zeroes', {
    statement: `
Given an integer array \`nums\`, **move all the \`0\`s to the end** while keeping the relative order of the non-zero elements. Return the resulting array.

Try to do it without making a copy of the array.
`,
    params: ['nums'],
    constraints: ['1 <= nums.length <= 10^4', '-2^31 <= nums[i] <= 2^31 - 1'],
    explain: ['The non-zero numbers keep their order and the zeros move to the end.', 'A single zero stays where it is.'],
    known: [[1, 3, 12, 0, 0], [0]],
    ref: function moveZeroes(nums) { return [...nums.filter((n) => n !== 0), ...nums.filter((n) => n === 0)]; },
    tests: [[[0, 1, 0, 3, 12]], [[0]], [[1, 2, 3]], [[0, 0, 1]], [[4, 0, 0, 5, 0, 6]], [[-1, 0, -2, 0]], [(() => { const r = rng(36); return Array.from({ length: 8000 }, () => (r() < 0.4 ? 0 : randInt(r, -1000, 1000))); })()]],
  }),
];
