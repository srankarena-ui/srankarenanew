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
  name_localizations?: Record<string, string>;
  description_localizations?: Record<string, string>;
  options?: {
    name: string;
    description: string;
    type: number; // 3 = STRING
    required?: boolean;
    name_localizations?: Record<string, string>;
    description_localizations?: Record<string, string>;
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

// Diagnostics for the admin panel — reads live state directly from Discord's
// API (not our DB), so "is this actually deployed" has a real answer.

export async function getRegisteredCommands(): Promise<{ error: string } | { commands: { name: string; description: string }[] }> {
  const appId = process.env.DISCORD_APPLICATION_ID;
  if (!appId) return { error: "DISCORD_APPLICATION_ID not configured" };
  try {
    const res = await fetch(`${DISCORD_API}/applications/${appId}/commands`, { headers: botHeaders() });
    if (!res.ok) return { error: `Discord API ${res.status}: ${await res.text()}` };
    const commands = (await res.json()) as { name: string; description: string }[];
    return { commands };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Discord API request failed" };
  }
}

export async function getGuildStatus(): Promise<
  { error: string } | { guildName: string; roleFound: boolean; roleName?: string }
> {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) return { error: "DISCORD_GUILD_ID not configured" };
  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}`, { headers: botHeaders() });
    if (!res.ok) return { error: `El bot no tiene acceso al servidor (${res.status}) — ¿fue invitado?` };
    const guild = (await res.json()) as { name: string };

    const roleId = process.env.DISCORD_VERIFIED_ROLE_ID;
    let roleFound = false;
    let roleName: string | undefined;
    if (roleId) {
      const rolesRes = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, { headers: botHeaders() });
      if (rolesRes.ok) {
        const roles = (await rolesRes.json()) as { id: string; name: string }[];
        const role = roles.find((r) => r.id === roleId);
        roleFound = !!role;
        roleName = role?.name;
      }
    }

    return { guildName: guild.name, roleFound, roleName };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Discord API request failed" };
  }
}

// Grants the "Verificado" role after a /verificar captcha succeeds — the
// anti-raid/anti-bot gate (paired with restricting @everyone in the server
// itself). Best-effort: never throws, so a misconfigured bot never blocks
// the underlying flow.
export async function assignVerifiedRole(discordUserId: string) {
  const guildId = process.env.DISCORD_GUILD_ID;
  const roleId = process.env.DISCORD_VERIFIED_ROLE_ID;
  if (!guildId || !roleId) return { error: "DISCORD_GUILD_ID/DISCORD_VERIFIED_ROLE_ID not configured" };
  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`, {
      method: "PUT",
      headers: botHeaders(),
    });
    if (!res.ok) return { error: `Discord API ${res.status}: ${await res.text()}` };
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Discord role update failed" };
  }
}

// DMs the user — used to deliver the /verificar captcha code out-of-band, so
// solving it proves control of the Discord account, not just of the command box.
export async function sendDirectMessage(discordUserId: string, content: string) {
  try {
    const dmChannel = await fetch(`${DISCORD_API}/users/@me/channels`, {
      method: "POST",
      headers: botHeaders(),
      body: JSON.stringify({ recipient_id: discordUserId }),
    });
    if (!dmChannel.ok) return { error: `Discord API ${dmChannel.status}: ${await dmChannel.text()}` };
    const { id: channelId } = (await dmChannel.json()) as { id: string };

    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: botHeaders(),
      body: JSON.stringify({ content }),
    });
    if (!res.ok) return { error: `Discord API ${res.status}: ${await res.text()}` };
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Discord DM failed" };
  }
}
