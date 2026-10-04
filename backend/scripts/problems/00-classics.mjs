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
A shop lists its item prices in \`nums\`, and you hold a gift card worth exactly \`target\`. Pick **two different items whose prices add up to \`target\`** and return their positions (0-based) as a two-element array.

Every input has exactly one such pair, and an item cannot be picked twice. The two positions may come back in either order.
`,
    params: ['nums', 'target'],
    meta: { compare: 'unordered' },
    constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i], target <= 10^9', 'Exactly one pair reaches target'],
    explain: ['9 + 1 = 10, and those prices sit at positions 1 and 2.', '-3 + 12 = 9, at positions 1 and 3.'],
    known: [[1, 2], [1, 3]],
    ref: function twoSum(nums, target) {
      const seen = new Map();
      for (let i = 0; i < nums.length; i++) {
        if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
        seen.set(nums[i], i);
      }
      return [];
    },
    tests: [[[4, 9, 1, 7], 10], [[5, -3, 8, 12], 9], [[6, 6], 12], [[-1, -2, -3, -4, -5], -8], [[0, 4, 3, 0], 0], [[1, 5, 9, 14], 23], uniquePair(11, 400), uniquePair(12, 2000)],
  }),

  problem('valid-anagram', {
    statement: `
Two words are **anagrams** when one can be turned into the other just by reordering its letters, with every letter used exactly as many times as it appears.

Return \`true\` if \`s\` and \`t\` are anagrams of each other, and \`false\` otherwise.
`,
    params: ['s', 't'],
    constraints: ['1 <= s.length, t.length <= 5 * 10^4', 'Both strings use only lowercase English letters'],
    explain: ['Both words use g, h, i, n and t exactly once.', '"apple" has an "l" that "paper" does not.'],
    known: [true, false],
    ref: function isAnagram(s, t) {
      if (s.length !== t.length) return false;
      const count = new Array(26).fill(0);
      for (let i = 0; i < s.length; i++) { count[s.charCodeAt(i) - 97]++; count[t.charCodeAt(i) - 97]--; }
      return count.every((c) => c === 0);
    },
    tests: [['night', 'thing'], ['apple', 'paper'],['a', 'a'], ['ab', 'a'], ['aacc', 'ccac'], ['listen', 'silent'], ['abc'.repeat(5000), 'cba'.repeat(5000)], ['abc'.repeat(5000), 'cba'.repeat(4999) + 'cbb']],
  }),

  problem('contains-duplicate', {
    statement: `
A ticket scanner records the ticket numbers it sees in \`nums\`. Return \`true\` if **some ticket number was scanned more than once**, and \`false\` if all of them are different.
`,
    params: ['nums'],
    constraints: ['1 <= nums.length <= 10^5', '-10^9 <= nums[i] <= 10^9'],
    explain: ['Ticket 3 was scanned twice.', 'All three tickets are different.'],
    known: [true, false],
    ref: function containsDuplicate(nums) { return new Set(nums).size !== nums.length; },
    tests: [[[7, 3, 9, 3]], [[10, 20, 30]], [[1]], [[2, 8, 8, 5, 2, 9]], [[0, 0]], [[-5, 5, -5]], [Array.from({ length: 8000 }, (_, i) => i * 3 - 4000)], [[...Array.from({ length: 8000 }, (_, i) => i * 3 - 4000), 2999]]],
  }),

  problem('group-anagrams', {
    statement: `
Sort the words in \`strs\` into groups so that **two words share a group exactly when they are anagrams** (made of the same letters, the same number of times). Return the list of groups.

The groups, and the words inside each group, may be returned in any order.
`,
    params: ['strs'],
    meta: { compare: 'unordered-deep' },
    constraints: ['1 <= strs.length <= 10^4', '0 <= strs[i].length <= 100', 'Words use only lowercase English letters'],
    explain: ['"dusty"/"study", "night"/"thing" and "act"/"cat" each form a pair.', 'Words with different letters stay in separate groups.'],
    ref: function groupAnagrams(strs) {
      const groups = new Map();
      for (const s of strs) {
        const key = s.split('').sort().join('');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(s);
      }
      return [...groups.values()];
    },
    tests: [[['dusty', 'night', 'act', 'study', 'thing', 'cat']], [['abc', 'x']], [['z']], [['']], [['', '']], [['abc', 'bca', 'cab', 'xyz']], [['ab', 'ba', 'ab', 'ba']], [(() => { const r = rng(21); return Array.from({ length: 1500 }, () => Array.from({ length: randInt(r, 1, 6) }, () => 'abcd'[randInt(r, 0, 3)]).join('')); })()]],
  }),

  problem('top-k-frequent-elements', {
    statement: `
\`nums\` is a log of product ids, one per sale. Return the **\`k\` ids that were sold most often**, in any order.

The inputs are chosen so the answer is unambiguous: nothing outside the answer ties with the \`k\`th best seller.
`,
    params: ['nums', 'k'],
    meta: { compare: 'unordered' },
    constraints: ['1 <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4', 'k is between 1 and the number of distinct ids', 'The answer is unique'],
    explain: ['8 was sold three times, more than any other id.', '6 sold four times and 5 sold three times.'],
    known: [[8], [6, 5]],
    ref: function topKFrequent(nums, k) {
      const count = new Map();
      for (const n of nums) count.set(n, (count.get(n) || 0) + 1);
      return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map((e) => e[0]);
    },
    tests: [
      [[7, 7, 8, 8, 8, 9], 1],
      [[4, 4, 5, 5, 5, 6, 6, 6, 6], 2],
      [[3], 1],
      [[4, 1, -1, 2, -1, 2, 3, -1, 2, 2], 2],
      [[5, 5, 5, 6, 6, 7], 1],
      [[1, 2, 2, 3, 3, 3], 3],
      (() => { const out = []; for (let v = 1; v <= 60; v++) for (let c = 0; c < v; c++) out.push(v * 7 - 200); return [out, 10]; })(),
    ],
  }),

  problem('product-of-array-except-self', {
    statement: `
For each position \`i\` of \`nums\`, work out what you get by **multiplying every other number together**, leaving \`nums[i]\` out. Return these results as an array of the same length.

Aim for **O(n)** time, and do not use division.
`,
    params: ['nums'],
    constraints: ['2 <= nums.length <= 10^5', '-30 <= nums[i] <= 30', 'Every prefix and suffix product fits in a 32-bit integer'],
    explain: ['5 x 3 = 15, 2 x 3 = 6 and 2 x 5 = 10.', 'Only the position holding the zero avoids multiplying by zero: 3 x 4 x 2 = 24.'],
    known: [[15, 6, 10], [0, 24, 0, 0]],
    ref: function productExceptSelf(nums) {
      const out = new Array(nums.length).fill(1);
      let left = 1;
      for (let i = 0; i < nums.length; i++) { out[i] = left; left *= nums[i]; }
      let right = 1;
      for (let i = nums.length - 1; i >= 0; i--) { out[i] *= right; right *= nums[i]; }
      return out.map((v) => (v === 0 ? 0 : v));
    },
    tests: [[[2, 5, 3]], [[3, 0, 4, 2]], [[2, 3]], [[0, 0]], [[1, 1, 1]], [[-2, 5, 0, 4]], [(() => { const r = rng(22); return Array.from({ length: 3000 }, () => (r() < 0.5 ? -1 : 1)); })()]],
  }),

  problem('longest-consecutive-sequence', {
    statement: `
Pages fell out of a book and were picked up in random order; \`nums\` holds their page numbers. Find the **longest stretch of back-to-back page numbers** (like 7, 8, 9) you can assemble and return how many pages it has.

The numbers can be anywhere in the array, and repeats count once. Aim for **O(n)** time.
`,
    params: ['nums'],
    constraints: ['0 <= nums.length <= 10^5', '-10^9 <= nums[i] <= 10^9'],
    explain: ['10, 11, 12, 13 is the longest stretch.', '-1, 0, 1 beats 8, 9.'],
    known: [4, 3],
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
    tests: [[[10, 5, 12, 3, 11, 4, 13]], [[9, 1, -1, 0, 8]], [[]], [[2, 3, 1, 3]], [[5]], [[-3, -2, -1, 10, 11]], [ints(23, 6000, -5000, 5000)]],
  }),

  problem('maximum-subarray', {
    statement: `
\`nums\` holds a trader's profit (or loss, when negative) for each day. Choose **one unbroken run of at least one day** and return the biggest total profit such a run can have.
`,
    params: ['nums'],
    constraints: ['1 <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4'],
    explain: ['Days 3 to 5 give 5 - 1 + 2 = 6.', 'With one day, its value is the answer, even when negative.'],
    known: [6, -7],
    ref: function maxSubArray(nums) {
      let best = nums[0];
      let cur = nums[0];
      for (let i = 1; i < nums.length; i++) {
        cur = Math.max(nums[i], cur + nums[i]);
        best = Math.max(best, cur);
      }
      return best;
    },
    tests: [[[3, -4, 5, -1, 2, -6, 4]], [[-7]], [[2, 2, -1, 3]], [[1]], [[-2, -1]], [[0, 0, 0]], [ints(24, 9000, -10000, 10000)]],
  }),

  problem('majority-element', {
    statement: `
An election's ballots are listed in \`nums\`, one candidate id per ballot. One candidate won **more than half of all the ballots**. Return that candidate's id.
`,
    params: ['nums'],
    constraints: ['n == nums.length', '1 <= n <= 5 * 10^4', '-10^9 <= nums[i] <= 10^9', 'Some value fills more than half the array'],
    explain: ['4 got two of the three ballots.', '8 got three of the five ballots.'],
    known: [4, 8],
    ref: function majorityElement(nums) {
      let candidate = 0;
      let votes = 0;
      for (const n of nums) {
        if (votes === 0) candidate = n;
        votes += n === candidate ? 1 : -1;
      }
      return candidate;
    },
    tests: [[[4, 9, 4]], [[1, 8, 8, 2, 8]], [[1]], [[6, 6, 6, 7, 7]], [[-1, -1, 2, 3, -1]], (() => { const r = rng(25); const a = Array.from({ length: 4001 }, () => 42); for (let i = 0; i < 3999; i++) a.push(randInt(r, -100, 100)); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return [a]; })()],
  }),

  problem('sort-colors', {
    statement: `
A conveyor carries parcels tagged \`0\` (express), \`1\` (standard) or \`2\` (economy), listed in \`nums\`. Rearrange them so **all 0s come first, then all 1s, then all 2s**, and return the result.

Do it **without a library sort**; one pass over the array is enough.
`,
    params: ['nums'],
    constraints: ['n == nums.length', '1 <= n <= 300', 'Every value is 0, 1 or 2'],
    explain: ['Both 0s move to the front and both 2s to the back.', 'The 1 moves ahead of the 2.'],
    known: [[0, 0, 1, 2, 2], [1, 2]],
    ref: function sortColors(nums) { return [...nums].sort((a, b) => a - b); },
    tests: [[[1, 2, 0, 0, 2]], [[2, 1]], [[0]], [[2, 2, 2]], [[1, 0]], [[2, 1, 0, 2, 1, 0, 2, 1, 0]], [ints(26, 300, 0, 2)]],
  }),

  problem('valid-palindrome', {
    statement: `
Ignore case, and throw away everything in \`s\` that is not a letter or a digit. Return \`true\` if **what is left reads the same from both ends**, and \`false\` otherwise.
`,
    params: ['s'],
    constraints: ['1 <= s.length <= 2 * 10^5', 's contains printable ASCII characters only'],
    explain: ['Cleaned up, it is "wasitacaroracatisaw", the same backwards.', '"steponnocats" reversed is "stacnonopets".'],
    known: [true, false],
    ref: function isPalindrome(s) {
      const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleaned === cleaned.split('').reverse().join('');
    },
    tests: [['Was it a car or a cat I saw?'], ['Step on no cats'], ['!!'], ['1b'], ['.,'], ['ab_a'], ['No lemon, no melon'], ['a'.repeat(50000) + 'b' + 'a'.repeat(50000)], ['a'.repeat(50000) + 'bc' + 'a'.repeat(50000)]],
  }),

  problem('two-sum-ii-input-array-is-sorted', {
    statement: `
\`numbers\` is already **sorted from smallest to largest**. Find the two entries that add up to \`target\` and return their positions **counting from 1**, smaller position first.

There is exactly one such pair, and one entry cannot be used twice. Solve it with **O(1) extra memory**.
`,
    params: ['numbers', 'target'],
    constraints: ['2 <= numbers.length <= 3 * 10^4', '-1000 <= numbers[i], target <= 1000', 'numbers never decreases', 'Exactly one pair reaches target'],
    explain: ['4 + 8 = 12, at positions 3 and 4.', '-2 + 0 = -2, at positions 2 and 3.'],
    known: [[3, 4], [2, 3]],
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
    tests: [[[1, 3, 4, 8, 10], 12], [[-5, -2, 0, 6], -2], [[-3, 1], -2], [[1, 2, 3, 4, 4, 9, 56, 90], 8], [[5, 25, 75], 100], (() => { const a = Array.from({ length: 1500 }, (_, i) => i - 700); return [a, a[1498] + a[1499]]; })(), (() => { const a = Array.from({ length: 1500 }, (_, i) => i - 700); return [a, a[0] + a[1]]; })()],
  }),

  problem('3sum', {
    statement: `
Find every way to **pick three entries of \`nums\` (at three different positions) whose values sum to zero**. Return the distinct value triples: two triples with the same three values count once.

Triples, and the values inside each, can be in any order.
`,
    params: ['nums'],
    meta: { compare: 'unordered-deep' },
    constraints: ['3 <= nums.length <= 3000', '-10^5 <= nums[i] <= 10^5'],
    explain: ['All values are positive, so nothing sums to zero.', '-3 + 1 + 2 = 0 is the only zero-sum triple.'],
    known: [[], [[-3, 1, 2]]],
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
    tests: [[[1, 2, 3]], [[-3, 1, 2, 0]], [[-4, 2, 2, -1, 3, -2]], [[0, 0, 0, 0]], [[-2, 0, 1, 1, 2]], [[3, -2, 1, 0]], [ints(32, 300, -100, 100)], [ints(33, 600, -1000, 1000)]],
  }),

  problem('container-with-most-water', {
    title: 'Two Fence Posts',
    slug: 'two-fence-posts',
    statement: `
Fence posts stand one metre apart along a ditch; post \`i\` is \`height[i]\` metres tall. A tarp stretched between **any two posts** holds water up to the shorter post, so the pair at positions \`i < j\` holds \`min(height[i], height[j]) * (j - i)\`.

Return the **most water any pair of posts can hold**.
`,
    params: ['height'],
    constraints: ['n == height.length', '2 <= n <= 10^5', '0 <= height[i] <= 10^4'],
    explain: ['Posts 0 and 4 hold min(3, 5) x 4 = 12.', 'The only pair holds min(2, 2) x 1 = 2.'],
    known: [12, 2],
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
    tests: [[[3, 1, 6, 2, 5]], [[2, 2]], [[5, 2, 3, 2, 5]], [[1, 2, 1]], [[0, 0]], [[10000, 1, 1, 1, 10000]], [ints(34, 9000, 0, 10000)]],
  }),

  problem('trapping-rain-water', {
    title: 'Puddles Between Pillars',
    slug: 'puddles-between-pillars',
    statement: `
A row of stone pillars, each one unit wide, has heights \`height\`. After a storm, water collects in every dip that has a taller pillar somewhere on **both** sides; water above a pillar rises to the lower of the tallest pillars to its left and right.

Return the **total units of water** left standing on the pillars.
`,
    params: ['height'],
    constraints: ['n == height.length', '1 <= n <= 2 * 10^4', '0 <= height[i] <= 10^5'],
    explain: ['3 + 1 + 3 = 7 units sit between the walls of height 3 and 4.', 'Each of the two dips of height 1 holds one unit.'],
    known: [7, 2],
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
    tests: [[[3, 0, 2, 0, 4]], [[2, 1, 3, 1, 2]], [[1]], [[3, 0, 3]], [[5, 4, 3, 2, 1]], [[2, 0, 2, 0, 2]], [ints(35, 9000, 0, 100000)]],
  }),

  problem('move-zeroes', {
    statement: `
Shift **every zero in \`nums\` to the back** of the array. The other numbers must stay in the order they started in. Return the rearranged array.

Try to do it in place, without building a second array.
`,
    params: ['nums'],
    constraints: ['1 <= nums.length <= 10^4', '-2^31 <= nums[i] <= 2^31 - 1'],
    explain: ['5, 7, 2 keep their order; both zeros go to the back.', 'The zero moves behind the 9.'],
    known: [[5, 7, 2, 0, 0], [9, 0]],
    ref: function moveZeroes(nums) { return [...nums.filter((n) => n !== 0), ...nums.filter((n) => n === 0)]; },
    tests: [[[5, 0, 0, 7, 2]], [[0, 9]], [[0]], [[1, 2, 3]], [[0, 0, 1]], [[4, 0, 0, 5, 0, 6]], [[-1, 0, -2, 0]], [(() => { const r = rng(36); return Array.from({ length: 8000 }, () => (r() < 0.4 ? 0 : randInt(r, -1000, 1000))); })()]],
  }),
];
