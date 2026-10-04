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
    title: 'Cheapest Way Up the Stairs',
    slug: 'cheapest-way-up-the-stairs',
    statement: `
Each step of a staircase has a toll: \`cost[i]\` is paid when you **leave step \`i\`**, and from there you may move up **one or two** steps.

You can begin on step \`0\` or step \`1\` for free. Return the **least total toll** to get past the last step.
`,
    params: ['cost'],
    constraints: ['2 <= cost.length <= 1000', '0 <= cost[i] <= 999'],
    explain: ['Start on step 0 (pay 4, jump two), then pay 3 and step off the top: 7.', 'Start on step 0 (pay 2), then hop over to steps 2 and 4 paying 1 each: 4.'],
    known: [7, 4],
    ref: function minCostClimbingStairs(cost) {
      let a = 0;
      let b = 0;
      for (let i = 2; i <= cost.length; i++) [a, b] = [b, Math.min(b + cost[i - 1], a + cost[i - 2])];
      return b;
    },
    tests: [[[4, 9, 3]], [[2, 6, 1, 8, 1]], [[0, 0]], [[5, 5]], [[0, 2, 2, 1]], [ints(101, 1000, 0, 999)]],
  }),

  problem('house-robber', {
    title: 'Booking Festival Booths',
    slug: 'booking-festival-booths',
    statement: `
A festival rents out booths in a single row, and booth \`i\` would earn you \`nums[i]\`. Noise rules forbid you from renting **two booths that are next to each other**.

Return the **most you can earn** with the booths you choose.
`,
    params: ['nums'],
    constraints: ['1 <= nums.length <= 100', '0 <= nums[i] <= 400'],
    explain: ['The middle booth alone (8) beats the two ends together (3 + 4).', 'Booths 0 and 3 are not neighbours: 6 + 7 = 13.'],
    known: [8, 13],
    ref: function rob(nums) {
      let take = 0;
      let skip = 0;
      for (const n of nums) [take, skip] = [skip + n, Math.max(take, skip)];
      return Math.max(take, skip);
    },
    tests: [[[3, 8, 4]], [[6, 1, 2, 7]], [[5]], [[2, 1]], [[0, 0, 0]], [[2, 1, 1, 2]], [ints(102, 100, 0, 400)]],
  }),

  problem('house-robber-ii', {
    title: 'Booking Festival Booths II',
    slug: 'booking-festival-booths-ii',
    statement: `
This time the booths stand in a **ring** around a fountain, so the first and last booths are also neighbours. Booth \`i\` earns \`nums[i]\`, and you still may not rent two neighbouring booths.

Return the **most you can earn**.
`,
    params: ['nums'],
    constraints: ['1 <= nums.length <= 100', '0 <= nums[i] <= 1000'],
    explain: ['In a ring of three every pair is adjacent, so only one booth: 4.', 'Booths 1 and 3 are not neighbours: 5 + 6 = 11.'],
    known: [4, 11],
    ref: function rob(nums) {
      if (nums.length === 1) return nums[0];
      const line = (arr) => { let take = 0; let skip = 0; for (const n of arr) [take, skip] = [skip + n, Math.max(take, skip)]; return Math.max(take, skip); };
      return Math.max(line(nums.slice(1)), line(nums.slice(0, -1)));
    },
    tests: [[[4, 1, 4]], [[2, 5, 1, 6]], [[3, 1, 2]], [[5]], [[1, 2]], [[200, 3, 140, 20, 10]], [[0, 0]], [ints(103, 100, 0, 1000)]],
  }),

  problem('longest-palindromic-substring', {
    statement: `
Find the **longest unbroken stretch of \`s\` that reads the same backwards** and return it.

If there is a tie for the longest, return the one that begins earliest.
`,
    params: ['s'],
    constraints: ['1 <= s.length <= 1000', 's contains only English letters and digits'],
    explain: ['"aba" is the only palindrome longer than one character.', '"pp" and "qq" tie; "pp" comes first.'],
    known: ['aba', 'pp'],
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
    tests: [['xabay'], ['ppqq'], ['a'], ['ac'], ['xyrotorzz'], ['aaaa'], ['abcda'], [word(104, 900, 'ab')], [word(105, 1000, 'abcdefghij')]],
  }),

  problem('palindromic-substrings', {
    statement: `
Count the **stretches of \`s\` that read the same backwards**. Every start and end position counts separately, so identical text at two different places is counted twice.
`,
    params: ['s'],
    constraints: ['1 <= s.length <= 1000', 's uses only lowercase English letters'],
    explain: ['Only the three single letters.', '"a", "b", "a" and "aba".'],
    known: [3, 4],
    ref: function countSubstrings(s) {
      let count = 0;
      const expand = (l, r) => { while (l >= 0 && r < s.length && s[l] === s[r]) { count++; l--; r++; } };
      for (let i = 0; i < s.length; i++) { expand(i, i); expand(i, i + 1); }
      return count;
    },
    tests: [['xyz'], ['aba'], ['a'], ['abba'], ['bbb'], [word(106, 1000, 'ab')], [word(107, 1000, 'abcdefghijklmnopqrstuvwxyz')]],
  }),

  problem('decode-ways', {
    statement: `
A secret message was written with \`A = 1\`, \`B = 2\`, ..., \`Z = 26\`, and the numbers were then run together, so the spaces are lost. Given the digit string \`s\`, count **how many letter messages could have produced it**.

Every chunk must be a number from \`1\` to \`26\` with no leading zero: \`"0"\` and \`"05"\` are not letters. The count fits in a 32-bit integer.
`,
    params: ['s'],
    constraints: ['1 <= s.length <= 100', 's contains only digits, possibly starting with 0'],
    explain: ['"17" is either "AG" (1, 7) or "Q" (17).', 'The 0 must pair with the 2 as 20, leaving 1, 20, 1 = "ATA".', '"30" and a lone "0" are not letters.'],
    samples: 3,
    known: [2, 1, 0],
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
    tests: [['17'], ['1201'], ['30'], ['0'], ['10'], ['27'], ['2101'], ['21206'], ['100'], ['3'.repeat(90)], [word(108, 30, '0123456789').replace(/^0/, '1')]],
  }),

  problem('coin-change', {
    statement: `
A vending machine must return exactly \`amount\` in change, and it has an endless supply of coins with the values in \`coins\`. Return the **smallest number of coins** that adds up to \`amount\`, or \`-1\` if no combination works.
`,
    params: ['coins', 'amount'],
    constraints: ['1 <= coins.length <= 12', '1 <= coins[i] <= 2^31 - 1', '0 <= amount <= 10^4'],
    explain: ['7 + 3 + 3 = 13 uses three coins.', 'Coins of 4 can only make multiples of 4.', 'No change needed, no coins.'],
    samples: 3,
    known: [3, -1, 0],
    ref: function coinChange(coins, amount) {
      const INF = amount + 1;
      const dp = new Array(amount + 1).fill(INF);
      dp[0] = 0;
      for (let a = 1; a <= amount; a++) for (const c of coins) if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
      return dp[amount] > amount ? -1 : dp[amount];
    },
    tests: [[[3, 7], 13], [[4], 6], [[2], 0], [[1], 2], [[9, 4, 7], 100], [[2, 5, 10, 1], 27], [[5, 7], 9999], [[1, 3, 4, 5], 7]],
  }),

  problem('maximum-product-subarray', {
    statement: `
Choose **one unbroken, non-empty run of numbers** in \`nums\` and multiply them together. Return the **largest product** any such run can give.

The answer fits in a 32-bit integer.
`,
    params: ['nums'],
    constraints: ['1 <= nums.length <= 2 * 10^4', '-10 <= nums[i] <= 10', 'Every prefix and suffix product fits in a 32-bit integer'],
    explain: ['4 x 2 = 8; including the -1 would make it negative.', 'The two negatives are separated by 0, so 0 is the best.'],
    known: [8, 0],
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
    tests: [[[3, -1, 4, 2]], [[-3, 0, -2]], [[-2]], [[0, 2]], [[-2, 3, -4]], [[2, -5, -2, -4, 3]], [[1, 0, -1, 2, 3, -5, -2]], [ints(109, 20, -2, 2)]],
  }),

  problem('word-break', {
    statement: `
Can the text \`s\` be **chopped into pieces that are all words from \`wordDict\`**, with nothing left over? Words may be used any number of times. Return \`true\` or \`false\`.
`,
    params: ['s', 'wordDict'],
    constraints: ['1 <= s.length <= 300', '1 <= wordDict.length <= 1000', '1 <= wordDict[i].length <= 20', 'All strings use only lowercase English letters', 'Dictionary words are distinct'],
    explain: ['"sun" + "flower".', '"night" + "mare"; "ma" alone would leave "re".', '"pine" + "apple" leaves an "s" that is not a word.'],
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
      ['sunflower', ['sun', 'flow', 'flower', 'er']],
      ['nightmare', ['night', 'mare', 'ma']],
      ['pineapples', ['pine', 'apple', 'pen']],
      ['a', ['a']],
      ['a', ['b']],
      ['aaaaaaa', ['aaaa', 'aaa']],
      ['bird', ['bi', 'b', 'ird']],
      ['a'.repeat(250) + 'b', ['a', 'aa', 'aaa', 'aaaa']],
      ['ab'.repeat(120), ['ab', 'a', 'b']],
    ],
  }),

  problem('longest-increasing-subsequence', {
    statement: `
Cross out as few numbers of \`nums\` as you like (keeping the rest in order) so that what remains is **strictly increasing**. Return the **most numbers you can keep**.
`,
    params: ['nums'],
    constraints: ['1 <= nums.length <= 2500', '-10^4 <= nums[i] <= 10^4'],
    explain: ['Keep 5, 6, 7, 8 (or 1, 2, 3, 8).', 'Equal values never count as increasing.', 'Keep 2, 3, 4.'],
    samples: 3,
    known: [4, 1, 3],
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
    tests: [[[5, 1, 6, 2, 7, 3, 8]], [[9, 9, 9]], [[2, 8, 3, 4, 1]], [[1]], [[5, 4, 3, 2, 1]], [[1, 2, 3, 4, 5]], [[6, 12, 6, 5, 10, 11]], [ints(110, 2500, -10000, 10000)]],
  }),

  problem('unique-paths', {
    statement: `
A city is a grid of \`m\` rows by \`n\` columns of blocks. A courier starts at the top-left block and must reach the bottom-right block, moving only **down or right** one block at a time.

Count the **different routes** the courier can take.
`,
    params: ['m', 'n'],
    constraints: ['1 <= m, n <= 100', 'The answer is at most 2 * 10^9'],
    explain: ['Any route is 3 downs and 4 rights in some order: 35 routes.', 'One down and two rights: right-right-down, right-down-right or down-right-right.'],
    known: [35, 3],
    ref: function uniquePaths(m, n) {
      const row = new Array(n).fill(1);
      for (let i = 1; i < m; i++) for (let j = 1; j < n; j++) row[j] += row[j - 1];
      return row[n - 1];
    },
    tests: [[4, 5], [2, 3], [5, 4], [1, 1], [1, 10], [10, 1], [3, 3], [23, 12], [51, 9]],
  }),

  problem('jump-game', {
    statement: `
You stand on the first square of a row. The number on square \`i\`, \`nums[i]\`, is **the farthest you may jump forward from it** (any shorter jump is allowed too).

Return \`true\` if you can land on the last square, otherwise \`false\`.
`,
    params: ['nums'],
    constraints: ['1 <= nums.length <= 10^4', '0 <= nums[i] <= 10^5'],
    explain: ['Jump to square 1, and from there two squares to the end.', 'Every route gets stuck on the 0 at square 2.'],
    known: [true, false],
    ref: function canJump(nums) {
      let reach = 0;
      for (let i = 0; i < nums.length; i++) {
        if (i > reach) return false;
        reach = Math.max(reach, i + nums[i]);
      }
      return true;
    },
    tests: [[[1, 2, 0, 1]], [[2, 1, 0, 3]], [[0]], [[0, 1]], [[1, 0, 1]], [[2, 0, 0]], [[1, 1, 1, 1, 0]], [ints(111, 9000, 0, 3)]],
  }),

  problem('jump-game-ii', {
    statement: `
As before, square \`i\` lets you jump forward **up to \`nums[i]\` squares**. The last square can always be reached.

Return the **fewest jumps** needed to get from the first square to the last.
`,
    params: ['nums'],
    constraints: ['1 <= nums.length <= 10^4', '0 <= nums[i] <= 1000', 'The last square is always reachable'],
    explain: ['Hop to square 1, then the 4 carries you to the end.', 'One jump of three reaches the end.'],
    known: [2, 1],
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
    tests: [[[1, 4, 1, 1, 1]], [[3, 1, 1, 1]], [[0]], [[1]], [[1, 2]], [[1, 1, 1, 1]], [[5, 9, 3, 2, 1, 0, 2, 3, 3, 1, 0, 0]], [ints(112, 9000, 1, 6)]],
  }),

  problem('gas-station', {
    title: 'Fuel Stops on a Ring Road',
    slug: 'fuel-stops-on-a-ring-road',
    statement: `
A ring road has \`n\` fuel stops. At stop \`i\` you can take on \`gas[i]\` litres, and the drive from stop \`i\` to stop \`i + 1\` (wrapping around after the last) burns \`cost[i]\` litres. Your tank starts empty and never overflows.

Return the stop to **start from so you can drive one full lap**, or \`-1\` if no start works. When an answer exists, it is the only one.
`,
    params: ['gas', 'cost'],
    constraints: ['n == gas.length == cost.length', '1 <= n <= 10^5', '0 <= gas[i], cost[i] <= 10^4', 'At most one start works'],
    explain: ['From stop 1 the tank reads 3, 0, 3 and 2 after each leg, never below zero.', 'The road burns 7 litres but only 6 are available.'],
    known: [1, -1],
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
      [[2, 5, 1, 4], [3, 2, 4, 1]],
      [[1, 2, 3], [2, 2, 3]],
      [[5], [4]],
      [[2], [2]],
      [[4, 1, 6], [5, 2, 1]],
      [[3, 1, 1], [1, 2, 2]],
      (() => { const n = 5000; const gas = Array.from({ length: n }, (_, i) => (i === 1234 ? 9000 : 1)); const cost = Array.from({ length: n }, (_, i) => (i === 1233 ? 9 : 1)); return [gas, cost]; })(),
    ],
  }),

  problem('insert-interval', {
    statement: `
\`intervals\` is a list of **non-overlapping** \`[start, end]\` bookings, ordered by start. Add the booking \`newInterval\`, **joining it with any bookings it overlaps** so the list stays ordered and free of overlaps, and return the new list.
`,
    params: ['intervals', 'newInterval'],
    constraints: ['0 <= intervals.length <= 10^4', 'Each interval has two numbers', '0 <= start <= end <= 10^5', 'intervals is ordered by start', 'newInterval has two numbers'],
    explain: ['[8, 13] overlaps both [7, 9] and [12, 14], so the three join into [7, 14].', 'No overlap, so the booking is simply added at the end.'],
    known: [[[2, 4], [7, 14]], [[1, 3], [5, 6]]],
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
      [[[2, 4], [7, 9], [12, 14]], [8, 13]],
      [[[1, 3]], [5, 6]],
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
\`intervals\` lists time ranges \`[start, end]\` in no particular order. **Combine every group of overlapping ranges into one range** and return the result ordered by start.

Ranges that just touch, like \`[3, 7]\` and \`[7, 9]\`, count as overlapping.
`,
    params: ['intervals'],
    constraints: ['1 <= intervals.length <= 10^4', 'Each interval has two numbers', '0 <= start <= end <= 10^4'],
    explain: ['[5, 8] and [6, 10] overlap and become [5, 10].', 'The ranges meet at 7, so they join.'],
    known: [[[1, 2], [5, 10], [12, 13]], [[3, 9]]],
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
      [[[5, 8], [1, 2], [6, 10], [12, 13]]],
      [[[3, 7], [7, 9]]],
      [[[2, 5], [0, 5]]],
      [[[1, 4], [2, 3]]],
      [[[5, 6]]],
      [[[2, 3], [4, 5], [6, 7], [8, 9], [1, 10]]],
      [(() => { const r = rng(113); return Array.from({ length: 3000 }, () => { const a = randInt(r, 0, 9990); return [a, a + randInt(r, 0, 8)]; }); })()],
    ],
  }),

  problem('non-overlapping-intervals', {
    statement: `
A meeting room has requests \`intervals\`, each \`[start, end]\`. Return the **fewest requests you must cancel** so that no two remaining meetings overlap.

A meeting may start at the exact moment another ends; that is not an overlap.
`,
    params: ['intervals'],
    constraints: ['1 <= intervals.length <= 10^5', 'Each interval has two numbers', '-5 * 10^4 <= start < end <= 5 * 10^4'],
    explain: ['Cancel [1, 4]; [2, 3] and [3, 6] fit back to back.', 'Two identical requests: one must go.', 'The meetings only touch at 6.'],
    samples: 3,
    known: [1, 1, 0],
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
      [[[1, 4], [2, 3], [3, 6]]],
      [[[0, 5], [0, 5]]],
      [[[4, 6], [6, 8]]],
      [[[1, 50], [5, 15], [1, 5], [2, 6]]],
      [[[0, 2], [1, 3], [2, 4], [3, 5], [4, 6]]],
      [[[-50000, 50000]]],
      [(() => { const r = rng(114); return Array.from({ length: 4000 }, () => { const a = randInt(r, -49000, 48000); return [a, a + randInt(r, 1, 900)]; }); })()],
    ],
  }),
];
