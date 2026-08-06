"use client";

import { useEffect, useRef, useState } from "react";
import { CASTIGOS, castigosParaRol, type Castigo } from "@/core/lib/castigos";

// Campeones para el giro de la segunda ruleta. No hace falta la lista real de
// Data Dragon: son los que pasan borrosos durante segundo y medio, y el que de
// verdad toca lo manda el servidor.
const CARAS = [
  "Ahri", "Darius", "Jinx", "Lee Sin", "Lux", "Thresh", "Yasuo", "Zed",
  "Ekko", "Vi", "Kai'Sa", "Garen", "Morgana", "Riven", "Sett", "Ashe",
];

/**
 * Segunda ruleta: solo aparece si el castigo es "campeón aleatorio". Gira sobre
 * nombres cualesquiera y para en el que decidió el servidor, sorteado entre los
 * campeones que el castigado ha jugado alguna vez.
 */
function RuletaCampeon({ campeon }: { campeon: string }) {
  const [girando, setGirando] = useState(true);
  const [cara, setCara] = useState(CARAS[0]);

  useEffect(() => {
    const t = setInterval(() => setCara(CARAS[Math.floor(Math.random() * CARAS.length)]), 70);
    const fin = setTimeout(() => { clearInterval(t); setGirando(false); }, 1500);
    return () => { clearInterval(t); clearTimeout(fin); };
  }, []);

  return (
    <div className="mt-3 rounded-xl border border-gray-800 bg-[#0b0e14] px-4 py-4">
      <p className="text-[9px] uppercase tracking-[0.2em] text-gray-600">Te toca jugar</p>
      <div className="mt-2 flex items-center justify-center gap-2.5">
        {!girando && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`https://cdn.communitydragon.org/latest/champion/${campeon}/square`}
            alt=""
            className="h-9 w-9 rounded"
          />
        )}
        <p className={`text-lg font-bold ${girando ? "text-gray-500 blur-[1px]" : "text-white"}`}>
          {girando ? cara : campeon}
        </p>
      </div>
    </div>
  );
}

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
  const [campeon, setCampeon] = useState<string | null>(null);

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

  // React monta los efectos dos veces en desarrollo, y aquí el efecto GASTA un
  // sello: sin esta guardia, cada clic lanzaba dos castigos y cobraba dos.
  // `cancelled` no basta — solo ignora la respuesta, la petición ya salió.
  const lanzado = useRef(false);

  useEffect(() => {
    if (lanzado.current) return;
    lanzado.current = true;

    const started = Date.now();

    // Sin bandera de cancelación a propósito. La había, y el desmontaje falso
    // de React la ponía a true antes de que llegara la respuesta: la petición
    // sí salía, pero el resultado se descartaba y la ruleta giraba para
    // siempre. Escribir estado tras desmontar es inocuo en React 18, y aquí el
    // modal solo se desmonta al cerrarlo.
    fetch("/api/seals/throw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournamentId, targetUserId: target.userId }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        // Giro mínimo de 1,2 s aunque el servidor conteste al instante: sin él
        // la ruleta parpadea y no se ve.
        const espera = Math.max(0, 1200 - (Date.now() - started));
        setTimeout(() => {
          setGirando(false);
          if (!res.ok) setError(body.error ?? "No se pudo lanzar el sello");
          else { setFinal(body.castigo); setCampeon(body.params?.campeon ?? null); onDone(); }
        }, espera);
      })
      .catch(() => {
        setGirando(false);
        setError("Fallo de red");
      });
    // Solo debe correr al montar: el ref ya lo garantiza, y meter dependencias
    // aquí no cambiaría nada salvo confundir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

            {/* Segunda ruleta: si el castigo es "campeón aleatorio", el que le
                toca ya lo decidió el servidor; esto solo lo revela girando. */}
            {final && campeon && <RuletaCampeon campeon={campeon} />}

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
