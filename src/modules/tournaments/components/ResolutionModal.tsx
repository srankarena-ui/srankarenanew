"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/core/ui/Modal";
import { Button } from "@/core/ui/Button";
import { Input } from "@/core/ui/Input";
import { useToast } from "@/core/ui/Toast";
import { useTournamentStore } from "@/modules/tournaments/store";
import { advanceWinner } from "@/modules/tournaments/actions";
import { useTranslations } from "next-intl";
import type { TournamentMatch, Tournament } from "@/core/types";

interface ResolutionModalProps {
  match: TournamentMatch;
  tournament: Tournament;
}

export function ResolutionModal({ match, tournament }: ResolutionModalProps) {
  const t = useTranslations("tournaments");
  const { closeResolutionModal } = useTournamentStore();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [matchIdInput, setMatchIdInput] = useState("");

  async function handleForceWinner(winnerId: string) {
    setLoading(true);
    const result = await advanceWinner(match.id, winnerId);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Winner forced", "success");
      router.refresh();
      closeResolutionModal();
    }
    setLoading(false);
  }

  async function handleManualScan() {
    setLoading(true);
    try {
      const endpoint =
        tournament.game === "Clash Royale" ? "/api/cr/scan" : "/api/riot/scan";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: matchIdInput }),
      });

      const data = await res.json();
      if (data.winnerId) {
        const result = await advanceWinner(match.id, data.winnerId);
        if (result.error) {
          toast(result.error, "error");
        } else {
          toast("Winner detected from API", "success");
          router.refresh();
          closeResolutionModal();
        }
      } else {
        toast("No result found for this match ID", "warning");
      }
    } catch {
      toast("Scan failed", "error");
    }
    setLoading(false);
  }

  return (
    <Modal isOpen onClose={closeResolutionModal} title={t("adminOverride")}>
      <div className="space-y-6">
        {/* Force winner */}
        <div>
          <h4 className="mb-3 text-[10px] font-bold text-gray-500">
            {t("forceWinner")}
          </h4>
          <div className="flex gap-3">
            {match.player1_id && (
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => handleForceWinner(match.player1_id!)}
                isLoading={loading}
              >
                Player 1
              </Button>
            )}
            {match.player2_id && (
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => handleForceWinner(match.player2_id!)}
                isLoading={loading}
              >
                Player 2
              </Button>
            )}
          </div>
        </div>

        {/* Manual scan */}
        <div>
          <h4 className="mb-3 text-[10px] font-bold text-gray-500">
            {t("manualScan")}
          </h4>
          <div className="flex gap-3">
            <Input
              value={matchIdInput}
              onChange={(e) => setMatchIdInput(e.target.value)}
              placeholder={t("matchId")}
              className="flex-1"
            />
            <Button
              variant="secondary"
              onClick={handleManualScan}
              isLoading={loading}
              disabled={!matchIdInput}
            >
              {t("scanApi")}
            </Button>
          </div>
        </div>

        <Button variant="ghost" onClick={closeResolutionModal} className="w-full">
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
