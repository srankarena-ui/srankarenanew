# S-Rank Arena — Design System

The **Challenger** design language for **S-Rank Arena**, a multi-game eSports tournament platform. This redesign reinvents the original (dark-only, all-caps, Twitch-purple) into something **bolder and friendlier**: an electric-blue identity with rounded shapes, clean type, calmer copy, and a fully realized **light + dark** theme. The dark theme is primary.

> Direction inspired by [challengermode.com](https://www.challengermode.com/) at the user's request — clean, modern, electric-blue esports look.

## Product context

S-Rank Arena lets players **join tournaments, climb a rank ladder (F → S by XP), and earn tiered achievements** across games like **League of Legends, Clash Royale and Valorant**. Core surfaces: a marketing **landing** page, **tournaments** browser, **tournament detail** (overview / players / bracket), public **player profiles**, **auth**, account **settings** (linked game accounts), and an **admin** panel. It supports automated single/double-elimination brackets, "Summoner Trials" leaderboards, and **live match scanning** via the Riot & Supercell APIs. The product is **bilingual (EN/ES)**.

### Sources
- **Codebase** (read-only, attached): `Srankarenanew/` — a Next.js 16 / React 19 / Tailwind v4 app. Key references: `src/app/globals.css` (original tokens), `src/core/ui/*` (Button, Card, Badge, Input, Tabs, Modal, Toast, Navbar, Footer), `src/core/lib/ranks.ts` & `achievements.ts` (rank/tier systems), `src/modules/**` (landing, tournaments, profile, settings, admin), `src/core/i18n/dictionaries/en.json` (all product copy).
- **Logo**: `uploads/LOGO-HYDRO.png` — a star-in-shield mark (→ `assets/`).

---

## Content fundamentals

How S-Rank Arena writes copy in this redesign:

- **Tone**: confident, warm, and a little playful — like a teammate, not a referee. The old UI shouted (`ENTER THE ARENA`); the new voice is friendlier (`Join the arena`, `Climb the ranks, together`, `Game on.`).
- **Casing**: **sentence case** for everything readable — headings, buttons, body. UPPERCASE is reserved **only** for tiny mono micro-labels (field labels, stat captions, status badges). This is the single biggest shift from the original.
- **Person**: speak to the player as **"you"** ("track **your** stats", "**your** next match"). Refer to the platform as "the arena."
- **Length**: short and scannable. Headlines ≤ 5 words; supporting lines one sentence. Buttons are 1–3 words and verb-first (*Join now*, *Register*, *Submit score*).
- **Numbers & stats**: always in **JetBrains Mono**, tabular, with thousands separators (`2,480 EXP`, `24–11 W/L`, `4.8 KDA`). EXP is written `+250 EXP`.
- **Domain vocabulary**: Rank (F–S), EXP, Tournament, Bracket, Match, Check-in, Seed, BYE, Standings, Linked accounts, Verification. Achievement tiers: Bronze → Silver → Gold → Platinum → S-Rank.
- **Emoji**: not used in UI. Personality comes from color, shape and the icon set.
- **Examples**: *"Climb the ranks, together."* · *"Everything you need to compete."* · *"Ready to compete?"* · *"Registration closes Friday at 18:00."* · *"That account is already linked."*

---

## Visual foundations

**Mood**: electric, clean, friendly-competitive. Color and shape carry the personality; type stays neutral.

- **Color**: hero is **electric blue `#3E6BFF`** with a **cyan `#36D2FF`** secondary (used for highlights, live/S-rank glow, and the blue→cyan gradient). Neutrals are cool and blue-tinted. Dark theme sits on a deep navy-black `#0A0E1A` with `#121826` surfaces; light theme is a cool off-white `#F3F6FC` with pure-white cards. One accent, one support — never a rainbow. Semantic = green/red/amber/blue. See `tokens/colors.css`.
- **Accent themes (swappable)**: the accent is a **selectable identity** — set `data-accent="challenger | volt | ember | aurora"` on `<html>` (or any wrapper), independent of `data-theme`. **Challenger** (electric blue, default), **Volt** (electric lime), **Ember** (warm coral), **Aurora** (violet→mint). Neutral surfaces are shared; only the accent and everything derived from it (`--accent-soft`, `--accent-ring`, the glow shadows, gradients — all via `color-mix(var(--accent))`) changes. Each accent has light + dark values for legibility. See `tokens/accents.css`. The UI kit's nav has a live accent picker.
- **Typography**: **Plus Jakarta Sans** for all UI & display (weights 400–800; hierarchy from size + weight, never caps), **JetBrains Mono** for stats, ranks, labels and tags. Big headings use tight tracking (`-0.035em`); mono micro-labels use `+0.04em` uppercase. See `tokens/typography.css`.
- **Backgrounds**: solid token surfaces, never busy. Accent appears as **soft radial glows** behind heroes (`radial-gradient(circle, var(--accent-soft), transparent)`) and as **blue→cyan gradient bands** for CTAs, auth panels and tournament banners. No photographic imagery in the kit — game banners are per-game CSS gradients. No noise/grain.
- **Corner radii**: generously rounded and friendly — inputs/buttons `12–16px`, cards `20px`, hero/CTA blocks `32px`, and **pills (`999px`)** for badges, tags, avatars-as-circles, and the segmented Tabs. See `tokens/spacing.css`.
- **Cards**: `--surface` fill, `1px --border`, `--radius-xl`, soft `--shadow-sm` at rest. Content cards **lift** on hover (`translateY(-3px)` + `--shadow-lg`); interactive cards get an **accent border + glow** instead.
- **Shadows / elevation**: soft and low-contrast (`sm/md/lg`). The signature flourish is the **accent glow** (`--shadow-glow`, `--shadow-glow-cyan`) — a 1px accent ring + colored blur used on primary buttons (hover), the active Tab, the current-rank badge, and S-tier elements. Shadows are theme-aware (heavier in dark, lighter in light).
- **Borders**: `1px` hairlines (`--border`) for structure; `1.5px` for inputs and the rank/secondary buttons so they read crisply. Borders strengthen (`--border-strong`) or turn accent on hover/focus.
- **Motion**: quick and friendly — `--dur 200ms` with `--ease-out`; presses use a slight springy overshoot (`--ease-spring`, buttons `scale(.97)`, switch thumb). Modals fade + pop. Live badges pulse. No long or infinite decorative loops. Respects `prefers-reduced-motion` where animated.
- **Hover / press**: hover = lighter accent or accent wash (`--accent-soft`) + glow; press = scale-down / `--accent-press`. Focus = `3px` accent ring (`--accent-ring`).
- **Transparency & blur**: used sparingly and on purpose — the sticky **navbar** blurs the page behind it (`backdrop-filter: blur(14px)` over an 82%-opaque bg), the **modal overlay** blurs, and badges floating on gradient banners use a translucent dark scrim + blur for legibility.
- **Layout**: centered, max-width `1200px` containers with `24px` gutters; sticky top nav; generous vertical rhythm on the 4px spacing scale. Efficient over decorative — group repeated info, avoid filler.

---

## Iconography

- **Style**: a single, consistent **outline (stroke) icon set** — `1.5–2px` strokes, round caps/joins, `currentColor`, 24×24 viewBox. This matches the original codebase, which used inline Lucide-style stroke SVGs throughout (`src/core/ui/Navbar.tsx`, `ServicesGrid.tsx`, etc.).
- **Implementation**: bundled as a small in-house set in `ui_kits/s-rank-arena/kit-shared.jsx` (`<Icon name="…" />`), with ~35 glyphs (trophy, swords, target, medal, gamepad, shield, zap, users, calendar, clock, settings, search, filter, chevrons, sun/moon, etc.). It is **visually equivalent to [Lucide](https://lucide.dev)** — if you need more glyphs, pull the matching Lucide icon (same weight/style) rather than drawing your own.
- **Social icons**: filled-path brand glyphs (Discord, X/Twitter, Twitch, YouTube) live in `kit-chrome.jsx` (Footer), matching the originals in `src/core/ui/Footer.tsx`.
- **Rules**: never use emoji as icons; never hand-draw one-off SVG illustrations. Icons inherit text color and sit in soft accent-tinted tiles (`--accent-soft`) when featured. The **logo mark** (`assets/s-rank-mark*.png`, `s-rank-logo.svg`) is the star-in-shield — white on dark, ink on light.

---

## Index / manifest

**Root**
- `styles.css` — global entry point (consumers link this). `@import` manifest only.
- `base.css` — element defaults built on the tokens.
- `readme.md` — this guide. · `SKILL.md` — portable Agent-Skill wrapper.

**`tokens/`** — `colors.css` (brand, neutrals, rank ladder, tiers, semantic, + dark/light themes & elevation), `accents.css` (the 4 swappable accent identities), `typography.css`, `spacing.css` (spacing/radii/motion/z), `fonts.css` (webfonts).

**`assets/`** — `s-rank-mark.png` (ink), `s-rank-mark-white.png` (white), `s-rank-logo.svg`.

**`components/`** — reusable React primitives (read from `window.SRankArenaDesignSystem_6d53b2`):
- `core/` — **Button, Card, Badge, Tag, Avatar**
- `forms/` — **Input, Switch**
- `navigation/` — **Tabs**
- `game/` — **RankBadge, ProgressBar, StatTile** (brand-specific)
- `feedback/` — **Modal**

Each component ships `<Name>.jsx` + `<Name>.d.ts` + `<Name>.prompt.md`, with one `@dsCard` demo per directory.

**`ui_kits/s-rank-arena/`** — full interactive app recreation (`index.html` + `kit-*.jsx`). See its `README.md`.

**`guidelines/`** — foundation specimen cards (Colors, Type, Spacing, Brand) shown in the Design System tab.

**`explorations/`** — the original 4-direction accent study (Volt / Ember / Aurora / Challenger).

---

## Caveats
- **Fonts** load from Google Fonts CDN (`tokens/fonts.css`). For production, self-host the `.woff2` files and replace the `@import` with local `@font-face` rules.
- Component cards & the UI kit depend on the generated `_ds_bundle.js`, which the compiler builds each turn.
