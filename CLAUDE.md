# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **HTML5 / CSS3 / JavaScript Vanilla ES6+ (módulos ES)** — sin frameworks, sin bundlers, sin dependencias npm en producción.
- Ejecución: `game.js` es un **módulo ES** (`<script type="module">`), por lo que **requiere servidor HTTP** — Live Server, `python -m http.server`, o la URL de Vercel. Abrir el archivo con doble clic (`file://`) **ya no funciona** (los módulos se bloquean por CORS). Depuración: F12 → Consola.
- Fuente externa única: Google Fonts (Orbitron + Inter) vía CDN en `<head>` L7. Tests con Vitest (`npm test`) sobre la lógica pura en `game-logic.js`.

## Archivo principal

`arise-shadow-connect-v2.html` es el archivo activo en desarrollo y el único HTML del proyecto.

## Arquitectura (archivos separados, fuente única de lógica)

| Archivo | Contenido |
|---|---|
| `arise-shadow-connect-v2.html` | Estructura: pantallas `.screen`, modales `.modal-overlay`, `#gameGrid`. Enlaza `styles.css` (L8) y `game.js` como módulo (L193) |
| `styles.css` | CSS custom properties (`:root` L2), clases de orbes, rangos, animaciones |
| `game-logic.js` | **Fuente única de la lógica pura y el estado**: constantes (`ORBS`, `RANKS`), estado (`G`, `P`), `getRank`, `checkWin`, IA (`findWin`/`findStrategic`/`randMove`), `saveRank`. Sin DOM. Todo `export`. |
| `game.js` | **Capa de navegador** (módulo ES): importa la lógica de `game-logic.js` y añade renderizado, eventos y audio. |

**Regla clave:** la lógica pura vive **solo** en `game-logic.js`. `game.js` la importa (no la redefine) y los tests de Vitest importan del mismo módulo → los tests prueban el código que corre en producción. No duplicar lógica entre ambos archivos.

Como `game.js` es un módulo ES, los handlers usados en `onclick` inline del HTML se exponen a `window` al final del archivo (`Object.assign(window, {...})`, L287).

### Elementos HTML clave (`arise-shadow-connect-v2.html`)

| Elemento | Línea | Descripción |
|---|---|---|
| `#menuScreen` | L14 | Pantalla de inicio (activa por defecto) |
| `#gameScreen` | L67 | Pantalla de partida |
| `#gameGrid` | L85 | Contenedor del tablero (se puebla en `buildGrid()`) |
| `#orbSelectModal` | L114 | Modal de selección de orbes |
| `#gameOverModal` | L134 | Modal de fin de partida |
| `#pauseModal` | L151 | Modal de pausa |
| `#rankingModal` | L163 | Modal TOP 10 |
| `#infoModal` | L172 | Modal de instrucciones |

## Separación de capas

No mezclar mutaciones de `G` con manipulación del DOM en la misma función. La lógica
pura (sin DOM) va en `game-logic.js`; el renderizado y los eventos, en `game.js`.

### Lógica pura — `game-logic.js`

| Función | Línea |
|---|---|
| `getRank()` | L52 |
| `checkWin()` | L61 |
| `findWin()` | L80 |
| `findStrategic()` | L91 |
| `randMove()` | L110 |
| `saveRank()` | L120 |
| `resetG()` (helper de tests) | L37 |

### Renderizado / DOM y Eventos — `game.js`

| Capa | Función | Línea |
|---|---|---|
| **Renderizado / DOM** | `updatePlayerUI()` | L22 |
| | `buildOrbRow()` | L38 |
| | `buildGrid()` | L106 |
| | `endGame()` | L169 |
| | `showExpPop()` | L208 |
| | `updateUI()` | L218 |
| | `showRanking()` | L240 |
| | `openModal()` / `closeModal()` / `show()` | L255–L257 |
| **Entrada / Eventos** | `openOrbSelect()` | L56 |
| | `startGameFromSelect()` | L69 |
| | `setType()` | L81 |
| | `startGame()` | L87 |
| | `clickCell()` | L132 |
| | `placeOrb()` | L139 |
| | `aiMove()` (orquesta la IA de `game-logic.js`) | L160 |
| | `pauseGame()` / `resumeGame()` | L258–L259 |
| | `restartRound()` | L231 |
| | `goMenu()` | L260 |

## Estado global (`game-logic.js`, exportado)

```js
// L24 — export let G
G = {
  connect: 4,         // N requerido para ganar (4, 5 o 6)
  gridSize: 8,        // siempre connect + 4
  grid: [],           // matriz gridSize×gridSize: 0=vacía, 1=p1, 2=p2
  currentPlayer: 1,
  turn: 0,
  isOver: false, isPaused: false, vsAI: false,
  scores: { p1: 0, p2: 0, draw: 0 },
  winCells: [],
  p1Orb: 'hunter', p2Orb: 'power',
  pendingConnect: 4,  // guardado al abrir orbSelectModal
};

// L31 — export let P = { exp: 0, ranking: [] }
// game.js lo hidrata desde localStorage al cargar (claves 'sc_exp' y 'sc_ranking'),
// y escribe en endGame()/saveRank().
```

