# Prompts para Claude Code (VS Code) — migración a "S-Rank Arena · Challenger"

**Cómo usar:** copia esta carpeta `design_handoff/` dentro de la raíz de tu repo `Srankarenanew/`. Abre el proyecto en VS Code con Claude Code y pega los prompts **en orden**, uno por uno, revisando el diff de cada paso antes de continuar.

---

## Prompt 0 — Contexto (pégalo primero, una vez)

```
Vas a aplicar un nuevo design system a este proyecto Next.js (App Router, React 19, Tailwind v4, next-intl).

Lee primero, en este orden:
- design_handoff/README.md  (guía de migración + mapa de tokens)
- design_handoff/design-system/readme.md  (guía de marca: tono, foundations, iconografía)
- design_handoff/design-system/tokens/*.css
- design_handoff/design-system/components/**/*.prompt.md

Es una migración VISUAL y de TONO. La marca pasa de púrpura/MAYÚSCULAS/solo-oscuro a:
azul eléctrico #3E6BFF + cian #36D2FF, sentence case, formas redondeadas, Plus Jakarta Sans
+ JetBrains Mono, con tema claro+oscuro y 4 acentos seleccionables.

NO cambies la lógica de negocio ni las rutas. Trabaja paso a paso y espera mi visto bueno
entre pasos. Confírmame el plan antes de tocar código.
```

---

## Prompt 1 — Tokens + fuentes en `globals.css`

```
Paso 1: tokens.
1. En src/app/globals.css, reemplaza el bloque @theme actual por la paleta nueva siguiendo
   la tabla "Mapa de tokens" de design_handoff/README.md (accent #3E6BFF, bg #0A0E1A, etc.)
   y añade --color-accent-2 (#36D2FF) y --font-mono ("JetBrains Mono").
2. Copia los bloques de tema claro [data-theme="light"] desde
   design_handoff/design-system/tokens/colors.css y los 4 acentos desde
   design_handoff/design-system/tokens/accents.css, adaptándolos a nombres --color-*
   donde tu @theme los use. Lo derivado (soft/ring/glow) debe usar
   color-mix(in srgb, var(--color-accent) X%, transparent) para seguir al acento.
3. Registra las fuentes con next/font/google en src/app/[locale]/layout.tsx:
   Plus_Jakarta_Sans (400–800) y JetBrains_Mono (400/500/700), y exponlas como variables CSS.
4. Ajusta el <html>: color-scheme y la fuente body a var(--font-body).

Muéstrame el diff de globals.css y layout.tsx.
```

---

## Prompt 2 — Componentes base `src/core/ui/`

```
Paso 2: componentes UI. Adapta SOLO el estilo (no la API) de estos archivos para que
coincidan con sus equivalentes en design_handoff/design-system/components/ (lee cada .prompt.md):

- src/core/ui/Button.tsx   -> quita uppercase/tracking-widest/font-black; sentence case,
  font-bold, rounded-2xl, variantes primary(azul+glow hover)/secondary/ghost/danger, active:scale-[.97]
- src/core/ui/Card.tsx     -> rounded-2xl, borde var(--color-border), sombra suave, hover lift+glow opcional
- src/core/ui/Badge.tsx    -> pill mono uppercase pequeño; variantes; punto pulse para "Live"
- src/core/ui/Input.tsx    -> label mono uppercase chico, rounded-xl, focus ring de acento, estado error
- src/core/ui/Tabs.tsx     -> segmentado pill, tab activo azul con glow
- src/core/ui/Modal.tsx    -> overlay con blur, panel rounded-2xl, fade+pop
- src/core/ui/Toast.tsx    -> colores semánticos nuevos

Mantén props, tipos y nombres. Hazlo archivo por archivo y muéstrame cada diff.
```

---

## Prompt 3 — Navbar, Footer y assets

```
Paso 3: chrome.
1. Copia design_handoff/design-system/assets/* a public/ (mark blanco, mark tinta, svg).
2. src/core/ui/Navbar.tsx: links en sentence case; usa el mark blanco en tema oscuro y el
   de tinta en claro (quita brightness-0 invert fijo); botón de usuario redondeado.
   AÑADE: un toggle de tema (sol/luna) y un selector de acento (challenger/volt/ember/aurora)
   que escriban data-theme y data-accent en <html> y persistan en localStorage.
3. src/core/ui/Footer.tsx: títulos de columna en mono uppercase con color de acento;
   conserva los SVG de redes.

Muéstrame los diffs.
```

---

## Prompt 4 — Tema claro + acentos a nivel app

```
Paso 4: theming runtime.
1. En src/app/[locale]/layout.tsx, inicializa data-theme (por defecto "dark") y
   data-accent (por defecto "challenger") en <html>, leyendo de cookie/localStorage sin flash.
2. Crea un pequeño provider/hook (p.ej. src/core/ui/ThemeProvider.tsx) que gestione
   theme + accent y lo conecte al toggle/selector de la Navbar.
3. Verifica que TODOS los módulos (landing, tournaments, profile, settings, admin) se ven
   bien en claro y oscuro y con los 4 acentos.

Muéstrame los diffs y dime qué pantallas revisaste.
```

---

## Prompt 5 — Tono y copy (i18n)

```
Paso 5: tono.
En src/core/i18n/dictionaries/en.json y es.json, reescribe los textos a sentence case y voz
amigable (tú/"you"), siguiendo la sección "Content fundamentals" de
design_handoff/design-system/readme.md. Ejemplos: títulos de héroe tipo
"Climb the ranks, together." / "Sube de rango, en equipo."; botones verbo-primero y cortos.
NO cambies las claves (keys), solo los valores. Mantén EN y ES en paralelo.

Lista los strings que cambiaste.
```

---

## Prompt 6 — Limpieza y verificación

```
Paso 6: QA.
1. Busca y elimina restos del estilo viejo: clases "uppercase tracking-widest", "font-black"
   en titulares/botones, y cualquier púrpura (#a855f7, purple-600, etc.) que deba ser azul.
2. Revisa contraste AA, foco visible y prefers-reduced-motion.
3. Corre `npm run build` y arregla lo que rompa.
4. Dame un resumen de archivos tocados y un checklist de pantallas verificadas en claro/oscuro
   con cada acento.
```

---

### Consejo
Si un paso es muy grande, pídele a Claude Code que lo haga **archivo por archivo**. Revisa cada diff antes de aceptar. Para producción, recuerda self-hostear las fuentes (ver `fonts.css`).
