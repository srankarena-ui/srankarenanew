# Handoff: aplicar el Design System "S-Rank Arena (Challenger)" al repo `Srankarenanew`

Este paquete contiene **el sistema de diseño completo** (tokens, reglas, componentes de referencia y assets) más **prompts listos para pegar** en Claude Code (VS Code). El objetivo: migrar tu app actual al nuevo look **Challenger** — azul eléctrico, formas redondeadas, tipografía limpia, tono amigable (sin MAYÚSCULAS por todos lados), con **tema claro + oscuro** y **4 acentos seleccionables**.

> ⚠️ Los archivos `.jsx` dentro de `design-system/components/` son **referencias de diseño** (versiones cosméticas), no para copiar tal cual. La tarea es **adaptar tus componentes reales** (`src/core/ui/*.tsx`) a estos estilos usando tu stack (Next.js + Tailwind v4). Los `.css` de `design-system/tokens/` **sí** se integran casi directos.

---

## Tu stack (detectado)
- **Next.js 16 / React 19**, App Router, `src/app/[locale]/…`
- **Tailwind CSS v4** (config vía `@theme` en `src/app/globals.css`)
- **next-intl** (i18n EN/ES — los textos viven en `src/core/i18n/dictionaries/*.json`)
- Componentes UI en `src/core/ui/*.tsx` · módulos en `src/modules/**`

## Qué cambia (resumen de la marca)
| Antes | Ahora (Challenger) |
|---|---|
| Púrpura `#a855f7` | Azul eléctrico `#3E6BFF` + cian `#36D2FF` |
| Solo oscuro | **Claro + oscuro** (`data-theme`) + **4 acentos** (`data-accent`) |
| `font-black uppercase tracking-widest` por todos lados | **Sentence case**; MAYÚSCULAS solo en micro-labels mono |
| Inter | **Plus Jakarta Sans** (UI) + **JetBrains Mono** (stats/labels) |
| Esquinas `rounded-xl/2xl` | Más redondeado (cards 20px, pills 999px) |
| Glow púrpura | Glow azul derivado del acento (`color-mix`) |

---

## Contenido de este paquete
```
design_handoff/
├─ README.md            ← (este archivo) guía de migración
├─ PROMPTS.md           ← prompts para pegar en Claude Code, en orden
└─ design-system/
   ├─ styles.css            entry point (@import de todo)
   ├─ base.css              resets sobre tokens
   ├─ tokens/
   │   ├─ colors.css        marca, neutros, rangos, tiers, semánticos, claro/oscuro, elevación
   │   ├─ accents.css       los 4 acentos (challenger/volt/ember/aurora) × claro/oscuro
   │   ├─ typography.css    familias, escala, pesos, tracking
   │   ├─ spacing.css       espaciado, radios, motion, z
   │   └─ fonts.css         @import de Google Fonts (cambiar por self-host en prod)
   ├─ components/        referencias .jsx + .d.ts + .prompt.md (Button, Card, Badge, Tag,
   │                     Avatar, Input, Switch, Tabs, RankBadge, ProgressBar, StatTile, Modal)
   ├─ assets/            logo (mark blanco / mark tinta / svg)
   ├─ readme.md          la guía de marca completa (tono, foundations, iconografía)
   └─ SKILL.md           wrapper de Agent Skill
```

---

## Plan de migración (lo que harán los prompts)

### 1. Tokens → `globals.css`
Reemplazar el bloque `@theme` actual por la paleta nueva (ver tabla abajo) y registrar las fuentes con `next/font`. Pegar el tema claro (`[data-theme="light"]`) y los acentos (`[data-accent="…"]`) desde `tokens/colors.css` + `tokens/accents.css`. Lo derivado (soft/ring/glow/gradientes) usa `color-mix(var(--color-accent))` para seguir al acento automáticamente.

