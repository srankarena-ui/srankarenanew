"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Badge } from "@/core/ui/Badge";

interface GameParticipant {
  id: string;
  game_id: string;
  tournament_id: string;
  tournament: { title: string };
  result: "win" | "loss" | "draw";
  role: string;
  kills: number;
  deaths: number;
  assists: number;
  created_at: string;
}

interface UserMatchesTabProps {
  userId: string;
}

export function UserMatchesTab({ userId }: UserMatchesTabProps) {
  const router = useRouter();
  const locale = useLocale();
  const [matches, setMatches] = useState<GameParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMatches() {
      try {
        const res = await fetch(`/api/admin/users/${userId}/matches`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setMatches(data);
        }
      } catch (error) {
        console.error("Failed to fetch matches:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMatches();
  }, [userId]);

  if (loading) {
    return <div className="py-8 text-center text-[var(--color-text-muted)]">Loading...</div>;
  }

  if (matches.length === 0) {
    return (
      <div className="py-8 text-center text-[var(--color-text-muted)]">
        No matches found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
      <table className="w-full text-sm">
        <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-card)]">
          <tr>
            <th className="px-6 py-3 text-left font-bold text-[var(--color-text-primary)]">
              Tournament
            </th>
            <th className="px-6 py-3 text-left font-bold text-[var(--color-text-primary)]">
              Date
            </th>
            <th className="px-6 py-3 text-left font-bold text-[var(--color-text-primary)]">
              Role
            </th>
            <th className="px-6 py-3 text-left font-bold text-[var(--color-text-primary)]">
              K/D/A
            </th>
            <th className="px-6 py-3 text-left font-bold text-[var(--color-text-primary)]">
              Result
            </th>
            <th className="px-6 py-3 text-center font-bold text-[var(--color-text-primary)]">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {matches.map((match) => (
            <tr key={match.id} className="hover:bg-[var(--color-bg-card-hover)] transition-colors">
              <td className="px-6 py-4 font-bold text-[var(--color-text-primary)]">
                {match.tournament.title}
              </td>
              <td className="px-6 py-4 text-xs text-[var(--color-text-muted)]">
                {new Date(match.created_at).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 text-xs text-[var(--color-text-secondary)] uppercase">
                {match.role || "—"}
              </td>
              <td className="px-6 py-4 text-xs font-bold text-[var(--color-accent)]">
                {match.kills}/{match.deaths}/{match.assists}
              </td>
              <td className="px-6 py-4">
                <Badge
                  variant={
                    match.result === "win"
                      ? "success"
                      : match.result === "loss"
                        ? "danger"
                        : "default"
                  }
                >
                  {match.result}
                </Badge>
              </td>
              <td className="px-6 py-4 text-center">
                <button
                  onClick={() =>
                    router.push(
                      `/${locale}/tournaments/${match.tournament_id}/bracket?match=${match.game_id}`
                    )
                  }
                  className="text-[var(--color-accent)] hover:underline font-bold text-xs"
                >
                  Bracket →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
