"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/core/ui/Card";
import { Badge } from "@/core/ui/Badge";
import { LoLStatsPanel } from "@/modules/profile/components/LoLStatsPanel";

interface RankedInfo {
  tier: string;
  rank: string;
  lp: number;
  wins: number;
  losses: number;
}

interface MatchInfo {
  matchId: string;
  champion: string;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  win: boolean;
  gameMode: string;
  gameDuration: number;
  queueId: number;
  gameCreation: number;
}

interface PlayerData {
  gameName: string;
  tagLine: string;
  puuid: string;
  summonerLevel: number;
  profileIconId: number;
  soloQueue: RankedInfo | null;
  flexQueue: RankedInfo | null;
  matches: MatchInfo[];
}

const QUEUE_NAMES: Record<number, string> = {
  420: "Ranked Solo/Duo",
  440: "Ranked Flex",
  400: "Normal Draft",
  430: "Normal Blind",
  450: "ARAM",
  1700: "Arena",
};

const TIER_COLORS: Record<string, string> = {
  IRON: "#6b5b4e",
  BRONZE: "#cd7f32",
  SILVER: "#c0c0c0",
  GOLD: "#ffd700",
  PLATINUM: "#00d4ff",
  EMERALD: "#50c878",
  DIAMOND: "#b9f2ff",
  MASTER: "#9d4dbb",
  GRANDMASTER: "#ef4444",
  CHALLENGER: "#f59e0b",
};

export default function LoLPlayerPage() {
  const searchParams = useSearchParams();
  const gameName = searchParams.get("name");
  const tagline = searchParams.get("tag");
  const region = searchParams.get("region");

  const [data, setData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameName || !tagline || !region) {
      setError("Missing player info");
      setLoading(false);
      return;
    }

    fetch(`/api/lol/player?gameName=${encodeURIComponent(gameName)}&tagline=${encodeURIComponent(tagline)}&region=${encodeURIComponent(region)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Player not found");
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [gameName, tagline, region]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="text-center">
          <p className="text-red-400">{error || "Failed to load player data"}</p>
        </Card>
      </div>
    );
  }

  const totalGames = data.matches.length;
  const wins = data.matches.filter((m) => m.win).length;
  const losses = totalGames - wins;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const avgKDA =
    totalGames > 0
      ? {
          k: (data.matches.reduce((s, m) => s + m.kills, 0) / totalGames).toFixed(1),
          d: (data.matches.reduce((s, m) => s + m.deaths, 0) / totalGames).toFixed(1),
          a: (data.matches.reduce((s, m) => s + m.assists, 0) / totalGames).toFixed(1),
        }
      : { k: "0", d: "0", a: "0" };
  const totalDeaths = data.matches.reduce((s, m) => s + m.deaths, 0);
  const kdaRatio =
    totalDeaths > 0
      ? (
          (data.matches.reduce((s, m) => s + m.kills + m.assists, 0)) /
          totalDeaths
        ).toFixed(2)
      : "Perfect";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* Header */}
      <Card className="relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--color-accent)]/10 blur-[60px]" />
        <div className="relative flex items-center gap-5">
          {/* Profile icon */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 text-sm text-gray-400">
            <img
              src={`https://ddragon.leagueoflegends.com/cdn/14.10.1/img/profileicon/${data.profileIconId}.png`}
              alt="icon"
              className="h-full w-full rounded-2xl object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <div>
            <h1 className="text-2xl text-white">
              {data.gameName}
              <span className="text-gray-500 font-bold">#{data.tagLine}</span>
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="accent">{region?.toUpperCase()}</Badge>
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-500">
                Level {data.summonerLevel}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left sidebar — Ranked info */}
        <div className="space-y-4">
          <RankedCard title="Ranked Solo/Duo" info={data.soloQueue} />
          <RankedCard title="Ranked Flex" info={data.flexQueue} />

          {/* Recent stats summary */}
          <Card>
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-gray-400">
              Recent {totalGames} Games
            </h3>
            <div className="mt-3 flex items-center gap-4">
              {/* Win rate donut */}
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#1f2937" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke={winRate >= 50 ? "#3b82f6" : "#ef4444"}
                    strokeWidth="3"
                    strokeDasharray={`${winRate * 0.88} ${88 - winRate * 0.88}`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-[10px] text-white">{winRate}%</span>
              </div>
              <div className="text-[10px]">
                <p className="font-bold text-gray-400">
                  {wins}W {losses}L
                </p>
                <p className="mt-1 text-white text-sm">
                  {avgKDA.k} / <span className="text-red-400">{avgKDA.d}</span> / {avgKDA.a}
                </p>
                <p className="mt-0.5 font-bold text-gray-500">
                  {kdaRatio}:1 KDA
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right — Match history */}
        <div>
          <h2 className="mb-4 text-[10px] uppercase tracking-[0.2em] text-gray-400">
            Recent Matches
          </h2>
          <div className="space-y-2">
            {data.matches.map((match) => (
              <MatchRow key={match.matchId} match={match} />
            ))}
            {data.matches.length === 0 && (
              <Card className="text-center">
                <p className="text-sm text-gray-500">No recent matches found</p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {data.puuid && region && (
        <LoLStatsPanel puuid={data.puuid} region={region} />
      )}
    </div>
  );
}

function RankedCard({ title, info }: { title: string; info: RankedInfo | null }) {
  if (!info) {
    return (
      <Card>
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-gray-400">
          {title}
        </h3>
        <p className="mt-2 text-xs text-gray-600">Unranked</p>
      </Card>
    );
  }

  const totalGames = info.wins + info.losses;
  const wr = totalGames > 0 ? Math.round((info.wins / totalGames) * 100) : 0;
  const tierColor = TIER_COLORS[info.tier] || "#6b7280";

  return (
    <Card>
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-gray-400">
        {title}
      </h3>
      <div className="mt-3 flex items-center gap-3">
        <img
          src={`https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/${info.tier.toLowerCase()}.png`}
          alt={info.tier}
          className="h-14 w-14 shrink-0 object-contain drop-shadow-[0_0_6px_rgba(255,215,0,0.3)]"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.style.display = "none";
          }}
        />
        <div>
          <p className="text-sm text-white">
            {info.tier} {info.rank}
          </p>
          <p className="text-[9px] font-bold text-gray-500">
            {info.lp} LP · {info.wins}W {info.losses}L · {wr}% WR
          </p>
        </div>
      </div>
    </Card>
  );
}

