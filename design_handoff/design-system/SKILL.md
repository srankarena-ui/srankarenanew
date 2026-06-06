---
name: s-rank-arena-design
description: Use this skill to generate well-branded interfaces and assets for S-Rank Arena (the "Challenger" electric-blue eSports design language), either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping. Supports light and dark themes.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc.), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick reference
- **Global CSS**: link `styles.css` (it `@import`s tokens + fonts + base). Default theme is dark; add `data-theme="light"` on any wrapper for light.
- **Identity**: electric blue `#3E6BFF` + cyan `#36D2FF`; cool neutrals; deep navy-black dark / cool off-white light. One accent + one support, never a rainbow.
- **Accent themes**: swappable via `data-accent="challenger|volt|ember|aurora"` (independent of `data-theme`). Challenger (blue, default), Volt (lime), Ember (coral), Aurora (violet). Everything accent-derived follows automatically.
- **Type**: Plus Jakarta Sans (UI/display, sentence case — never ALL-CAPS) + JetBrains Mono (stats, ranks, labels, tags). Hierarchy from size + weight.
- **Shape**: generously rounded (cards 20px, pills 999px); soft shadows + a signature accent **glow** on primary/active/S-tier elements.
- **Voice**: friendly, confident, "you"-focused, sentence case. Verbs in buttons.
- **Components**: read from `window.<Namespace>` after loading `_ds_bundle.js` — Button, Card, Badge, Tag, Avatar, Input, Switch, Tabs, RankBadge, ProgressBar, StatTile, Modal. See each `components/**/<Name>.prompt.md`.
- **Icons**: outline/stroke set (Lucide-equivalent), `currentColor`. Never emoji.
- **Assets**: `assets/s-rank-mark-white.png` (dark bg), `assets/s-rank-mark.png` (light bg), `assets/s-rank-logo.svg`.
- **Full app recreation**: `ui_kits/s-rank-arena/`.

When you need the exact component namespace, run the design-system check or read any `components/**/*.card.html`.
