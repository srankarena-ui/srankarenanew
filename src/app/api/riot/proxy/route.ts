import { NextRequest, NextResponse } from "next/server";
import { requireAuthedRequestFlexible } from "@/core/lib/require-auth";

/**
 * Pasarela hacia la API de Riot para el cliente de escritorio.
 *
 * Existe para que el overlay de streamer no necesite que cada usuario meta su
 * propia clave de desarrollador —que caduca cada 24 horas y es un incordio— ni
 * que le mandemos la de la plataforma: es una sola clave para todos, y en
 * veinte máquinas cualquiera podría quemar el límite o filtrarla.
 *
 * Solo reenvía. No interpreta ni transforma nada.
 */

// Lista blanca. Sin ella esto sería un proxy abierto: cualquiera con cuenta
// podría hacer que nuestro servidor pidiera lo que quisiera a donde quisiera.
const HOST_VALIDO = /^[a-z0-9-]+\.api\.riotgames\.com$/;
const RUTAS_VALIDAS = [
  "/riot/account/v1/",
  "/lol/summoner/v4/",
  "/lol/league/v4/",
  "/lol/league-exp/v4/",
  "/lol/match/v5/",
  "/lol/champion-mastery/v4/",
  "/lol/challenges/v1/",
  "/lol/spectator/v5/",
];

export async function GET(request: NextRequest) {
  // El límite es por usuario: el overlay consulta el rango cada pocos minutos,
  // pero varios streamers a la vez comparten la cuota de la plataforma.
  const auth = await requireAuthedRequestFlexible(request, "riot-proxy", 60, 60);
  if ("response" in auth) return auth.response;

  const crudo = request.nextUrl.searchParams.get("url");
  if (!crudo) return NextResponse.json({ error: "Falta url" }, { status: 400 });

  let destino: URL;
  try {
    destino = new URL(crudo);
  } catch {
    return NextResponse.json({ error: "url inválida" }, { status: 400 });
  }

  if (destino.protocol !== "https:" || !HOST_VALIDO.test(destino.hostname)) {
    return NextResponse.json({ error: "Host no permitido" }, { status: 403 });
  }
  if (!RUTAS_VALIDAS.some((r) => destino.pathname.startsWith(r))) {
    return NextResponse.json({ error: "Ruta no permitida" }, { status: 403 });
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Sin clave de Riot" }, { status: 500 });

  const res = await fetch(destino.toString(), { headers: { "X-Riot-Token": apiKey } });
  const cuerpo = await res.text();

  // Se devuelve el estado tal cual: el overlay ya sabe distinguir un 404 (sin
  // rango) de un 429 (límite), y traducirlo aquí le quitaría esa información.
  return new NextResponse(cuerpo, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}
