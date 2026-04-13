"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { cn } from "@/core/lib/cn";
import { Badge } from "@/core/ui/Badge";
import { useToast } from "@/core/ui/Toast";
import { DefaultBanner } from "@/core/ui/DefaultBanner";
import { useTournamentStore } from "@/modules/tournaments/store";
import { registerForTournament, unregisterFromTournament } from "@/modules/tournaments/actions";
import { TeamRegisterButton } from "./TeamRegisterButton";
import { TournamentOverview } from "./TournamentOverview";
import { TournamentPlayers } from "./TournamentPlayers";
import { BracketView } from "./BracketView";
import { ScoreModal } from "./ScoreModal";
import { ResolutionModal } from "./ResolutionModal";
import { SummonerTrialsLeaderboard } from "./SummonerTrialsLeaderboard";
import type { Tournament, TournamentParticipant, Profile, MatchWithPlayers, TrialsEnrollmentWithProfile, TrialsConfig } from "@/core/types";

interface TournamentDetailProps {
  tournament: Tournament;
  participants: (TournamentParticipant & { profile: Profile })[];
  matches: MatchWithPlayers[];
  currentUserId: string | null;
  isRegistered: boolean;
  isAdmin: boolean;
  trialsEnrollments?: TrialsEnrollmentWithProfile[];
  teamRegistrationCount?: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-600",
  registration: "bg-green-500",
  active: "bg-red-500",
  completed: "bg-gray-600",
  cancelled: "bg-red-800",
};

const MAIN_TABS = ["overview", "players", "bracket"] as const;

function getDisplayFormat(tournament: Tournament) {
  if (tournament.tournament_format === "summoner_trials") {
    return { value: "Summoner Trials", subvalue: undefined as string | undefined };
  }

  return {
    value:
      tournament.mode ||
      (tournament.team_size === 2 ? "2v2" : tournament.team_size === 5 ? "5v5" : "1v1"),
    subvalue: tournament.series_format?.toUpperCase(),
  };
}

