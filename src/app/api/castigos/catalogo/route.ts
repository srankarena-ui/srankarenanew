import { NextResponse } from "next/server";
import { CASTIGOS_VERIFICABLES } from "@/core/lib/castigos";

/**
 * Los castigos que pueden tocarte, para pintarlos donde haga falta.
 *
 * Existe para que la ruleta del overlay gire con los nombres de verdad. La
 * alternativa era copiar la lista dentro del overlay, y a la primera que se
 * añada o se quite un castigo la copia mentiría sin que nadie se entere.
 *
 * No lleva `verify` ni nada que revele cómo se comprueba: es lo que se enseña
 * en pantalla, nada más. `dureza` va porque la ruleta pesará con ella.
 */
export const revalidate = 3600;  // cambia con cada despliegue, no cada minuto

export function GET() {
  return NextResponse.json({
    castigos: CASTIGOS_VERIFICABLES.map((c) => ({
      key: c.key,
      name: c.name,
      dureza: c.dureza,
    })),
  });
}
