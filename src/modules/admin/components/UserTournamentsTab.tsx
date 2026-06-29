"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Badge } from "@/core/ui/Badge";

interface Tournament {
  id: string;
  title: string;
  start_date: string;
  status: string;
  game: string;
  reward_points: number;
}

interface UserTournamentsTabProps {
  userId: string;
}

export function UserTournamentsTab({ userId }: UserTournamentsTabProps) {
  const router = useRouter();
  const locale = useLocale();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTournaments() {
      try {
        const res = await fetch(`/api/admin/users/${userId}/tournaments`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setTournaments(data);
        }
      } catch (error) {
        console.error("Failed to fetch tournaments:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTournaments();
  }, [userId]);

  if (loading) {
    return <div className="py-8 text-center text-[var(--color-text-muted)]">Loading...</div>;
  }

  if (tournaments.length === 0) {
    return (
      <div className="py-8 text-center text-[var(--color-text-muted)]">
        No tournaments found
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
              Game
            </th>
            <th className="px-6 py-3 text-left font-bold text-[var(--color-text-primary)]">
              Status
            </th>
            <th className="px-6 py-3 text-left font-bold text-[var(--color-text-primary)]">
              Reward
            </th>
            <th className="px-6 py-3 text-center font-bold text-[var(--color-text-primary)]">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {tournaments.map((tournament) => (
            <tr key={tournament.id} className="hover:bg-[var(--color-bg-card-hover)] transition-colors">
              <td className="px-6 py-4 font-bold text-[var(--color-text-primary)]">
                {tournament.title}
              </td>
              <td className="px-6 py-4 text-xs text-[var(--color-text-muted)]">
                {new Date(tournament.start_date).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 text-xs text-[var(--color-text-secondary)]">
                {tournament.game}
              </td>
              <td className="px-6 py-4">
                <Badge
                  variant={
                    tournament.status === "active"
                      ? "accent"
                      : tournament.status === "completed"
                        ? "success"
                        : "default"
                  }
                >
                  {tournament.status}
                </Badge>
              </td>
              <td className="px-6 py-4 text-xs text-[var(--color-accent)] font-bold">
                +{tournament.reward_points} XP
              </td>
              <td className="px-6 py-4 text-center">
                <button
                  onClick={() => router.push(`/${locale}/tournaments/${tournament.id}`)}
                  className="text-[var(--color-accent)] hover:underline font-bold text-xs"
                >
                  View →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
