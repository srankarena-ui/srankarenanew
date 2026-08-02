// Piezas server-side compartidas por el reporte en vivo (/api/challenges/report)
// y el job post-partida (/api/challenges/sync): resolver el PUUID del usuario,
// pedir maestría a Riot y registrar un reto cumplido.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/core/types/database";
import { getRiotCluster } from "@/core/lib/riot-regions";

export function getAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type AdminClient = ReturnType<typeof getAdminClient>;

export interface RiotIdentity {
  puuid: string;
  region: string;
}

// El PUUID ya vive en profiles (se guarda al vincular la cuenta). Solo si falta
// se re-resuelve con Account-V1 y se cachea, para no gastar rate limit en cada
// reporte — la key personal tiene poco margen.
export async function resolveRiotIdentity(
  admin: AdminClient,
  userId: string,
  apiKey: string
): Promise<RiotIdentity | null> {
  const { data: profile } = await admin
    .from("profiles")
    .select("riot_puuid, lol_region, riot_gamename, riot_tagline")
    .eq("id", userId)
    .single();

  if (!profile) return null;

  const region = profile.lol_region || "na1";
  if (profile.riot_puuid) return { puuid: profile.riot_puuid, region };

  if (!profile.riot_gamename || !profile.riot_tagline) return null;

  const url = `https://${getRiotCluster(region)}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/`
    + `${encodeURIComponent(profile.riot_gamename)}/${encodeURIComponent(profile.riot_tagline)}`;
  const res = await fetch(url, { headers: { "X-Riot-Token": apiKey } });
  if (!res.ok) return null;

  const account = (await res.json()) as { puuid?: string };
  if (!account.puuid) return null;

  await admin.from("profiles").update({ riot_puuid: account.puuid }).eq("id", userId);
  return { puuid: account.puuid, region };
}

// Data Dragon: nombre de campeón → id numérico. Es lo único que necesita el id;
// tanto la Live Client Data API como match-v5 hablan por nombre.
// ponytail: caché en memoria del proceso, se rehace en cada deploy/arranque en
// frío. Si algún día molesta, moverlo a la tabla de games o a Edge Config.
let championIds: Promise<Map<string, number>> | null = null;

function loadChampionIds(): Promise<Map<string, number>> {
  return (async () => {
    const versionsRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    const versions = (await versionsRes.json()) as string[];
    const res = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${versions[0]}/data/en_US/champion.json`
    );
    const json = (await res.json()) as { data: Record<string, { key: string }> };
    return new Map(Object.entries(json.data).map(([name, c]) => [name, Number(c.key)]));
  })();
}

export async function resolveChampionId(champion: string): Promise<number | null> {
  championIds ??= loadChampionIds();
  try {
    return (await championIds).get(champion) ?? null;
  } catch {
    championIds = null; // que el próximo intento vuelva a probar
    return null;
  }
}

// Puntos de maestría del campeón. null = no se pudo consultar (red, 429, key
// vencida): quien llame debe tratarlo como error, no como "no cumple".
export async function fetchMasteryPoints(
  identity: RiotIdentity,
  champion: string,
  apiKey: string
): Promise<number | null> {
  const championId = await resolveChampionId(champion);
  if (championId === null) return null;

  const url = `https://${identity.region}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries`
    + `/by-puuid/${identity.puuid}/by-champion/${championId}`;
  const res = await fetch(url, { headers: { "X-Riot-Token": apiKey } });

  // Sin maestría en ese campeón Riot responde 404 — es 0 puntos, no un fallo.
  if (res.status === 404) return 0;
  if (!res.ok) return null;

  const mastery = (await res.json()) as { championPoints?: number };
  return mastery.championPoints ?? 0;
}

export interface CompletionInput {
  challengeId: string;
  userId: string;
  assignmentId: string;
  riotGameId: number;
  evidence: Record<string, unknown>;
  verified: boolean;
  source: "live" | "match_history";
}

// Registra el cumplimiento y cierra la asignación. El unique
// (challenge_id, user_id, riot_game_id) hace idempotente el polling del
// cliente, que reporta la misma partida en cada tick mientras dura.
export async function recordCompletion(admin: AdminClient, input: CompletionInput) {
  await admin.from("challenge_completions").upsert(
    {
      challenge_id: input.challengeId,
      user_id: input.userId,
      assignment_id: input.assignmentId,
      riot_game_id: input.riotGameId,
      evidence: input.evidence as never,
      verified: input.verified,
      source: input.source,
    },
    { onConflict: "challenge_id,user_id,riot_game_id", ignoreDuplicates: true }
  );

  await admin
    .from("challenge_assignments")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", input.assignmentId)
    .eq("status", "pending");
}
