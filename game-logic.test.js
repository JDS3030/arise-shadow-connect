import { describe, test, expect, beforeEach } from 'vitest';
import { RANKS, G, P, resetG, getRank, checkWin, findWin, findStrategic, randMove, saveRank } from './game-logic.js';

// ═══════════════════════════════════════════════════
// getRank
// ═══════════════════════════════════════════════════
describe('getRank', () => {
  test('exp=0 devuelve rango E', () => {
    const { rank, idx } = getRank(0);
    expect(rank.n).toBe('E');
    expect(idx).toBe(0);
  });

  test('exp=499 sigue en E (borde inferior de D)', () => {
    expect(getRank(499).rank.n).toBe('E');
  });

  test('exp=500 sube a D (borde exacto)', () => {
    expect(getRank(500).rank.n).toBe('D');
  });

  test('exp=1499 sigue en D', () => {
    expect(getRank(1499).rank.n).toBe('D');
  });

  test('exp=1500 sube a C', () => {
    expect(getRank(1500).rank.n).toBe('C');
  });

  test('exp=3500 sube a B', () => {
    expect(getRank(3500).rank.n).toBe('B');
  });

  test('exp=7000 sube a A', () => {
    expect(getRank(7000).rank.n).toBe('A');
  });

  test('exp=15000 alcanza rango S', () => {
    const { rank, idx } = getRank(15000);
    expect(rank.n).toBe('S');
    expect(idx).toBe(RANKS.length - 1);
  });

  test('exp muy alto permanece en S', () => {
    expect(getRank(999999).rank.n).toBe('S');
  });

  test('devuelve la clase CSS correcta para cada rango', () => {
    const casos = [[0,'re'],[500,'rd'],[1500,'rc'],[3500,'rb'],[7000,'ra'],[15000,'rs']];
    casos.forEach(([exp, cls]) => {
      expect(getRank(exp).rank.cls).toBe(cls);
    });
  });
});

// ═══════════════════════════════════════════════════
// checkWin
// ═══════════════════════════════════════════════════
describe('checkWin', () => {
  beforeEach(() => resetG(4)); // tablero 8×8, connect 4

  test('una sola pieza no gana', () => {
    G.grid[0][0] = 1;
    expect(checkWin(0, 0)).toBeNull();
  });

  test('3 en línea no gana en connect 4', () => {
    G.grid[0][0] = G.grid[0][1] = G.grid[0][2] = 1;
    expect(checkWin(0, 2)).toBeNull();
  });

  test('victoria horizontal del jugador 1', () => {
    G.grid[0][0] = G.grid[0][1] = G.grid[0][2] = G.grid[0][3] = 1;
    expect(checkWin(0, 3)).toBe(1);
  });

  test('victoria horizontal del jugador 2', () => {
    G.grid[2][1] = G.grid[2][2] = G.grid[2][3] = G.grid[2][4] = 2;
    expect(checkWin(2, 4)).toBe(2);
  });

  test('victoria vertical del jugador 1', () => {
    G.grid[0][0] = G.grid[1][0] = G.grid[2][0] = G.grid[3][0] = 1;
    expect(checkWin(3, 0)).toBe(1);
  });

  test('victoria diagonal ↘', () => {
    G.grid[0][0] = G.grid[1][1] = G.grid[2][2] = G.grid[3][3] = 1;
    expect(checkWin(3, 3)).toBe(1);
  });

  test('victoria diagonal ↗', () => {
    G.grid[3][0] = G.grid[2][1] = G.grid[1][2] = G.grid[0][3] = 1;
    expect(checkWin(0, 3)).toBe(1);
  });

  test('winCells se llena con exactamente N celdas ganadoras', () => {
    G.grid[0][0] = G.grid[0][1] = G.grid[0][2] = G.grid[0][3] = 1;
    checkWin(0, 3);
    expect(G.winCells).toHaveLength(4);
  });

  test('winCells contiene las coordenadas correctas', () => {
    G.grid[0][0] = G.grid[0][1] = G.grid[0][2] = G.grid[0][3] = 1;
    checkWin(0, 3);
    const flat = G.winCells.map(([r, c]) => `${r},${c}`);
    expect(flat).toContain('0,0');
    expect(flat).toContain('0,3');
  });

  test('victoria en connect 5 (tablero 9×9)', () => {
    resetG(5);
    G.grid[0][0] = G.grid[0][1] = G.grid[0][2] = G.grid[0][3] = G.grid[0][4] = 1;
    expect(checkWin(0, 4)).toBe(1);
  });

  test('4 en línea no gana en connect 5', () => {
    resetG(5);
    G.grid[0][0] = G.grid[0][1] = G.grid[0][2] = G.grid[0][3] = 1;
    expect(checkWin(0, 3)).toBeNull();
  });

  test('victoria en connect 6 (tablero 10×10)', () => {
    resetG(6);
    for (let c = 0; c < 6; c++) G.grid[0][c] = 2;
    expect(checkWin(0, 5)).toBe(2);
  });
});

