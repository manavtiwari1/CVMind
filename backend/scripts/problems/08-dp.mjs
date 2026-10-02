import { problem, rng, randInt } from './_lib.mjs';

const ints = (seed, n, lo, hi) => {
  const r = rng(seed);
  return Array.from({ length: n }, () => randInt(r, lo, hi));
};
const word = (seed, n, alphabet) => {
  const r = rng(seed);
  return Array.from({ length: n }, () => alphabet[randInt(r, 0, alphabet.length - 1)]).join('');
};

export default [
  problem('min-cost-climbing-stairs', {
    statement: `
You are given an array \`cost\` where \`cost[i]\` is the price of stepping **off** stair \`i\`. After paying the cost you can climb **one or two** stairs.

You may start from stair \`0\` or stair \`1\`. Return the **minimum total cost** to reach the top of the floor, which is one step past the last stair.
`,
    params: ['cost'],
    constraints: ['2 <= cost.length <= 1000', '0 <= cost[i] <= 999'],
    explain: ['Start at index 1, pay 15 and climb two steps to the top.', 'Start at index 0 and step on the stairs of cost 1 only, paying 6 in total.'],
    known: [15, 6],
    ref: function minCostClimbingStairs(cost) {
      let a = 0;
      let b = 0;
      for (let i = 2; i <= cost.length; i++) [a, b] = [b, Math.min(b + cost[i - 1], a + cost[i - 2])];
      return b;
    },
    tests: [[[10, 15, 20]], [[1, 100, 1, 1, 1, 100, 1, 1, 100, 1]], [[0, 0]], [[5, 5]], [[0, 2, 2, 1]], [ints(101, 1000, 0, 999)]],
  }),

  problem('house-robber', {
    statement: `
You are a robber planning to rob houses along a street. Each house \`i\` holds \`nums[i]\` dollars, but **adjacent houses have linked alarms**: robbing two neighbouring houses sets off the alarm.

Return the **maximum amount** you can rob without triggering the alarm.
`,
    params: ['nums'],
    constraints: ['1 <= nums.length <= 100', '0 <= nums[i] <= 400'],
    explain: ['Rob houses 0 and 2 for 1 + 3 = 4.', 'Rob houses 0, 2 and 4 for 2 + 9 + 1 = 12.'],
    known: [4, 12],
    ref: function rob(nums) {
      let take = 0;
      let skip = 0;
      for (const n of nums) [take, skip] = [skip + n, Math.max(take, skip)];
      return Math.max(take, skip);
    },
    tests: [[[1, 2, 3, 1]], [[2, 7, 9, 3, 1]], [[5]], [[2, 1]], [[0, 0, 0]], [[2, 1, 1, 2]], [ints(102, 100, 0, 400)]],
  }),

  problem('house-robber-ii', {
    statement: `
The houses are now arranged in a **circle**, so the first and the last house are neighbours. As before, robbing two adjacent houses sets off the alarm.

Given \`nums\`, where \`nums[i]\` is the money in house \`i\`, return the **maximum amount** you can rob without triggering the alarm.
`,
    params: ['nums'],
    constraints: ['1 <= nums.length <= 100', '0 <= nums[i] <= 1000'],
    explain: ['Houses 0 and 2 are neighbours in the circle, so you cannot rob both. The best is the middle house: 3.', 'Rob house 0 and house 2 for 1 + 3 = 4.', 'Houses 0 and 2 are neighbours in the circle, so the best is to rob house 2 alone: 3.'],
    samples: 3,
    known: [3, 4, 3],
    ref: function rob(nums) {
      if (nums.length === 1) return nums[0];
      const line = (arr) => { let take = 0; let skip = 0; for (const n of arr) [take, skip] = [skip + n, Math.max(take, skip)]; return Math.max(take, skip); };
      return Math.max(line(nums.slice(1)), line(nums.slice(0, -1)));
    },
    tests: [[[2, 3, 2]], [[1, 2, 3, 1]], [[1, 2, 3]], [[5]], [[1, 2]], [[200, 3, 140, 20, 10]], [[0, 0]], [ints(103, 100, 0, 1000)]],
  }),

  problem('longest-palindromic-substring', {
    statement: `
Given a string \`s\`, return its **longest palindromic substring**.

If several palindromic substrings share the maximum length, return the one that **starts first** in \`s\`.
`,
    params: ['s'],
    constraints: ['1 <= s.length <= 1000', 's consists of digits and English letters'],
    explain: ['"aba" is also valid, but "bab" starts first.', 'The longest palindrome is "bb".', 'A single character is a palindrome.'],
    samples: 3,
    known: ['bab', 'bb', 'a'],
    ref: function longestPalindrome(s) {
      let start = 0;
      let length = 1;
      const expand = (l, r) => {
        while (l >= 0 && r < s.length && s[l] === s[r]) { l--; r++; }
        const len = r - l - 1;
        if (len > length) { length = len; start = l + 1; }
      };
      for (let i = 0; i < s.length; i++) { expand(i, i); expand(i, i + 1); }
      return s.slice(start, start + length);
    },
    tests: [['babad'], ['cbbd'], ['a'], ['ac'], ['forgeeksskeegfor'], ['aaaa'], ['abcda'], [word(104, 900, 'ab')], [word(105, 1000, 'abcdefghij')]],
  }),

  problem('palindromic-substrings', {
    statement: `
Given a string \`s\`, return the **number of palindromic substrings** in it.

A substring is a contiguous sequence of characters. Substrings at different positions count separately, even if they contain the same characters.
`,
    params: ['s'],
    constraints: ['1 <= s.length <= 1000', 's consists of lowercase English letters'],
    explain: ['Three palindromes: "a", "b" and "c".', 'Six palindromes: "a", "a", "a", "aa", "aa" and "aaa".'],
    known: [3, 6],
    ref: function countSubstrings(s) {
      let count = 0;
      const expand = (l, r) => { while (l >= 0 && r < s.length && s[l] === s[r]) { count++; l--; r++; } };
      for (let i = 0; i < s.length; i++) { expand(i, i); expand(i, i + 1); }
      return count;
    },
    tests: [['abc'], ['aaa'], ['a'], ['abba'], ['racecar'], [word(106, 1000, 'ab')], [word(107, 1000, 'abcdefghijklmnopqrstuvwxyz')]],
  }),

  problem('decode-ways', {
    statement: `
A message made of capital letters is encoded as digits using the mapping \`"A" -> "1"\`, \`"B" -> "2"\`, ..., \`"Z" -> "26"\`.

Given a string \`s\` of digits, return the **number of ways to decode it**. A way is valid only if every group maps to a letter; for example \`"06"\` cannot be decoded because \`"0"\` and \`"06"\` do not map to any letter.

The answer is guaranteed to fit in a 32-bit integer.
`,
    params: ['s'],
    constraints: ['1 <= s.length <= 100', 's contains only digits and may contain leading zeros'],
    explain: ['"12" can be decoded as "AB" (1 2) or "L" (12).', '"226" can be "BZ" (2 26), "VF" (22 6) or "BBF" (2 2 6).', '"06" has no valid decoding.'],
    samples: 3,
    known: [2, 3, 0],
    ref: function numDecodings(s) {
      let prev2 = 1; // ways for the prefix two back
      let prev1 = s[0] === '0' ? 0 : 1;
      for (let i = 1; i < s.length; i++) {
        let cur = 0;
        if (s[i] !== '0') cur += prev1;
        const two = Number(s.slice(i - 1, i + 1));
        if (two >= 10 && two <= 26) cur += prev2;
        [prev2, prev1] = [prev1, cur];
      }
      return prev1;
    },
    tests: [['12'], ['226'], ['06'], ['0'], ['10'], ['27'], ['2101'], ['11106'], ['100'], ['3'.repeat(90)], [word(108, 30, '0123456789').replace(/^0/, '1')]],
  }),

  problem('coin-change', {
    statement: `
You are given an integer array \`coins\` of coin denominations and an integer \`amount\`. You have an unlimited supply of each coin.

Return the **fewest coins** needed to make up \`amount\`. If it cannot be made up by any combination of the coins, return \`-1\`.
`,
    params: ['coins', 'amount'],
    constraints: ['1 <= coins.length <= 12', '1 <= coins[i] <= 2^31 - 1', '0 <= amount <= 10^4'],
    explain: ['11 = 5 + 5 + 1, which uses three coins.', 'The amount 3 cannot be made with coins of 2.', 'The amount 0 needs no coins.'],
    samples: 3,
    known: [3, -1, 0],
    ref: function coinChange(coins, amount) {
      const INF = amount + 1;
      const dp = new Array(amount + 1).fill(INF);
      dp[0] = 0;
      for (let a = 1; a <= amount; a++) for (const c of coins) if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
      return dp[amount] > amount ? -1 : dp[amount];
    },
    tests: [[[1, 2, 5], 11], [[2], 3], [[1], 0], [[1], 2], [[186, 419, 83, 408], 6249], [[2, 5, 10, 1], 27], [[5, 7], 9999], [[1, 3, 4, 5], 7]],
  }),

  problem('maximum-product-subarray', {
    statement: `
Given an integer array \`nums\`, find a **contiguous non-empty subarray** whose product is the largest, and return that product.

The answer is guaranteed to fit in a 32-bit integer.
`,
    params: ['nums'],
    constraints: ['1 <= nums.length <= 2 * 10^4', '-10 <= nums[i] <= 10', 'The product of any prefix or suffix of nums fits in a 32-bit integer'],
    explain: ['The subarray [2, 3] has the largest product, 6.', 'The result cannot be 2 because [-2, -1] is not contiguous; the best is 0.'],
    known: [6, 0],
    ref: function maxProduct(nums) {
      let best = nums[0];
      let hi = nums[0];
      let lo = nums[0];
      for (let i = 1; i < nums.length; i++) {
        const n = nums[i];
        const candidates = [n, hi * n, lo * n];
        hi = Math.max(...candidates);
        lo = Math.min(...candidates);
        best = Math.max(best, hi);
      }
      return best;
    },
    tests: [[[2, 3, -2, 4]], [[-2, 0, -1]], [[-2]], [[0, 2]], [[-2, 3, -4]], [[2, -5, -2, -4, 3]], [[1, 0, -1, 2, 3, -5, -2]], [ints(109, 20, -2, 2)]],
  }),

  problem('word-break', {
    statement: `
Given a string \`s\` and a dictionary of strings \`wordDict\`, return \`true\` if \`s\` can be split into a sequence of **one or more dictionary words**.

A dictionary word may be reused as many times as you like.
`,
    params: ['s', 'wordDict'],
    constraints: ['1 <= s.length <= 300', '1 <= wordDict.length <= 1000', '1 <= wordDict[i].length <= 20', 's and wordDict[i] consist of lowercase English letters', 'All strings in wordDict are unique'],
    explain: ['"leetcode" can be split as "leet code".', '"applepenapple" can be split as "apple pen apple".', 'No split uses only dictionary words.'],
    samples: 3,
    known: [true, true, false],
    ref: function wordBreak(s, wordDict) {
      const words = new Set(wordDict);
      const dp = new Array(s.length + 1).fill(false);
      dp[0] = true;
      for (let i = 1; i <= s.length; i++) {
        for (let j = 0; j < i; j++) {
          if (dp[j] && words.has(s.slice(j, i))) { dp[i] = true; break; }
        }
      }
      return dp[s.length];
    },
    tests: [
      ['leetcode', ['leet', 'code']],
      ['applepenapple', ['apple', 'pen']],
      ['catsandog', ['cats', 'dog', 'sand', 'and', 'cat']],
      ['a', ['a']],
      ['a', ['b']],
      ['aaaaaaa', ['aaaa', 'aaa']],
      ['cars', ['car', 'ca', 'rs']],
      ['a'.repeat(250) + 'b', ['a', 'aa', 'aaa', 'aaaa']],
      ['ab'.repeat(120), ['ab', 'a', 'b']],
    ],
  }),

  problem('longest-increasing-subsequence', {
    statement: `
Given an integer array \`nums\`, return the **length of the longest strictly increasing subsequence**.

A subsequence keeps the original order of elements but may skip some of them.
`,
    params: ['nums'],
    constraints: ['1 <= nums.length <= 2500', '-10^4 <= nums[i] <= 10^4'],
    explain: ['One longest subsequence is [2, 3, 7, 101].', 'One longest subsequence is [0, 1, 2, 3].', 'Strictly increasing means equal values cannot be repeated.'],
    samples: 3,
    known: [4, 4, 1],
    ref: function lengthOfLIS(nums) {
      const tails = [];
      for (const n of nums) {
        let lo = 0;
        let hi = tails.length;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (tails[mid] < n) lo = mid + 1; else hi = mid; }
        tails[lo] = n;
      }
      return tails.length;
    },
    tests: [[[10, 9, 2, 5, 3, 7, 101, 18]], [[0, 1, 0, 3, 2, 3]], [[7, 7, 7, 7, 7, 7, 7]], [[1]], [[5, 4, 3, 2, 1]], [[1, 2, 3, 4, 5]], [[4, 10, 4, 3, 8, 9]], [ints(110, 2500, -10000, 10000)]],
  }),

  problem('unique-paths', {
    statement: `
A robot stands in the top-left corner of an \`m x n\` grid and wants to reach the bottom-right corner. At each step it can move only **down or right**.

Return the number of **unique paths** the robot can take.
`,
    params: ['m', 'n'],
    constraints: ['1 <= m, n <= 100', 'The answer is guaranteed to be less than or equal to 2 * 10^9'],
    explain: ['There are 28 paths through a 3 x 7 grid.', 'There are 3 paths through a 3 x 2 grid: right-down-down, down-down-right and down-right-down.'],
    known: [28, 3],
    ref: function uniquePaths(m, n) {
      const row = new Array(n).fill(1);
      for (let i = 1; i < m; i++) for (let j = 1; j < n; j++) row[j] += row[j - 1];
      return row[n - 1];
    },
    tests: [[3, 7], [3, 2], [7, 3], [1, 1], [1, 10], [10, 1], [3, 3], [23, 12], [51, 9]],
  }),

  problem('jump-game', {
    statement: `
You are given an integer array \`nums\`. You start at the first index and each element \`nums[i]\` is your **maximum jump length** from position \`i\`.

Return \`true\` if you can reach the **last index**, and \`false\` otherwise.
`,
    params: ['nums'],
    constraints: ['1 <= nums.length <= 10^4', '0 <= nums[i] <= 10^5'],
    explain: ['Jump 1 step from index 0 to 1, then 3 steps to the last index.', 'You always arrive at index 3, whose jump length is 0, so you can never reach the last index.'],
    known: [true, false],
    ref: function canJump(nums) {
      let reach = 0;
      for (let i = 0; i < nums.length; i++) {
        if (i > reach) return false;
        reach = Math.max(reach, i + nums[i]);
      }
      return true;
    },
    tests: [[[2, 3, 1, 1, 4]], [[3, 2, 1, 0, 4]], [[0]], [[0, 1]], [[1, 0, 1]], [[2, 0, 0]], [[1, 1, 1, 1, 0]], [ints(111, 9000, 0, 3)]],
  }),

  problem('jump-game-ii', {
    statement: `
You are given an integer array \`nums\` and start at index \`0\`. Each \`nums[i]\` is your **maximum jump length** from index \`i\`.

Return the **minimum number of jumps** needed to reach the last index. You can assume the last index is always reachable.
`,
    params: ['nums'],
    constraints: ['1 <= nums.length <= 10^4', '0 <= nums[i] <= 1000', 'The last index is always reachable'],
    explain: ['Jump 1 step to index 1, then 3 steps to the last index: 2 jumps.', 'Jump to index 1, then to the end: 2 jumps.'],
    known: [2, 2],
    ref: function jump(nums) {
      let jumps = 0;
      let end = 0;
      let far = 0;
      for (let i = 0; i < nums.length - 1; i++) {
        far = Math.max(far, i + nums[i]);
        if (i === end) { jumps++; end = far; }
      }
      return jumps;
    },
    tests: [[[2, 3, 1, 1, 4]], [[2, 3, 0, 1, 4]], [[0]], [[1]], [[1, 2]], [[1, 1, 1, 1]], [[5, 9, 3, 2, 1, 0, 2, 3, 3, 1, 0, 0]], [ints(112, 9000, 1, 6)]],
  }),

  problem('gas-station', {
    statement: `
There are \`n\` gas stations on a circular route. Station \`i\` has \`gas[i]\` units of fuel, and driving from station \`i\` to the next one costs \`cost[i]\` units. Your tank starts empty and has unlimited capacity.

Return the **index of the station where you should start** to complete the full circuit clockwise, or \`-1\` if that is impossible. If a solution exists it is guaranteed to be unique.
`,
    params: ['gas', 'cost'],
    constraints: ['n == gas.length == cost.length', '1 <= n <= 10^5', '0 <= gas[i], cost[i] <= 10^4', 'If a solution exists, it is unique'],
    explain: ['Start at station 3 with 4 units, and every later stop leaves you with enough fuel.', 'Whichever station you start at, you run out of fuel before finishing the circuit.'],
    known: [3, -1],
    ref: function canCompleteCircuit(gas, cost) {
      let total = 0;
      let tank = 0;
      let start = 0;
      for (let i = 0; i < gas.length; i++) {
        const d = gas[i] - cost[i];
        total += d;
        tank += d;
        if (tank < 0) { start = i + 1; tank = 0; }
      }
      return total < 0 ? -1 : start;
    },
    tests: [
      [[1, 2, 3, 4, 5], [3, 4, 5, 1, 2]],
      [[2, 3, 4], [3, 4, 3]],
      [[5], [4]],
      [[2], [2]],
      [[5, 1, 2, 3, 4], [4, 4, 1, 5, 1]],
      [[3, 1, 1], [1, 2, 2]],
      (() => { const n = 5000; const gas = Array.from({ length: n }, (_, i) => (i === 1234 ? 9000 : 1)); const cost = Array.from({ length: n }, (_, i) => (i === 1233 ? 9 : 1)); return [gas, cost]; })(),
    ],
  }),

  problem('insert-interval', {
    statement: `
You are given an array \`intervals\` of **non-overlapping** intervals \`[start, end]\`, **sorted by start**, and another interval \`newInterval\`.

Insert \`newInterval\` so that the result is still sorted and has no overlapping intervals, **merging** any intervals that overlap with it. Return the resulting array.
`,
    params: ['intervals', 'newInterval'],
    constraints: ['0 <= intervals.length <= 10^4', 'intervals[i].length == 2', '0 <= start <= end <= 10^5', 'intervals is sorted by start in ascending order', 'newInterval.length == 2'],
    explain: ['The new interval overlaps [1, 3], so they merge into [1, 5].', 'The new interval [4, 8] overlaps [3, 5], [6, 7] and [8, 10], which merge into [3, 10].'],
    known: [[[1, 5], [6, 9]], [[1, 2], [3, 10], [12, 16]]],
    ref: function insert(intervals, newInterval) {
      const out = [];
      let [s, e] = newInterval;
      let i = 0;
      while (i < intervals.length && intervals[i][1] < s) out.push(intervals[i++]);
      while (i < intervals.length && intervals[i][0] <= e) { s = Math.min(s, intervals[i][0]); e = Math.max(e, intervals[i][1]); i++; }
      out.push([s, e]);
      while (i < intervals.length) out.push(intervals[i++]);
      return out;
    },
    tests: [
      [[[1, 3], [6, 9]], [2, 5]],
      [[[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 8]],
      [[], [5, 7]],
      [[[1, 5]], [2, 3]],
      [[[1, 5]], [6, 8]],
      [[[3, 5]], [1, 2]],
      [[[1, 5]], [0, 0]],
      [Array.from({ length: 2000 }, (_, i) => [i * 10, i * 10 + 5]), [9995, 10012]],
    ],
  }),

  problem('merge-intervals', {
    statement: `
Given an array of \`intervals\` where \`intervals[i] = [start, end]\`, **merge all overlapping intervals** and return an array of the non-overlapping intervals that cover all the input intervals, sorted by start.

Two intervals that share only an endpoint, such as \`[1, 4]\` and \`[4, 5]\`, are considered overlapping.
`,
    params: ['intervals'],
    constraints: ['1 <= intervals.length <= 10^4', 'intervals[i].length == 2', '0 <= start <= end <= 10^4'],
    explain: ['[1, 3] and [2, 6] overlap and merge into [1, 6].', 'The two intervals touch at 4, so they merge.'],
    known: [[[1, 6], [8, 10], [15, 18]], [[1, 5]]],
    ref: function merge(intervals) {
      const sorted = intervals.map((x) => [...x]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const out = [sorted[0]];
      for (let i = 1; i < sorted.length; i++) {
        const last = out[out.length - 1];
        if (sorted[i][0] <= last[1]) last[1] = Math.max(last[1], sorted[i][1]);
        else out.push(sorted[i]);
      }
      return out;
    },
    tests: [
      [[[1, 3], [2, 6], [8, 10], [15, 18]]],
      [[[1, 4], [4, 5]]],
      [[[1, 4], [0, 4]]],
      [[[1, 4], [2, 3]]],
      [[[5, 6]]],
      [[[2, 3], [4, 5], [6, 7], [8, 9], [1, 10]]],
      [(() => { const r = rng(113); return Array.from({ length: 3000 }, () => { const a = randInt(r, 0, 9990); return [a, a + randInt(r, 0, 8)]; }); })()],
    ],
  }),

  problem('non-overlapping-intervals', {
    statement: `
Given an array of \`intervals\` where \`intervals[i] = [start, end]\`, return the **minimum number of intervals you must remove** so that the rest are non-overlapping.

Intervals that only touch at an endpoint, such as \`[1, 2]\` and \`[2, 3]\`, do **not** overlap.
`,
    params: ['intervals'],
    constraints: ['1 <= intervals.length <= 10^5', 'intervals[i].length == 2', '-5 * 10^4 <= start < end <= 5 * 10^4'],
    explain: ['Removing [1, 3] leaves three non-overlapping intervals.', 'The three intervals are identical, so two must go.', 'The intervals only touch, so nothing needs to be removed.'],
    samples: 3,
    known: [1, 2, 0],
    ref: function eraseOverlapIntervals(intervals) {
      const sorted = intervals.map((x) => [...x]).sort((a, b) => a[1] - b[1]);
      let kept = 0;
      let end = -Infinity;
      for (const [s, e] of sorted) {
        if (s >= end) { kept++; end = e; }
      }
      return intervals.length - kept;
    },
    tests: [
      [[[1, 2], [2, 3], [3, 4], [1, 3]]],
      [[[1, 2], [1, 2], [1, 2]]],
      [[[1, 2], [2, 3]]],
      [[[1, 100], [11, 22], [1, 11], [2, 12]]],
      [[[0, 2], [1, 3], [2, 4], [3, 5], [4, 6]]],
      [[[-50000, 50000]]],
      [(() => { const r = rng(114); return Array.from({ length: 4000 }, () => { const a = randInt(r, -49000, 48000); return [a, a + randInt(r, 1, 900)]; }); })()],
    ],
  }),
];
