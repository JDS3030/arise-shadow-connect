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
  { n: 'D', exp: 400,   cls: 'rd' },
  { n: 'C', exp: 1500,  cls: 'rc' },
  { n: 'B', exp: 3500,  cls: 'rb' },
  { n: 'A', exp: 7000,  cls: 'ra' },
  { n: 'S', exp: 15000, cls: 'rs' },
];

// Valor de celda para un Muro Dorado (bloqueada; ni victoria ni jugada).
// La cuadrícula usa: 0=vacía, 1=p1, 2=p2, 3=muro.
export const WALL = 3;

// Habilidades de sombra (v1.1.0). Cada orbe otorga un poder único de un solo
// uso por partida. `id` identifica el efecto; `mode` orienta la UI de objetivo.
// mode: 'self' (sin objetivo) · 'any' · 'empty' · 'enemy' · 'move'
export const ABILITIES = {
  hunter: { id: 'double',    name: 'Doble Jugada',    icon: '⚔️', desc: 'Coloca 2 fichas en un turno', mode: 'self'  },
  power:  { id: 'blackhole', name: 'Hoyo Negro',      icon: '🕳️', desc: 'Absorbe un área 3×3',        mode: 'any'   },
  shadow: { id: 'steal',     name: 'Robo de Sombra',  icon: '🌑', desc: 'Roba una ficha enemiga',      mode: 'enemy' },
  magic:  { id: 'teleport',  name: 'Teletransporte',  icon: '✨', desc: 'Mueve una ficha tuya',        mode: 'move'  },
  gold:   { id: 'wall',      name: 'Muro Dorado',     icon: '⭐', desc: 'Bloquea una celda',           mode: 'empty' },
};

// ═══════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════
export let G = {
  connect: 4, gridSize: 8, grid: [], currentPlayer: 1, turn: 0,
  isOver: false, isPaused: false, vsAI: false,
  scores: { p1: 0, p2: 0, draw: 0 }, winCells: [],
  p1Orb: 'hunter', p2Orb: 'power', pendingConnect: 4,
  abilityUsed: { 1: false, 2: false }, // habilidad de un solo uso por partida
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
  G.abilityUsed = { 1: false, 2: false };
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

// ═══════════════════════════════════════════════════
// HABILIDADES (lógica pura · mutan G.grid, sin DOM)
// ═══════════════════════════════════════════════════

// Devuelve la definición de habilidad de un orbe (o undefined).
export function abilityFor(orbId) {
  return ABILITIES[orbId];
}

// 🕳️ Hoyo Negro — absorbe el área 3×3 centrada en (r,c): vacía toda ficha
// o muro dentro del rango. Devuelve las celdas que fueron limpiadas.
export function blackHole(r, c) {
  const cleared = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < G.gridSize && nc >= 0 && nc < G.gridSize && G.grid[nr][nc] !== 0) {
      G.grid[nr][nc] = 0;
      cleared.push([nr, nc]);
    }
  }
  return cleared;
}

// 🌑 Robo de Sombra — convierte la ficha enemiga en (r,c) en propia de `player`.
// Devuelve true si el robo fue válido.
export function stealCell(r, c, player) {
  const enemy = player === 1 ? 2 : 1;
  if (G.grid[r][c] !== enemy) return false;
  G.grid[r][c] = player;
  return true;
}

// ✨ Teletransporte — mueve la ficha propia de (fr,fc) a la celda vacía (tr,tc).
// Devuelve true si el movimiento fue válido.
export function teleportCell(fr, fc, tr, tc, player) {
  if (G.grid[fr][fc] !== player) return false;
  if (G.grid[tr][tc] !== 0) return false;
  G.grid[fr][fc] = 0;
  G.grid[tr][tc] = player;
  return true;
}

// ⭐ Muro Dorado — bloquea una celda vacía (nadie puede jugar ni ganar en ella).
// Devuelve true si se pudo bloquear.
export function blockCell(r, c) {
  if (G.grid[r][c] !== 0) return false;
  G.grid[r][c] = WALL;
  return true;
}

// Decisión de habilidad de la IA (jugador 2). Estrategia defensiva: si el
// humano amenaza victoria inmediata y la IA no puede ganar este turno, usa su
// poder para neutralizar la amenaza. Devuelve una acción o null (guardar poder).
export function aiAbilityMove(orbId) {
  const ability = ABILITIES[orbId];
  if (!ability) return null;
  if (findWin(2)) return null;      // si puede ganar ya, que gane normal
  const t = findWin(1);             // ¿el humano amenaza ganar?
  if (!t) return null;              // sin amenaza → conserva la habilidad
  switch (ability.id) {
    case 'blackhole':
      return { id: 'blackhole', r: t.r, c: t.c };
    case 'wall':
      return { id: 'wall', r: t.r, c: t.c };
    case 'double':
      // primera jugada: tapar la celda ganadora; la segunda la decide la capa DOM
      return { id: 'double', r: t.r, c: t.c };
    case 'steal': {
      // roba una ficha enemiga adyacente a la celda ganadora (rompe la línea)
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nr = t.r + dr, nc = t.c + dc;
        if (nr >= 0 && nr < G.gridSize && nc >= 0 && nc < G.gridSize && G.grid[nr][nc] === 1)
          return { id: 'steal', r: nr, c: nc };
      }
      return null;
    }
    case 'teleport': {
      // mueve una ficha propia sobre la celda ganadora del humano (la bloquea)
      for (let r = 0; r < G.gridSize; r++) for (let c = 0; c < G.gridSize; c++)
        if (G.grid[r][c] === 2)
          return { id: 'teleport', fr: r, fc: c, tr: t.r, tc: t.c };
      return null;
    }
  }
  return null;
}
