# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **HTML5 / CSS3 / JavaScript Vanilla ES6+** — sin frameworks, sin bundlers, sin dependencias npm.
- Ejecución: abrir `arise-shadow-connect-v2.html` en el navegador o con Live Server. Depuración: F12 → Consola.
- Fuente externa única: Google Fonts (Orbitron + Inter) vía CDN en `<head>` L7. Tests con Vitest (`npm test`) sobre la lógica pura en `game-logic.js`.

## Archivo principal

`arise-shadow-connect-v2.html` es el archivo activo en desarrollo y el único HTML del proyecto.

## Arquitectura (un solo archivo, tres bloques)

| Bloque | Líneas | Contenido |
|---|---|---|
| `<style>` | L8–L175 | CSS custom properties (`:root` L10), clases de orbes, animaciones |
| `<body>` | L177–L362 | Pantallas `.screen`, modales `.modal-overlay`, `#gameGrid` |
| `<script>` | L364–L729 | Constantes, estado global, lógica, renderizado |

### Elementos HTML clave

| Elemento | Línea | Descripción |
|---|---|---|
| `#menuScreen` | L181 | Pantalla de inicio (activa por defecto) |
| `#gameScreen` | L234 | Pantalla de partida |
| `#gameGrid` | L252 | Contenedor del tablero (se puebla en `buildGrid()`) |
| `#orbSelectModal` | L281 | Modal de selección de orbes |
| `#gameOverModal` | L304 | Modal de fin de partida |
| `#pauseModal` | L321 | Modal de pausa |
| `#rankingModal` | L333 | Modal TOP 10 |
| `#infoModal` | L342 | Modal de instrucciones |

## Separación obligatoria dentro de `<script>`

No mezclar mutaciones de `G` con manipulación del DOM en la misma función.

| Capa | Función | Línea |
|---|---|---|
| **Estado puro** | `getRank()` | L399 |
| | `checkWin()` | L544 |
| | `aiMove()` | L563 |
| | `findWin()` | L568 |
| | `findStrategic()` | L578 |
| | `randMove()` | L596 |
| | `saveRank()` | L676 |
| **Renderizado / DOM** | `updatePlayerUI()` | L403 |
| | `buildGrid()` | L489 |
| | `buildOrbRow()` | L419 |
| | `updateUI()` | L654 |
| | `showExpPop()` | L644 |
| | `showRanking()` | L683 |
| | `openModal()` / `closeModal()` / `show()` | L698–L700 |
| **Entrada / Eventos** | `openOrbSelect()` | L437 |
| | `startGameFromSelect()` | L450 |
| | `setType()` | L463 |
| | `startGame()` | L469 |
| | `clickCell()` | L516 |
| | `placeOrb()` | L523 |
| | `pauseGame()` / `resumeGame()` | L701–L702 |
| | `restartRound()` | L667 |
| | `goMenu()` | L703 |

## Estado global

```js
// L383–L388
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

// L389–L392 — persistencia (leer al inicio, escribir en saveRank/endGame)
let P = {
  exp: +localStorage.getItem('sc_exp') || 0,        // clave: 'sc_exp'
  ranking: JSON.parse(localStorage.getItem('sc_ranking') || '[]'), // clave: 'sc_ranking'
};
```

## Constantes (`L368–L378`)

```js
ORBS   // L368: array de 5 orbes — {id, name, cls, icon, col, glow}
RANKS  // L375: E(0) D(500) C(1500) B(3500) A(7000) S(15000)
```

## Convenciones de código

- Funciones y variables: `camelCase`
- Constantes globales: `UPPERCASE_SNAKE` (actualmente `ORBS`, `RANKS`)
- Clases CSS de orbes: prefijo `o-` → `o-hunter`, `o-shadow`, `o-magic`, `o-power`, `o-gold`
- Clases CSS de rangos: prefijo `r` + letra → `re`, `rd`, `rc`, `rb`, `ra`, `rs`
- IDs de modales: sufijo `Modal`

## Flujo de pantallas

```
menuScreen (L181) → orbSelectModal (L281) → gameScreen (L234) → gameOverModal (L304)
                                                    │
                                              pauseModal (L321)
```

`show(id)` L700 — quita `.active` a todas las `.screen` y la aplica solo al id dado.

## IA (`L563–L600`)

Prioridad fija: `findWin(2)` → `findWin(1)` → `findStrategic()` → `randMove()`.
`findStrategic()` puntúa celdas vacías por distancia al centro y adyacencia a piezas propias.

## Audio (`L713–L723`)

`playTone(freq, dur)` usa Web Audio API. `audioCtx` se inicializa en el primer uso (política de autoplay).

---

## Declaración de Baseline — v1.0 (2026-06-26)

**QUÉ FUNCIONA HOY:** `arise-shadow-connect-v2.html` ejecuta sin errores; flujo completo verificado: menú (`L181`), selector de orbes (`L281`), tablero Connect 4/5/6 (`L489`), detección de victoria horizontal/vertical/diagonal (`L544`), IA (`L563`) y persistencia EXP/ranking en `localStorage` (`L389`).
**NO IMPLEMENTADO HOY:** tests automatizados, migración de datos entre versiones de `localStorage`, configuración avanzada de partida (tiempo límite, dificultad de IA ajustable).
**CONTRATO:** cualquier cambio que rompa la carga inicial del `#menuScreen`, las funciones `checkWin()` (`L544`), `placeOrb()` (`L523`) o `updateUI()` (`L654`) debe revertirse o repararse antes de continuar con nueva funcionalidad.
