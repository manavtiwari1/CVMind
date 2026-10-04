import { problem, rng, randInt, DESIGN_NOTE } from './_lib.mjs';

export default [
  problem('min-stack', {
    statement: `
Build a stack that can also report **the smallest value it currently holds**. Every operation must take **O(1)** time.

Implement the \`MinStack\` class:

- \`MinStack()\` starts with an empty stack.
- \`push(val)\` places \`val\` on top.
- \`pop()\` discards the top value.
- \`top()\` returns the top value without removing it.
- \`getMin()\` returns the smallest value anywhere in the stack.

${DESIGN_NOTE}
`,
    meta: { kind: 'design' },
    design: { className: 'MinStack', ctor: [], methods: [['push', ['val']], ['pop', []], ['top', []], ['getMin', []]] , cpp: { ctor: [], methods: [{ name: 'push', args: ['int'], names: ['val'], ret: 'void' }, { name: 'pop', args: [], ret: 'void' }, { name: 'top', args: [], ret: 'int' }, { name: 'getMin', args: [], ret: 'int' }] } },
    constraints: ['-2^31 <= val <= 2^31 - 1', 'pop, top and getMin are only called when the stack is not empty', 'At most 3 * 10^4 calls in total'],
    explain: ['With 4 and 7 inside the minimum is 4. Pushing 1 lowers it to 1, and popping the 1 brings it back to 4, with 7 on top.'],
    samples: 1,
    known: [[null, null, null, 4, null, 1, null, 4, 7]],
    ref: class MinStack {
      constructor() { this.values = []; this.mins = []; }
      push(val) { this.values.push(val); this.mins.push(this.mins.length ? Math.min(val, this.mins[this.mins.length - 1]) : val); }
      pop() { this.values.pop(); this.mins.pop(); }
      top() { return this.values[this.values.length - 1]; }
      getMin() { return this.mins[this.mins.length - 1]; }
    },
    tests: [
      [['MinStack', 'push', 'push', 'getMin', 'push', 'getMin', 'pop', 'getMin', 'top'], [[], [4], [7], [], [1], [], [], [], []]],
      [['MinStack', 'push', 'getMin', 'top'], [[], [5], [], []]],
      [['MinStack', 'push', 'push', 'getMin', 'pop', 'getMin'], [[], [2], [1], [], [], []]],
      [['MinStack', 'push', 'push', 'push', 'pop', 'getMin', 'top'], [[], [3], [3], [1], [], [], []]],
      [['MinStack', 'push', 'push', 'pop', 'getMin'], [[], [0], [-1], [], []]],
      (() => {
        const r = rng(3);
        const ops = ['MinStack'];
        const args = [[]];
        let size = 0;
        for (let i = 0; i < 400; i++) {
          const roll = r();
          if (size === 0 || roll < 0.5) { ops.push('push'); args.push([randInt(r, -1000, 1000)]); size++; }
          else if (roll < 0.7) { ops.push('pop'); args.push([]); size--; }
          else if (roll < 0.85) { ops.push('top'); args.push([]); }
          else { ops.push('getMin'); args.push([]); }
        }
        return [ops, args];
      })(),
    ],
  }),

  problem('evaluate-reverse-polish-notation', {
    statement: `
\`tokens\` is an arithmetic expression written in **postfix order**: each operator comes right after its two operands, so \`3 4 +\` means \`3 + 4\`. Compute its value.

- Operators are \`+\`, \`-\`, \`*\` and \`/\`; everything else is an integer.
- \`/\` is integer division that **drops the fractional part** (it rounds toward zero).
- The expression is always well formed, never divides by zero, and stays within 32-bit integers.
`,
    params: ['tokens'],
    constraints: ['1 <= tokens.length <= 10^4', 'Each token is an operator or an integer from -200 to 200'],
    explain: ['(6 - 2) * 4 = 16', '20 / (3 + 4) = 2, since the fraction is dropped.'],
    known: [16, 2],
    ref: function evalRPN(tokens) {
      const stack = [];
      for (const t of tokens) {
        if (t === '+' || t === '-' || t === '*' || t === '/') {
          const b = stack.pop();
          const a = stack.pop();
          if (t === '+') stack.push(a + b);
          else if (t === '-') stack.push(a - b);
          else if (t === '*') stack.push(a * b);
          else stack.push(Math.trunc(a / b));
        } else {
          stack.push(Number(t));
        }
      }
      return stack.pop();
    },
    tests: [
      [['6', '2', '-', '4', '*']],
      [['20', '3', '4', '+', '/']],
      [['3', '4', '5', '*', '-', '2', '/']],
      [['3']],
      [['-7', '2', '/']],
      [['7', '-2', '/']],
      [['1', '2', '-', '3', '*']],
      [['18']],
      [['5', '1', '2', '+', '4', '*', '+', '3', '-']],
    ],
  }),

  problem('generate-parentheses', {
    statement: `
List **every balanced string made of \`n\` opening and \`n\` closing parentheses**. Balanced means that, reading left to right, you never close more parentheses than you have opened.

Return the strings in any order.
`,
    params: ['n'],
    meta: { compare: 'unordered' },
    constraints: ['1 <= n <= 8'],
    explain: ['Two pairs can be nested or placed side by side.', 'One pair has a single arrangement.'],
    known: [['(())', '()()'], ['()']],
    ref: function generateParenthesis(n) {
      const out = [];
      const build = (cur, open, close) => {
        if (cur.length === 2 * n) { out.push(cur); return; }
        if (open < n) build(cur + '(', open + 1, close);
        if (close < open) build(cur + ')', open, close + 1);
      };
      build('', 0, 0);
      return out;
    },
    tests: [[2], [1], [3], [4], [5], [8]],
  }),

  problem('daily-temperatures', {
    title: 'Wait for a Warmer Day',
    slug: 'wait-for-a-warmer-day',
    statement: `
\`temperatures\` is a forecast, one reading per day. For each day, count **how many days pass until a strictly warmer day arrives**, and return these counts as an array.

Use \`0\` for days that are never followed by a warmer one.
`,
    params: ['temperatures'],
    constraints: ['1 <= temperatures.length <= 10^5', '30 <= temperatures[i] <= 100'],
    explain: ['Day 0 (60) waits two days for 62; day 2 (62) waits two days for 65.', 'Each day is beaten by the next, except the last.'],
    known: [[2, 1, 2, 1, 0], [1, 1, 0]],
    ref: function dailyTemperatures(temperatures) {
      const answer = new Array(temperatures.length).fill(0);
      const stack = [];
      for (let i = 0; i < temperatures.length; i++) {
        while (stack.length && temperatures[stack[stack.length - 1]] < temperatures[i]) {
          const j = stack.pop();
          answer[j] = i - j;
        }
        stack.push(i);
      }
      return answer;
    },
    tests: [
      [[60, 58, 62, 61, 65]],
      [[40, 45, 50]],
      [[35, 70, 95]],
      [[90, 80, 70]],
      [[55]],
      [[50, 50, 50]],
      [(() => { const r = rng(2); return Array.from({ length: 9000 }, () => randInt(r, 30, 100)); })()],
    ],
  }),

  problem('car-fleet', {
    title: 'Convoys on a Narrow Road',
    slug: 'convoys-on-a-narrow-road',
    statement: `
Trucks travel one way along a road with no overtaking, all heading for a depot \`target\` km away. Truck \`i\` starts \`position[i]\` km along the road and drives at \`speed[i]\` km per hour.

When a truck catches up with the one ahead, it slows down and they continue together as a **convoy**. Trucks that catch up exactly at the depot also count as one convoy.

Return **how many convoys reach the depot**.
`,
    params: ['target', 'position', 'speed'],
    constraints: ['1 <= n <= 10^5', '0 < target <= 10^6', '0 <= position[i] < target, all different', '0 < speed[i] <= 10^6'],
    explain: ['The trucks at 6 and 2 both need 2 hours, so they arrive together; the truck at 0 needs 10 hours and arrives alone.', 'One truck is one convoy.'],
    known: [2, 1],
    ref: function carFleet(target, position, speed) {
      const cars = position.map((p, i) => [p, (target - p) / speed[i]]).sort((a, b) => b[0] - a[0]);
      let fleets = 0;
      let slowest = 0;
      for (const [, time] of cars) {
        if (time > slowest) { fleets++; slowest = time; }
      }
      return fleets;
    },
    tests: [
      [10, [6, 2, 0], [2, 4, 1]],
      [15, [5], [2]],
      [50, [0, 10, 20], [5, 3, 1]],
      [10, [6, 8], [3, 2]],
      [13, [10, 2, 5, 7, 4, 6, 11], [7, 5, 10, 5, 9, 4, 1]],
      [20, [0, 4, 8, 12, 16], [5, 4, 3, 2, 1]],
    ],
  }),

  problem('largest-rectangle-in-histogram', {
    statement: `
A bar chart has bars of width \`1\` standing side by side, with heights \`heights\`. Draw an axis-aligned rectangle that **stays inside the bars** (it may span several neighbouring bars, but no higher than the shortest of them).

Return the **largest area** such a rectangle can have.
`,
    params: ['heights'],
    constraints: ['1 <= heights.length <= 10^5', '0 <= heights[i] <= 10^4'],
    explain: ['The two bars of height 4 give 4 x 2 = 8.', 'Both bars at height 3 give 6, more than the 5 alone.'],
    known: [8, 6],
    ref: function largestRectangleArea(heights) {
      const stack = []; // indexes of bars with increasing heights
      let best = 0;
      const n = heights.length;
      for (let i = 0; i <= n; i++) {
        const h = i === n ? 0 : heights[i];
        while (stack.length && heights[stack[stack.length - 1]] >= h) {
          const height = heights[stack.pop()];
          const left = stack.length ? stack[stack.length - 1] + 1 : 0;
          best = Math.max(best, height * (i - left));
        }
        stack.push(i);
      }
      return best;
    },
    tests: [
      [[3, 1, 4, 4, 2]],
      [[3, 5]],
      [[1]],
      [[0, 0]],
      [[4, 6, 3, 6, 4, 2]],
      [[2, 1, 2]],
      [[5, 5, 5, 5]],
      [[1, 2, 3, 4, 5]],
      [(() => { const r = rng(6); return Array.from({ length: 9000 }, () => randInt(r, 0, 10000)); })()],
    ],
  }),

  problem('asteroid-collision', {
    title: 'Marbles on a Track',
    slug: 'marbles-on-a-track',
    statement: `
Marbles roll along a straight track at the same speed. \`asteroids[i]\` describes marble \`i\` from left to right: its **absolute value is its weight**, and its **sign is its direction** (positive rolls right, negative rolls left).

When a right-rolling marble meets a left-rolling one, the **lighter marble shatters**; if they weigh the same, **both shatter**. Marbles rolling the same way never touch.

Return the marbles that survive, from left to right.
`,
    params: ['asteroids'],
    constraints: ['2 <= asteroids.length <= 10^4', '-1000 <= asteroids[i] <= 1000', 'asteroids[i] != 0'],
    explain: ['The -3 hits the 7 and shatters; the 4 is never reached.', 'Equal weights, so both shatter.'],
    known: [[4, 7], []],
    ref: function asteroidCollision(asteroids) {
      const stack = [];
      for (const a of asteroids) {
        let alive = true;
        while (alive && a < 0 && stack.length && stack[stack.length - 1] > 0) {
          const top = stack[stack.length - 1];
          if (top < -a) stack.pop();
          else if (top === -a) { stack.pop(); alive = false; }
          else alive = false;
        }
        if (alive) stack.push(a);
      }
      return stack;
    },
    tests: [
      [[4, 7, -3]],
      [[6, -6]],
      [[-3, -1, 2, 5]],
      [[2, -4, -4]],
      [[-1, 3, 2, -3]],
      [[3, 5, -6, 2, -1, 4]],
      [(() => { const r = rng(8); return Array.from({ length: 3000 }, () => (r() < 0.5 ? -1 : 1) * randInt(r, 1, 1000)); })()],
    ],
  }),
];
