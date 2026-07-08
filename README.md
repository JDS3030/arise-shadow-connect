# ⚔️ ARISE — Shadow Connect

> Juego de estrategia **Connect 4 / 5 / 6** con temática de cazadores y orbes de sombra.
> Enfréntate a otro jugador o a la **IA Sombra**, sube de rango (E → S) y compite por el TOP 10.

**🎮 Jugar ahora:** **[arise-shadow-connect.vercel.app](https://arise-shadow-connect.vercel.app)**

---

## ✨ Características

- **3 modos de tablero:** Connect 4, 5 o 6 (el tablero escala a `N + 4`).
- **Dos formas de jugar:** 1 vs 1 local o **1 vs IA**.
- **5 orbes** seleccionables (Hunter, Shadow, Magic, Power, Gold), cada uno con su color y brillo.
- **Sistema de rangos** por experiencia: `E → D → C → B → A → S`.
- **Ranking TOP 10** local con puntaje según rapidez y dificultad.
- **Efectos de sonido** vía Web Audio API (sin archivos externos).
- **Detección de victoria** horizontal, vertical y diagonal.
- Progreso (EXP y ranking) **guardado en el navegador** (`localStorage`).

---

## 🛠️ Stack

- **HTML5 · CSS3 · JavaScript Vanilla (ES6+)**
- Sin frameworks, sin bundlers, sin dependencias en tiempo de ejecución.
- Fuentes vía Google Fonts (Orbitron + Inter).
- Tests con **Vitest** (+ jsdom) — solo en desarrollo.
- Hospedaje estático en **Vercel**.

---

## 🚀 Ejecutar en local

`game.js` es un **módulo ES**, por lo que la app **necesita servirse por HTTP**
(abrir el archivo con doble clic / `file://` no funciona: el navegador bloquea los
módulos por CORS). Opciones:

- **Live Server** (extensión de VS Code) — clic derecho sobre el HTML → *Open with Live Server*, o
- Cualquier servidor estático simple:

```bash
# Python
python -m http.server 8000
# luego abre http://localhost:8000/arise-shadow-connect-v2.html
```

- O simplemente usa la **versión desplegada**: [arise-shadow-connect.vercel.app](https://arise-shadow-connect.vercel.app)

Para depurar: `F12` → pestaña **Consola**.

---

## 🧪 Tests

Los tests cubren la lógica pura del juego (detección de victoria, IA, rangos, ranking).

```bash
npm install      # instala dependencias de desarrollo
npm test         # corre los tests una vez
npm run test:watch   # modo watch
npm run test:ui      # interfaz visual de Vitest
```

---

## 📁 Estructura del proyecto

```
.
├── arise-shadow-connect-v2.html   # ← archivo principal (en desarrollo)
├── styles.css                     # estilos (orbes, animaciones, pantallas)
├── game-logic.js                  # ← fuente única de lógica pura y estado (importada por game.js y por los tests)
├── game.js                        # capa de navegador: renderizado, eventos y audio (módulo ES)
├── game-logic.test.js             # tests con Vitest
├── vercel.json                    # config de despliegue (redirige / al HTML)
├── .vercelignore                  # archivos excluidos del deploy
├── CLAUDE.md                      # guía técnica del proyecto
└── PLAN-DE-MEJORAS.md             # roadmap de mejoras por fases
```

> **Nota:** `arise-shadow-connect-v2.html` es el archivo **activo** y único HTML del proyecto.

---

## 🎯 Cómo se juega

1. En el menú, elige **modo** (vs Jugador o vs IA) y **tamaño** (Connect 4/5/6).
2. Selecciona tu **orbe** (contra la IA, el suyo se asigna al azar).
3. Coloca orbes en el tablero por turnos.
4. Gana quien conecte **N orbes** en línea (horizontal, vertical o diagonal).
5. Ganar otorga **EXP**; contra la IA la recompensa es doble.

**Rangos por EXP:** E (0) · D (400) · C (1500) · B (3500) · A (7000) · S (15000)

---

## ☁️ Despliegue

La app es 100% estática y se hospeda en **Vercel**.

```bash
vercel --prod    # publica la versión actual a producción
```

`vercel.json` redirige la raíz `/` al archivo principal, ya que el archivo no se
llama `index.html`.

> ℹ️ El progreso se guarda en el `localStorage` de **cada navegador**, por lo que
> no se sincroniza entre dispositivos. Un ranking compartido en la nube requeriría
> un backend (ver `PLAN-DE-MEJORAS.md`).

---

## 🗺️ Roadmap

El plan de mejoras por fases (sanear código, robustez, PWA móvil, IA, pulido) está
documentado en **[`PLAN-DE-MEJORAS.md`](./PLAN-DE-MEJORAS.md)**.

---

## 📄 Licencia

Proyecto personal / educativo.
