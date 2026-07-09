# Changelog — ARISE: Shadow Connect

Todas las versiones notables de este proyecto se documentan aquí.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.0.0/)
y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/) (`MAJOR.MINOR.PATCH`).

- **MAJOR** — cambios que rompen el contrato de baseline (ver `CLAUDE.md`).
- **MINOR** — funcionalidad nueva compatible hacia atrás.
- **PATCH** — correcciones y refactors sin funcionalidad nueva.

> El historial 0.x → 1.0.1 se reconstruyó a partir del árbol de commits de git
> (14 commits, sin tags previos). Fechas exactas según `git log`.

---

## [1.5.0] — 2026-07-09

### Added
- **Pantalla de entrada estilo Solo Leveling** (`#entranceScreen`): nueva pantalla
  de bienvenida (la primera que se ve) con portal animado, título **ARISE** con
  glow, ventana de notificación del Sistema y botón **ENTER THE GATE** que lleva
  al menú (`enterApp()`).
- **Internacionalización EN/ES** (base): diccionario `I18N` en `game.js`, atributos
  `data-i18n` en el HTML y `applyLang()`/`setLang()`. El idioma inicial se toma de
  la preferencia guardada (`sc_lang` en `localStorage`) o del idioma del navegador
  (`navigator.language`), con inglés como versión activa por defecto. Selector
  visible EN/ES en la entrada; en español el título muestra **SURGE** y los textos
  se traducen. Diseño de referencia en `solo-leveling.pen`.

### Notes
- Fuente `Geist Mono` añadida al CDN de Google Fonts para las etiquetas técnicas.
- Contrato intacto: `checkWin`/`placeOrb`/`updateUI` sin cambios; el menú sigue
  cargando (ahora tras la entrada). Tests de smoke nuevos para la entrada + idioma.

---

## [1.4.0] — 2026-07-09

### Added
- **Tutorial de bienvenida (coach-marks)**: al comenzar una partida por primera
  vez, un recorrido guiado resalta cada parte de la pantalla (turno, tablero,
  barra de habilidad, marcador) con tooltips paso a paso. El paso de habilidad
  explica el poder del orbe elegido (nombre, efecto y cómo usarlo). Se recuerda
  en `localStorage` (`sc_tutorial_v1`) y se puede reabrir con el botón “?” de la
  barra superior.
- Campo `how` en `ABILITIES` (cómo se usa cada habilidad) — fuente única para el
  texto del tutorial.

### Changed
- **La opción por defecto al elegir modo es ahora “VS SOMBRA (IA)”** (antes VS
  Jugador).

---

## [1.3.0] — 2026-07-09

### Added
- **Tono de la IA cuando comparte orbe**: si en modo IA el jugador elige para
  la IA el mismo orbe que el suyo, aparece un selector para que la IA se vea
  **más oscura** o **más clara** (a elección del jugador), de modo que las
  fichas sigan siendo distinguibles. Se aplica a fichas, indicador de turno,
  orbe ganador, botón de habilidad y marcador del rival.

### Notes
- Implementado con clases CSS `o-shade-dark` / `o-shade-light` (filtro de
  brillo) sobre los elementos del jugador 2; estado `aiShade` en `game.js`.

---

## [1.2.0] — 2026-07-09

### Added
- **Elección del orbe de la Sombra IA**: al jugar contra la IA, ahora el
  jugador elige el orbe del rival (su color y su habilidad) en el selector,
  en vez de asignarse al azar. El selector de orbe del jugador 2 queda
  habilitado en modo IA con la etiqueta "ORBE DE LA SOMBRA IA".

### Changed
- `startGameFromSelect()` ya no asigna un orbe aleatorio a la IA; usa el
  seleccionado (`G.p2Orb`).

---

## [1.1.0] — 2026-07-09 · Shadow Abilities

### Added
- **Sistema de habilidades de sombra**: cada orbe otorga un poder único, de un
  solo uso por partida. Hasta ahora la elección de orbe era solo cosmética.
  - ⚔️ **Hunter — Doble Jugada**: coloca 2 fichas en un mismo turno.
  - 🕳️ **Power — Hoyo Negro**: absorbe (vacía) un área de 3×3 (9 casillas).
  - 🌑 **Shadow — Robo de Sombra**: convierte una ficha enemiga en propia.
  - ✨ **Magic — Teletransporte**: mueve una ficha propia a una celda vacía.
  - ⭐ **Gold — Muro Dorado**: bloquea una celda (nadie puede jugar ni ganar en ella).
- **La Sombra IA usa su habilidad** con una heurística defensiva (neutraliza la
  amenaza de victoria del humano cuando no puede ganar en el turno).
- Barra de habilidad en la pantalla de partida con modo de selección de objetivo.
- Tip de habilidad en el selector de orbes y en el modal de info.
- Nuevo estado de celda **muro** (`WALL = 3`) en la cuadrícula.
- Etiqueta de versión visible en el menú.
- Tests de Vitest para las funciones puras de habilidades y la IA.

### Notes
- Funciones puras nuevas en `game-logic.js`: `blackHole`, `stealCell`,
  `teleportCell`, `blockCell`, `aiAbilityMove`, `abilityFor` + constantes
  `ABILITIES` y `WALL`. Sin tocar `checkWin`/`placeOrb`/`updateUI` (contrato intacto).

---

## [1.0.1] — 2026-07-08

### Added
- Despliegue en Vercel (`vercel.json`) — app estática pública.
- `README.md` y `PLAN-DE-MEJORAS.md`.

### Changed
- **Fase 1 del plan**: `game-logic.js` pasa a ser la **fuente única** de la
  lógica pura; `game.js` la importa como módulo ES. Se elimina la duplicación
  de lógica entre navegador y tests. Los tests ahora prueban el código real.
- El desarrollo local ahora requiere servidor HTTP (los módulos ES bloquean `file://`).

### Fixed
- `cleanUrls` removido de `vercel.json` para que la raíz sirva el juego.

---

## [1.0.0] — 2026-06-26 · Baseline oficial

### Added
- Arquitectura en archivos separados: `arise-shadow-connect-v2.html`,
  `styles.css`, `game.js`, `game-logic.js`.
- Suite de tests con Vitest sobre la lógica pura.
- Sistema de hooks DevOps: `PostToolUse` (auto-test) y `PreToolUse` (delete-guard).
- Declaración de baseline y contrato en `CLAUDE.md`.

### Fixed
- Umbral del rango D bajado a 400 EXP; mejor salida del delete-guard.

---

## [0.3.0] — 2026-06-26

### Added
- *Arise Shadow Connect v2*: versión final pulida (base del HTML activo actual).

## [0.2.0] — 2026-06-26

### Added
- *Arise Shadow Connect*: modo puzzle con canvas.

## [0.1.0] — 2026-06-26

### Added
- Prototipo original *Shadow Connect*.
