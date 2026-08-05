"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

/**
 * Pestaña activa guardada en la URL en vez de en memoria: así cada pestaña de
 * un torneo tiene enlace propio, se puede compartir, recargar y volver atrás.
 *
 * El valor por defecto no se escribe en la URL — /torneos/x y /torneos/x?tab=
 * overview son la misma página y no conviene tener dos direcciones para ella.
 */
export function useTabParam<T extends string>(
  key: string,
  valid: readonly T[],
  fallback: T
): readonly [T, (tab: T) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const raw = params.get(key) as T | null;
  // Una pestaña inventada a mano en la URL cae en la de por defecto.
  const active = raw && valid.includes(raw) ? raw : fallback;

  const set = (tab: T) => {
    const next = new URLSearchParams(params.toString());
    if (tab === fallback) next.delete(key);
    else next.set(key, tab);
    const qs = next.toString();
    // push y no replace: el botón atrás debe deshacer el cambio de pestaña.
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return [active, set] as const;
}
