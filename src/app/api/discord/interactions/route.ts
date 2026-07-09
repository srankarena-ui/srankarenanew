import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { InteractionType, InteractionResponseType } from "discord-interactions";
import { verifyDiscordRequest, assignVerifiedRole } from "@/core/lib/discord";
import { getRankForXp } from "@/core/lib/ranks";
import { formatTag } from "@/core/lib/tag";
import type { Database } from "@/core/types/database";

const EPHEMERAL = 64; // message flags: only visible to the user who ran the command

function getAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function reply(content: string) {
  return NextResponse.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: EPHEMERAL },
  });
}

type DiscordOption = { name: string; value: string };
type DiscordInteraction = {
  type: number;
  member?: { user: { id: string } };
  user?: { id: string };
  data?: { name: string; options?: DiscordOption[] };
};

async function handleVincular(discordUserId: string, code: string) {
  const supabase = getAdminClient();

  const { data: challenge } = await supabase
    .from("discord_link_challenges")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .is("verified_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!challenge) return reply("❌ Código inválido o expirado. Genera uno nuevo desde Ajustes en la web.");

  const { error } = await supabase
    .from("profiles")
    .update({ discord_id: discordUserId })
    .eq("id", challenge.user_id);

  if (error) {
    if (error.code === "23505") return reply("❌ Este Discord ya está vinculado a otra cuenta de S-Rank Arena.");
    return reply(`❌ Error: ${error.message}`);
  }

  await supabase
    .from("discord_link_challenges")
    .update({ verified_at: new Date().toISOString() })
    .eq("user_id", challenge.user_id);

  const roleResult = await assignVerifiedRole(discordUserId);
  if ("error" in roleResult) {
    return reply("✅ ¡Cuenta vinculada! ⚠️ No pude asignarte el rol automáticamente — avisa a un admin.");
  }

  return reply("✅ ¡Cuenta vinculada! Ya puedes usar /perfil.");
}

async function handlePerfil(discordUserId: string) {
  const supabase = getAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, discriminator, experience, dota2_account_id, riot_gamename")
    .eq("discord_id", discordUserId)
    .maybeSingle();

  if (!profile) return reply("❌ No tienes tu cuenta vinculada. Usa `/vincular` con el código de Ajustes en la web.");

  const rank = getRankForXp(profile.experience ?? 0);
  const lines = [
    `**${formatTag(profile.username, profile.discriminator)}**`,
    `Rango: **${rank.rank}** · XP: **${profile.experience ?? 0}**`,
  ];
  if (profile.riot_gamename) lines.push(`LoL: ${profile.riot_gamename}`);
  if (profile.dota2_account_id) lines.push(`Dota 2: vinculado`);

  return reply(lines.join("\n"));
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("X-Signature-Ed25519");
  const timestamp = request.headers.get("X-Signature-Timestamp");

  const valid = await verifyDiscordRequest(rawBody, signature, timestamp);
  if (!valid) return new NextResponse("Invalid request signature", { status: 401 });

  const interaction = JSON.parse(rawBody) as DiscordInteraction;

  if (interaction.type === InteractionType.PING) {
    return NextResponse.json({ type: InteractionResponseType.PONG });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const discordUserId = interaction.member?.user.id ?? interaction.user?.id;
    if (!discordUserId) return reply("❌ No se pudo identificar tu usuario de Discord.");

    const name = interaction.data?.name;
    if (name === "vincular") {
      const code = interaction.data?.options?.find((o) => o.name === "codigo")?.value ?? "";
      return handleVincular(discordUserId, code);
    }
    if (name === "perfil") {
      return handlePerfil(discordUserId);
    }
    return reply("❌ Comando no reconocido.");
  }

  return new NextResponse("Unhandled interaction type", { status: 400 });
}
