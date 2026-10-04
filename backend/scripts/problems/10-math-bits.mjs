import { problem, rng, randInt } from './_lib.mjs';

const UNSIGNED = '0 <= n <= 2^32 - 1, given as a non-negative integer';

export default [
  problem('number-of-1-bits', {
    statement: `
Write the positive integer \`n\` in binary as a **32-bit unsigned value** and count **how many of its bits are 1**.
`,
    params: ['n'],
    cpp: { args: ['uint32_t'], ret: 'int' },
    constraints: ['1 <= n <= 2^32 - 1'],
    explain: ['13 is 1101 in binary: three 1s.', '256 is a single 1 followed by eight 0s.', '4294967294 is thirty-one 1s and a final 0.'],
    samples: 3,
    known: [3, 1, 31],
    ref: function hammingWeight(n) {
      let count = 0;
      n = n >>> 0;
      while (n) { count += n & 1; n >>>= 1; }
      return count;
    },
    tests: [[13], [256], [4294967294], [1], [4294967295], [2147483648], [1023], [123456789]],
  }),

  problem('counting-bits', {
    statement: `
For every whole number \`i\` from \`0\` up to \`n\`, count the **1s in the binary form of \`i\`**. Return the \`n + 1\` counts as an array, with the count for \`i\` at position \`i\`.

Try to reuse earlier counts instead of examining each number from scratch.
`,
    params: ['n'],
    constraints: ['0 <= n <= 10^5'],
    explain: ['0, 1, 10 and 11 in binary contain 0, 1, 1 and 2 ones.', '4, 5 and 6 are 100, 101 and 110: 1, 2 and 2 ones.'],
    known: [[0, 1, 1, 2], [0, 1, 1, 2, 1, 2, 2]],
    ref: function countBits(n) {
      const bits = new Array(n + 1).fill(0);
      for (let i = 1; i <= n; i++) bits[i] = bits[i >> 1] + (i & 1);
      return bits;
    },
    tests: [[3], [6], [0], [1], [16], [31], [1000], [100000]],
  }),

  problem('reverse-bits', {
    statement: `
Write \`n\` as exactly **32 binary digits** (with leading zeros), **read those digits backwards**, and return the unsigned integer they form.

For instance \`00000000000000000000000000000110\` (6) turns into \`01100000000000000000000000000000\`.
`,
    params: ['n'],
    cpp: { args: ['uint32_t'], ret: 'uint32_t' },
    constraints: ['0 <= n <= 2^32 - 1'],
    explain: ['The lowest bit moves to the highest position: 2^31.', '6 becomes 2^30 + 2^29.'],
    known: [2147483648, 1610612736],
    ref: function reverseBits(n) {
      let result = 0;
      n = n >>> 0;
      for (let i = 0; i < 32; i++) { result = (result * 2) + (n & 1); n >>>= 1; }
      return result;
    },
    tests: [[1], [6], [0], [2147483648], [4294967295], [255], [3141592653], [12345678]],
  }),

  problem('missing-number', {
    statement: `
\`nums\` has \`n\` different numbers, all chosen from \`0, 1, ..., n\`. Exactly **one number from that range was left out**. Return it.
`,
    params: ['nums'],
    constraints: ['n == nums.length', '1 <= n <= 10^4', '0 <= nums[i] <= n', 'Values in nums are distinct'],
    explain: ['With four numbers the range is 0 to 4, and 3 is absent.', 'The range is 0 to 1, and 0 is absent.', 'The range is 0 to 3, and 3 is absent.'],
    samples: 3,
    known: [3, 0, 3],
    ref: function missingNumber(nums) {
      let expected = (nums.length * (nums.length + 1)) / 2;
      for (const n of nums) expected -= n;
      return expected;
    },
    tests: [[[4, 0, 1, 2]], [[1]], [[2, 0, 1]], [[0]], [[1, 2]], [(() => { const n = 9000; const a = Array.from({ length: n + 1 }, (_, i) => i); const miss = 4321; a.splice(miss, 1); const r = rng(301); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return [a]; })()][0]],
  }),

  problem('sum-of-two-integers', {
    statement: `
Add the integers \`a\` and \`b\` and return the result, **without using the \`+\` or \`-\` operators** anywhere in your code.

Hint: binary addition can be split into a sum without carries (XOR) and the carries themselves (AND, shifted left).
`,
    params: ['a', 'b'],
    constraints: ['-1000 <= a, b <= 1000'],
    explain: ['4 + 9 = 13.', '-6 + 2 = -4.'],
    known: [13, -4],
    ref: function getSum(a, b) { return a + b; },
    tests: [[4, 9], [-6, 2], [0, 0], [-1, 1], [-5, -7], [1000, 1000], [-1000, 999], [13, -29]],
  }),

  problem('reverse-integer', {
    statement: `
Return the 32-bit signed integer \`x\` with its **decimal digits in reverse order**, keeping its sign. If the reversed number does not fit in \`[-2^31, 2^31 - 1]\`, return \`0\` instead.

Pretend you cannot use 64-bit integers.
`,
    params: ['x'],
    constraints: ['-2^31 <= x <= 2^31 - 1'],
    explain: ['456 backwards is 654.', 'The minus sign stays in front: -890 becomes -98 (the leading zero drops).', '1000 backwards is 0001, which is 1.'],
    samples: 3,
    known: [654, -98, 1],
    ref: function reverse(x) {
      const sign = x < 0 ? -1 : 1;
      const reversed = Number(String(Math.abs(x)).split('').reverse().join('')) * sign;
      return reversed < -(2 ** 31) || reversed > 2 ** 31 - 1 ? 0 : reversed;
    },
    tests: [[456], [-890], [1000], [0], [1999999999], [-2147483648], [2147483647], [1463847412], [-1563847412], [900000]],
  }),

  problem('roman-to-integer', {
    statement: `
Turn the Roman numeral \`s\` into an ordinary integer. The letters are worth \`I = 1\`, \`V = 5\`, \`X = 10\`, \`L = 50\`, \`C = 100\`, \`D = 500\` and \`M = 1000\`.

Values are usually added from left to right. The exception: when a letter is **worth less than the letter right after it**, it is subtracted instead (\`IV = 4\`, \`XC = 90\`, \`CM = 900\`, and so on).
`,
    params: ['s'],
    constraints: ['1 <= s.length <= 15', 's uses only I, V, X, L, C, D and M', 's is a valid numeral between 1 and 3999'],
    explain: ['X + IV = 10 + 4.', 'L + XXX = 50 + 30.', 'CD + XC + VII = 400 + 90 + 7.'],
    samples: 3,
    known: [14, 80, 497],
    ref: function romanToInt(s) {
      const value = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
      let total = 0;
      for (let i = 0; i < s.length; i++) {
        const v = value[s[i]];
        total += i + 1 < s.length && v < value[s[i + 1]] ? -v : v;
      }
      return total;
    },
    tests: [['XIV'], ['LXXX'], ['CDXCVII'], ['IV'], ['IX'], ['XL'], ['CDXLIV'], ['MMMCMXCIX'], ['DCCCXC']],
  }),

  problem('integer-to-roman', {
    statement: `
Write \`num\` as a **Roman numeral** using \`I = 1\`, \`V = 5\`, \`X = 10\`, \`L = 50\`, \`C = 100\`, \`D = 500\` and \`M = 1000\`.

Build it from the largest value downwards. Where a digit is 4 or 9, use the subtractive pairs \`IV\`, \`IX\`, \`XL\`, \`XC\`, \`CD\` or \`CM\`, so no letter ever appears more than three times in a row.
`,
    params: ['num'],
    constraints: ['1 <= num <= 3999'],
    explain: ['10 + 4 is X + IV.', '50 + 30 is L + XXX.', '400 + 90 + 7 is CD + XC + VII.'],
    samples: 3,
    known: ['XIV', 'LXXX', 'CDXCVII'],
    ref: function intToRoman(num) {
      const table = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
      let out = '';
      for (const [v, sym] of table) while (num >= v) { out += sym; num -= v; }
      return out;
    },
    tests: [[14], [80], [497], [4], [9], [40], [444], [3999], [1], [2024]],
  }),

  problem('powx-n', {
    statement: `
Compute \`x\` raised to the whole-number power \`n\` (which may be negative or zero) and return it.

Answers within \`10^-5\` are accepted. With exponents up to two billion, multiplying one step at a time is too slow, so use **repeated squaring**.
`,
    params: ['x', 'n'],
    meta: { compare: 'float' },
    constraints: ['-100.0 < x < 100.0', '-2^31 <= n <= 2^31 - 1', 'n is a whole number', 'x is not zero, or n > 0', '-10^4 <= x^n <= 10^4'],
    explain: ['3 x 3 x 3 x 3 = 81.', '1.5 squared is 2.25.', 'A negative power flips the result: 4^-1 = 1 / 4.'],
    samples: 3,
    known: [81, 2.25, 0.25],
    ref: function myPow(x, n) { return Math.pow(x, n); },
    tests: [[3, 4], [1.5, 2], [4, -1], [1, 2147483647], [-1, 2147483647], [0.00001, 2147483647], [2, 0], [1.00001, 1000], [-3, 5], [10, -4]],
  }),

  problem('sqrtx', {
    statement: `
Return the **largest whole number whose square is at most \`x\`**, that is, the square root of \`x\` rounded down.

Built-in power or square-root helpers (\`Math.sqrt\`, \`x ** 0.5\` and friends) are off limits.
`,
    params: ['x'],
    constraints: ['0 <= x <= 2^31 - 1'],
    explain: ['3 x 3 = 9 exactly.', '3 x 3 = 9 fits under 15, but 4 x 4 = 16 does not.'],
    known: [3, 3],
    ref: function mySqrt(x) {
      let lo = 0;
      let hi = Math.min(x, 46341);
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (mid * mid <= x) lo = mid;
        else hi = mid - 1;
      }
      return lo;
    },
    tests: [[9], [15], [0], [1], [2], [16], [99], [2147395599], [2147483647], [15241578750190521]].slice(0, 9),
  }),

  problem('plus-one', {
    statement: `
A very long number is stored digit by digit in \`digits\`, **most significant digit first**, with no leading zeros. Add \`1\` to it and return the new digit array.
`,
    params: ['digits'],
    constraints: ['1 <= digits.length <= 100', '0 <= digits[i] <= 9', 'No leading zeros'],
    explain: ['279 + 1 = 280: the 9 rolls over and carries.', '5 + 1 = 6.', '99 + 1 = 100 needs an extra digit.'],
    samples: 3,
    known: [[2, 8, 0], [6], [1, 0, 0]],
    ref: function plusOne(digits) {
      const out = [...digits];
      for (let i = out.length - 1; i >= 0; i--) {
        if (out[i] < 9) { out[i]++; return out; }
        out[i] = 0;
      }
      return [1, ...out];
    },
    tests: [[[2, 7, 9]], [[5]], [[9, 9]], [[0]], [[9, 9, 9]], [[1, 9, 9]], [[8, 9, 9, 9, 9]], [Array.from({ length: 100 }, () => 9)]],
  }),

  problem('add-binary', {
    statement: `
\`a\` and \`b\` are numbers written in binary as strings of \`0\`s and \`1\`s. Return **their sum, also written in binary**.
`,
    params: ['a', 'b'],
    constraints: ['1 <= a.length, b.length <= 10^4', 'Both strings contain only "0" and "1"', 'No leading zeros, except the string "0" itself'],
    explain: ['5 + 3 = 8, which is 1000 in binary.', '9 + 6 = 15, which is 1111.'],
    known: ['1000', '1111'],
    ref: function addBinary(a, b) {
      let i = a.length - 1;
      let j = b.length - 1;
      let carry = 0;
      let out = '';
      while (i >= 0 || j >= 0 || carry) {
        const sum = (i >= 0 ? a.charCodeAt(i--) - 48 : 0) + (j >= 0 ? b.charCodeAt(j--) - 48 : 0) + carry;
        out = (sum & 1) + out;
        carry = sum >> 1;
      }
      return out;
    },
    tests: [['101', '11'], ['1001', '110'], ['0', '0'], ['1', '1'], ['1111', '1111'], ['100', '110010'], ['1'.repeat(200), '1'], ['1' + '0'.repeat(300), '1' + '0'.repeat(150)]],
  }),
];
