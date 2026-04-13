import { Badge } from "@/core/ui/Badge";
import { getTranslations } from "next-intl/server";
import type { Profile } from "@/core/types";

interface HallOfFameProps {
  topPlayers: Pick<Profile, "username" | "rank" | "experience">[];
}

export async function HallOfFame({ topPlayers }: HallOfFameProps) {
  const t = await getTranslations("landing");

  return (
    <section className="mx-auto max-w-4xl px-4 py-24">
      <h2 className="mb-12 text-center text-3xl font-black uppercase italic tracking-tighter text-white">
        {t("hallOfFameTitle")}
      </h2>

      <div className="space-y-3">
        {topPlayers.map((player, i) => (
          <div
            key={player.username}
            className="flex items-center gap-4 rounded-2xl border border-gray-800 bg-[#121620] px-5 py-4 transition-all hover:border-gray-700"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-900/30 text-sm font-black text-purple-400">
              {i + 1}
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">{player.username}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
                {player.experience} XP
              </p>
            </div>
            <Badge variant="purple">{player.rank || t("unranked")}</Badge>
          </div>
        ))}

        {topPlayers.length === 0 && (
          <p className="text-center text-sm text-gray-600">{t("hallOfFameEmpty")}</p>
        )}
      </div>
    </section>
  );
}
