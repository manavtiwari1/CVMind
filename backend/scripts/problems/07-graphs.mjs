import { problem, rng, randInt } from './_lib.mjs';

const grid = (seed, rows, cols, make) => {
  const r = rng(seed);
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => make(r)));
};

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export default [
  problem('number-of-islands', {
    statement: `
A satellite map \`grid\` marks land as \`"1"\` and water as \`"0"\`. Land cells that touch **side by side (not diagonally)** belong to the same island, and everything outside the map is water.

Count the **islands** on the map.
`,
    params: ['grid'],
    constraints: ['m == grid.length, n == grid[i].length', '1 <= m, n <= 300', 'Every cell is "0" or "1"'],
    explain: ['The left column pair, the top-right cell and the bottom-right pair are separate.', 'The land snakes from the top-left to the bottom-right without a break.'],
    known: [3, 1],
    ref: function numIslands(grid) {
      const rows = grid.length;
      const cols = grid[0].length;
      const seen = grid.map((row) => row.map(() => false));
      let count = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] !== '1' || seen[r][c]) continue;
          count++;
          const stack = [[r, c]];
          seen[r][c] = true;
          while (stack.length) {
            const [y, x] = stack.pop();
            for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const ny = y + dy;
              const nx = x + dx;
              if (ny >= 0 && ny < rows && nx >= 0 && nx < cols && grid[ny][nx] === '1' && !seen[ny][nx]) {
                seen[ny][nx] = true;
                stack.push([ny, nx]);
              }
            }
          }
        }
      }
      return count;
    },
    tests: [
      [[['1', '0', '1'], ['1', '0', '0'], ['0', '1', '1']]],
      [[['1', '1', '0'], ['0', '1', '1'], ['0', '0', '1']]],
      [[['1']]],
      [[['0']]],
      [[['1', '0', '1', '0', '1']]],
      [[['1'], ['0'], ['1']]],
      [grid(91, 60, 60, (r) => (r() < 0.45 ? '1' : '0'))],
      [grid(92, 150, 150, (r) => (r() < 0.6 ? '1' : '0'))],
    ],
  }),

  problem('max-area-of-island', {
    statement: `
In the map \`grid\`, \`1\` is land and \`0\` is water. Land cells that share a side form one island, and an island's size is how many cells it covers.

Return the **size of the biggest island**, or \`0\` if the map has no land.
`,
    params: ['grid'],
    constraints: ['m == grid.length, n == grid[i].length', '1 <= m, n <= 50', 'Every cell is 0 or 1'],
    explain: ['The island on the right covers four cells; the top-left one covers three.', 'All water.'],
    known: [4, 0],
    ref: function maxAreaOfIsland(grid) {
      const rows = grid.length;
      const cols = grid[0].length;
      const seen = grid.map((row) => row.map(() => false));
      let best = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!grid[r][c] || seen[r][c]) continue;
          let area = 0;
          const stack = [[r, c]];
          seen[r][c] = true;
          while (stack.length) {
            const [y, x] = stack.pop();
            area++;
            for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const ny = y + dy;
              const nx = x + dx;
              if (ny >= 0 && ny < rows && nx >= 0 && nx < cols && grid[ny][nx] && !seen[ny][nx]) {
                seen[ny][nx] = true;
                stack.push([ny, nx]);
              }
            }
          }
          best = Math.max(best, area);
        }
      }
      return best;
    },
    tests: [
      [[[1, 1, 0, 0], [0, 1, 0, 1], [1, 0, 1, 1], [0, 0, 0, 1]]],
      [[[0, 0], [0, 0]]],
      [[[1]]],
      [[[0]]],
      [[[1, 1], [1, 1]]],
      [[[1, 0, 1], [0, 1, 0], [1, 0, 1]]],
      [grid(93, 50, 50, (r) => (r() < 0.55 ? 1 : 0))],
    ],
  }),

  problem('pacific-atlantic-water-flow', {
    title: 'Rainfall to Both Seas',
    slug: 'rainfall-to-both-seas',
    statement: `
\`heights\` is an elevation map of a rectangular valley. The **North Sea** lies along the top and left edges, and the **South Sea** along the bottom and right edges.

Rain on a cell can run to a side neighbour that is **no higher** than the cell itself, and drains into a sea from any cell on that sea's edges.

Return every cell \`[row, col]\` whose rain can end up in **both** seas, in any order.
`,
    params: ['heights'],
    meta: { compare: 'unordered' },
    constraints: ['m == heights.length, n == heights[r].length', '1 <= m, n <= 200', '0 <= heights[r][c] <= 10^5'],
    explain: ['Only the two bottom-right cells are cut off from the North Sea.', 'Both cells sit on edges of both seas.'],
    known: [[[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0]], [[0, 0], [0, 1]]],
    ref: function pacificAtlantic(heights) {
      const rows = heights.length;
      const cols = heights[0].length;
      const flood = (starts) => {
        const seen = heights.map((row) => row.map(() => false));
        const stack = [];
        for (const [r, c] of starts) { seen[r][c] = true; stack.push([r, c]); }
        while (stack.length) {
          const [y, x] = stack.pop();
          for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < rows && nx >= 0 && nx < cols && !seen[ny][nx] && heights[ny][nx] >= heights[y][x]) {
              seen[ny][nx] = true;
              stack.push([ny, nx]);
            }
          }
        }
        return seen;
      };
      const pac = [];
      const atl = [];
      for (let r = 0; r < rows; r++) { pac.push([r, 0]); atl.push([r, cols - 1]); }
      for (let c = 0; c < cols; c++) { pac.push([0, c]); atl.push([rows - 1, c]); }
      const p = flood(pac);
      const a = flood(atl);
      const out = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (p[r][c] && a[r][c]) out.push([r, c]);
      return out;
    },
    tests: [
      [[[3, 2, 1], [4, 5, 2], [6, 3, 1]]],
      [[[2, 1]]],
      [[[1]]],
      [[[1, 1], [1, 1]]],
      [[[3, 3, 3], [3, 1, 3], [0, 2, 4]]],
      [[[10, 10, 10], [10, 1, 10], [10, 10, 10]]],
      [grid(94, 30, 30, (r) => randInt(r, 0, 12))],
    ],
  }),

  problem('surrounded-regions', {
    statement: `
On the board, \`"O"\` cells that share a side form a group. A group that **cannot reach the edge of the board** through other \`"O"\` cells is enclosed, and every cell in it turns into \`"X"\`. Groups with at least one cell on the edge are untouched.

Return the board after all enclosed groups have been filled in.
`,
    params: ['board'],
    constraints: ['m == board.length, n == board[i].length', '1 <= m, n <= 200', 'Every cell is "X" or "O"'],
    explain: ['The two inner groups are enclosed and fill in; the O on the right edge survives.', 'Both cells are on the edge, so nothing changes.'],
    known: [[['X', 'X', 'X', 'X', 'X'], ['X', 'X', 'X', 'X', 'X'], ['X', 'X', 'X', 'X', 'O'], ['X', 'X', 'X', 'X', 'X']], [['O', 'X']]],
    ref: function solve(board) {
      const rows = board.length;
      const cols = board[0].length;
      const out = board.map((row) => [...row]);
      const safe = out.map((row) => row.map(() => false));
      const stack = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if ((r === 0 || c === 0 || r === rows - 1 || c === cols - 1) && out[r][c] === 'O') { safe[r][c] = true; stack.push([r, c]); }
      }
      while (stack.length) {
        const [y, x] = stack.pop();
        for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < rows && nx >= 0 && nx < cols && out[ny][nx] === 'O' && !safe[ny][nx]) { safe[ny][nx] = true; stack.push([ny, nx]); }
        }
      }
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (out[r][c] === 'O' && !safe[r][c]) out[r][c] = 'X';
      return out;
    },
    tests: [
      [[['X', 'X', 'X', 'X', 'X'], ['X', 'O', 'X', 'O', 'X'], ['X', 'O', 'X', 'X', 'O'], ['X', 'X', 'X', 'X', 'X']]],
      [[['O', 'X']]],
      [[['X']]],
      [[['O']]],
      [[['O', 'O'], ['O', 'O']]],
      [[['X', 'X', 'X'], ['X', 'O', 'X'], ['X', 'X', 'X']]],
      [[['O', 'X', 'O'], ['X', 'O', 'X'], ['O', 'X', 'O']]],
      [grid(95, 40, 40, (r) => (r() < 0.6 ? 'O' : 'X'))],
    ],
  }),

  problem('rotting-oranges', {
    title: 'Mold on the Bread Shelf',
    slug: 'mold-on-the-bread-shelf',
    statement: `
A bakery shelf is a grid where \`0\` is an empty spot, \`1\` is a fresh loaf and \`2\` is a moldy loaf. Each hour, mold spreads from every moldy loaf to the fresh loaves directly **above, below, left or right** of it.

Return how many **hours pass before no fresh loaf is left**, or \`-1\` if some loaf can never be reached.
`,
    params: ['grid'],
    constraints: ['m == grid.length, n == grid[i].length', '1 <= m, n <= 10', 'Every cell is 0, 1 or 2'],
    explain: ['Mold starts top-right and reaches the last loaf, bottom-left, in hour 4.', 'The empty spot shields the fresh loaf forever.'],
    known: [4, -1],
    ref: function orangesRotting(grid) {
      const rows = grid.length;
      const cols = grid[0].length;
      const g = grid.map((row) => [...row]);
      let fresh = 0;
      let queue = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (g[r][c] === 1) fresh++;
        else if (g[r][c] === 2) queue.push([r, c]);
      }
      let minutes = 0;
      while (queue.length && fresh > 0) {
        const next = [];
        for (const [y, x] of queue) {
          for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < rows && nx >= 0 && nx < cols && g[ny][nx] === 1) { g[ny][nx] = 2; fresh--; next.push([ny, nx]); }
          }
        }
        queue = next;
        minutes++;
      }
      return fresh === 0 ? minutes : -1;
    },
    tests: [
      [[[1, 1, 2], [0, 1, 1], [1, 1, 0]]],
      [[[2, 0, 1]]],
      [[[2, 0]]],
      [[[0]]],
      [[[1]]],
      [[[2]]],
      [[[2, 1, 1, 1, 1, 1, 1, 1, 1, 1]]],
      [grid(96, 10, 10, (r) => { const v = r(); return v < 0.1 ? 2 : v < 0.85 ? 1 : 0; })],
    ],
  }),

  problem('course-schedule', {
    statement: `
A degree has courses numbered \`0\` to \`numCourses - 1\`. Each pair \`[a, b]\` in \`prerequisites\` says course \`b\` **must be completed before** course \`a\` can start.

Return \`true\` if a student can complete every course, or \`false\` if the requirements make that impossible.
`,
    params: ['numCourses', 'prerequisites'],
    constraints: ['1 <= numCourses <= 2000', '0 <= prerequisites.length <= 5000', 'Each pair has two course numbers', '0 <= a, b < numCourses', 'No pair is repeated'],
    explain: ['Course 0, then 2, then 1.', 'The three requirements form a loop, so none can start.'],
    known: [true, false],
    ref: function canFinish(numCourses, prerequisites) {
      const indegree = new Array(numCourses).fill(0);
      const next = Array.from({ length: numCourses }, () => []);
      for (const [a, b] of prerequisites) { next[b].push(a); indegree[a]++; }
      const queue = [];
      for (let i = 0; i < numCourses; i++) if (indegree[i] === 0) queue.push(i);
      let taken = 0;
      while (queue.length) {
        const c = queue.pop();
        taken++;
        for (const n of next[c]) if (--indegree[n] === 0) queue.push(n);
      }
      return taken === numCourses;
    },
    tests: [
      [3, [[2, 0], [1, 2]]],
      [3, [[0, 1], [1, 2], [2, 0]]],
      [1, []],
      [3, [[1, 0], [2, 1]]],
      [2, [[0, 1], [1, 0]]],
      [4, [[1, 0], [2, 0], [3, 2]]],
      [5, [[1, 4], [2, 4], [3, 1], [3, 2]]],
      (() => { const n = 1500; const pre = []; for (let i = 1; i < n; i++) pre.push([i, i - 1]); return [n, pre]; })(),
      (() => { const n = 1500; const pre = []; for (let i = 1; i < n; i++) pre.push([i, i - 1]); pre.push([0, n - 1]); return [n, pre]; })(),
    ],
  }),

  problem('course-schedule-ii', {
    statement: `
Courses are numbered \`0\` to \`numCourses - 1\`, and each pair \`[a, b]\` in \`prerequisites\` means course \`b\` comes **before** course \`a\`. Plan a timetable that takes **every course exactly once** and respects all the requirements. Return \`[]\` if no such timetable exists.

To keep the answer unique: whenever several courses are available, take the **lowest-numbered** one next.
`,
    params: ['numCourses', 'prerequisites'],
    constraints: ['1 <= numCourses <= 2000', '0 <= prerequisites.length <= numCourses * (numCourses - 1)', 'Each pair has two course numbers', '0 <= a, b < numCourses', 'a != b, and no pair is repeated'],
    explain: ['0 has no requirement, 2 needs 0, and 1 needs 2.', 'Only 1 is free at first; it unlocks 2 and 3 (2 goes first), and 3 unlocks 0.'],
    known: [[0, 2, 1], [1, 2, 3, 0]],
    ref: function findOrder(numCourses, prerequisites) {
      const indegree = new Array(numCourses).fill(0);
      const next = Array.from({ length: numCourses }, () => []);
      for (const [a, b] of prerequisites) { next[b].push(a); indegree[a]++; }
      let ready = [];
      for (let i = 0; i < numCourses; i++) if (indegree[i] === 0) ready.push(i);
      const order = [];
      while (ready.length) {
        ready.sort((x, y) => x - y);
        const c = ready.shift();
        order.push(c);
        for (const n of next[c]) if (--indegree[n] === 0) ready.push(n);
      }
      return order.length === numCourses ? order : [];
    },
    tests: [
      [3, [[2, 0], [1, 2]]],
      [4, [[2, 1], [3, 1], [0, 3]]],
      [1, []],
      [2, [[1, 0], [0, 1]]],
      [3, []],
      [4, [[3, 2], [2, 1], [1, 0]]],
      [5, [[1, 4], [2, 4], [3, 1], [3, 2]]],
      (() => { const n = 800; const pre = []; for (let i = 1; i < n; i++) pre.push([i, (i * 7) % i]); return [n, pre]; })(),
    ],
  }),
];