// ═══════════════════════════════════════════════════
// findWin
// ═══════════════════════════════════════════════════
describe('findWin', () => {
  beforeEach(() => resetG(4));

  test('tablero vacío → no hay victoria inminente', () => {
    expect(findWin(1)).toBeNull();
    expect(findWin(2)).toBeNull();
  });

  test('detecta victoria horizontal inminente del jugador 2', () => {
    G.grid[0][0] = G.grid[0][1] = G.grid[0][2] = 2;
    const m = findWin(2);
    expect(m).not.toBeNull();
    expect(G.grid[m.r][m.c]).toBe(0); // la celda debe estar vacía
  });

  test('la posición devuelta completa realmente 4 en línea', () => {
    G.grid[0][0] = G.grid[0][1] = G.grid[0][2] = 2;
    const m = findWin(2);
    G.grid[m.r][m.c] = 2;
    expect(checkWin(m.r, m.c)).toBe(2);
  });

  test('detecta victoria vertical inminente del jugador 1', () => {
    G.grid[0][3] = G.grid[1][3] = G.grid[2][3] = 1;
    const m = findWin(1);
    expect(m).not.toBeNull();
    G.grid[m.r][m.c] = 1;
    expect(checkWin(m.r, m.c)).toBe(1);
  });

  test('no altera G.grid después de la búsqueda', () => {
    G.grid[0][0] = G.grid[0][1] = G.grid[0][2] = 2;
    findWin(2);
    // Todas las celdas vacías deben seguir en 0
    for (let r = 0; r < G.gridSize; r++)
      for (let c = 0; c < G.gridSize; c++)
        if (!(r === 0 && c <= 2))
          expect(G.grid[r][c]).toBe(0);
  });

  test('prioriza bloquear al jugador 1 cuando no hay victoria propia', () => {
    G.grid[0][0] = G.grid[0][1] = G.grid[0][2] = 1;
    // Jugador 2 no tiene victoria, pero jugador 1 está a punto de ganar
    expect(findWin(2)).toBeNull(); // jugador 2 no puede ganar aún
    expect(findWin(1)).not.toBeNull(); // pero detecta la amenaza de jugador 1
  });
});

// ═══════════════════════════════════════════════════
// findStrategic
// ═══════════════════════════════════════════════════
describe('findStrategic', () => {
  beforeEach(() => resetG(4)); // 8×8, mid=4

  test('en tablero vacío devuelve la celda central (4,4)', () => {
    const m = findStrategic();
    expect(m).not.toBeNull();
    expect(m.r).toBe(4);
    expect(m.c).toBe(4);
  });

  test('devuelve null en tablero completamente lleno', () => {
    for (let r = 0; r < G.gridSize; r++)
      for (let c = 0; c < G.gridSize; c++)
        G.grid[r][c] = 1;
    expect(findStrategic()).toBeNull();
  });

  test('prefiere celdas adyacentes a piezas propias (jugador 2)', () => {
    G.grid[4][4] = 2; // pieza propia en el centro
    const m = findStrategic();
    expect(m).not.toBeNull();
    const esAdyacente = Math.abs(m.r - 4) <= 1 && Math.abs(m.c - 4) <= 1;
    expect(esAdyacente).toBe(true);
  });

  test('centro de tablero 9×9 (connect 5) es (4,4)', () => {
    resetG(5); // gridSize=9, mid=4
    const m = findStrategic();
    expect(m.r).toBe(4);
    expect(m.c).toBe(4);
  });

  test('siempre devuelve una celda vacía', () => {
    // Llena la mitad del tablero
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < G.gridSize; c++)
        G.grid[r][c] = 1;
    const m = findStrategic();
    expect(m).not.toBeNull();
    expect(G.grid[m.r][m.c]).toBe(0);
  });
});

