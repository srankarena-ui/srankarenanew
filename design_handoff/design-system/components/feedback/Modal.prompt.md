**Modal** — centered dialog for confirmations, score submission, registration, etc.

```jsx
const [open, setOpen] = React.useState(false);
<Modal
  open={open}
  onClose={() => setOpen(false)}
  title="Register your team"
  subtitle="Summoner's Clash · Season 4"
  footer={<>
    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
    <Button onClick={confirm}>Confirm</Button>
  </>}
>
  …form…
</Modal>
```
`size` sm/md/lg. Overlay click & the × call `onClose`. Body scrolls; footer stays pinned.
