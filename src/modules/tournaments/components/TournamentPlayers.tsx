"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/core/ui/Button";
import { Badge } from "@/core/ui/Badge";
import { useToast } from "@/core/ui/Toast";
import { generateBracket } from "@/modules/tournaments/actions";
import type { Tournament, TournamentParticipant, Profile } from "@/core/types";

interface TournamentPlayersProps {
  tournament: Tournament;
  participants: (TournamentParticipant & { profile: Profile })[];
  currentUserId: string | null;
  isRegistered: boolean;
  isAdmin: boolean;
}

export function TournamentPlayers({
  tournament,
  participants,
  currentUserId,
  isRegistered,
  isAdmin,
}: TournamentPlayersProps) {
  const t = useTranslations("tournaments");
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleGenerateBracket() {
    setLoading(true);
    const result = await generateBracket(tournament.id);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast(t("bracketGenerated"), "success");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div>
      {/* Header with count + admin action */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-sm uppercase tracking-wider text-white">
            {t("tabPlayers")}
          </h2>
          <p className="mt-0.5 text-[10px] font-bold text-gray-500">
            {t("registeredCount", { current: participants.length, max: tournament.max_participants })}
          </p>
        </div>
        {isAdmin && tournament.status === "registration" && participants.length >= 2 && (
          <Button variant="secondary" onClick={handleGenerateBracket} isLoading={loading}>
            {t("generateBracket")}
          </Button>
        )}
      </div>

      {/* Player list — Battlefy style table */}
      <div className="overflow-hidden rounded-xl border border-gray-800/60">
        {/* Header row */}
        <div className="flex items-center bg-[#0d1017] px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
          <span className="w-12">#</span>
          <span className="flex-1">{t("playerColumn")}</span>
          <span className="w-24 text-right">{t("joinedColumn")}</span>
        </div>

        {/* Player rows */}
        {participants.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center px-4 py-3 ${i % 2 === 0 ? "bg-[#121620]" : "bg-[#0f1319]"}`}
          >
            <span className="w-12 text-sm font-bold text-gray-500">{i + 1}</span>
            <div className="flex flex-1 items-center gap-3">
              {/* Avatar placeholder */}
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-[10px] uppercase text-gray-500">
                {(p.profile?.username || "?").charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {p.profile?.username || t("unknownPlayer")}
                  {p.user_id === currentUserId && (
                    <span className="ml-2 text-[8px] text-[var(--color-accent)]">
                      {t("you")}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <span className="w-24 text-right text-[10px] text-gray-600">
              {new Date(p.created_at).toLocaleDateString()}
            </span>
          </div>
        ))}

        {participants.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-600">
            {t("noPlayersRegistered")}
          </div>
        )}
      </div>
    </div>
  );
}