**Mapa de tokens (oscuro):**
| Token (`@theme`) | Antes | Ahora |
|---|---|---|
| `--color-accent` | `#a855f7` | `#3E6BFF` |
| `--color-accent-hover` | `#9333ea` | `#2F58E6` |
| `--color-accent-2` (nuevo) | — | `#36D2FF` |
| `--color-bg-primary` | `#0b0e14` | `#0A0E1A` |
| `--color-bg-card` | `#121620` | `#121826` |
| `--color-bg-card-hover` | `#1a1f2e` | `#1A2235` |
| `--color-border` | `#1f2937` | `#232B3E` |
| `--color-border-hover` | `#374151` | `#333E57` |
| `--color-text-primary` | `#e5e7eb` | `#EAEEF7` |
| `--color-text-secondary` | `#9ca3af` | `#939BB0` |
| `--color-text-muted` | `#6b7280` | `#5C6577` |
| `--color-success` | `#22c55e` | `#22C55E` |
| `--color-danger` | `#ef4444` | `#F0434F` |
| `--color-warning` | `#f59e0b` | `#F5A524` |
| `--font-heading` / `--font-body` | Inter | `"Plus Jakarta Sans"` |
| `--font-mono` (nuevo) | — | `"JetBrains Mono"` |

> El sistema de **rangos F→S** (`src/core/lib/ranks.ts`) y **tiers** (`achievements.ts`): mantén la lógica, solo actualiza el color del rango `C` y `S` a azul/cian si quieres alinearlos (opcional). Equivalencias en `design-system/tokens/colors.css` (`--rank-*`, `--tier-*`).

### 2. Componentes `src/core/ui/*.tsx` (ajustes cosméticos)
Para cada uno, aplica los estilos del componente equivalente en `design-system/components/` (lee su `.prompt.md`):

- **Button.tsx** — quitar `font-black uppercase tracking-widest`; usar `font-bold` sentence case, `rounded-2xl`, variantes primary (azul + glow en hover) / secondary (borde→acento) / ghost (wash de acento) / danger; press con `active:scale-[.97]`.
- **Card.tsx** — `rounded-2xl`, `border-[var(--color-border)]`, sombra suave; hover opcional con lift + glow azul.
- **Badge.tsx** — pill mono uppercase minúsculo (status: Open/Live/Ended); variantes accent/success/warning/danger; punto `pulse` para Live.
- **Input.tsx** — label mono uppercase pequeño, `rounded-xl`, focus con ring de acento (`0 0 0 3px`), estado error.
- **Tabs.tsx** — segmentado tipo pill; tab activo azul con glow.
- **Modal.tsx** — overlay con blur, panel `rounded-2xl`, animación fade+pop.
- **Toast.tsx** — alinear colores semánticos.
- **Navbar.tsx** — quitar `brightness-0 invert` salvo en oscuro (usar mark blanco en oscuro, tinta en claro); links sentence case; **añadir toggle de tema (☀️/🌙) y selector de acento**; el botón de usuario redondeado con avatar.
- **Footer.tsx** — labels de sección mono uppercase en color de acento; mantener los SVG sociales.

### 3. Tono y contenido (i18n)
En `src/core/i18n/dictionaries/{en,es}.json`: pasar los textos gritados a **sentence case** y voz amigable. Ej: `"heroTitle": "S-RANK ARENA"` → titular tipo "Climb the ranks, together." / "Sube de rango, en equipo."; `"loginButton": "Enter the Arena"` → "Enter the arena". Botones verbo-primero, cortos. Reglas completas en `design-system/readme.md` (sección *Content fundamentals*).

### 4. Tema claro + acentos (runtime)
Añadir `data-theme` y `data-accent` en `<html>` (en `src/app/[locale]/layout.tsx`), persistir preferencia (localStorage/cookie), y exponer el toggle + selector en la Navbar. Reglas en `tokens/colors.css` (`[data-theme="light"]`) y `tokens/accents.css`.

### 5. Verificación
- Login → home → torneos → detalle (bracket) → perfil → ajustes → admin, en **claro y oscuro** y con los 4 acentos.
- Contraste AA en textos; foco visible; `prefers-reduced-motion` respetado.
- Sin púrpura `#a855f7` residual ni `uppercase` en titulares/botones.

---

## Notas
- **Fuentes**: el paquete usa Google Fonts vía `@import`. Para producción, self-hostea los `.woff2` (con `next/font/local`) y quita el `@import` de `fonts.css`.
- **Assets**: usa `assets/s-rank-mark-white.png` en fondos oscuros y `assets/s-rank-mark.png` en claros (o el `.svg`).
- Mantén la **lógica** de tu app intacta; esto es una capa visual + de tono.
