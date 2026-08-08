import { NextResponse } from "next/server";
import { itemCatalog } from "@/core/lib/ddragon-items";
import { TOPE_PRESUPUESTO } from "@/core/lib/castigos";

/**
 * Los objetos que «Presupuesto ajustado» no deja terminar en el inventario.
 *
 * Sale del mismo catálogo que usa la comprobación, así que la lista y el
 * veredicto no pueden discrepar. Con una lista escrita a mano, un objeto nuevo
 * o un reajuste de precios la dejaría mintiendo durante parches, y el jugador
 * perdería puntos por comprar algo que la lista no marcaba.
 *
 * La usa el cliente de escritorio para dejarle al jugador un conjunto de
 * objetos en la tienda de League con todo lo prohibido.
 */
export const revalidate = 3600;

export async function GET() {
  const { precio, enTienda } = await itemCatalog();

  const ids = [...enTienda]
    .filter((id) => (precio.get(id) ?? 0) > TOPE_PRESUPUESTO)
    .sort((a, b) => (precio.get(a) ?? 0) - (precio.get(b) ?? 0));

  return NextResponse.json({ tope: TOPE_PRESUPUESTO, ids });
}
