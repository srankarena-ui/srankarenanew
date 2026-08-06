import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAuthedRequest } from "@/core/lib/require-auth";
import { rollCastigo, DIAS_RECIENTES, type CastigoParams } from "@/core/lib/castigos";
import { championCatalog } from "@/core/lib/ddragon-items";
import { notify, NOTIFICATION_TYPES } from "@/core/lib/notify";
import type { Database } from "@/core/types/database";

/**
 * Gastar un sello para imponerle un castigo a otro participante.
 *
 * El castigo lo sortea el servidor, no lo elige quien lanza: si lo eligiera,
 * siempre caería el más duro sobre el rival más incómodo. El sorteo se filtra
 * por el rol del castigado — ver castigos.ts.
 *
 * Todo con service role tras validar: el saldo y el gasto no pueden depender de
 * lo que diga el navegador.
 */
export async function POST(request: NextRequest) {
  // 10 por minuto: gastar un sello es raro, y limita el daño si alguien
  // automatiza la llamada.
  const auth = await requireAuthedRequest("seal-throw", 10, 60);
  if ("response" in auth) return auth.response;

  const { tournamentId, targetUserId } = await request.json().catch(() => ({}));
  if (!tournamentId || !targetUserId) {
    return NextResponse.json({ error: "Faltan tournamentId y targetUserId" }, { status: 400 });
  }
  if (targetUserId === auth.userId) {
    return NextResponse.json({ error: "No puedes lanzarte un sello a ti mismo" }, { status: 400 });
  }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // El objetivo tiene que estar inscrito en ESE torneo, no en cualquiera.
  const { data: target } = await admin
    .from("summoner_trials_enrollments")
    .select("user_id, stats_snapshot, puuid, region")
    .eq("tournament_id", tournamentId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: "Ese jugador no está inscrito en el torneo" }, { status: 404 });
  }

  // Un castigo a la vez por persona. No es un enfriamiento por tiempo: mientras
  // tenga uno sin resolver no puede recibir otro, y se libera al cumplirlo o
  // rechazarlo. Así nadie se lleva diez seguidos, y no hace falta ni temporizador
  // ni tabla — el estado ya está aquí.
  //
  // Se comprueba antes de reservar el sello: cobrarlo y luego rechazar el
  // lanzamiento sería quitarle munición a quien no ha lanzado nada.
  const { data: activo } = await admin
    .from("challenge_assignments")
    .select("id")
    .eq("user_id", targetUserId)
    .in("status", ["pending", "accepted"])
    .limit(1)
    .maybeSingle();

  if (activo) {
    return NextResponse.json(
      { error: "Ya tiene un castigo activo. Podrás lanzarle otro cuando lo cumpla o lo rechace." },
      { status: 409 }
    );
  }

  // Se reserva el sello ANTES de crear nada. Al revés quedaban castigos
  // impuestos sin sello detrás cuando dos peticiones competían.
  //
  // El `is("spent_at", null)` dentro del update es lo que hace la reserva
  // atómica: si otra petición se adelantó, este update afecta a 0 filas y se
  // prueba con el siguiente sello en vez de fallar. Antes devolvía 409, y como
  // el navegador manda dos peticiones por clic en desarrollo, saltaba siempre.
  const reservado = await reservarSello(admin, auth.userId, targetUserId);
  if (!reservado) {
    return NextResponse.json({ error: "No tienes sellos sin gastar" }, { status: 400 });
  }

  const snapshot = target.stats_snapshot as { role?: string } | null;

  // Si el sorteo saca uno que necesita maestría y esa consulta falla, se vuelve
  // a girar sin él: mejor otro castigo que uno que luego no se puede comprobar.
  let elegido = rollCastigo(snapshot?.role ?? null);
  let params: CastigoParams = {};

  if (elegido.needsMastery) {
    const apiKey = process.env.RIOT_API_KEY;
    const congelado = apiKey
      ? await congelarParams(target.region, target.puuid, apiKey, elegido.key)
      : null;
    if (congelado) params = congelado;
    else elegido = rollCastigo(snapshot?.role ?? null, Math.random, true);
  }

  const { data: challenge, error: challengeError } = await admin
    .from("challenges")
    .insert({
      tournament_id: tournamentId,
      title: elegido.name,
      description: elegido.how,
      // `params` guarda lo congelado al imponerlo —el campeón sorteado, los
      // vetados por maestría—, que es lo que permite comprobarlo después.
      conditions: { type: "castigo", key: elegido.key, params } as unknown as Database["public"]["Tables"]["challenges"]["Insert"]["conditions"],
      created_by: auth.userId,
    })
    .select("id")
    .single();

  if (challengeError || !challenge) {
    // Devolver el sello: no se le cobra por un castigo que no llegó a existir.
    await admin.from("seals").update({ spent_at: null, spent_on: null }).eq("id", reservado);
    return NextResponse.json({ error: "No se pudo crear el castigo" }, { status: 500 });
  }

  await admin.from("challenge_assignments").insert({
    challenge_id: challenge.id,
    user_id: targetUserId,
  });

  await admin.from("seals").update({ challenge_id: challenge.id }).eq("id", reservado);

  // Sin esto el castigado no se enteraba salvo que abriese la clasificación y
  // mirase su propia fila.
  const [quien, aQuien] = await Promise.all([
    nombre(admin, auth.userId),
    nombre(admin, targetUserId),
  ]);
  const link = `/es/tournaments/${tournamentId}?tab=leaderboard`;

  await notify(admin, [
    {
      userId: targetUserId,
      type: NOTIFICATION_TYPES.castigoRecibido,
      title: `${quien} te ha aplicado un sello: ${elegido.name}`,
      body: elegido.how,
      link,
    },
    {
      userId: auth.userId,
      type: NOTIFICATION_TYPES.castigoLanzado,
      title: `Le has aplicado un sello a ${aQuien}: ${elegido.name}`,
      body: elegido.how,
      link,
    },
  ]);

  return NextResponse.json({ castigo: elegido, params });
}