## Constantes (`game-logic.js`, exportadas)

```js
ORBS      // array de 5 orbes — {id, name, cls, icon, col, glow}
RANKS     // E(0) D(400) C(1500) B(3500) A(7000) S(15000)
WALL      // = 3 · valor de celda para un Muro Dorado (0=vacía,1=p1,2=p2,3=muro)
ABILITIES // mapa orbId → {id, name, icon, desc, mode} · 1 poder por orbe (v1.1.0)
```

### Habilidades (v1.1.0) — 1 orbe = 1 poder, 1 uso por partida

Lógica pura en `game-logic.js`; orquestación/DOM en `game.js`. Cada jugador
(incluida la IA) usa su poder una vez. Funciones puras (mutan `G.grid`, sin DOM):

| Función | Habilidad | Efecto |
|---|---|---|
| `blackHole(r,c)` | 🕳️ Power · Hoyo Negro | Vacía el área 3×3 centrada en (r,c) |
| `stealCell(r,c,p)` | 🌑 Shadow · Robo de Sombra | Convierte ficha enemiga en (r,c) en propia de `p` |
| `teleportCell(fr,fc,tr,tc,p)` | ✨ Magic · Teletransporte | Mueve ficha propia a celda vacía |
| `blockCell(r,c)` | ⭐ Gold · Muro Dorado | Marca la celda vacía como `WALL` |
| Doble Jugada | ⚔️ Hunter | Sin función pura: `extraPlacements` en `game.js` da 1 ficha extra |
| `aiAbilityMove(orbId)` | — | Decisión defensiva de habilidad para la IA (jugador 2) |

`G.abilityUsed = {1,2}` rastrea el uso; se reinicia en `resetG()`, `startGame()`
y `restartRound()`. En `game.js`: `renderAbilityBar()`, `activateAbility()`,
`handleAbilityTarget()` (modo objetivo), `afterAbility()`/`endTurn()`,
`aiTurn()`/`aiUseAbility()`. Los muros (`WALL`) no rompen `checkWin` (nunca
igualan a 1/2) y quedan excluidos de `findWin`/`findStrategic`/`randMove` (≠0).

## Convenciones de código

- Funciones y variables: `camelCase`
- Constantes globales: `UPPERCASE_SNAKE` (actualmente `ORBS`, `RANKS`)
- Clases CSS de orbes: prefijo `o-` → `o-hunter`, `o-shadow`, `o-magic`, `o-power`, `o-gold`
- Clases CSS de rangos: prefijo `r` + letra → `re`, `rd`, `rc`, `rb`, `ra`, `rs`
- IDs de modales: sufijo `Modal`

## Flujo de pantallas

```
menuScreen → orbSelectModal → gameScreen → gameOverModal
                                   │
                             pauseModal
```

`show(id)` (`game.js` L257) — quita `.active` a todas las `.screen` y la aplica solo al id dado.

## IA (lógica en `game-logic.js` L80–L118, orquestada por `aiMove()` en `game.js` L160)

Prioridad fija: `findWin(2)` → `findWin(1)` → `findStrategic()` → `randMove()`.
`findStrategic()` puntúa celdas vacías por distancia al centro y adyacencia a piezas propias.

## Audio (`game.js` L270–L283)

`playTone(freq, dur)` usa Web Audio API. `audioCtx` se inicializa en el primer uso (política de autoplay).

---

## Versionado

El proyecto usa **Versionado Semántico** (`MAJOR.MINOR.PATCH`). El historial
completo vive en `CHANGELOG.md` y la versión canónica en `package.json`.
Versión actual: **1.3.0**. Regla: feature nueva → MINOR;
fix/refactor sin feature → PATCH; ruptura del contrato de baseline → MAJOR.

## Declaración de Baseline — v1.0 (2026-06-26)

**QUÉ FUNCIONA HOY:** `arise-shadow-connect-v2.html` ejecuta sin errores; flujo completo verificado: menú (`#menuScreen`), selector de orbes (`#orbSelectModal`), tablero Connect 4/5/6 (`buildGrid()`), detección de victoria horizontal/vertical/diagonal (`checkWin()`), IA (`aiMove()`) y persistencia EXP/ranking en `localStorage`. Desplegado en Vercel.
**NO IMPLEMENTADO HOY:** migración de datos entre versiones de `localStorage`, configuración avanzada de partida (tiempo límite, dificultad de IA ajustable). Los tests de Vitest cubren solo la lógica pura de `game-logic.js`.
**CONTRATO:** cualquier cambio que rompa la carga inicial del `#menuScreen`, las funciones `checkWin()`, `placeOrb()` o `updateUI()` (todas en `game.js`) debe revertirse o repararse antes de continuar con nueva funcionalidad.
