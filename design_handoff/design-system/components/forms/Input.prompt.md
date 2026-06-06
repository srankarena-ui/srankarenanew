**Input** — single-line text field with label, icon, hint & error.

```jsx
<Input label="Email" type="email" placeholder="you@arena.gg" />
<Input label="Search" leftIcon={<Icon name="search" />} placeholder="Find a tournament" />
<Input label="Username" error="That handle is taken" defaultValue="nova" />
```
`hint` shows helper text; `error` turns the border red and replaces the hint. Always pair with a `label` (or `aria-label`).
