import { verifyKey } from "discord-interactions";

export async function verifyDiscordRequest(
  rawBody: string,
  signature: string | null,
  timestamp: string | null
): Promise<boolean> {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey || !signature || !timestamp) return false;
  return verifyKey(rawBody, signature, timestamp, publicKey);
}

const DISCORD_API = "https://discord.com/api/v10";

function botHeaders() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("DISCORD_BOT_TOKEN not configured");
  return { Authorization: `Bot ${token}`, "Content-Type": "application/json" };
}

export type DiscordCommand = {
  name: string;
  description: string;
  options?: {
    name: string;
    description: string;
    type: number; // 3 = STRING
    required?: boolean;
  }[];
};

// Registers global slash commands (propagate up to ~1h). Call once, or
// whenever the command list changes — not on every request.
export async function registerGlobalCommands(commands: DiscordCommand[]) {
  const appId = process.env.DISCORD_APPLICATION_ID;
  if (!appId) throw new Error("DISCORD_APPLICATION_ID not configured");
  const res = await fetch(`${DISCORD_API}/applications/${appId}/commands`, {
    method: "PUT",
    headers: botHeaders(),
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Discord command registration ${res.status}: ${await res.text()}`);
  return res.json();
}

// Posts a message to a channel as the bot — used for admin-triggered
// tournament announcements (manual, never automatic).
export async function postDiscordMessage(channelId: string, content: string) {
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: botHeaders(),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) return { error: `Discord API ${res.status}: ${await res.text()}` };
  return { success: true };
}

// Grants/revokes the "Verificado" role on link/unlink — this is the actual
// anti-raid/anti-bot gate (paired with restricting @everyone in the server
// itself). Best-effort: never throws, so a misconfigured bot never blocks
// the DB-side link/unlink, which is the source of truth.
async function setVerifiedRole(discordUserId: string, method: "PUT" | "DELETE") {
  const guildId = process.env.DISCORD_GUILD_ID;
  const roleId = process.env.DISCORD_VERIFIED_ROLE_ID;
  if (!guildId || !roleId) return { error: "DISCORD_GUILD_ID/DISCORD_VERIFIED_ROLE_ID not configured" };
  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`, {
      method,
      headers: botHeaders(),
    });
    if (!res.ok) return { error: `Discord API ${res.status}: ${await res.text()}` };
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Discord role update failed" };
  }
}

export const assignVerifiedRole = (discordUserId: string) => setVerifiedRole(discordUserId, "PUT");
export const removeVerifiedRole = (discordUserId: string) => setVerifiedRole(discordUserId, "DELETE");
