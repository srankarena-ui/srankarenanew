"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/core/supabase/browser";
import { castigo, REJECTION_PENALTY } from "@/core/lib/castigos";

interface Pendiente {
  id: string;
  key: string;
}

/**
 * Aviso de castigo sin decidir, arriba de la clasificación.
 *
 * Mientras no responda, sus partidas nuevas no cuentan para el torneo. No es
 * una penalización sino una pausa, así que hay que decirlo claro o parecerá un
 * error cuando su progreso deje de subir.
 */
export function CastigoPendiente({ userId }: { userId: string }) {
  const router = useRouter();
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("challenge_assignments")
      .select("id, challenges(conditions)")
      .eq("user_id", userId)
      .eq("status", "pending")
      .then(({ data }) => {
        if (cancelled || !data) return;
        const filas = data as Array<{ id: string; challenges: { conditions: unknown } | null }>;
        setPendientes(
          filas
            .map((a) => ({ id: a.id, key: (a.challenges?.conditions as { key?: string })?.key ?? "" }))
            .filter((p) => p.key)
        );
      });
    return () => { cancelled = true; };
  }, [userId]);

  if (!pendientes.length) return null;

  const actual = pendientes[0];
  const c = castigo(actual.key);

  async function responder(accept: boolean) {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/castigos/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: actual.id, accept }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "No se pudo responder");
        setEnviando(false);
        return;
      }
      setPendientes((prev) => prev.slice(1));
      setEnviando(false);
      router.refresh();
    } catch {
      setError("Fallo de red");
      setEnviando(false);
    }
  }

  return (
    <div className="rounded-xl border border-red-500/40 bg-red-950/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-red-400">
            Tienes un castigo sin decidir
            {pendientes.length > 1 && ` · ${pendientes.length} en total`}
          </p>
          <p className="mt-1 text-sm font-bold text-white">{c?.name ?? actual.key}</p>
          {c && <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{c.how}</p>}
          <p className="mt-2 text-[10px] leading-relaxed text-gray-500">
            Hasta que respondas, <span className="text-gray-300">tus partidas nuevas no cuentan</span>{" "}
            para el torneo. Si aceptas, cuenta la primera partida que empieces a partir de
            entonces. Si rechazas, se cierra y pierdes {REJECTION_PENALTY} puntos.
          </p>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => responder(true)}
            disabled={enviando}
            className="rounded-xl bg-[var(--color-accent)] px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
          >
            Aceptar
          </button>
          <button
            onClick={() => responder(false)}
            disabled={enviando}
            className="rounded-xl border border-gray-700 px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-gray-400 transition-colors hover:border-red-500/60 hover:text-red-400 disabled:opacity-50"
          >
            Rechazar −{REJECTION_PENALTY}
          </button>
        </div>
      </div>
    </div>
  );
}
