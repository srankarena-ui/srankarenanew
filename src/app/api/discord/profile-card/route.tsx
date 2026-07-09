import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { getRankForXp } from "@/core/lib/ranks";
import type { Database } from "@/core/types/database";

// Public, unauthenticated: Discord fetches this URL server-side to render the
// /perfil-imagen embed. Only exposes username/discriminator/role/xp — the
// same fields already visible on the public profile page.

function getAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const SIZE = { width: 800, height: 220 };

const ROLE_LABEL: Record<string, string> = { admin: "ADMIN", organizador: "ORGANIZADOR" };
const ROLE_COLOR: Record<string, string> = { admin: "#F0434F", organizador: "#F5A524" };

function fallbackImage(message: string) {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0E1A",
          color: "#939BB0",
          fontSize: 28,
        }}
      >
        {message}
      </div>
    ),
    SIZE
  );
}

export async function GET(request: Request) {
  const discordUserId = new URL(request.url).searchParams.get("id");
  if (!discordUserId) return fallbackImage("Falta el parámetro id");

  const supabase = getAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, discriminator, experience, role")
    .eq("discord_id", discordUserId)
    .maybeSingle();

  if (!profile) return fallbackImage("Cuenta no vinculada");

  const xp = profile.experience ?? 0;
  const rank = getRankForXp(xp);
  const roleLabel = ROLE_LABEL[profile.role ?? ""] ?? "COMPETIDOR";
  const roleColor = ROLE_COLOR[profile.role ?? ""] ?? "#22C55E";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          gap: 28,
          padding: 32,
          background: "#0A0E1A",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 128,
            height: 128,
            borderRadius: 32,
            alignItems: "center",
            justifyContent: "center",
            backgroundImage: "linear-gradient(135deg, #9333ea, #581c87)",
            color: "white",
            fontSize: 56,
          }}
        >
          {profile.username?.charAt(0).toUpperCase() ?? "?"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", fontSize: 42, color: "white", fontStyle: "italic" }}>
            <span style={{ textTransform: "uppercase" }}>{profile.username}</span>
            <span style={{ marginLeft: 8, fontSize: 22, fontStyle: "normal", color: "#5C6577" }}>
              #{profile.discriminator}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span
              style={{
                display: "flex",
                padding: "4px 12px",
                borderRadius: 999,
                border: `1px solid ${roleColor}`,
                color: roleColor,
                fontSize: 14,
                textTransform: "uppercase",
              }}
            >
              {roleLabel}
            </span>
            <span
              style={{
                display: "flex",
                padding: "4px 12px",
                borderRadius: 999,
                border: `1px solid ${rank.color}`,
                color: rank.color,
                fontSize: 14,
                textTransform: "uppercase",
              }}
            >
              {`Rango ${rank.rank} · Nivel ${Math.floor(xp / 100) + 1}`}
            </span>
          </div>
          <div style={{ display: "flex", fontSize: 14, color: "#5C6577" }}>Ver logros en srankarena.com</div>
        </div>
      </div>
    ),
    SIZE
  );
}
