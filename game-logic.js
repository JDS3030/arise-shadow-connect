// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════
export const ORBS = [
  { id: 'hunter', name: 'Hunter', cls: 'o-hunter', icon: '⚔️',  col: '#A855F7', glow: 'rgba(168,85,247,.55)' },
  { id: 'shadow', name: 'Shadow', cls: 'o-shadow', icon: '🌑',  col: '#3730A3', glow: 'rgba(55,48,163,.45)'  },
  { id: 'magic',  name: 'Magic',  cls: 'o-magic',  icon: '✨',  col: '#22D3EE', glow: 'rgba(6,182,212,.55)'  },
  { id: 'power',  name: 'Power',  cls: 'o-power',  icon: '🔥',  col: '#F87171', glow: 'rgba(239,68,68,.55)'  },
  { id: 'gold',   name: 'Gold',   cls: 'o-gold',   icon: '⭐',  col: '#FBBF24', glow: 'rgba(245,158,11,.55)' },
];

export const RANKS = [
  { n: 'E', exp: 0,     cls: 're' },
  { n: 'D', exp: 500,   cls: 'rd' },
  { n: 'C', exp: 1500,  cls: 'rc' },
  { n: 'B', exp: 3500,  cls: 'rb' },
  { n: 'A', exp: 7000,  cls: 'ra' },
  { n: 'S', exp: 15000, cls: 'rs' },
];

// ═══════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════
export let G = {
  connect: 4, gridSize: 8, grid: [], currentPlayer: 1, turn: 0,
  isOver: false, isPaused: false, vsAI: false,
  scores: { p1: 0, p2: 0, draw: 0 }, winCells: [],
  p1Orb: 'hunter', p2Orb: 'power', pendingConnect: 4,
};

export let P = {
  exp: 0,
  ranking: [],
};

// Helper para tests: reinicia G a un estado limpio con connect N
export function resetG(connect = 4) {
  G.connect = connect;
  G.gridSize = connect + 4;
  G.grid = Array.from({ length: G.gridSize }, () => Array(G.gridSize).fill(0));
  G.currentPlayer = 1;
  G.turn = 0;
  G.isOver = false;
  G.isPaused = false;
  G.vsAI = false;
  G.winCells = [];
}

// ═══════════════════════════════════════════════════
// RANK
// ═══════════════════════════════════════════════════
export function getRank(exp) {
  for (let i = RANKS.length - 1; i >= 0; i--)
    if (exp >= RANKS[i].exp) return { rank: RANKS[i], idx: i };
  return { rank: RANKS[0], idx: 0 };
}

// ═══════════════════════════════════════════════════
// WIN CHECK
// ═══════════════════════════════════════════════════
export function checkWin(r, c) {
  const p = G.grid[r][c];
  const dirs = [[[0, 1], [0, -1]], [[1, 0], [-1, 0]], [[1, 1], [-1, -1]], [[1, -1], [-1, 1]]];
  for (const [d1, d2] of dirs) {
    let cnt = 1, cells = [[r, c]];
    for (const d of [d1, d2]) {
      let nr = r + d[0], nc = c + d[1];
      while (nr >= 0 && nr < G.gridSize && nc >= 0 && nc < G.gridSize && G.grid[nr][nc] === p) {
        cnt++; cells.push([nr, nc]); nr += d[0]; nc += d[1];
      }
    }
    if (cnt >= G.connect) { G.winCells = cells; return p; }
  }
  return null;
}

// ═══════════════════════════════════════════════════
// AI
// ═══════════════════════════════════════════════════
export function findWin(p) {
  for (let r = 0; r < G.gridSize; r++) for (let c = 0; c < G.gridSize; c++) {
    if (G.grid[r][c] !== 0) continue;
    G.grid[r][c] = p;
    const w = checkWin(r, c);
    G.grid[r][c] = 0;
    if (w === p) return { r, c };
  }
  return null;
}

export function findStrategic() {
  const mid = Math.floor(G.gridSize / 2);
  let moves = [];
  for (let r = 0; r < G.gridSize; r++) for (let c = 0; c < G.gridSize; c++) {
    if (G.grid[r][c] !== 0) continue;
    let sc = -(Math.abs(r - mid) + Math.abs(c - mid));
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < G.gridSize && nc >= 0 && nc < G.gridSize) {
        if (G.grid[nr][nc] === 2) sc += 3;
        if (G.grid[nr][nc] === 1) sc += 1;
      }
    }
    moves.push({ r, c, sc });
  }
  moves.sort((a, b) => b.sc - a.sc);
  return moves[0] || null;
}

export function randMove() {
  const e = [];
  for (let r = 0; r < G.gridSize; r++) for (let c = 0; c < G.gridSize; c++)
    if (G.grid[r][c] === 0) e.push({ r, c });
  return e.length ? e[Math.floor(Math.random() * e.length)] : null;
}

// ═══════════════════════════════════════════════════
// RANKING
// ═══════════════════════════════════════════════════
export function saveRank() {
  const entry = {
    score: 1000 - G.turn * 10 + (G.connect - 4) * 100,
    turns: G.turn,
    mode: `Connect ${G.connect}`,
    vsAI: G.vsAI,
    date: new Date().toLocaleDateString('es-ES'),
  };
  P.ranking.push(entry);
  P.ranking.sort((a, b) => b.score - a.score);
  P.ranking = P.ranking.slice(0, 10);
  localStorage.setItem('sc_ranking', JSON.stringify(P.ranking));
}
