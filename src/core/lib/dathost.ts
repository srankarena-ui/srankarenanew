// DatHost CS2 Match API client. https://dathost.readme.io/docs/cs2-match-api-introduction
//
// ponytail: exact nested field names (players/settings/webhooks shape) are inferred
// from public docs, not confirmed against a live key. First real match creation should
// be smoke-tested and this file patched if DatHost's actual schema differs.

const DATHOST_BASE = "https://dathost.net/api/0.1";

function authHeader() {
  const key = process.env.DATHOST_API_KEY;
  if (!key) throw new Error("DATHOST_API_KEY not configured");
  // DatHost's REST API uses HTTP Basic auth with the API key as username, no password.
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

export type Cs2MatchPlayer = { steam_id_64: string; team: "team1" | "team2"; nickname?: string };

export type Cs2CreateMatchResult = { id: string; connect_url: string | null };

export async function createCs2Match(opts: {
  gameServerId: string;
  players: Cs2MatchPlayer[];
  team1Name?: string;
  team2Name?: string;
  map: string;
  webhookUrl: string;
}): Promise<{ data: Cs2CreateMatchResult } | { error: string }> {
  const res = await fetch(`${DATHOST_BASE}/cs2-matches`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      game_server_id: opts.gameServerId,
      players: opts.players,
      team1: opts.team1Name ? { name: opts.team1Name } : undefined,
      team2: opts.team2Name ? { name: opts.team2Name } : undefined,
      settings: { map: opts.map },
      webhooks: { match_end_url: opts.webhookUrl, round_end_url: opts.webhookUrl },
    }),
  });

  if (!res.ok) return { error: `DatHost API ${res.status}: ${await res.text()}` };
  const data = await res.json() as { id: string; connect_url?: string };
  return { data: { id: data.id, connect_url: data.connect_url ?? null } };
}

// DatHost's webhook payload for match_end. Field names are the same best-effort inference
// noted above — verify against a real payload before relying on this in production.
export type Cs2WebhookPayload = {
  id: string;
  finished?: boolean;
  team1?: { score?: number };
  team2?: { score?: number };
  winner?: { team?: "team1" | "team2" };
};
