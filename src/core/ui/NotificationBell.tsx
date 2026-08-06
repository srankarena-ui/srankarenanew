"use client";

import { useEffect, useRef, useState } from "react";

interface Aviso {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

/** "hace 3 min", "hace 2 h", "hace 4 d" — más útil que una fecha exacta aquí. */
function hace(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "ahora";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
}

/**
 * Campana de avisos. Lee de /api/me/inbox, la misma fuente que consultará el
 * cliente de escritorio — así no hay dos sistemas de avisos en paralelo.
 *
 * Sin sondeo: se consulta al montar y al abrir el panel. Un intervalo por
 * pestaña abierta cuesta más de lo que aporta cuando el aviso más urgente
 * —un castigo— se cumple en la siguiente partida, no en los próximos treinta
 * segundos. Cuando exista el cliente de escritorio, ese sí sondea.
 */
export function NotificationBell({ locale }: { locale: string }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [abierto, setAbierto] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  const noLeidos = avisos.filter((a) => !a.read_at).length;

  async function cargar() {
    try {
      const res = await fetch("/api/me/inbox");
      if (!res.ok) return;
      const data = await res.json();
      setAvisos(data.avisos ?? []);
    } catch {
      // Sin conexión la campana simplemente no se actualiza; no hay nada que
      // decirle al usuario que no vea ya en el resto de la página.
    }
  }

  useEffect(() => { cargar(); }, []);

  // Cerrar al pulsar fuera. Sin esto el panel se queda abierto tapando la barra.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (panel.current && !panel.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  async function abrir() {
    const abriendo = !abierto;
    setAbierto(abriendo);
    if (!abriendo) return;

    await cargar();
    if (noLeidos === 0) return;

    // Optimista: se pintan leídos ya y se avisa al servidor. Si la petición
    // falla, la próxima carga los devuelve a no leídos.
    setAvisos((prev) => prev.map((a) => ({ ...a, read_at: a.read_at ?? new Date().toISOString() })));
    fetch("/api/me/inbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .catch(() => {});
  }

  return (
    <div className="relative" ref={panel}>
      <button
        type="button"
        onClick={abrir}
        aria-label={noLeidos ? `${noLeidos} avisos sin leer` : "Avisos"}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {noLeidos > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[9px] font-bold text-white">
            {noLeidos > 9 ? "9+" : noLeidos}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[#121620] shadow-xl">
          <p className="border-b border-[var(--color-border)] px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-gray-500">
            Avisos
          </p>

          {avisos.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-gray-600">No tienes avisos.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {avisos.map((a) => {
                const contenido = (
                  <>
                    <p className="text-xs font-bold leading-snug text-white">{a.title}</p>
                    {a.body && <p className="mt-0.5 text-[10px] leading-relaxed text-gray-400">{a.body}</p>}
                    <p className="mt-1 text-[9px] text-gray-600">{hace(a.created_at)}</p>
                  </>
                );
                const clases = `block border-b border-gray-800/60 px-4 py-3 last:border-0 ${
                  a.read_at ? "" : "bg-[var(--color-accent)]/5"
                } ${a.link ? "transition-colors hover:bg-gray-800/40" : ""}`;

                return (
                  <li key={a.id}>
                    {a.link ? (
                      <a href={a.link.startsWith("/") ? a.link : `/${locale}${a.link}`} className={clases}>
                        {contenido}
                      </a>
                    ) : (
                      <div className={clases}>{contenido}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
