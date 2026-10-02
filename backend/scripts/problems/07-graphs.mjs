import { problem, rng, randInt } from './_lib.mjs';

const grid = (seed, rows, cols, make) => {
  const r = rng(seed);
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => make(r)));
};

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export default [
  problem('number-of-islands', {
    statement: `
You are given an \`m x n\` grid of the characters \`"1"\` (land) and \`"0"\` (water). Return the **number of islands**.

An island is a group of land cells connected **horizontally or vertically**. You may assume all four edges of the grid are surrounded by water.
`,
    params: ['grid'],
    constraints: ['m == grid.length, n == grid[i].length', '1 <= m, n <= 300', 'grid[i][j] is "0" or "1"'],
    explain: ['All the land cells are connected, so there is one island.', 'There are three separate groups of land.'],
    known: [1, 3],
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
      [[['1', '1', '1', '1', '0'], ['1', '1', '0', '1', '0'], ['1', '1', '0', '0', '0'], ['0', '0', '0', '0', '0']]],
      [[['1', '1', '0', '0', '0'], ['1', '1', '0', '0', '0'], ['0', '0', '1', '0', '0'], ['0', '0', '0', '1', '1']]],
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
You are given an \`m x n\` binary matrix \`grid\`. An island is a group of \`1\`s (land) connected **horizontally or vertically**. The area of an island is the number of cells in it.

Return the **maximum area** of an island in the grid, or \`0\` if there is no island.
`,
    params: ['grid'],
    constraints: ['m == grid.length, n == grid[i].length', '1 <= m, n <= 50', 'grid[i][j] is 0 or 1'],
    explain: ['The largest island has 6 connected cells.', 'There is no land.'],
    known: [6, 0],
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
      [[[0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0], [0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0], [0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0], [0, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0]]],
      [[[0, 0, 0, 0, 0, 0, 0, 0]]],
      [[[1]]],
      [[[0]]],
      [[[1, 1], [1, 1]]],
      [[[1, 0, 1], [0, 1, 0], [1, 0, 1]]],
      [grid(93, 50, 50, (r) => (r() < 0.55 ? 1 : 0))],
    ],
  }),

  problem('pacific-atlantic-water-flow', {
    statement: `
An \`m x n\` grid \`heights\` gives the height above sea level of each cell of an island. The **Pacific Ocean** touches the island's left and top edges, and the **Atlantic Ocean** touches its right and bottom edges.

Rain water flows from a cell to a neighbouring cell (up, down, left or right) whose height is **less than or equal** to its own. Water can flow into an ocean from any cell next to that ocean.

Return every cell \`[row, col]\` from which rain water can reach **both** oceans. You may return the cells in any order.
`,
    params: ['heights'],
    meta: { compare: 'unordered' },
    constraints: ['m == heights.length, n == heights[r].length', '1 <= m, n <= 200', '0 <= heights[r][c] <= 10^5'],
    explain: ['Water from these seven cells can flow to both oceans.', 'The only cell touches both oceans.'],
    known: [[[0, 4], [1, 3], [1, 4], [2, 2], [3, 0], [3, 1], [4, 0]], [[0, 0]]],
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
      [[[1, 2, 2, 3, 5], [3, 2, 3, 4, 4], [2, 4, 5, 3, 1], [6, 7, 1, 4, 5], [5, 1, 1, 2, 4]]],
      [[[1]]],
      [[[1, 1], [1, 1]]],
      [[[3, 3, 3], [3, 1, 3], [0, 2, 4]]],
      [[[10, 10, 10], [10, 1, 10], [10, 10, 10]]],
      [grid(94, 30, 30, (r) => randInt(r, 0, 12))],
    ],
  }),

  problem('surrounded-regions', {
    statement: `
You are given an \`m x n\` matrix \`board\` containing the letters \`"X"\` and \`"O"\`. **Capture every region of \`"O"\`s that is fully surrounded by \`"X"\`s** by flipping all the \`"O"\`s in it to \`"X"\`.

A region is a group of \`"O"\` cells connected horizontally or vertically. A region is surrounded only if none of its cells lies on the border of the board, so any region that touches the border is left unchanged.

Return the board after the capture.
`,
    params: ['board'],
    constraints: ['m == board.length, n == board[i].length', '1 <= m, n <= 200', 'board[i][j] is "X" or "O"'],
    explain: ['The three O cells in the middle are surrounded, so they flip. The O in the bottom row touches the border and stays.', 'Nothing to capture.'],
    known: [[['X', 'X', 'X', 'X'], ['X', 'X', 'X', 'X'], ['X', 'X', 'X', 'X'], ['X', 'O', 'X', 'X']], [['X']]],
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
      [[['X', 'X', 'X', 'X'], ['X', 'O', 'O', 'X'], ['X', 'X', 'O', 'X'], ['X', 'O', 'X', 'X']]],
      [[['X']]],
      [[['O']]],
      [[['O', 'O'], ['O', 'O']]],
      [[['X', 'X', 'X'], ['X', 'O', 'X'], ['X', 'X', 'X']]],
      [[['O', 'X', 'O'], ['X', 'O', 'X'], ['O', 'X', 'O']]],
      [grid(95, 40, 40, (r) => (r() < 0.6 ? 'O' : 'X'))],
    ],
  }),

  problem('rotting-oranges', {
    statement: `
You are given an \`m x n\` grid where each cell is

- \`0\`: empty,
- \`1\`: a fresh orange, or
- \`2\`: a rotten orange.

Every minute, each fresh orange that is **4-directionally adjacent** to a rotten orange becomes rotten.

Return the **minimum number of minutes** until no fresh orange is left. If that is impossible, return \`-1\`.
`,
    params: ['grid'],
    constraints: ['m == grid.length, n == grid[i].length', '1 <= m, n <= 10', 'grid[i][j] is 0, 1 or 2'],
    explain: ['All the oranges are rotten after 4 minutes.', 'The orange in the bottom-left corner is never reached.', 'There are no fresh oranges, so no time is needed.'],
    samples: 3,
    known: [4, -1, 0],
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
      [[[2, 1, 1], [1, 1, 0], [0, 1, 1]]],
      [[[2, 1, 1], [0, 1, 1], [1, 0, 1]]],
      [[[0, 2]]],
      [[[0]]],
      [[[1]]],
      [[[2]]],
      [[[2, 1, 1, 1, 1, 1, 1, 1, 1, 1]]],
      [grid(96, 10, 10, (r) => { const v = r(); return v < 0.1 ? 2 : v < 0.85 ? 1 : 0; })],
    ],
  }),

  problem('course-schedule', {
    statement: `
There are \`numCourses\` courses labelled \`0\` to \`numCourses - 1\`. The array \`prerequisites\` holds pairs \`[a, b]\`, meaning you **must take course \`b\` before course \`a\`**.

Return \`true\` if it is possible to finish all the courses, and \`false\` otherwise.
`,
    params: ['numCourses', 'prerequisites'],
    constraints: ['1 <= numCourses <= 2000', '0 <= prerequisites.length <= 5000', 'prerequisites[i].length == 2', '0 <= a, b < numCourses', 'All the pairs are unique'],
    explain: ['Take course 0, then course 1.', 'Each course requires the other, so it is impossible.'],
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
      [2, [[1, 0]]],
      [2, [[1, 0], [0, 1]]],
      [1, []],
      [3, [[1, 0], [2, 1]]],
      [3, [[1, 0], [2, 1], [0, 2]]],
      [4, [[1, 0], [2, 0], [3, 1], [3, 2]]],
      [5, [[1, 4], [2, 4], [3, 1], [3, 2]]],
      (() => { const n = 1500; const pre = []; for (let i = 1; i < n; i++) pre.push([i, i - 1]); return [n, pre]; })(),
      (() => { const n = 1500; const pre = []; for (let i = 1; i < n; i++) pre.push([i, i - 1]); pre.push([0, n - 1]); return [n, pre]; })(),
    ],
  }),

  problem('course-schedule-ii', {
    statement: `
There are \`numCourses\` courses labelled \`0\` to \`numCourses - 1\`. The array \`prerequisites\` holds pairs \`[a, b]\`, meaning you **must take course \`b\` before course \`a\`**.

Return an order in which you can take **all** the courses. If it is impossible to finish them all, return an empty array.

Many valid orders can exist, so to make the answer unique, return the **lexicographically smallest** one: at every step take the smallest-numbered course whose prerequisites are already done.
`,
    params: ['numCourses', 'prerequisites'],
    constraints: ['1 <= numCourses <= 2000', '0 <= prerequisites.length <= numCourses * (numCourses - 1)', 'prerequisites[i].length == 2', '0 <= a, b < numCourses', 'a != b, and all the pairs are unique'],
    explain: ['Course 0 comes first, then course 1.', 'After course 0, courses 1 and 2 are both available; the smaller number goes first.', 'A single course with no prerequisites.'],
    samples: 3,
    known: [[0, 1], [0, 1, 2, 3], [0]],
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
      [2, [[1, 0]]],
      [4, [[1, 0], [2, 0], [3, 1], [3, 2]]],
      [1, []],
      [2, [[1, 0], [0, 1]]],
      [3, []],
      [4, [[3, 2], [2, 1], [1, 0]]],
      [5, [[1, 4], [2, 4], [3, 1], [3, 2]]],
      (() => { const n = 800; const pre = []; for (let i = 1; i < n; i++) pre.push([i, (i * 7) % i]); return [n, pre]; })(),
    ],
  }),
];
