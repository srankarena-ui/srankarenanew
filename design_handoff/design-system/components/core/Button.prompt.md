**Button** — the primary action control; use for any click/submit action (mixed-case labels, never SHOUTING).

```jsx
<Button variant="primary" size="lg" onClick={join}>Join a tournament</Button>
<Button variant="secondary" leftIcon={<Icon name="filter" />}>Filters</Button>
<Button variant="ghost" size="sm">Cancel</Button>
<Button variant="danger" isLoading>Withdrawing…</Button>
```

- **variant**: `primary` (filled electric blue, glow on hover) · `secondary` (surface + border, border turns accent on hover) · `ghost` (text-only, soft accent wash on hover) · `danger` (soft red).
- **size**: `sm` `md` `lg`. Use `lg` for hero/empty-state CTAs, `md` default, `sm` in toolbars/cards.
- `fullWidth` for mobile & forms; `isLoading` swaps a spinner; `leftIcon`/`rightIcon` take any node; `as="a"` to render a link.
