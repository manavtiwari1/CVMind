import { problem } from './_lib.mjs';

/** Problems that already had real tests but only a placeholder statement. */
export default [
  problem('best-time-to-buy-and-sell-stock', {
    statement: `
\`prices[i]\` is what one share of a stock costs on day \`i\`. You may **buy one share on some day and sell it on a later day**, at most once.

Return the largest profit this single trade can make, or \`0\` if every possible trade loses money.
`,
    params: ['prices'],
    constraints: ['1 <= prices.length <= 10^5', '0 <= prices[i] <= 10^4'],
    explain: ['Buy at 2 on day 3 and sell at 8 on day 4 for a profit of 6.', 'The price never rises after a buy, so the best is to not trade.'],
    ref: function maxProfit(prices) {
      let best = 0;
      let low = Infinity;
      for (const p of prices) {
        low = Math.min(low, p);
        best = Math.max(best, p - low);
      }
      return best;
    },
    tests: [
      [[9, 4, 6, 2, 8, 3]],
      [[8, 5, 5, 2]],
      [[5]],
      [[1, 2]],
      [[2, 4, 1]],
      [[3, 3, 3, 3]],
      [[2, 1, 2, 1, 0, 1, 2]],
      [Array.from({ length: 5000 }, (_, i) => (i * 7919) % 10000)],
    ],
  }),

  problem('valid-parentheses', {
    statement: `
\`s\` is made only of the bracket characters \`( ) [ ] { }\`. Return \`true\` if the brackets are **properly balanced**, and \`false\` otherwise.

Balanced means each closing bracket closes the most recent bracket that is still open, the two are of the same kind, and nothing is left open at the end.
`,
    params: ['s'],
    constraints: ['1 <= s.length <= 10^4', 's uses only the characters ()[]{}'],
    explain: ['Each bracket closes the innermost one still open.', 'The "]" arrives while "(" is the innermost open bracket.'],
    ref: function isValid(s) {
      const stack = [];
      const pairs = { ')': '(', ']': '[', '}': '{' };
      for (const c of s) {
        if (c === '(' || c === '[' || c === '{') stack.push(c);
        else if (stack.pop() !== pairs[c]) return false;
      }
      return stack.length === 0;
    },
    tests: [['{[()]}'], ['[(])'], ['[]{}'], ['{)'], ['('], [')'], ['(('], ['((()))[{}]'], ['(())]'], ['{'.repeat(2000) + '}'.repeat(2000)]],
  }),

  problem('binary-search', {
    statement: `
\`nums\` holds distinct integers in **increasing order**. Return the position of \`target\` in \`nums\`, or \`-1\` if it is missing.

Your solution must take **O(log n)** time.
`,
    params: ['nums', 'target'],
    constraints: ['1 <= nums.length <= 10^4', '-10^4 < nums[i], target < 10^4', 'Values in nums are distinct and increasing'],
    explain: ['7 sits at position 4.', 'There is no 5 in the array.'],
    ref: function search(nums, target) {
      let lo = 0;
      let hi = nums.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (nums[mid] === target) return mid;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
      }
      return -1;
    },
    tests: [
      [[-6, -2, 1, 4, 7, 15], 7],
      [[-6, -2, 1, 4, 7, 15], 5],
      [[5], 5],
      [[5], 4],
      [[1, 3], 3],
      [[1, 3], 1],
      [[-9999, -5000, 0, 5000, 9999], -9999],
      [Array.from({ length: 10000 }, (_, i) => i * 2 - 9999), 9999 - 1],
    ],
  }),

  problem('climbing-stairs', {
    statement: `
A staircase has \`n\` steps, and with each stride you go up **either 1 step or 2 steps**.

Count the different sequences of strides that take you from the bottom exactly to the top step.
`,
    params: ['n'],
    constraints: ['1 <= n <= 45'],
    explain: ['Five sequences: 1+1+1+1, 1+1+2, 1+2+1, 2+1+1 and 2+2.', 'Eight sequences reach step 5.'],
    ref: function climbStairs(n) {
      let a = 1;
      let b = 1;
      for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
      return b;
    },
    tests: [[4], [5], [1], [2], [3], [10], [20], [35], [45]],
  }),

  problem('single-number', {
    statement: `
In \`nums\`, **every value shows up exactly twice except one**, which shows up only once. Return that lonely value.

Aim for linear time and constant extra memory.
`,
    params: ['nums'],
    constraints: ['1 <= nums.length <= 3 * 10^4', '-3 * 10^4 <= nums[i] <= 3 * 10^4', 'Exactly one value appears once; all others appear twice'],
    explain: ['6 appears twice, 3 only once.', '8 and 2 come in pairs, 9 does not.'],
    ref: function singleNumber(nums) {
      let x = 0;
      for (const n of nums) x ^= n;
      return x;
    },
    tests: [[[6, 3, 6]], [[8, 2, 9, 2, 8]], [[11]], [[-1, -1, -2]], [[0, 7, 0]], [[30000, -30000, 30000]], [[5, 3, 5, 9, 3, 7, 9]]],
  }),

  problem('palindrome-number', {
    statement: `
Return \`true\` if the decimal digits of the integer \`x\` **read the same left to right as right to left**, and \`false\` otherwise. A minus sign counts as a character, so negative numbers never qualify.

As a challenge, solve it with arithmetic only, without turning \`x\` into a string.
`,
    params: ['x'],
    constraints: ['-2^31 <= x <= 2^31 - 1'],
    explain: ['4554 is the same in both directions.', 'Backwards it would read 707-.'],
    ref: function isPalindrome(x) {
      if (x < 0 || (x % 10 === 0 && x !== 0)) return false;
      let reversed = 0;
      while (x > reversed) {
        reversed = reversed * 10 + (x % 10);
        x = Math.floor(x / 10);
      }
      return x === reversed || x === Math.floor(reversed / 10);
    },
    tests: [[4554], [-707], [30], [0], [7], [1221], [123321], [12321], [1000021], [2147447412], [2147483647]],
  }),
];
