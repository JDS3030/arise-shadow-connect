# Plan de Mejoras — ARISE: Shadow Connect

> Documento de trabajo. Ejecutamos **por fases**: no se pasa a la siguiente sin
> verificar que el juego sigue cargando (`#menuScreen`, `checkWin()`,
> `placeOrb()`, `updateUI()` — contrato de CLAUDE.md).
>
> **Estado global:** publicado en https://arise-shadow-connect.vercel.app (Vercel, estático).

---

## Leyenda

- **Impacto:** 🔴 alto · 🟡 medio · 🟢 mejora visible
- **Esfuerzo:** ⏱️ bajo · ⏱️⏱️ medio · ⏱️⏱️⏱️ alto
- **Riesgo:** riesgo de romper algo existente

---

## FASE 1 — Sanear la base del código 🔴

*Objetivo: una sola fuente de verdad y tests que prueben el código real. Todo lo demás se construye sobre esto.*

| # | Tarea | Impacto | Esfuerzo | Riesgo |
|---|---|---|---|---|
| 1.1 | Unificar `game.js` y `game-logic.js` en **un solo módulo**. Hoy `ORBS`, `RANKS`, `checkWin`, la IA y `saveRank` están duplicados; un cambio en uno no se refleja en el otro. | 🔴 | ⏱️⏱️ | Medio |
| 1.2 | Cargar el módulo en el HTML con `<script type="module">` e importar desde `game-logic.js`. | 🔴 | ⏱️ | Medio |
| 1.3 | Actualizar los tests para que apunten al código que **realmente corre** (hoy prueban una copia). | 🔴 | ⏱️ | Bajo |
| 1.4 | Correr `npm test` y verificar que todo pasa + el juego carga en el navegador. | — | ⏱️ | — |

**Criterio de aceptación:** el juego funciona igual que ahora, pero ya no hay código duplicado y `npm test` prueba las funciones reales.

> ✅ **Completada (2026-07-08).** `game-logic.js` es ahora la fuente única de la
> lógica pura; `game.js` la importa como módulo ES y expone los handlers a `window`.
> `game-logic.js` se versiona y despliega (se quitó de `.gitignore`/`.vercelignore`).
> 44 tests pasan sobre el código real + smoke-test end-to-end con jsdom + deploy
> verificado en Vercel. **Nota:** el dev local ahora requiere servidor HTTP (no `file://`).

---

## FASE 2 — Robustez y datos 🟡

*Objetivo: que no se rompa en casos límite y que el usuario controle sus datos.*

| # | Tarea | Impacto | Esfuerzo | Riesgo |
|---|---|---|---|---|
| 2.1 | Envolver la lectura de `localStorage` en `try/catch` (hoy `JSON.parse` revienta si está corrupto o en modo incógnito). | 🟡 | ⏱️ | Bajo |
| 2.2 | Botón **"Reiniciar progreso"** en el menú (borra EXP y ranking con confirmación). | 🟡 | ⏱️ | Bajo |
| 2.3 | Validar/migrar datos viejos de `localStorage` si cambia el formato. | 🟢 | ⏱️ | Bajo |

**Criterio de aceptación:** abrir en incógnito no rompe el juego; se puede reiniciar el progreso desde la UI.

---

## FASE 3 — Experiencia móvil y presencia web 🟢📱

*Objetivo: aprovechar que ya está en la nube — que se sienta app nativa en el celular y que el link se vea profesional.*

| # | Tarea | Impacto | Esfuerzo | Riesgo |
|---|---|---|---|---|
| 3.1 | **PWA instalable**: `manifest.json` + service worker → "Agregar a pantalla de inicio", ícono propio, pantalla completa, funciona **sin internet**. | 🟢 | ⏱️⏱️ | Bajo |
| 3.2 | **Meta tags + favicon**: `theme-color`, Open Graph (imagen + descripción al compartir por WhatsApp/redes), favicon. | 🟢 | ⏱️ | Bajo |
| 3.3 | **Soporte táctil**: la pista de columna usa `mouseenter`, que no existe en pantallas táctiles. Agregar eventos touch. | 🟢 | ⏱️⏱️ | Medio |

**Criterio de aceptación:** se puede instalar en el celular, funciona offline, y el enlace compartido muestra imagen + título.

---

## FASE 4 — Jugabilidad e IA 🔴🎮

*Objetivo: que el juego sea un reto real y coherente.*

| # | Tarea | Impacto | Esfuerzo | Riesgo |
|---|---|---|---|---|
| 4.1 | **Resolver la inconsistencia de diseño**: hoy se resalta toda la columna (estilo Connect 4 con gravedad) pero se puede poner ficha en cualquier celda (estilo Gomoku). Decidir uno e implementarlo bien. | 🔴 | ⏱️⏱️ | Alto |
| 4.2 | **IA más inteligente**: detectar amenazas dobles y "tres en línea abiertos", no solo la victoria/bloqueo inmediato. | 🔴 | ⏱️⏱️⏱️ | Medio |
| 4.3 | **Niveles de dificultad** Fácil / Normal / Difícil (pendiente marcado en CLAUDE.md). | 🟡 | ⏱️⏱️ | Medio |

**Criterio de aceptación:** el modo de juego es coherente y la IA en "Difícil" es un reto real.

---

## FASE 5 — Pulido y accesibilidad 🟢

*Objetivo: detalles que elevan la calidad percibida.*

| # | Tarea | Impacto | Esfuerzo | Riesgo |
|---|---|---|---|---|
| 5.1 | Botón de **silenciar sonido** (mute) con preferencia guardada. | 🟢 | ⏱️ | Bajo |
| 5.2 | Marcar visualmente la **última jugada**. | 🟢 | ⏱️ | Bajo |
| 5.3 | **Accesibilidad**: navegación por teclado y ARIA en las celdas (hoy son `<div>` con click). | 🟢 | ⏱️⏱️ | Bajo |
| 5.4 | Conectar **auto-deploy** Vercel↔GitHub (cada `git push` publica solo). | 🟢 | ⏱️ | Bajo |

**Criterio de aceptación:** juego pulido, usable con teclado, y despliegue automático activo.

---

## Orden recomendado de ejecución

```
FASE 1 (base sana)  →  FASE 2 (robustez)  →  FASE 3 (móvil/web)  →  FASE 4 (jugabilidad)  →  FASE 5 (pulido)
```

**Por qué este orden:**
1. La Fase 1 evita que el trabajo futuro se duplique o se rompa.
2. La Fase 2 es rápida y quita riesgos de fallo.
3. La Fase 3 aprovecha que ya está desplegada (impacto visible inmediato en el celular).
4. La Fase 4 es la más grande y arriesgada — se hace con la base ya estable.
5. La Fase 5 son detalles finales.

> **Nota:** cada fase se puede entregar y desplegar por separado. No hace falta
> hacer todo de una vez.

---

## Registro de avance

| Fase | Estado | Fecha | Notas |
|---|---|---|---|
| 1 | ✅ Completada | 2026-07-08 | Fuente única en `game-logic.js`; 44 tests + smoke-test + deploy OK |
| 2 | ⬜ Pendiente | — | |
| 3 | ⬜ Pendiente | — | |
| 4 | ⬜ Pendiente | — | |
| 5 | ⬜ Pendiente | — | |