export function TournamentDetail({
  tournament,
  participants,
  matches,
  currentUserId,
  isRegistered,
  isAdmin,
  trialsEnrollments,
  teamRegistrationCount = 0,
}: TournamentDetailProps) {
  const t = useTranslations("tournaments");
  const locale = useLocale();
  const { activeTab, setActiveTab, scoreModalOpen, resolutionModalOpen, selectedMatch } =
    useTournamentStore();

  const isSummonerTrials = tournament.tournament_format === "summoner_trials";
  const displayFormat = getDisplayFormat(tournament);

  const dateObj = tournament.start_date ? new Date(tournament.start_date) : null;
  const formattedDate = dateObj
    ? dateObj.toLocaleDateString(locale === "es" ? "es-ES" : "en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="flex gap-6">
      {/* ── Main content ── */}
      <div className="min-w-0 flex-1">
        {/* Title */}
        <h1 className="mb-4 text-3xl font-black uppercase tracking-tight text-white">
          {tournament.title}
        </h1>

        {/* Main tabs — Battlefy style */}
        <div className="mb-6 flex border-b border-gray-800">
          {MAIN_TABS.map((tab) => {
            const isActive = activeTab === tab;
            const label =
              tab === "overview"
                ? t("tabOverview")
                : tab === "players"
                  ? t("tabPlayers")
                  : isSummonerTrials
                    ? "Leaderboard"
                    : t("tabBracket");
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] transition-colors",
                  isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
                )}
              >
                {label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 h-[2px] w-full bg-purple-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Info cards row — Battlefy style */}
        {activeTab === "overview" && (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {/* Game */}
            <InfoCard label={t("game") || "Game"} value={tournament.game} />
            {/* Date & Time */}
            <InfoCard
              label={t("startDate") || "Date & Time"}
              value={formattedDate || "—"}
              subvalue={tournament.start_time ? tournament.start_time.slice(0, 5) : undefined}
            />
            {/* Format */}
            <InfoCard
              label="Format"
              value={displayFormat.value}
              subvalue={displayFormat.subvalue}
            />
            {/* Map & Region */}
            <InfoCard
              label={tournament.map ? "Game Map & Type" : "Region"}
              value={tournament.map || tournament.region || "—"}
              subvalue={tournament.map ? tournament.region || undefined : undefined}
            />
          </div>
        )}

        {/* Tab content */}
        {activeTab === "overview" && (
          <TournamentOverview tournament={tournament} />
        )}
        {activeTab === "players" && (
          <TournamentPlayers
            tournament={tournament}
            participants={participants}
            currentUserId={currentUserId}
            isRegistered={isRegistered}
            isAdmin={isAdmin}
          />
        )}
        {activeTab === "bracket" && !isSummonerTrials && (
          <BracketView
            tournament={tournament}
            matches={matches}
            participants={participants}
            isAdmin={isAdmin}
          />
        )}
        {activeTab === "bracket" && isSummonerTrials && (
          <SummonerTrialsLeaderboard
            tournamentId={tournament.id}
            enrollments={trialsEnrollments ?? []}
            config={tournament.trials_config as unknown as TrialsConfig}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
          />
        )}
      </div>

      {/* ── Sidebar ── */}
      <aside className="hidden w-72 shrink-0 lg:block">
        {/* Registration status */}
        <div className="mb-4 flex items-center justify-between">
          <span
            className={cn(
              "rounded-md px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white",
              tournament.registration_open ? "bg-green-600" : "bg-gray-700"
            )}
          >
            {tournament.registration_open ? "Registration Open" : "Registration Closed"}
          </span>
        </div>

        {/* Players / Teams count */}
        <div className="mb-4 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">
          {(() => {
            const trialsConfig = tournament.trials_config as TrialsConfig | null;
            const isTrialsTeamBased = isSummonerTrials && (trialsConfig?.match_type === "duo" || trialsConfig?.match_type === "flex");
            const isBracketTeamBased = !isSummonerTrials && (tournament.team_size === 2 || tournament.team_size === 5);
            if (isTrialsTeamBased || isBracketTeamBased) {
              return <><span className="text-white">{teamRegistrationCount}</span> / {tournament.max_participants} Teams Registered</>;
            }
            return <><span className="text-white">{participants.length}</span> / {tournament.max_participants} Players Registered</>;
          })()}
        </div>

        {/* Join section */}
        <div className="rounded-2xl border border-gray-800/60 bg-[#121620] p-5">
          <h3 className="mb-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
            Join
          </h3>

          {currentUserId ? (
            (() => {
              const trialsConfig = tournament.trials_config as TrialsConfig | null;
              const isTrialsTeamBased =
                isSummonerTrials &&
                (trialsConfig?.match_type === "duo" || trialsConfig?.match_type === "flex");
              const isBracketTeamBased =
                !isSummonerTrials &&
                (tournament.team_size === 2 || tournament.team_size === 5);

              if (isTrialsTeamBased) {
                return (
                  <TeamRegisterButton
                    tournamentId={tournament.id}
                    queueType={trialsConfig!.match_type as "duo" | "flex"}
                    registrationOpen={!!tournament.registration_open}
                    currentUserId={currentUserId}
                  />
                );
              }

              if (isBracketTeamBased) {
                return (
                  <TeamRegisterButton
                    tournamentId={tournament.id}
                    queueType={tournament.team_size === 2 ? "duo" : "flex"}
                    registrationOpen={!!tournament.registration_open}
                    currentUserId={currentUserId}
                  />
                );
              }

              return (
                <>
                  {tournament.registration_open && !isRegistered && (
                    <RegisterButton tournamentId={tournament.id} />
                  )}
                  {isRegistered && (
                    <div className="space-y-2">
                      <Badge variant="success">{t("registered")}</Badge>
                      <UnregisterButton tournamentId={tournament.id} />
                    </div>
                  )}
                  {!tournament.registration_open && !isRegistered && (
                    <p className="text-xs text-gray-500">
                      {t("registrationClosedDetails")}
                    </p>
                  )}
                </>
              );
            })()
          ) : (
            <a
              href={`/${locale}/login`}
              className="block w-full rounded-xl bg-purple-600 py-3 text-center text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-purple-500"
            >
              {t("loginToJoin")}
            </a>
          )}
        </div>

        {/* Reward */}
        {tournament.reward_points > 0 && (
          <div className="mt-4 rounded-2xl border border-gray-800/60 bg-[#121620] p-5">
            <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
              Reward
            </h3>
            <p className="text-lg font-black text-purple-400">
              +{tournament.reward_points} EXP
            </p>
          </div>
        )}

        {/* Region */}
        {tournament.region && (
          <div className="mt-4 rounded-2xl border border-gray-800/60 bg-[#121620] p-5">
            <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
              Region
            </h3>
            <p className="text-sm font-bold text-white">{tournament.region}</p>
          </div>
        )}

        {/* Admin Actions */}
        {isAdmin && (
          <div className="mt-4 rounded-2xl border border-yellow-800/30 bg-yellow-900/10 p-5">
            <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-yellow-400">
              Admin
            </h3>
            <div className="space-y-2">
              <a
                href={`/${locale}/admin/edit-tournament/${tournament.id}`}
                className="block w-full rounded-xl border border-gray-700 bg-[#0b0e14] py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-gray-300 transition-colors hover:border-purple-500/50 hover:text-white"
              >
                Edit Tournament
              </a>
            </div>
          </div>
        )}
      </aside>

      {/* Modals */}
      {scoreModalOpen && selectedMatch && (
        <ScoreModal
          match={selectedMatch}
          seriesFormat={tournament.series_format}
        />
      )}
      {resolutionModalOpen && selectedMatch && (
        <ResolutionModal
          match={selectedMatch}
          tournament={tournament}
        />
      )}
    </div>
  );
}

// ── Info card ──
function InfoCard({
  label,
  value,
  subvalue,
}: {
  label: string;
  value: string;
  subvalue?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800/60 bg-[#121620] px-4 py-3">
      <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-purple-400">
        {label}
      </p>
      <p className="text-sm font-bold text-white">{value}</p>
      {subvalue && (
        <p className="mt-0.5 text-[10px] text-gray-500">{subvalue}</p>
      )}
    </div>
  );
}

// ── Register / Unregister buttons ──
function RegisterButton({ tournamentId }: { tournamentId: string }) {
  const t = useTranslations("tournaments");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleRegister() {
    setLoading(true);
    const result = await registerForTournament(tournamentId);
    if (result.error) toast(result.error, "error");
    else {
      toast(t("registeredSuccess"), "success");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleRegister}
      disabled={loading}
      className="w-full rounded-xl bg-purple-600 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
    >
      {loading ? "..." : t("register")}
    </button>
  );
}

function UnregisterButton({ tournamentId }: { tournamentId: string }) {
  const t = useTranslations("tournaments");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleUnregister() {
    setLoading(true);
    const result = await unregisterFromTournament(tournamentId);
    if (result.error) toast(result.error, "error");
    else {
      toast(t("unregisteredSuccess"), "info");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleUnregister}
      disabled={loading}
      className="w-full rounded-xl border border-red-800/50 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 transition-colors hover:bg-red-900/20 disabled:opacity-50"
    >
      {loading ? "..." : t("unregister")}
    </button>
  );
}
