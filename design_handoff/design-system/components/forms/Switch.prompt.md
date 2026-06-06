**Switch** — toggle for on/off settings.

```jsx
<Switch checked={open} onChange={e => setOpen(e.target.checked)} label="Registration open" />
```
Controlled via `checked` + `onChange`. Track fills electric blue when on; thumb springs across. Use for admin settings and preferences, not for primary actions.