/**
 * Congela lo que el castigo necesite para poder comprobarse después.
 *
 * Una sola petición de maestría lo resuelve todo: da los campeones que ha
 * jugado (para sortear uno), los que pasan de 5.000 puntos, y su top 3.
 * Congelarlo aquí es lo que lo hace verificable — la maestría sube al jugar, y
 * mirarla después daría un resultado distinto según cuándo se mire.
 */
async function congelarParams(
  region: string,
  puuid: string,
  apiKey: string,
  castigoKey: string
): Promise<CastigoParams | null> {
  const res = await fetch(
    `https://${region}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}`,
    { headers: { "X-Riot-Token": apiKey } }
  );
  if (!res.ok) return null;

  const masteries = (await res.json()) as Array<{ championId: number; championPoints: number; lastPlayTime: number }>;

  // Solo lo jugado últimamente. El top de maestría es acumulado de siempre, así
  // que sin este filtro «tus tres más jugados» puede vetarle campeones que no
  // toca hace meses — comprobado en una cuenta real: uno del top llevaba 112
  // días sin jugarse, y el castigo salía gratis.
  const corte = Date.now() - DIAS_RECIENTES * 86400_000;
  const recientes = masteries.filter((m) => (m.lastPlayTime ?? 0) >= corte);
  const nombres = await championCatalog();
  const nombre = (id: number) => nombres.get(id);

  if (castigoKey === "campeon_aleatorio") {
    // Solo entre los que ha jugado alguna vez: asignarle uno que no tiene
    // convertiría el castigo en imposible.
    const suyos = masteries
      .filter((m) => m.championPoints > 0)
      .map((m) => nombre(m.championId))
      .filter((n): n is string => !!n);
    if (!suyos.length) return null;
    return { campeon: suyos[Math.floor(Math.random() * suyos.length)] };
  }

  if (castigoKey === "campeon_bajo") {
    return {
      vetados: masteries
        .filter((m) => m.championPoints >= 5000)
        .map((m) => nombre(m.championId))
        .filter((n): n is string => !!n),
    };
  }

  if (castigoKey === "sin_tus_tres") {
    return {
      vetados: [...(recientes.length >= 3 ? recientes : masteries)]
        .sort((a, b) => b.championPoints - a.championPoints)
        .slice(0, 3)
        .map((m) => nombre(m.championId))
        .filter((n): n is string => !!n),
    };
  }

  return {};
}

/** Nombre para el texto del aviso; el id crudo no le dice nada a nadie. */
async function nombre(
  admin: ReturnType<typeof createAdminClient<Database>>,
  userId: string
): Promise<string> {
  const { data } = await admin.from("profiles").select("username").eq("id", userId).maybeSingle();
  return data?.username ?? "Alguien";
}

/** Reserva un sello sin gastar del usuario. Devuelve su id, o null si no tiene. */
async function reservarSello(
  admin: ReturnType<typeof createAdminClient<Database>>,
  userId: string,
  targetUserId: string
): Promise<string | null> {
  // Se prueban varios porque perder la carrera una vez no significa quedarse
  // sin munición: puede haber 99 más detrás.
  for (let intento = 0; intento < 5; intento++) {
    const { data: seal } = await admin
      .from("seals")
      .select("id")
      .eq("user_id", userId)
      .is("spent_at", null)
      .order("earned_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!seal) return null;

    const { data: claimed } = await admin
      .from("seals")
      .update({ spent_at: new Date().toISOString(), spent_on: targetUserId })
      .eq("id", seal.id)
      .is("spent_at", null)
      .select("id");

    if (claimed?.length) return seal.id;
  }
  return null;
}
