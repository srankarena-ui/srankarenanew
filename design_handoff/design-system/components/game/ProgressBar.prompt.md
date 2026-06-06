**ProgressBar** — XP / completion bar with a blue→cyan gradient fill.

```jsx
<ProgressBar value={2480} max={5000} label="To rank S" valueText="2,480 / 5,000 XP" />
<ProgressBar value={62} height={6} />
```
Drives the XP-to-next-rank meter on profiles and check-in/registration fill. Omit `label`/`valueText` for a bare bar.
