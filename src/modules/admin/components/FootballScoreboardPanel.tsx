"use client";

import { useEffect, useState } from "react";
import { Card } from "@/core/ui/Card";
import { Button } from "@/core/ui/Button";
import { Input } from "@/core/ui/Input";
import { useToast } from "@/core/ui/Toast";
import {
  updateFootballScoreboard,
  startFootballClock,
  pauseFootballClock,
  resetFootballClock,
  setFootballAddedTime,
} from "@/modules/admin/actions";
import { computeElapsedSeconds, formatClock } from "@/core/lib/football-clock";
import type { Database } from "@/core/types/database";

type Scoreboard = Database["public"]["Tables"]["football_scoreboard"]["Row"];

export function FootballScoreboardPanel({ scoreboard }: { scoreboard: Scoreboard | null }) {
  const { toast } = useToast();
  const [homeTeam, setHomeTeam] = useState(scoreboard?.home_team ?? "Inglaterra");
  const [awayTeam, setAwayTeam] = useState(scoreboard?.away_team ?? "Argentina");
  const [homeAbbr, setHomeAbbr] = useState(scoreboard?.home_abbr ?? "ENG");
  const [awayAbbr, setAwayAbbr] = useState(scoreboard?.away_abbr ?? "ARG");
  const [homeFlagUrl, setHomeFlagUrl] = useState(scoreboard?.home_flag_url ?? "");
  const [awayFlagUrl, setAwayFlagUrl] = useState(scoreboard?.away_flag_url ?? "");
  const [homeScore, setHomeScore] = useState(scoreboard?.home_score ?? 0);
  const [awayScore, setAwayScore] = useState(scoreboard?.away_score ?? 0);
  const [addedMinutes, setAddedMinutes] = useState(scoreboard?.added_time_minutes ?? 0);
  const [clockRunning, setClockRunning] = useState(scoreboard?.clock_running ?? false);
  const [clockSeconds, setClockSeconds] = useState(scoreboard?.clock_seconds ?? 0);
  const [clockStartedAt, setClockStartedAt] = useState(scoreboard?.clock_started_at ?? null);
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const [clockLoading, setClockLoading] = useState(false);

  useEffect(() => {
    if (!clockRunning) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [clockRunning]);

  async function saveDetails() {
    setLoading(true);
    const formData = new FormData();
    formData.set("home_team", homeTeam);
    formData.set("away_team", awayTeam);
    formData.set("home_abbr", homeAbbr);
    formData.set("away_abbr", awayAbbr);
    formData.set("home_flag_url", homeFlagUrl);
    formData.set("away_flag_url", awayFlagUrl);
    formData.set("home_score", String(homeScore));
    formData.set("away_score", String(awayScore));
    const result = await updateFootballScoreboard(formData);
    setLoading(false);
    if ("error" in result && result.error) toast(result.error, "error");
    else toast("Marcador actualizado", "success");
  }

  async function handleStart() {
    setClockLoading(true);
    const result = await startFootballClock();
    setClockLoading(false);
    if ("error" in result && result.error) return toast(result.error, "error");
    setClockRunning(true);
    setClockStartedAt(new Date().toISOString());
  }

  async function handlePause() {
    setClockLoading(true);
    const elapsed = computeElapsedSeconds(clockSeconds, clockRunning, clockStartedAt);
    const result = await pauseFootballClock();
    setClockLoading(false);
    if ("error" in result && result.error) return toast(result.error, "error");
    setClockSeconds(elapsed);
    setClockRunning(false);
    setClockStartedAt(null);
  }

  async function handleReset() {
    setClockLoading(true);
    const result = await resetFootballClock();
    setClockLoading(false);
    if ("error" in result && result.error) return toast(result.error, "error");
    setClockSeconds(0);
    setClockRunning(false);
    setClockStartedAt(null);
    setAddedMinutes(0);
  }

  async function handleAddedTime(minutes: number) {
    setAddedMinutes(minutes);
    const result = await setFootballAddedTime(minutes);
    if ("error" in result && result.error) toast(result.error, "error");
  }

  const displaySeconds = computeElapsedSeconds(clockSeconds, clockRunning, clockStartedAt);
  void tick; // forces re-render every second while running, see effect above

  return (
    <Card>
      <h1 className="mb-2 text-lg font-bold text-white">Football Scoreboard</h1>
      <p className="mb-6 text-xs text-gray-500">
        Overlay para OBS: <code>/overlay/football</code>. Se actualiza solo cada pocos segundos, no hace falta refrescar la fuente.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Input label="Local (nombre)" value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} />
          <Input label="Local (sigla)" value={homeAbbr} maxLength={4} onChange={(e) => setHomeAbbr(e.target.value.toUpperCase())} />
          <Input label="Local (URL bandera)" value={homeFlagUrl} onChange={(e) => setHomeFlagUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div className="space-y-2">
          <Input label="Visitante (nombre)" value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} />
          <Input label="Visitante (sigla)" value={awayAbbr} maxLength={4} onChange={(e) => setAwayAbbr(e.target.value.toUpperCase())} />
          <Input label="Visitante (URL bandera)" value={awayFlagUrl} onChange={(e) => setAwayFlagUrl(e.target.value)} placeholder="https://..." />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="flex items-center justify-center gap-3 rounded-xl border border-gray-800 bg-[#0b0e14] p-4">
          <button onClick={() => setHomeScore((s) => Math.max(0, s - 1))} className="h-8 w-8 rounded-lg border border-gray-700 text-lg text-gray-300 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">−</button>
          <span className="w-10 text-center text-3xl font-bold text-white">{homeScore}</span>
          <button onClick={() => setHomeScore((s) => s + 1)} className="h-8 w-8 rounded-lg border border-gray-700 text-lg text-gray-300 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">+</button>
        </div>
        <div className="flex items-center justify-center gap-3 rounded-xl border border-gray-800 bg-[#0b0e14] p-4">
          <button onClick={() => setAwayScore((s) => Math.max(0, s - 1))} className="h-8 w-8 rounded-lg border border-gray-700 text-lg text-gray-300 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">−</button>
          <span className="w-10 text-center text-3xl font-bold text-white">{awayScore}</span>
          <button onClick={() => setAwayScore((s) => s + 1)} className="h-8 w-8 rounded-lg border border-gray-700 text-lg text-gray-300 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">+</button>
        </div>
      </div>

      <Button onClick={saveDetails} isLoading={loading} className="mb-6 w-full">
        Guardar equipos y marcador
      </Button>

      <div className="mb-2 rounded-xl border border-gray-800 bg-[#0b0e14] p-4">
        <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">Reloj del partido</p>
        <div className="mb-3 text-center font-mono text-4xl text-white">{formatClock(displaySeconds)}</div>
        <div className="flex gap-2">
          {clockRunning ? (
            <Button onClick={handlePause} isLoading={clockLoading} className="flex-1">Pausar</Button>
          ) : (
            <Button onClick={handleStart} isLoading={clockLoading} className="flex-1">Iniciar</Button>
          )}
          <Button variant="ghost" onClick={handleReset} isLoading={clockLoading}>Reiniciar</Button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-gray-400">Tiempo agregado (min):</span>
          <input
            type="number"
            min={0}
            value={addedMinutes}
            onChange={(e) => handleAddedTime(Number(e.target.value) || 0)}
            className="w-16 rounded-lg border border-gray-800 bg-[#0d1117] px-2 py-1 text-sm text-white outline-hidden focus:border-[var(--color-accent)]"
          />
        </div>
      </div>
    </Card>
  );
}