function MatchRow({ match }: { match: MatchInfo }) {
  const kda =
    match.deaths > 0
      ? ((match.kills + match.assists) / match.deaths).toFixed(2)
      : "Perfect";
  const duration = `${Math.floor(match.gameDuration / 60)}m ${match.gameDuration % 60}s`;
  const queueName = QUEUE_NAMES[match.queueId] || match.gameMode;
  const timeAgo = getTimeAgo(match.gameCreation);

  return (
    <div
      className={`flex items-center gap-4 rounded-xl border p-3 ${
        match.win
          ? "border-blue-900/50 bg-blue-950/20"
          : "border-red-900/50 bg-red-950/20"
      }`}
    >
      {/* Champion */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-800">
        <img
          src={`https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/${match.champion}.png`}
          alt={match.champion}
          className="h-full w-full rounded-xl object-cover"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.style.display = "none";
            el.parentElement!.textContent = match.champion.slice(0, 2);
          }}
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs ${match.win ? "text-blue-400" : "text-red-400"}`}>
            {match.win ? "Victory" : "Defeat"}
          </span>
          <span className="text-[9px] font-bold text-gray-600">{queueName}</span>
          <span className="text-[9px] text-gray-700">{duration}</span>
        </div>
        <p className="mt-0.5 text-[9px] font-bold text-gray-500">{match.champion}</p>
      </div>

      {/* KDA */}
      <div className="text-right">
        <p className="text-sm text-white">
          {match.kills} / <span className="text-red-400">{match.deaths}</span> / {match.assists}
        </p>
        <p className="text-[9px] font-bold text-gray-500">{kda} KDA · {match.cs} CS</p>
      </div>

      {/* Time */}
      <div className="hidden text-right sm:block">
        <p className="text-[9px] font-bold text-gray-600">{timeAgo}</p>
      </div>
    </div>
  );
}

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}
