"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/core/ui/Button";
import { useToast } from "@/core/ui/Toast";
import { updateFeaturedEventsConfig } from "@/modules/admin/actions";
import type { FeaturedEventsConfig } from "@/core/types/site-content";
import type { Tournament } from "@/core/types";

interface FeaturedEventsManagerProps {
  initialConfig: FeaturedEventsConfig;
  tournaments: Tournament[];
}

export function FeaturedEventsManager({ initialConfig, tournaments }: FeaturedEventsManagerProps) {
  const t = useTranslations("admin");
  const { toast } = useToast();
  const [featuredIds, setFeaturedIds] = useState<string[]>(initialConfig.tournament_ids ?? []);
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setFeaturedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...featuredIds];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setFeaturedIds(next);
  }

  function moveDown(idx: number) {
    if (idx === featuredIds.length - 1) return;
    const next = [...featuredIds];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setFeaturedIds(next);
  }

  async function handleSave() {
    setSaving(true);
    const result = await updateFeaturedEventsConfig({ tournament_ids: featuredIds });
    setSaving(false);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast(t("featuredEventsSaved"), "success");
    }
  }

  const featuredTournaments = featuredIds
    .map((id) => tournaments.find((tournament) => tournament.id === id))
    .filter(Boolean) as Tournament[];

  const available = tournaments.filter((tournament) => !featuredIds.includes(tournament.id));

  return (
    <div className="space-y-8">
      {/* Featured order */}
      <div>
        <h3 className="mb-3 text-sm font-bold text-[var(--color-accent)]">
          {t("featuredEventsSelected", { count: featuredTournaments.length })}
        </h3>
        {featuredTournaments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-700 py-8 text-center text-sm text-gray-600">
            {t("featuredEventsEmpty")}
          </p>
        ) : (
          <div className="space-y-2">
            {featuredTournaments.map((tournament, idx) => (
              <div
                key={tournament.id}
                className="flex items-center gap-3 rounded-xl border border-purple-900/40 bg-[#121620] px-4 py-3"
              >
                {tournament.banner_url ? (
                  <img
                    src={tournament.banner_url}
                    alt={tournament.title}
                    className="h-10 w-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-10 w-16 rounded-lg bg-gray-800 flex items-center justify-center text-gray-600 text-xs">
                    {t("noImage")}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-bold text-white">{tournament.title}</p>
                  <p className="text-[10px] font-bold text-gray-500">
                    {tournament.game} · {tournament.status}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="rounded px-2 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === featuredTournaments.length - 1}
                    className="rounded px-2 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => toggle(tournament.id)}
                    className="rounded px-2 py-1 text-xs text-red-400 hover:text-red-300"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available tournaments */}
      <div>
        <h3 className="mb-3 text-sm font-bold text-gray-500">
          {t("availableTournaments", { count: available.length })}
        </h3>
        {available.length === 0 ? (
          <p className="text-center text-sm text-gray-600">{t("allTournamentsSelected")}</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {available.map((tournament) => (
              <div
                key={tournament.id}
                className="flex items-center gap-3 rounded-xl border border-gray-800 bg-[#0d1017] px-4 py-3 hover:border-gray-700 cursor-pointer transition-colors"
                onClick={() => toggle(tournament.id)}
              >
                {tournament.banner_url ? (
                  <img
                    src={tournament.banner_url}
                    alt={tournament.title}
                    className="h-10 w-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-10 w-16 rounded-lg bg-gray-800 flex items-center justify-center text-gray-600 text-xs">
                    {t("noImageShort")}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-bold text-white">{tournament.title}</p>
                  <p className="text-[10px] font-bold text-gray-500">
                    {tournament.game} · {tournament.status}
                  </p>
                </div>
                <span className="text-xs text-[var(--color-accent)] font-bold">+ {t("add")}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? t("saving") : t("saveFeaturedEvents")}
      </Button>
    </div>
  );
}
