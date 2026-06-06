**Tabs** — segmented control for switching views (Overview / Players / Bracket).

```jsx
const [tab, setTab] = React.useState("overview");
<Tabs value={tab} onChange={setTab} tabs={[
  { id: "overview", label: "Overview" },
  { id: "players", label: "Players", count: 32 },
  { id: "bracket", label: "Bracket" },
]} />
```
`block` stretches tabs full-width. Active tab fills electric blue with a glow. Use for 2–5 sibling views; for many filters use a Select instead.
