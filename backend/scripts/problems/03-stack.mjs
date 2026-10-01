import { problem, rng, randInt, DESIGN_NOTE } from './_lib.mjs';

export default [
  problem('min-stack', {
    statement: `
Design a stack that supports \`push\`, \`pop\`, \`top\` and retrieving the **minimum element**, all in **constant time**.

Implement the \`MinStack\` class:

- \`MinStack()\` creates an empty stack.
- \`push(val)\` pushes \`val\` onto the stack.
- \`pop()\` removes the element on top of the stack.
- \`top()\` returns the element on top of the stack.
- \`getMin()\` returns the smallest element currently in the stack.

${DESIGN_NOTE}
`,
    meta: { kind: 'design' },
    design: { className: 'MinStack', ctor: [], methods: [['push', ['val']], ['pop', []], ['top', []], ['getMin', []]] , cpp: { ctor: [], methods: [{ name: 'push', args: ['int'], names: ['val'], ret: 'void' }, { name: 'pop', args: [], ret: 'void' }, { name: 'top', args: [], ret: 'int' }, { name: 'getMin', args: [], ret: 'int' }] } },
    constraints: ['-2^31 <= val <= 2^31 - 1', 'pop, top and getMin are always called on a non-empty stack', 'At most 3 * 10^4 calls are made'],
    explain: ['After pushing -2, 0 and -3 the minimum is -3. After one pop the top is 0 and the minimum is -2.'],
    samples: 1,
    known: [[null, null, null, null, -3, null, 0, -2]],
    ref: class MinStack {
      constructor() { this.values = []; this.mins = []; }
      push(val) { this.values.push(val); this.mins.push(this.mins.length ? Math.min(val, this.mins[this.mins.length - 1]) : val); }
      pop() { this.values.pop(); this.mins.pop(); }
      top() { return this.values[this.values.length - 1]; }
      getMin() { return this.mins[this.mins.length - 1]; }
    },
    tests: [
      [['MinStack', 'push', 'push', 'push', 'getMin', 'pop', 'top', 'getMin'], [[], [-2], [0], [-3], [], [], [], []]],
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
You are given an array of strings \`tokens\` that holds an arithmetic expression in **Reverse Polish Notation** (postfix). Evaluate it and return the result as an integer.

- The valid operators are \`+\`, \`-\`, \`*\` and \`/\`. Each operand is an integer or another expression.
- Division between two integers **truncates toward zero**.
- The expression is always valid, never divides by zero, and every intermediate value fits in a 32-bit integer.
`,
    params: ['tokens'],
    constraints: ['1 <= tokens.length <= 10^4', 'tokens[i] is an operator or an integer in the range [-200, 200]'],
    explain: ['((2 + 1) * 3) = 9', '(4 + (13 / 5)) = 4 + 2 = 6', 'The expression reduces step by step to 22.'],
    samples: 3,
    known: [9, 6, 22],
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
      [['2', '1', '+', '3', '*']],
      [['4', '13', '5', '/', '+']],
      [['10', '6', '9', '3', '+', '-11', '*', '/', '*', '17', '+', '5', '+']],
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
Given \`n\` pairs of parentheses, return **every well-formed combination** of exactly \`n\` pairs.

A combination is well-formed when every opening parenthesis is closed in the right order. You may return the combinations in any order.
`,
    params: ['n'],
    meta: { compare: 'unordered' },
    constraints: ['1 <= n <= 8'],
    explain: ['Only one arrangement exists for a single pair.', 'There are five well-formed arrangements of three pairs.'],
    known: [['()'], ['((()))', '(()())', '(())()', '()(())', '()()()']],
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
    tests: [[1], [3], [2], [4], [5], [8]],
  }),

  problem('daily-temperatures', {
    statement: `
Given an array \`temperatures\` of daily temperatures, return an array \`answer\` where \`answer[i]\` is the **number of days you have to wait after day \`i\`** to get a warmer temperature.

If there is no future day with a warmer temperature, \`answer[i]\` is \`0\`.
`,
    params: ['temperatures'],
    constraints: ['1 <= temperatures.length <= 10^5', '30 <= temperatures[i] <= 100'],
    explain: ['For example, day 0 (73) waits one day for 74, and day 2 (75) waits four days for 76.', 'Every day is followed by a warmer one, except the last.'],
    known: [[1, 1, 4, 2, 1, 1, 0, 0], [1, 1, 1, 0]],
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
      [[73, 74, 75, 71, 69, 72, 76, 73]],
      [[30, 40, 50, 60]],
      [[30, 60, 90]],
      [[90, 80, 70]],
      [[55]],
      [[50, 50, 50]],
      [(() => { const r = rng(2); return Array.from({ length: 9000 }, () => randInt(r, 30, 100)); })()],
    ],
  }),

  problem('car-fleet', {
    statement: `
There are \`n\` cars driving towards a destination that is \`target\` miles away along a single-lane road. Car \`i\` starts at \`position[i]\` and drives at a constant \`speed[i]\` miles per hour.

A car cannot pass the car in front of it. If it catches up, it slows down and drives at that car's speed, forming a **fleet** with it. Cars that catch up exactly at the destination also count as one fleet.

Return the number of car fleets that arrive at the destination.
`,
    params: ['target', 'position', 'speed'],
    constraints: ['1 <= n <= 10^5', '0 < target <= 10^6', '0 <= position[i] < target, and all positions are different', '0 < speed[i] <= 10^6'],
    explain: ['The cars starting at 10 and 8 become a fleet that meets at 12. The car at 0 never catches anyone. The cars at 5 and 3 become a fleet that meets at 6. That is 3 fleets.', 'A single car is a single fleet.'],
    known: [3, 1],
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
      [12, [10, 8, 0, 5, 3], [2, 4, 1, 1, 3]],
      [10, [3], [3]],
      [100, [0, 2, 4], [4, 2, 1]],
      [10, [6, 8], [3, 2]],
      [13, [10, 2, 5, 7, 4, 6, 11], [7, 5, 10, 5, 9, 4, 1]],
      [20, [0, 4, 8, 12, 16], [5, 4, 3, 2, 1]],
    ],
  }),

  problem('largest-rectangle-in-histogram', {
    statement: `
You are given an array \`heights\` representing the heights of the bars of a histogram. Every bar has width \`1\`.

Return the **area of the largest rectangle** that fits entirely inside the histogram.
`,
    params: ['heights'],
    constraints: ['1 <= heights.length <= 10^5', '0 <= heights[i] <= 10^4'],
    explain: ['The largest rectangle spans the bars of height 5 and 6 and has area 5 x 2 = 10.', 'The largest rectangle is a single bar of height 4.'],
    known: [10, 4],
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
      [[2, 1, 5, 6, 2, 3]],
      [[2, 4]],
      [[1]],
      [[0, 0]],
      [[6, 2, 5, 4, 5, 1, 6]],
      [[2, 1, 2]],
      [[5, 5, 5, 5]],
      [[1, 2, 3, 4, 5]],
      [(() => { const r = rng(6); return Array.from({ length: 9000 }, () => randInt(r, 0, 10000)); })()],
    ],
  }),

  problem('asteroid-collision', {
    statement: `
You are given an array \`asteroids\` of integers describing asteroids in a row. The **absolute value** is the asteroid's size and the **sign** is its direction: positive moves right, negative moves left. All asteroids move at the same speed.

Asteroids moving in the same direction never meet. When two asteroids meet, the **smaller one explodes**. If they are the same size, **both explode**.

Return the state of the asteroids after all collisions.
`,
    params: ['asteroids'],
    constraints: ['2 <= asteroids.length <= 10^4', '-1000 <= asteroids[i] <= 1000', 'asteroids[i] != 0'],
    explain: ['The 10 and -5 meet and the -5 explodes. The 5 and 10 never meet.', 'The 8 and -8 have the same size, so both explode.', 'The 2 and -5 meet and the 2 explodes, then the 10 and -5 meet and the -5 explodes.'],
    samples: 3,
    known: [[5, 10], [], [10]],
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
      [[5, 10, -5]],
      [[8, -8]],
      [[10, 2, -5]],
      [[-2, -1, 1, 2]],
      [[1, -2, -2, -2]],
      [[-2, 2, 1, -2]],
      [[3, 5, -6, 2, -1, 4]],
      [(() => { const r = rng(8); return Array.from({ length: 3000 }, () => (r() < 0.5 ? -1 : 1) * randInt(r, 1, 1000)); })()],
    ],
  }),
];
