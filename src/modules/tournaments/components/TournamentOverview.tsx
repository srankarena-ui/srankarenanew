"use client";

import { cn } from "@/core/lib/cn";
import { DefaultBanner } from "@/core/ui/DefaultBanner";
import { useTournamentStore } from "@/modules/tournaments/store";
import { useTranslations } from "next-intl";
import type { Tournament } from "@/core/types";

interface TournamentOverviewProps {
  tournament: Tournament;
}

const SUB_TABS = ["details", "rules", "prizes", "contact"] as const;

function getOverviewFormatLabel(tournament: Tournament) {
  if (tournament.tournament_format === "summoner_trials") {
    return "Summoner Trials";
  }

  return tournament.series_format?.toUpperCase() || "—";
}

export function TournamentOverview({ tournament }: TournamentOverviewProps) {
  const t = useTranslations("tournaments");
  const { overviewSubTab, setOverviewSubTab } = useTournamentStore();

  return (
    <div>
      {/* Sub-tabs — Battlefy style underline */}
      <div className="mb-6 flex border-b border-gray-800">
        {SUB_TABS.map((tab) => {
          const isActive = overviewSubTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setOverviewSubTab(tab)}
              className={cn(
                "relative px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
                isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
              )}
            >
              {tab === "details" ? t("detailsTab") : tab === "rules" ? t("rules") : tab === "prizes" ? t("prizesTab") : t("contactTab")}
              {isActive && (
                <span className="absolute bottom-0 left-0 h-[2px] w-full bg-purple-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-tab content */}
      {overviewSubTab === "details" && <DetailsTab tournament={tournament} />}
      {overviewSubTab === "rules" && <RulesTab tournament={tournament} />}
      {overviewSubTab === "prizes" && <PrizesTab tournament={tournament} />}
      {overviewSubTab === "contact" && <ContactTab tournament={tournament} />}
    </div>
  );
}

// ── Details tab ──
function DetailsTab({ tournament }: { tournament: Tournament }) {
  const t = useTranslations("tournaments");
  return (
    <div>
      {/* Banner */}
      <div className="mb-6 aspect-[3/1] w-full overflow-hidden rounded-2xl">
        {tournament.banner_url ? (
          <img
            src={tournament.banner_url}
            alt={tournament.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <DefaultBanner className="h-full w-full" />
        )}
      </div>

      {/* About */}
      <div>
        <h2 className="mb-4 text-xl font-black text-white">{t("aboutTournament")}</h2>
        <div className="prose prose-invert max-w-none">
          {tournament.description ? (
            <div
              className="ProseMirror text-sm leading-relaxed text-gray-400"
              dangerouslySetInnerHTML={{ __html: tournament.description }}
            />
          ) : (
            <p className="text-sm text-gray-600 italic">{t("noDescriptionProvided")}</p>
          )}
        </div>
      </div>

      {/* Quick info grid */}
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <QuickStat label={t("quickStatus")} value={tournament.status.toUpperCase()} />
        <QuickStat label={t("quickFormat")} value={getOverviewFormatLabel(tournament)} />
        <QuickStat label={t("quickMaxPlayers")} value={String(tournament.max_participants)} />
        <QuickStat label={t("quickExpReward")} value={tournament.reward_points > 0 ? `+${tournament.reward_points}` : "—"} />
      </div>
    </div>
  );
}

// ── Rules tab ──
function RulesTab({ tournament }: { tournament: Tournament }) {
  const t = useTranslations("tournaments");
  return (
    <div className="rounded-2xl border border-gray-800/60 bg-[#121620] p-6">
      {tournament.rules ? (
        <div
          className="ProseMirror text-sm leading-relaxed text-gray-300"
          dangerouslySetInnerHTML={{ __html: tournament.rules }}
        />
      ) : (
        <p className="text-sm text-gray-600 italic">{t("noRulesSpecified")}</p>
      )}
    </div>
  );
}

// ── Prizes tab ──
function PrizesTab({ tournament }: { tournament: Tournament }) {
  const t = useTranslations("tournaments");
  return (
    <div className="rounded-2xl border border-gray-800/60 bg-[#121620] p-6">
      {tournament.prizes ? (
        <div
          className="ProseMirror text-sm leading-relaxed text-gray-300"
          dangerouslySetInnerHTML={{ __html: tournament.prizes }}
        />
      ) : (
        <p className="text-sm text-gray-600 italic">{t("noPrizeInfo")}</p>
      )}

      {tournament.reward_points > 0 && (
        <div className="mt-6 rounded-xl border border-purple-800/30 bg-purple-900/10 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">
            {t("arenaReward")}
          </p>
          <p className="mt-1 text-2xl font-black text-purple-300">
            +{tournament.reward_points} EXP
          </p>
        </div>
      )}
    </div>
  );
}

// ── Contact tab ──
function ContactTab({ tournament }: { tournament: Tournament }) {
  const t = useTranslations("tournaments");
  return (
    <div className="rounded-2xl border border-gray-800/60 bg-[#121620] p-6">
      {tournament.contact_method ? (
        <div>
          <h3 className="mb-3 text-sm font-bold text-white">{t("contactMethodTitle")}</h3>
          <p className="text-sm text-gray-300">{tournament.contact_method}</p>
        </div>
      ) : (
        <p className="text-sm text-gray-600 italic">{t("noContactInfo")}</p>
      )}
    </div>
  );
}

// ── Quick stat card ──
function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-800/60 bg-[#121620] px-4 py-3 text-center">
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}
