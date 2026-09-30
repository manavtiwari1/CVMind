import { problem } from './_lib.mjs';

/** Problems that already had real tests but only a placeholder statement. */
export default [
  problem('best-time-to-buy-and-sell-stock', {
    statement: `
You are given an array \`prices\` where \`prices[i]\` is the price of a stock on day \`i\`.

You may choose **one day to buy** one share and a **later day to sell** it. Return the maximum profit you can make. If no profit is possible, return \`0\`.
`,
    params: ['prices'],
    constraints: ['1 <= prices.length <= 10^5', '0 <= prices[i] <= 10^4'],
    explain: ['Buy on day 2 (price 1) and sell on day 5 (price 6): profit = 6 - 1 = 5.', 'Prices only fall, so no profitable trade exists.'],
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
      [[7, 1, 5, 3, 6, 4]],
      [[7, 6, 4, 3, 1]],
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
Given a string \`s\` made only of the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, decide whether it is **valid**.

A string is valid when:

- every open bracket is closed by a bracket of the same type, and
- brackets are closed in the correct order, and
- every close bracket has a matching open bracket.
`,
    params: ['s'],
    constraints: ['1 <= s.length <= 10^4', 's consists only of the characters ()[]{}'],
    explain: ['Every bracket is closed in the right order.', 'Each pair is closed before the next one opens.', 'The "]" does not match the "(" that is open.'],
    samples: 3,
    ref: function isValid(s) {
      const stack = [];
      const pairs = { ')': '(', ']': '[', '}': '{' };
      for (const c of s) {
        if (c === '(' || c === '[' || c === '{') stack.push(c);
        else if (stack.pop() !== pairs[c]) return false;
      }
      return stack.length === 0;
    },
    tests: [['()'], ['()[]{}'], ['(]'], ['([)]'], ['{[]}'], ['('], [')'], ['(('], ['((()))[{}]'], ['(())]'], ['{'.repeat(2000) + '}'.repeat(2000)]],
  }),

  problem('binary-search', {
    statement: `
You are given an array \`nums\` of integers sorted in **ascending order** and an integer \`target\`.

Return the index of \`target\` in \`nums\`, or \`-1\` if it is not present. Your solution must run in **O(log n)** time.
`,
    params: ['nums', 'target'],
    constraints: ['1 <= nums.length <= 10^4', '-10^4 < nums[i], target < 10^4', 'All values in nums are unique and sorted in ascending order'],
    explain: ['9 is at index 4.', '2 is not in the array.'],
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
      [[-1, 0, 3, 5, 9, 12], 9],
      [[-1, 0, 3, 5, 9, 12], 2],
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
You are climbing a staircase with \`n\` steps. Each time you can climb either **1 or 2** steps.

Return the number of distinct ways you can climb to the top.
`,
    params: ['n'],
    constraints: ['1 <= n <= 45'],
    explain: ['Two ways: 1 + 1 or 2.', 'Three ways: 1 + 1 + 1, 1 + 2 or 2 + 1.'],
    ref: function climbStairs(n) {
      let a = 1;
      let b = 1;
      for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
      return b;
    },
    tests: [[2], [3], [1], [4], [5], [10], [20], [35], [45]],
  }),

  problem('single-number', {
    statement: `
Every element of the integer array \`nums\` appears **twice** except for one element, which appears exactly once. Find that single element.

Your solution should run in linear time and use only constant extra space.
`,
    params: ['nums'],
    constraints: ['1 <= nums.length <= 3 * 10^4', '-3 * 10^4 <= nums[i] <= 3 * 10^4', 'Each element appears twice except for one that appears once'],
    explain: ['Only 1 appears once.', 'Only 4 appears once.'],
    ref: function singleNumber(nums) {
      let x = 0;
      for (const n of nums) x ^= n;
      return x;
    },
    tests: [[[2, 2, 1]], [[4, 1, 2, 1, 2]], [[1]], [[-1, -1, -2]], [[0, 7, 0]], [[30000, -30000, 30000]], [[5, 3, 5, 9, 3, 7, 9]]],
  }),

  problem('palindrome-number', {
    statement: `
Given an integer \`x\`, return \`true\` if \`x\` is a **palindrome** (it reads the same forwards and backwards), and \`false\` otherwise.

Try to solve it without converting the integer to a string.
`,
    params: ['x'],
    constraints: ['-2^31 <= x <= 2^31 - 1'],
    explain: ['121 reads the same in both directions.', 'Read backwards it becomes 121-, so it is not a palindrome.'],
    ref: function isPalindrome(x) {
      if (x < 0 || (x % 10 === 0 && x !== 0)) return false;
      let reversed = 0;
      while (x > reversed) {
        reversed = reversed * 10 + (x % 10);
        x = Math.floor(x / 10);
      }
      return x === reversed || x === Math.floor(reversed / 10);
    },
    tests: [[121], [-121], [10], [0], [7], [1221], [123321], [12321], [1000021], [2147447412], [2147483647]],
  }),
];
