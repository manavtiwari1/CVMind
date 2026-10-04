import { problem, rng, randInt } from './_lib.mjs';

const letters = (seed, n, alphabet) => {
  const r = rng(seed);
  return Array.from({ length: n }, () => alphabet[randInt(r, 0, alphabet.length - 1)]).join('');
};

export default [
  problem('longest-substring-without-repeating-characters', {
    statement: `
Return the length of the **longest unbroken stretch of \`s\` in which no character appears twice**.

The stretch must be contiguous: you cannot skip characters.
`,
    params: ['s'],
    constraints: ['0 <= s.length <= 5 * 10^4', 's may contain letters, digits, symbols and spaces'],
    explain: ['"zxyw" has four different characters; any longer stretch repeats one.', 'With only one distinct character, the best stretch is one long.'],
    known: [4, 1],
    ref: function lengthOfLongestSubstring(s) {
      const last = new Map();
      let start = 0;
      let best = 0;
      for (let i = 0; i < s.length; i++) {
        if (last.has(s[i]) && last.get(s[i]) >= start) start = last.get(s[i]) + 1;
        last.set(s[i], i);
        best = Math.max(best, i - start + 1);
      }
      return best;
    },
    tests: [['xyzxyw'], ['qqqq'], ['cdcf'], [''], [' '], ['au'], ['deed'], ['kllmnok'], [letters(7, 4000, 'abcdefghijklmnopqrstuvwxyz0123456789 ')]],
  }),

  problem('longest-repeating-character-replacement', {
    statement: `
\`s\` is a string of capital letters. You may **repaint at most \`k\` of its characters**, turning each into any capital letter you like.

After repainting, what is the longest stretch of \`s\` in which every character is the same letter? Return its length.
`,
    params: ['s', 'k'],
    constraints: ['1 <= s.length <= 10^5', 's uses only capital English letters', '0 <= k <= s.length'],
    explain: ['Repaint one "X" to get "YYY" next to the other letter; four in a row would need two repaints.', 'Repaint the "N" and the whole string is "M".'],
    known: [3, 5],
    ref: function characterReplacement(s, k) {
      const count = new Array(26).fill(0);
      let left = 0;
      let maxCount = 0;
      let best = 0;
      for (let right = 0; right < s.length; right++) {
        maxCount = Math.max(maxCount, ++count[s.charCodeAt(right) - 65]);
        while (right - left + 1 - maxCount > k) count[s.charCodeAt(left++) - 65]--;
        best = Math.max(best, right - left + 1);
      }
      return best;
    },
    tests: [['XYYX', 1], ['MMNMM', 1], ['AAAA', 0], ['ABCDE', 0], ['ABCDE', 2], ['A', 1], ['ABBB', 2], [letters(11, 3000, 'ABC'), 50], [letters(12, 3000, 'ABCDEFGH'), 5]],
  }),

  problem('permutation-in-string', {
    statement: `
Return \`true\` if \`s2\` has a stretch of exactly \`s1.length\` characters that **uses the same letters as \`s1\`, just possibly shuffled**. Otherwise return \`false\`.
`,
    params: ['s1', 's2'],
    constraints: ['1 <= s1.length, s2.length <= 10^4', 'Both strings use only lowercase English letters'],
    explain: ['"yx" appears in s2 and is "xy" reordered.', '"x" and "y" never sit next to each other in s2.'],
    known: [true, false],
    ref: function checkInclusion(s1, s2) {
      if (s1.length > s2.length) return false;
      const need = new Array(26).fill(0);
      const have = new Array(26).fill(0);
      for (let i = 0; i < s1.length; i++) {
        need[s1.charCodeAt(i) - 97]++;
        have[s2.charCodeAt(i) - 97]++;
      }
      const same = () => need.every((v, i) => v === have[i]);
      if (same()) return true;
      for (let i = s1.length; i < s2.length; i++) {
        have[s2.charCodeAt(i) - 97]++;
        have[s2.charCodeAt(i - s1.length) - 97]--;
        if (same()) return true;
      }
      return false;
    },
    tests: [['xy', 'abyxc'], ['xy', 'axcyb'], ['a', 'a'], ['abc', 'ab'], ['tea', 'xate'], ['hello', 'ooolleoooleh'], ['abc', 'cccccbabbbaaaa'], [letters(3, 50, 'abc'), letters(4, 6000, 'abc')]],
  }),

  problem('minimum-window-substring', {
    statement: `
Find the **shortest stretch of \`s\` that contains every character of \`t\`**, counting repeats (if \`t\` has two \`a\`s, the stretch needs two \`a\`s). Return that stretch, or \`""\` if none exists.

When several shortest stretches exist, return the leftmost one.
`,
    params: ['s', 't'],
    constraints: ['1 <= s.length, t.length <= 10^5', 'Both strings use only English letters (either case)'],
    explain: ['"BZAXC" holds an A, a B and a C, and no shorter stretch does.', 'There is only one "q" to cover the two in t.'],
    known: ['BZAXC', ''],
    ref: function minWindow(s, t) {
      if (!t.length || t.length > s.length) return '';
      const need = new Map();
      for (const c of t) need.set(c, (need.get(c) || 0) + 1);
      let missing = t.length;
      let bestStart = 0;
      let bestLen = Infinity;
      let left = 0;
      for (let right = 0; right < s.length; right++) {
        const c = s[right];
        if (need.has(c)) {
          if (need.get(c) > 0) missing--;
          need.set(c, need.get(c) - 1);
        }
        while (missing === 0) {
          if (right - left + 1 < bestLen) { bestLen = right - left + 1; bestStart = left; }
          const l = s[left++];
          if (need.has(l)) {
            need.set(l, need.get(l) + 1);
            if (need.get(l) > 0) missing++;
          }
        }
      }
      return bestLen === Infinity ? '' : s.slice(bestStart, bestStart + bestLen);
    },
    tests: [['XAYBZAXC', 'ABC'], ['q', 'qq'], ['q', 'q'], ['ab', 'b'], ['aab', 'aab'], ['abc', 'cba'], ['bbaa', 'aba'], ['wxyzw', 'ww'], [letters(21, 5000, 'abcdefghij'), 'jjiihhggff']],
  }),

  problem('sliding-window-maximum', {
    statement: `
A window exactly \`k\` numbers wide starts at the left end of \`nums\` and slides right one step at a time until it reaches the right end.

Return the **largest number inside the window at each of its positions**, in order.
`,
    params: ['nums', 'k'],
    constraints: ['1 <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4', '1 <= k <= nums.length'],
    explain: ['Windows [2 7 3], [7 3 1], [3 1 8] and [1 8 4] peak at 7, 7, 8 and 8.', 'With k = 1 every number is its own window.'],
    known: [[7, 7, 8, 8], [5, -2]],
    ref: function maxSlidingWindow(nums, k) {
      const out = [];
      const dq = []; // indexes, values decreasing
      for (let i = 0; i < nums.length; i++) {
        while (dq.length && dq[0] <= i - k) dq.shift();
        while (dq.length && nums[dq[dq.length - 1]] <= nums[i]) dq.pop();
        dq.push(i);
        if (i >= k - 1) out.push(nums[dq[0]]);
      }
      return out;
    },
    tests: [
      [[2, 7, 3, 1, 8, 4], 3],
      [[5, -2], 1],
      [[6], 1],
      [[3, 9], 2],
      [[8, 6, 4, 2], 2],
      [[1, 2, 3, 4, 5], 5],
      [[7, 2, 4], 2],
      [(() => { const r = rng(5); return Array.from({ length: 8000 }, () => randInt(r, -10000, 10000)); })(), 50],
    ],
  }),

  problem('find-all-anagrams-in-a-string', {
    statement: `
Slide over \`s\` looking at every stretch that is as long as \`p\`. Return the **starting positions of the stretches that are rearrangements of \`p\`**, from left to right.
`,
    params: ['s', 'p'],
    constraints: ['1 <= s.length, p.length <= 3 * 10^4', 'Both strings use only lowercase English letters'],
    explain: ['"xyz" at 0, "zyx" at 3 and "yxz" at 4 all use x, y and z once.', '"pq" at 0 and "qp" at 2 match; "qq" at 1 does not.'],
    known: [[0, 3, 4], [0, 2]],
    ref: function findAnagrams(s, p) {
      const out = [];
      if (p.length > s.length) return out;
      const need = new Array(26).fill(0);
      const have = new Array(26).fill(0);
      for (let i = 0; i < p.length; i++) { need[p.charCodeAt(i) - 97]++; have[s.charCodeAt(i) - 97]++; }
      const same = () => need.every((v, i) => v === have[i]);
      if (same()) out.push(0);
      for (let i = p.length; i < s.length; i++) {
        have[s.charCodeAt(i) - 97]++;
        have[s.charCodeAt(i - p.length) - 97]--;
        if (same()) out.push(i - p.length + 1);
      }
      return out;
    },
    tests: [['xyzzyxz', 'xyz'], ['pqqp', 'pq'], ['a', 'b'], ['abc', 'abcd'], ['aaaaaaaaaa', 'aaa'], ['baa', 'aa'], [letters(31, 6000, 'ab'), 'aabab']],
  }),

  problem('minimum-size-subarray-sum', {
    statement: `
Every number in \`nums\` is **positive**. Find the **shortest unbroken run of numbers whose total is at least \`target\`** and return how many numbers it has.

Return \`0\` if even the whole array falls short.
`,
    params: ['target', 'nums'],
    constraints: ['1 <= target <= 10^9', '1 <= nums.length <= 10^5', '1 <= nums[i] <= 10^4'],
    explain: ['4 + 2 + 5 = 11 reaches 9; no two neighbours add up to 9.', 'The 6 alone is enough.'],
    known: [3, 1],
    ref: function minSubArrayLen(target, nums) {
      let left = 0;
      let sum = 0;
      let best = Infinity;
      for (let right = 0; right < nums.length; right++) {
        sum += nums[right];
        while (sum >= target) {
          best = Math.min(best, right - left + 1);
          sum -= nums[left++];
        }
      }
      return best === Infinity ? 0 : best;
    },
    tests: [
      [9, [1, 4, 2, 5, 3]],
      [6, [2, 6, 1]],
      [12, [1, 1, 1, 1, 1, 1, 1, 1]],
      [15, [1, 2, 3, 4, 5]],
      [5, [5]],
      [6, [10, 2, 3]],
      [100, [50, 50]],
      [213, (() => { const r = rng(9); return Array.from({ length: 9000 }, () => randInt(r, 1, 10)); })()],
    ],
  }),
];
