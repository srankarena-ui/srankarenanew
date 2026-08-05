"use client";

import { castigo } from "@/core/lib/castigos";

/**
 * Barra de victorias/derrotas: el porcentaje manda, los números acompañan.
 * Un 60% con 200 partidas y un 60% con 5 son cosas distintas, y la barra sola
 * no lo distingue.
 */
export function WinLossBar({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  if (!total) return <span className="text-xs text-gray-700">—</span>;

  const pct = Math.round((100 * wins) / total);
  return (
    <div className="min-w-[86px]">
      <div className="flex items-baseline gap-1.5">
        <span className={`text-xs font-bold ${pct >= 50 ? "text-green-400" : "text-red-400"}`}>
          {pct}%
        </span>
        <span className="text-[9px] text-gray-500">
          {wins}V · {losses}D
        </span>
      </div>
      <div className="mt-1 flex h-1 overflow-hidden rounded-full bg-gray-800">
        <div className="bg-green-500/80" style={{ width: `${pct}%` }} />
        <div className="flex-1 bg-red-500/70" />
      </div>
    </div>
  );
}

/**
 * Racha: los puntos de cada partida en orden, como línea. Verde si la última
 * mitad va mejor que la primera, roja si va peor — la pendiente es lo que se
 * lee de un vistazo, no los valores exactos.
 */
export function Sparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) {
    return <span className="text-[9px] text-gray-700">{scores.length ? "1 partida" : "—"}</span>;
  }

  const W = 68, H = 22, PAD = 2;
  const min = Math.min(...scores), max = Math.max(...scores);
  const span = max - min || 1;

  const punto = (v: number, i: number) => {
    const x = PAD + (i * (W - PAD * 2)) / (scores.length - 1);
    const y = H - PAD - ((v - min) / span) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };

  const mitad = Math.floor(scores.length / 2);
  const media = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const subiendo = media(scores.slice(mitad)) >= media(scores.slice(0, mitad));
  const color = subiendo ? "#4ade80" : "#f87171";

  const puntos = scores.map(punto).join(" ");

  return (
    <svg width={W} height={H} className="overflow-visible" aria-hidden>
      {/* Relleno bajo la línea: da volumen sin competir con el trazo */}
      <polygon points={`${PAD},${H} ${puntos} ${W - PAD},${H}`} fill={color} opacity={0.12} />
      <polyline points={puntos} fill="none" stroke={color} strokeWidth={1.5}
                strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={punto(scores[scores.length - 1], scores.length - 1).split(",")[0]}
              cy={punto(scores[scores.length - 1], scores.length - 1).split(",")[1]}
              r={2} fill={color} />
    </svg>
  );
}

/** Castigos pendientes que lleva encima ahora mismo. */
export function CastigosCell({ keys }: { keys: string[] }) {
  if (!keys.length) return <span className="text-xs text-gray-700">—</span>;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {keys.map((key, i) => {
        const c = castigo(key);
        return (
          <span
            key={`${key}-${i}`}
            title={c ? `${c.name} — ${c.how}` : key}
            className="rounded border border-red-500/40 bg-red-950/30 px-1.5 py-0.5 text-[9px] text-red-300"
          >
            {c?.name ?? key}
          </span>
        );
      })}
    </div>
  );
}
