"use client";

import { useEffect, useState } from "react";
import { CASTIGOS, castigosParaRol, type Castigo } from "@/core/lib/castigos";

/**
 * Ruleta de castigo. Gira mientras el servidor decide, y para en el que ha
 * salido de verdad — el giro es adorno, el sorteo es del backend. Si se
 * decidiera aquí, cualquiera lo repetiría hasta sacar el más suave.
 */
export function SealThrowModal({
  tournamentId,
  target,
  onClose,
  onDone,
}: {
  tournamentId: string;
  target: { userId: string; username: string; role: string | null };
  onClose: () => void;
  onDone: () => void;
}) {
  const [girando, setGirando] = useState(true);
  const [visible, setVisible] = useState<Castigo>(CASTIGOS[0]);
  const [final, setFinal] = useState<Castigo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // El nombre va cambiando mientras se espera. Solo entre los que le pueden
  // tocar a ese rol, para no enseñar uno que nunca podría salirle.
  useEffect(() => {
    if (!girando) return;
    const pool = castigosParaRol(target.role);
    const t = setInterval(() => {
      setVisible(pool[Math.floor(Math.random() * pool.length)]);
    }, 80);
    return () => clearInterval(t);
  }, [girando, target.role]);

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();

    fetch("/api/seals/throw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournamentId, targetUserId: target.userId }),
    })
      .then(async (res) => {
        const body = await res.json();
        if (cancelled) return;
        // Giro mínimo de 1,2 s aunque el servidor conteste al instante: sin él
        // la ruleta parpadea y no se ve.
        const espera = Math.max(0, 1200 - (Date.now() - started));
        setTimeout(() => {
          if (cancelled) return;
          setGirando(false);
          if (!res.ok) setError(body.error ?? "No se pudo lanzar el sello");
          else { setFinal(body.castigo); onDone(); }
        }, espera);
      })
      .catch(() => { if (!cancelled) { setGirando(false); setError("Fallo de red"); } });

    return () => { cancelled = true; };
  }, [tournamentId, target.userId, onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={final || error ? onClose : undefined}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-gray-800 bg-[#121620] p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Sello sobre</p>
        <p className="mb-5 text-lg font-bold text-white">{target.username}</p>

        {error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <>
            <div
              className={`rounded-xl border px-4 py-6 transition-colors ${
                girando
                  ? "border-gray-800 bg-[#0b0e14]"
                  : "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
              }`}
            >
              <p
                className={`text-xl font-bold ${
                  girando ? "text-gray-500 blur-[1px]" : "text-[var(--color-accent)]"
                }`}
              >
                {(final ?? visible).name}
              </p>
              {final && <p className="mt-2 text-xs leading-relaxed text-gray-400">{final.how}</p>}
            </div>

            {girando && <p className="mt-4 text-[10px] text-gray-600">Girando…</p>}
            {final && (
              <p className="mt-4 text-[10px] leading-relaxed text-gray-600">
                Lo tendrá que cumplir en su siguiente partida del torneo.
              </p>
            )}
          </>
        )}

        {(final || error) && (
          <button
            onClick={onClose}
            className="mt-5 w-full rounded-xl bg-[var(--color-accent)] py-2.5 text-[10px] uppercase tracking-[0.2em] text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            Cerrar
          </button>
        )}
      </div>
    </div>
  );
}
