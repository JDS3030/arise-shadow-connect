# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **HTML5 / CSS3 / JavaScript Vanilla ES6+** — sin frameworks, sin bundlers, sin dependencias npm.
- Ejecución: abrir `arise-shadow-connect-v2.html` en el navegador o con Live Server. Depuración: F12 → Consola.
- Fuente externa única: Google Fonts (Orbitron + Inter) vía CDN en `<head>` L7. Tests con Vitest (`npm test`) sobre la lógica pura en `game-logic.js`.

## Archivo principal

`arise-shadow-connect-v2.html` es el archivo activo en desarrollo y el único HTML del proyecto.

## Arquitectura (tres archivos separados)

| Archivo | Contenido |
|---|---|
| `arise-shadow-connect-v2.html` | Estructura: pantallas `.screen`, modales `.modal-overlay`, `#gameGrid`. Enlaza `styles.css` (L8) y `game.js` (L193) |
| `styles.css` | CSS custom properties (`:root` L2), clases de orbes, rangos, animaciones |
| `game.js` | Constantes, estado global, lógica y renderizado |

`game-logic.js` es una copia de la lógica pura (constantes, `checkWin`, IA, `saveRank`) usada solo por los tests de Vitest. **Ojo:** hoy está duplicada respecto a `game.js` — mantener ambas en sincronía (unificarla es la Fase 1 de `PLAN-DE-MEJORAS.md`).

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

## Separación obligatoria dentro de `game.js`

No mezclar mutaciones de `G` con manipulación del DOM en la misma función.

| Capa | Función | Línea |
|---|---|---|
| **Estado puro** | `getRank()` | L35 |
| | `checkWin()` | L177 |
| | `aiMove()` | L196 |
| | `findWin()` | L201 |
| | `findStrategic()` | L211 |
| | `randMove()` | L229 |
| | `saveRank()` | L309 |
| **Renderizado / DOM** | `updatePlayerUI()` | L39 |
| | `buildGrid()` | L123 |
| | `buildOrbRow()` | L55 |
| | `updateUI()` | L287 |
| | `showExpPop()` | L277 |
| | `showRanking()` | L316 |
| | `openModal()` / `closeModal()` / `show()` | L331–L333 |
| **Entrada / Eventos** | `openOrbSelect()` | L73 |
| | `startGameFromSelect()` | L86 |
| | `setType()` | L98 |
| | `startGame()` | L104 |
| | `clickCell()` | L149 |
| | `placeOrb()` | L156 |
| | `pauseGame()` / `resumeGame()` | L334–L335 |
| | `restartRound()` | L300 |
| | `goMenu()` | L336 |

## Estado global (`game.js`)

```js
// L19–L24
let G = {
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

// L25–L28 — persistencia (leer al inicio, escribir en saveRank/endGame)
let P = {
  exp: +localStorage.getItem('sc_exp') || 0,        // clave: 'sc_exp'
  ranking: JSON.parse(localStorage.getItem('sc_ranking') || '[]'), // clave: 'sc_ranking'
};
```

## Constantes (`game.js`)

```js
ORBS   // L4:  array de 5 orbes — {id, name, cls, icon, col, glow}
RANKS  // L11: E(0) D(400) C(1500) B(3500) A(7000) S(15000)
```

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

`show(id)` (`game.js` L333) — quita `.active` a todas las `.screen` y la aplica solo al id dado.

## IA (`game.js` L196–L233)

Prioridad fija: `findWin(2)` → `findWin(1)` → `findStrategic()` → `randMove()`.
`findStrategic()` puntúa celdas vacías por distancia al centro y adyacencia a piezas propias.

## Audio (`game.js` L346–L356)

`playTone(freq, dur)` usa Web Audio API. `audioCtx` se inicializa en el primer uso (política de autoplay).

---

## Declaración de Baseline — v1.0 (2026-06-26)

**QUÉ FUNCIONA HOY:** `arise-shadow-connect-v2.html` ejecuta sin errores; flujo completo verificado: menú (`#menuScreen`), selector de orbes (`#orbSelectModal`), tablero Connect 4/5/6 (`buildGrid()`), detección de victoria horizontal/vertical/diagonal (`checkWin()`), IA (`aiMove()`) y persistencia EXP/ranking en `localStorage`. Desplegado en Vercel.
**NO IMPLEMENTADO HOY:** migración de datos entre versiones de `localStorage`, configuración avanzada de partida (tiempo límite, dificultad de IA ajustable). Los tests de Vitest cubren solo la lógica pura de `game-logic.js`.
**CONTRATO:** cualquier cambio que rompa la carga inicial del `#menuScreen`, las funciones `checkWin()`, `placeOrb()` o `updateUI()` (todas en `game.js`) debe revertirse o repararse antes de continuar con nueva funcionalidad.
