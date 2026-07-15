import { createClient } from "@/core/supabase/server";
import { notFound } from "next/navigation";
import { FootballScoreboardDisplay } from "./FootballScoreboardDisplay";

export const metadata = { robots: { index: false, follow: false } };

// Transparent, chrome-less scoreboard for OBS/Twitch browser-source capture.
// Lives outside [locale] and is excluded from the i18n middleware (src/proxy.ts).
export default async function FootballOverlayPage() {
  const supabase = await createClient();
  const { data: scoreboard } = await supabase.from("football_scoreboard").select("*").eq("id", 1).single();

  if (!scoreboard) notFound();

  return (
    <>
      <style>{`html, body { background: transparent !important; margin: 0; }`}</style>
      <FootballScoreboardDisplay initial={scoreboard} />
    </>
  );
}
