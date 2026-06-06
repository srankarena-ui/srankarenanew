"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/core/ui/Modal";
import { Button } from "@/core/ui/Button";
import { Input } from "@/core/ui/Input";
import { useToast } from "@/core/ui/Toast";
import { useTournamentStore } from "@/modules/tournaments/store";
import { submitScore, advanceWinner } from "@/modules/tournaments/actions";
import type { TournamentMatch, SeriesFormat } from "@/core/types";

interface ScoreModalProps {
  match: TournamentMatch;
  seriesFormat: SeriesFormat;
}

export function ScoreModal({ match, seriesFormat }: ScoreModalProps) {
  const { closeScoreModal } = useTournamentStore();
  const router = useRouter();
  const { toast } = useToast();
  const [p1Score, setP1Score] = useState(match.player1_score);
  const [p2Score, setP2Score] = useState(match.player2_score);
  const [loading, setLoading] = useState(false);

  const maxWins = seriesFormat === "bo5" ? 3 : seriesFormat === "bo3" ? 2 : 1;

  async function handleSubmit() {
    setLoading(true);

    const result = await submitScore(match.id, p1Score, p2Score);
    if (result.error) {
      toast(result.error, "error");
      setLoading(false);
      return;
    }

    // Determine winner if either player reached max wins
    if (p1Score >= maxWins || p2Score >= maxWins) {
      const winnerId = p1Score >= maxWins ? match.player1_id : match.player2_id;
      if (winnerId) {
        const advResult = await advanceWinner(match.id, winnerId);
        if (advResult.error) {
          toast(advResult.error, "error");
          setLoading(false);
          return;
        }
      }
    }

    toast("Score submitted", "success");
    router.refresh();
    closeScoreModal();
    setLoading(false);
  }

  return (
    <Modal isOpen onClose={closeScoreModal} title="Submit Score">
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Format: {seriesFormat.toUpperCase()} — First to {maxWins} win{maxWins > 1 ? "s" : ""}
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
              Player 1
            </label>
            <input
              type="number"
              min={0}
              max={maxWins}
              value={p1Score}
              onChange={(e) => setP1Score(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-800 bg-[#0b0e14] px-4 py-3 text-center text-lg text-white outline-hidden focus:border-[var(--color-accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
              Player 2
            </label>
            <input
              type="number"
              min={0}
              max={maxWins}
              value={p2Score}
              onChange={(e) => setP2Score(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-800 bg-[#0b0e14] px-4 py-3 text-center text-lg text-white outline-hidden focus:border-[var(--color-accent)]"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={closeScoreModal} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={loading} className="flex-1">
            Submit
          </Button>
        </div>
      </div>
    </Modal>
  );
}
