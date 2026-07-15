// Elapsed time is stored as a frozen base (clock_seconds) plus, while
// running, the time since clock_started_at — computed client-side so the
// overlay ticks every second without hitting the server.
export function computeElapsedSeconds(
  clockSeconds: number,
  clockRunning: boolean,
  clockStartedAt: string | null
): number {
  if (!clockRunning || !clockStartedAt) return clockSeconds;
  return clockSeconds + Math.floor((Date.now() - new Date(clockStartedAt).getTime()) / 1000);
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
