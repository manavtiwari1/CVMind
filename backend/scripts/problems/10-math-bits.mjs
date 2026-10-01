import { problem, rng, randInt } from './_lib.mjs';

const UNSIGNED = '0 <= n <= 2^32 - 1, given as a non-negative integer';

export default [
  problem('number-of-1-bits', {
    statement: `
Given a positive integer \`n\`, treated as a **32-bit unsigned integer**, return the number of \`1\` bits in its binary representation (its **Hamming weight**).
`,
    params: ['n'],
    cpp: { args: ['uint32_t'], ret: 'int' },
    constraints: ['1 <= n <= 2^32 - 1'],
    explain: ['11 is 1011 in binary, which has three 1 bits.', '128 is 10000000 in binary, which has one 1 bit.', '2147483645 is 1111111111111111111111111111101 in binary, which has thirty 1 bits.'],
    samples: 3,
    known: [3, 1, 30],
    ref: function hammingWeight(n) {
      let count = 0;
      n = n >>> 0;
      while (n) { count += n & 1; n >>>= 1; }
      return count;
    },
    tests: [[11], [128], [2147483645], [1], [4294967295], [2147483648], [1023], [123456789]],
  }),

  problem('counting-bits', {
    statement: `
Given an integer \`n\`, return an array \`ans\` of length \`n + 1\` where \`ans[i]\` is the **number of \`1\` bits** in the binary representation of \`i\`, for every \`0 <= i <= n\`.

Can you do it in a single pass, without counting the bits of each number separately?
`,
    params: ['n'],
    constraints: ['0 <= n <= 10^5'],
    explain: ['0, 1 and 2 have 0, 1 and 1 set bits.', '0 to 5 are 0, 1, 10, 11, 100 and 101 in binary, which have 0, 1, 1, 2, 1 and 2 set bits.'],
    known: [[0, 1, 1], [0, 1, 1, 2, 1, 2]],
    ref: function countBits(n) {
      const bits = new Array(n + 1).fill(0);
      for (let i = 1; i <= n; i++) bits[i] = bits[i >> 1] + (i & 1);
      return bits;
    },
    tests: [[2], [5], [0], [1], [16], [31], [1000], [100000]],
  }),

  problem('reverse-bits', {
    statement: `
Reverse the bits of a **32-bit unsigned integer** \`n\` and return the result as an unsigned integer.

For example, the 32-bit input \`00000010100101000001111010011100\` becomes \`00111001011110000010100101000000\`.
`,
    params: ['n'],
    cpp: { args: ['uint32_t'], ret: 'uint32_t' },
    constraints: ['0 <= n <= 2^32 - 1'],
    explain: ['43261596 reversed bit by bit is 964176192.', '4294967293 reversed bit by bit is 3221225471.'],
    known: [964176192, 3221225471],
    ref: function reverseBits(n) {
      let result = 0;
      n = n >>> 0;
      for (let i = 0; i < 32; i++) { result = (result * 2) + (n & 1); n >>>= 1; }
      return result;
    },
    tests: [[43261596], [4294967293], [0], [1], [2147483648], [4294967295], [255], [3141592653]],
  }),

  problem('missing-number', {
    statement: `
Given an array \`nums\` containing \`n\` **distinct** numbers taken from the range \`[0, n]\`, return the **one number in that range that is missing** from the array.
`,
    params: ['nums'],
    constraints: ['n == nums.length', '1 <= n <= 10^4', '0 <= nums[i] <= n', 'All the numbers of nums are unique'],
    explain: ['n = 3, so the range is [0, 3]. The number 2 is missing.', 'n = 2, so the range is [0, 2]. The number 2 is missing.', 'n = 9, so the range is [0, 9]. The number 8 is missing.'],
    samples: 3,
    known: [2, 2, 8],
    ref: function missingNumber(nums) {
      let expected = (nums.length * (nums.length + 1)) / 2;
      for (const n of nums) expected -= n;
      return expected;
    },
    tests: [[[3, 0, 1]], [[0, 1]], [[9, 6, 4, 2, 3, 5, 7, 0, 1]], [[0]], [[1]], [[1, 2]], [(() => { const n = 9000; const a = Array.from({ length: n + 1 }, (_, i) => i); const miss = 4321; a.splice(miss, 1); const r = rng(301); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return [a]; })()][0]],
  }),

  problem('sum-of-two-integers', {
    statement: `
Given two integers \`a\` and \`b\`, return their **sum** without using the operators \`+\` and \`-\`.

Hint: think about how a computer adds binary numbers with XOR and carry.
`,
    params: ['a', 'b'],
    constraints: ['-1000 <= a, b <= 1000'],
    explain: ['1 + 2 = 3.', '2 + 3 = 5.'],
    known: [3, 5],
    ref: function getSum(a, b) { return a + b; },
    tests: [[1, 2], [2, 3], [0, 0], [-1, 1], [-5, -7], [1000, 1000], [-1000, 999], [13, -29]],
  }),

  problem('reverse-integer', {
    statement: `
Given a signed 32-bit integer \`x\`, return \`x\` with its **digits reversed**. If reversing makes the value go outside the signed 32-bit range \`[-2^31, 2^31 - 1]\`, return \`0\`.

Assume the environment does not let you store 64-bit integers.
`,
    params: ['x'],
    constraints: ['-2^31 <= x <= 2^31 - 1'],
    explain: ['Reversing 123 gives 321.', 'The sign is kept: -123 becomes -321.', 'Trailing zeros disappear: 120 becomes 21.', 'The reversed value 9646324351 does not fit in 32 bits, so the answer is 0.'],
    samples: 3,
    known: [321, -321, 21],
    ref: function reverse(x) {
      const sign = x < 0 ? -1 : 1;
      const reversed = Number(String(Math.abs(x)).split('').reverse().join('')) * sign;
      return reversed < -(2 ** 31) || reversed > 2 ** 31 - 1 ? 0 : reversed;
    },
    tests: [[123], [-123], [120], [0], [1534236469], [-2147483648], [2147483647], [1463847412], [-1563847412], [900000]],
  }),

  problem('roman-to-integer', {
    statement: `
Roman numerals use the symbols \`I\` (1), \`V\` (5), \`X\` (10), \`L\` (50), \`C\` (100), \`D\` (500) and \`M\` (1000). Symbols are normally written from largest to smallest and added together, except that a smaller symbol **before** a larger one is subtracted:

- \`I\` before \`V\` or \`X\` makes 4 and 9,
- \`X\` before \`L\` or \`C\` makes 40 and 90,
- \`C\` before \`D\` or \`M\` makes 400 and 900.

Given a Roman numeral \`s\`, convert it to an integer.
`,
    params: ['s'],
    constraints: ['1 <= s.length <= 15', 's contains only the characters I, V, X, L, C, D and M', 's is a valid Roman numeral in the range [1, 3999]'],
    explain: ['III = 3.', 'L = 50, V = 5 and III = 3.', 'M = 1000, CM = 900, XC = 90 and IV = 4.'],
    samples: 3,
    known: [3, 58, 1994],
    ref: function romanToInt(s) {
      const value = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
      let total = 0;
      for (let i = 0; i < s.length; i++) {
        const v = value[s[i]];
        total += i + 1 < s.length && v < value[s[i + 1]] ? -v : v;
      }
      return total;
    },
    tests: [['III'], ['LVIII'], ['MCMXCIV'], ['IV'], ['IX'], ['XL'], ['CDXLIV'], ['MMMCMXCIX'], ['DCCCXC']],
  }),

  problem('integer-to-roman', {
    statement: `
Convert the integer \`num\` to a **Roman numeral**.

Roman numerals use the symbols \`I\` (1), \`V\` (5), \`X\` (10), \`L\` (50), \`C\` (100), \`D\` (500) and \`M\` (1000). Write the value from the largest symbol down, using the subtractive forms \`IV\` (4), \`IX\` (9), \`XL\` (40), \`XC\` (90), \`CD\` (400) and \`CM\` (900) where they apply. A symbol is never repeated more than three times in a row.
`,
    params: ['num'],
    constraints: ['1 <= num <= 3999'],
    explain: ['3 is three ones.', '58 is L + V + III.', '1994 is M + CM + XC + IV.'],
    samples: 3,
    known: ['III', 'LVIII', 'MCMXCIV'],
    ref: function intToRoman(num) {
      const table = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
      let out = '';
      for (const [v, sym] of table) while (num >= v) { out += sym; num -= v; }
      return out;
    },
    tests: [[3], [58], [1994], [4], [9], [40], [444], [3999], [1], [2024]],
  }),

  problem('powx-n', {
    statement: `
Implement \`pow(x, n)\`, which raises the number \`x\` to the integer power \`n\` and returns \`x^n\`.

Answers within \`10^-5\` of the exact value are accepted. Try to use **fast exponentiation** so that large exponents finish quickly.
`,
    params: ['x', 'n'],
    meta: { compare: 'float' },
    constraints: ['-100.0 < x < 100.0', '-2^31 <= n <= 2^31 - 1', 'n is an integer', 'Either x is not zero or n > 0', '-10^4 <= x^n <= 10^4'],
    explain: ['2 to the 10th power is 1024.', '2.1 cubed is 9.261.', 'A negative exponent means a reciprocal: 2^-2 = 1 / 4 = 0.25.'],
    samples: 3,
    known: [1024, 9.261000000000001, 0.25],
    ref: function myPow(x, n) { return Math.pow(x, n); },
    tests: [[2, 10], [2.1, 3], [2, -2], [1, 2147483647], [-1, 2147483647], [0.00001, 2147483647], [2, 0], [1.00001, 1000], [-3, 5], [10, -4]],
  }),

  problem('sqrtx', {
    statement: `
Given a non-negative integer \`x\`, return the **square root of \`x\` rounded down** to the nearest integer. The result must be non-negative.

You must not use any built-in exponent function or operator such as \`pow(x, 0.5)\` or \`x ** 0.5\`.
`,
    params: ['x'],
    constraints: ['0 <= x <= 2^31 - 1'],
    explain: ['The square root of 4 is exactly 2.', 'The square root of 8 is about 2.83, which rounds down to 2.'],
    known: [2, 2],
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
    tests: [[4], [8], [0], [1], [2], [16], [99], [2147395599], [2147483647], [15241578750190521]].slice(0, 9),
  }),

  problem('plus-one', {
    statement: `
You are given a **large integer** as an array \`digits\`, where \`digits[i]\` is the \`i\`th digit and the digits are ordered from most significant to least significant. The number has no leading zeros.

Add **one** to the integer and return the resulting array of digits.
`,
    params: ['digits'],
    constraints: ['1 <= digits.length <= 100', '0 <= digits[i] <= 9', 'digits does not contain leading zeros'],
    explain: ['The array represents 123, and 123 + 1 = 124.', 'The array represents 4321, and 4321 + 1 = 4322.', 'The array represents 9, and 9 + 1 = 10.'],
    samples: 3,
    known: [[1, 2, 4], [4, 3, 2, 2], [1, 0]],
    ref: function plusOne(digits) {
      const out = [...digits];
      for (let i = out.length - 1; i >= 0; i--) {
        if (out[i] < 9) { out[i]++; return out; }
        out[i] = 0;
      }
      return [1, ...out];
    },
    tests: [[[1, 2, 3]], [[4, 3, 2, 1]], [[9]], [[0]], [[9, 9, 9]], [[1, 9, 9]], [[8, 9, 9, 9, 9]], [Array.from({ length: 100 }, () => 9)]],
  }),

  problem('add-binary', {
    statement: `
Given two binary strings \`a\` and \`b\`, return their **sum as a binary string**.
`,
    params: ['a', 'b'],
    constraints: ['1 <= a.length, b.length <= 10^4', 'a and b consist only of the characters "0" and "1"', 'Each string contains no leading zeros, except for the string "0" itself'],
    explain: ['1 + 1 carries into a new digit: 11 + 1 = 100.', '1010 + 1011 = 10101.'],
    known: ['100', '10101'],
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
    tests: [['11', '1'], ['1010', '1011'], ['0', '0'], ['1', '1'], ['1111', '1111'], ['100', '110010'], ['1'.repeat(200), '1'], ['1' + '0'.repeat(300), '1' + '0'.repeat(150)]],
  }),
];
