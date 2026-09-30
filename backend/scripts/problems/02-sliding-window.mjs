import { problem, rng, randInt } from './_lib.mjs';

const letters = (seed, n, alphabet) => {
  const r = rng(seed);
  return Array.from({ length: n }, () => alphabet[randInt(r, 0, alphabet.length - 1)]).join('');
};

export default [
  problem('longest-substring-without-repeating-characters', {
    statement: `
Given a string \`s\`, find the length of the **longest substring** that contains no repeated characters.

A substring is a contiguous run of characters inside the string.
`,
    params: ['s'],
    constraints: ['0 <= s.length <= 5 * 10^4', 's consists of English letters, digits, symbols and spaces'],
    explain: ['The longest such substring is "abc", so the answer is 3.', 'Every character is the same, so the longest substring is a single "b".'],
    known: [3, 1],
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
    tests: [['abcabcbb'], ['bbbbb'], ['pwwkew'], [''], [' '], ['au'], ['dvdf'], ['abba'], ['tmmzuxt'], [letters(7, 4000, 'abcdefghijklmnopqrstuvwxyz0123456789 ')]],
  }),

  problem('longest-repeating-character-replacement', {
    statement: `
You are given a string \`s\` of uppercase English letters and an integer \`k\`. In one operation you can change any character of \`s\` into any other uppercase letter. You may perform **at most \`k\`** operations.

Return the length of the longest substring made of a single repeated letter that you can obtain.
`,
    params: ['s', 'k'],
    constraints: ['1 <= s.length <= 10^5', 's consists of uppercase English letters', '0 <= k <= s.length'],
    explain: ['Replace the two "A"s with "B"s (or the other way round) to get "BBBB".', 'Replace the "B" in the middle to get "AAAA".'],
    known: [4, 4],
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
    tests: [['ABAB', 2], ['AABABBA', 1], ['AAAA', 0], ['ABCDE', 0], ['ABCDE', 2], ['A', 1], ['ABBB', 2], [letters(11, 3000, 'ABC'), 50], [letters(12, 3000, 'ABCDEFGH'), 5]],
  }),

  problem('permutation-in-string', {
    statement: `
Given two strings \`s1\` and \`s2\`, return \`true\` if \`s2\` contains a **permutation** of \`s1\` as a substring, and \`false\` otherwise.

In other words, return \`true\` if some substring of \`s2\` has exactly the same letters as \`s1\`, in any order.
`,
    params: ['s1', 's2'],
    constraints: ['1 <= s1.length, s2.length <= 10^4', 's1 and s2 consist of lowercase English letters'],
    explain: ['"ba" is a permutation of "ab" and appears in s2.', 'No substring of s2 contains exactly one "a" and one "b" side by side.'],
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
    tests: [['ab', 'eidbaooo'], ['ab', 'eidboaoo'], ['a', 'a'], ['abc', 'ab'], ['adc', 'dcda'], ['hello', 'ooolleoooleh'], ['abc', 'cccccbabbbaaaa'], [letters(3, 50, 'abc'), letters(4, 6000, 'abc')]],
  }),

  problem('minimum-window-substring', {
    statement: `
Given two strings \`s\` and \`t\`, return the **shortest substring of \`s\`** that contains every character of \`t\`, including duplicates. If there is no such substring, return the empty string \`""\`.

If several windows share the minimum length, return the one that starts first.
`,
    params: ['s', 't'],
    constraints: ['1 <= s.length, t.length <= 10^5', 's and t consist of uppercase and lowercase English letters'],
    explain: ['"BANC" is the shortest window that contains A, B and C.', 'The whole string is the window.', 'The single "a" cannot cover the two "a"s in t, so there is no window.'],
    samples: 3,
    known: ['BANC', 'a', ''],
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
    tests: [['ADOBECODEBANC', 'ABC'], ['a', 'a'], ['a', 'aa'], ['ab', 'b'], ['aab', 'aab'], ['abc', 'cba'], ['bbaa', 'aba'], ['cabwefgewcwaefgcf', 'cae'], [letters(21, 5000, 'abcdefghij'), 'jjiihhggff']],
  }),

  problem('sliding-window-maximum', {
    statement: `
You are given an integer array \`nums\` and a window size \`k\`. The window starts at the very left of the array and moves one position to the right each step, always covering exactly \`k\` numbers.

Return an array containing the **maximum value of the window** at every position.
`,
    params: ['nums', 'k'],
    constraints: ['1 <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4', '1 <= k <= nums.length'],
    explain: ['Window position -> maximum: [1 3 -1] -> 3, [3 -1 -3] -> 3, [-1 -3 5] -> 5, [-3 5 3] -> 5, [5 3 6] -> 6, [3 6 7] -> 7.', 'A single window holds the only element.'],
    known: [[3, 3, 5, 5, 6, 7], [1]],
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
      [[1, 3, -1, -3, 5, 3, 6, 7], 3],
      [[1], 1],
      [[1, -1], 1],
      [[9, 11], 2],
      [[4, 3, 2, 1], 2],
      [[1, 2, 3, 4, 5], 5],
      [[7, 2, 4], 2],
      [(() => { const r = rng(5); return Array.from({ length: 8000 }, () => randInt(r, -10000, 10000)); })(), 50],
    ],
  }),

  problem('find-all-anagrams-in-a-string', {
    statement: `
Given two strings \`s\` and \`p\`, return the **start index of every substring of \`s\` that is an anagram of \`p\`**, in increasing order.

An anagram uses exactly the same letters as the original, in any order.
`,
    params: ['s', 'p'],
    constraints: ['1 <= s.length, p.length <= 3 * 10^4', 's and p consist of lowercase English letters'],
    explain: ['The substring starting at 0 is "cba" and the one starting at 6 is "bac". Both are anagrams of "abc".', 'Substrings starting at 0, 1 and 2 are "ab", "ba" and "ab".'],
    known: [[0, 6], [0, 1, 2]],
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
    tests: [['cbaebabacd', 'abc'], ['abab', 'ab'], ['a', 'b'], ['abc', 'abcd'], ['aaaaaaaaaa', 'aaa'], ['baa', 'aa'], [letters(31, 6000, 'ab'), 'aabab']],
  }),

  problem('minimum-size-subarray-sum', {
    statement: `
Given an array of **positive** integers \`nums\` and a positive integer \`target\`, return the **minimal length of a contiguous subarray** whose sum is greater than or equal to \`target\`.

If no such subarray exists, return \`0\`.
`,
    params: ['target', 'nums'],
    constraints: ['1 <= target <= 10^9', '1 <= nums.length <= 10^5', '1 <= nums[i] <= 10^4'],
    explain: ['The subarray [4, 3] has sum 7 and is the shortest one that reaches the target.', 'The single element 4 is enough.'],
    known: [2, 1],
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
      [7, [2, 3, 1, 2, 4, 3]],
      [4, [1, 4, 4]],
      [11, [1, 1, 1, 1, 1, 1, 1, 1]],
      [15, [1, 2, 3, 4, 5]],
      [5, [5]],
      [6, [10, 2, 3]],
      [100, [50, 50]],
      [213, (() => { const r = rng(9); return Array.from({ length: 9000 }, () => randInt(r, 1, 10)); })()],
    ],
  }),
];