// ═══════════════════════════════════════════════════
// randMove
// ═══════════════════════════════════════════════════
describe('randMove', () => {
  beforeEach(() => resetG(4));

  test('devuelve una celda válida en tablero vacío', () => {
    const m = randMove();
    expect(m).not.toBeNull();
    expect(m.r).toBeGreaterThanOrEqual(0);
    expect(m.r).toBeLessThan(G.gridSize);
    expect(m.c).toBeGreaterThanOrEqual(0);
    expect(m.c).toBeLessThan(G.gridSize);
  });

  test('la celda devuelta está vacía', () => {
    G.grid[2][5] = 1; // ocupa una celda aleatoria
    const m = randMove();
    expect(G.grid[m.r][m.c]).toBe(0);
  });

  test('devuelve null en tablero completamente lleno', () => {
    for (let r = 0; r < G.gridSize; r++)
      for (let c = 0; c < G.gridSize; c++)
        G.grid[r][c] = 1;
    expect(randMove()).toBeNull();
  });

  test('con una sola celda libre, devuelve exactamente esa celda', () => {
    for (let r = 0; r < G.gridSize; r++)
      for (let c = 0; c < G.gridSize; c++)
        G.grid[r][c] = 1;
    G.grid[3][3] = 0; // única celda libre
    expect(randMove()).toEqual({ r: 3, c: 3 });
  });
});

// ═══════════════════════════════════════════════════
// saveRank
// ═══════════════════════════════════════════════════
describe('saveRank', () => {
  beforeEach(() => {
    resetG(4);
    P.ranking = [];
    P.exp = 0;
    localStorage.clear();
  });

  test('agrega una entrada al ranking', () => {
    G.turn = 10;
    saveRank();
    expect(P.ranking).toHaveLength(1);
  });

  test('score = 1000 - turn*10 + (connect-4)*100', () => {
    G.turn = 20;
    G.connect = 4;
    saveRank();
    expect(P.ranking[0].score).toBe(800); // 1000 - 200 + 0
  });

  test('score sube con connect más alto', () => {
    G.turn = 10;
    G.connect = 6;
    saveRank();
    expect(P.ranking[0].score).toBe(1000 - 100 + 200); // 1100
  });

  test('score más alto va primero (orden descendente)', () => {
    P.ranking = [
      { score: 400, turns: 60, mode: 'Connect 4', vsAI: false, date: '01/01/2026' },
      { score: 200, turns: 80, mode: 'Connect 4', vsAI: false, date: '01/01/2026' },
    ];
    G.turn = 5; // score = 950
    saveRank();
    expect(P.ranking[0].score).toBe(950);
    expect(P.ranking[1].score).toBe(400);
  });

  test('mantiene solo top 10 cuando hay más de 10 entradas', () => {
    P.ranking = Array.from({ length: 11 }, (_, i) => ({
      score: 100 + i, turns: i, mode: 'Connect 4', vsAI: false, date: '01/01/2026',
    }));
    G.turn = 0; // score = 1000, entrará primero
    saveRank();
    expect(P.ranking).toHaveLength(10);
  });

  test('guarda el ranking en localStorage como JSON', () => {
    saveRank();
    const guardado = JSON.parse(localStorage.getItem('sc_ranking'));
    expect(Array.isArray(guardado)).toBe(true);
    expect(guardado).toHaveLength(1);
  });

  test('la entrada guardada tiene los campos correctos', () => {
    G.turn = 15;
    G.connect = 5;
    G.vsAI = true;
    saveRank();
    const e = P.ranking[0];
    expect(e.turns).toBe(15);
    expect(e.mode).toBe('Connect 5');
    expect(e.vsAI).toBe(true);
    expect(typeof e.date).toBe('string');
  });
});
