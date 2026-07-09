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
