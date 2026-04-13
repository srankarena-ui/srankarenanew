"use client";

import { useEffect, useState } from "react";

interface MatchStats {
  matchId: string;
  champion: string;
  win: boolean;
  gameDuration: number;
  queueId: number;
  gameCreation: number;
  // Vision
  wardsPlaced: number;
  controlWardsPlaced: number;
  wardsKilled: number;
  visionScore: number;
  // Combat
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  pentaKills: number;
  quadraKills: number;
  tripleKills: number;
  doubleKills: number;
  firstBloodKill: boolean;
  largestMultiKill: number;
  killParticipation: number;
  soloKills: number;
  // Damage
  totalDamageDealtToChampions: number;
  physicalDamageDealtToChampions: number;
  magicDamageDealtToChampions: number;
  trueDamageDealtToChampions: number;
  totalDamageTaken: number;
  totalHeal: number;
  totalHealsOnTeammates: number;
  // Economy
  goldEarned: number;
  cs: number;
  csPerMin: number;
  // Objectives
  teamBaronKills: number;
  teamDragonKills: number;
  teamHeraldKills: number;
  teamGrubKills: number;
  teamTowerKills: number;
  dragonTakedowns: number;
  turretKills: number;
  inhibitorKills: number;
}

interface StatsData {
  matches: MatchStats[];
  averages: Record<string, number> | null;
  totals: {
    wins: number;
    losses: number;
    pentaKills: number;
    quadraKills: number;
    tripleKills: number;
    firstBloods: number;
  } | null;
  matchCount: number;
}

const QUEUE_NAMES: Record<number, string> = {
  420: "Ranked Solo",
  440: "Ranked Flex",
  400: "Normal Draft",
  430: "Normal Blind",
  450: "ARAM",
  1700: "Arena",
  0: "Custom",
};

function fmtK(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toFixed(0);
}

function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function WinBadge({ win }: { win: boolean }) {
  return (
    <span
      className={`inline-block w-8 rounded text-center text-xs font-bold py-0.5 ${
        win ? "bg-green-900/60 text-green-300" : "bg-red-900/60 text-red-300"
      }`}
    >
      {win ? "W" : "L"}
    </span>
  );
}

function SectionHeader({
  icon,
  title,
  stats,
  open,
  onToggle,
}: {
  icon: string;
  title: string;
  stats: { label: string; value: string }[];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 bg-[#1a1f2e] hover:bg-[#1e2436] rounded-lg transition-colors text-left"
    >
      <span className="text-lg">{icon}</span>
      <span className="font-semibold text-white w-28 shrink-0">{title}</span>
      <div className="flex flex-wrap gap-x-5 gap-y-1 flex-1 min-w-0">
        {stats.map((s) => (
          <span key={s.label} className="text-sm text-gray-400">
            <span className="text-gray-500">{s.label}: </span>
            <span className="text-purple-300 font-medium">{s.value}</span>
          </span>
        ))}
      </div>
      <span className={`ml-auto text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
        ▾
      </span>
    </button>
  );
}

function MatchRow({ m, children }: { m: MatchStats; children: React.ReactNode }) {
  return (
    <tr className={`border-b border-[#1e2436] text-sm ${m.win ? "bg-green-950/20" : "bg-red-950/20"}`}>
      <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{fmtDate(m.gameCreation)}</td>
      <td className="px-3 py-2 text-purple-200 font-medium whitespace-nowrap">{m.champion}</td>
      <td className="px-3 py-2">
        <WinBadge win={m.win} />
      </td>
      {children}
    </tr>
  );
}

export function LoLStatsPanel({ puuid, region }: { puuid: string; region: string }) {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/lol/stats?puuid=${encodeURIComponent(puuid)}&region=${encodeURIComponent(region)}&count=10`)
      .then((r) => r.json())
      .then((d: StatsData & { error?: string }) => {
        if (cancelled) return;
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(() => { if (!cancelled) setError("Failed to load stats"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [puuid, region]);

  const toggle = (key: string) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  if (loading) {
    return (
      <div className="rounded-xl bg-[#0f1117] border border-[#1e2436] p-6 space-y-3 animate-pulse">
        <div className="h-5 w-48 bg-[#1a1f2e] rounded" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-[#1a1f2e] rounded-lg" />
        ))}
      </div>
    );
  }

  if (error || !data || !data.averages || data.matchCount === 0) {
    return (
      <div className="rounded-xl bg-[#0f1117] border border-[#1e2436] p-6 text-center text-gray-500 text-sm">
        {error ?? "No recent matches found."}
      </div>
    );
  }

  const { matches, averages, totals, matchCount } = data;
  const winRate = totals ? Math.round((totals.wins / matchCount) * 100) : 0;
  const avgKda = `${averages.kills?.toFixed(1)} / ${averages.deaths?.toFixed(1)} / ${averages.assists?.toFixed(1)}`;

  return (
    <div className="rounded-xl bg-[#0f1117] border border-[#1e2436] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#1e2436] flex flex-wrap items-center gap-x-6 gap-y-2">
        <h3 className="text-white font-bold text-lg">LoL Stats</h3>
        <span className="text-gray-400 text-sm">Last {matchCount} matches</span>
        <span className="text-sm">
          <span className="text-green-400 font-semibold">{totals?.wins}W</span>
          <span className="text-gray-500 mx-1">–</span>
          <span className="text-red-400 font-semibold">{totals?.losses}L</span>
          <span className="text-gray-500 ml-1">({winRate}%)</span>
        </span>
        <span className="text-sm text-gray-400">
          Avg KDA: <span className="text-purple-300 font-medium">{avgKda}</span>{" "}
          <span className="text-gray-500">({averages.kda?.toFixed(2)})</span>
        </span>
        {totals && totals.pentaKills > 0 && (
          <span className="text-xs bg-yellow-900/50 text-yellow-300 border border-yellow-700/40 px-2 py-0.5 rounded-full font-bold">
            🔥 {totals.pentaKills} Penta{totals.pentaKills !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="p-4 space-y-2">
        {/* ── COMBAT ── */}
        <SectionHeader
          icon="⚔️"
          title="Combat"
          open={!!open["combat"]}
          onToggle={() => toggle("combat")}
          stats={[
            { label: "Avg K/D/A", value: avgKda },
            { label: "KDA", value: averages.kda?.toFixed(2) },
            { label: "KP%", value: `${averages.killParticipation?.toFixed(0)}%` },
            { label: "First Bloods", value: String(totals?.firstBloods ?? 0) },
          ]}
        />
        {open["combat"] && (
          <div className="overflow-x-auto rounded-lg border border-[#1e2436]">
            <table className="w-full min-w-[540px] text-xs">
              <thead>
                <tr className="bg-[#121620] text-gray-500 uppercase text-[10px] tracking-wide">
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Champion</th>
                  <th className="px-3 py-2 text-left">W/L</th>
                  <th className="px-3 py-2 text-right">K/D/A</th>
                  <th className="px-3 py-2 text-right">KDA</th>
                  <th className="px-3 py-2 text-right">KP%</th>
                  <th className="px-3 py-2 text-right">Multi</th>
                  <th className="px-3 py-2 text-right">Solo</th>
                  <th className="px-3 py-2 text-left">Mode</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <MatchRow key={m.matchId} m={m}>
                    <td className="px-3 py-2 text-right font-mono text-gray-200">
                      {m.kills}/{m.deaths}/{m.assists}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-300">{m.kda.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-gray-300">{m.killParticipation}%</td>
                    <td className="px-3 py-2 text-right text-gray-300">
                      {m.pentaKills > 0 ? (
                        <span className="text-yellow-400 font-bold">PENTA</span>
                      ) : m.quadraKills > 0 ? (
                        <span className="text-orange-400 font-semibold">QUADRA</span>
                      ) : m.tripleKills > 0 ? (
                        <span className="text-blue-400">TRIPLE</span>
                      ) : m.doubleKills > 0 ? (
                        <span className="text-gray-400">DOUBLE</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-400">{m.soloKills}</td>
                    <td className="px-3 py-2 text-left text-gray-500 whitespace-nowrap">
                      {QUEUE_NAMES[m.queueId] ?? `Q${m.queueId}`}
                    </td>
                  </MatchRow>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── VISION ── */}
        <SectionHeader
          icon="👁️"
          title="Vision"
          open={!!open["vision"]}
          onToggle={() => toggle("vision")}
          stats={[
            { label: "Avg Wards", value: averages.wardsPlaced?.toFixed(1) },
            { label: "Pink Wards", value: averages.controlWardsPlaced?.toFixed(1) },
            { label: "Ward Kills", value: averages.wardsKilled?.toFixed(1) },
            { label: "Vision Score", value: averages.visionScore?.toFixed(0) },
          ]}
        />
        {open["vision"] && (
          <div className="overflow-x-auto rounded-lg border border-[#1e2436]">
            <table className="w-full min-w-[480px] text-xs">
              <thead>
                <tr className="bg-[#121620] text-gray-500 uppercase text-[10px] tracking-wide">
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Champion</th>
                  <th className="px-3 py-2 text-left">W/L</th>
                  <th className="px-3 py-2 text-right">Wards Placed</th>
                  <th className="px-3 py-2 text-right">Pink Placed</th>
                  <th className="px-3 py-2 text-right">Ward Kills</th>
                  <th className="px-3 py-2 text-right">Vision Score</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <MatchRow key={m.matchId} m={m}>
                    <td className="px-3 py-2 text-right text-gray-300">{m.wardsPlaced}</td>
                    <td className="px-3 py-2 text-right text-gray-300">{m.controlWardsPlaced}</td>
                    <td className="px-3 py-2 text-right text-gray-300">{m.wardsKilled}</td>
                    <td className="px-3 py-2 text-right text-purple-300 font-medium">{m.visionScore}</td>
                  </MatchRow>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── OBJECTIVES ── */}
        <SectionHeader
          icon="🏆"
          title="Objectives"
          open={!!open["objectives"]}
          onToggle={() => toggle("objectives")}
          stats={[
            { label: "Avg Barons", value: averages.teamBaronKills?.toFixed(1) },
            { label: "Dragons", value: averages.teamDragonKills?.toFixed(1) },
            { label: "Heralds", value: averages.teamHeraldKills?.toFixed(1) },
            { label: "Grubs", value: averages.teamGrubKills?.toFixed(1) },
            { label: "Towers", value: averages.teamTowerKills?.toFixed(1) },
          ]}
        />
        {open["objectives"] && (
          <div className="overflow-x-auto rounded-lg border border-[#1e2436]">
            <table className="w-full min-w-[520px] text-xs">
              <thead>
                <tr className="bg-[#121620] text-gray-500 uppercase text-[10px] tracking-wide">
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Champion</th>
                  <th className="px-3 py-2 text-left">W/L</th>
                  <th className="px-3 py-2 text-right">Barons</th>
                  <th className="px-3 py-2 text-right">Dragons</th>
                  <th className="px-3 py-2 text-right">Heralds</th>
                  <th className="px-3 py-2 text-right">Grubs</th>
                  <th className="px-3 py-2 text-right">Towers</th>
                  <th className="px-3 py-2 text-right">Turret Kills</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <MatchRow key={m.matchId} m={m}>
                    <td className="px-3 py-2 text-right text-gray-300">{m.teamBaronKills}</td>
                    <td className="px-3 py-2 text-right text-gray-300">{m.teamDragonKills}</td>
                    <td className="px-3 py-2 text-right text-gray-300">{m.teamHeraldKills}</td>
                    <td className="px-3 py-2 text-right text-gray-300">{m.teamGrubKills}</td>
                    <td className="px-3 py-2 text-right text-gray-300">{m.teamTowerKills}</td>
                    <td className="px-3 py-2 text-right text-purple-300">{m.turretKills}</td>
                  </MatchRow>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── DAMAGE ── */}
        <SectionHeader
          icon="💥"
          title="Damage"
          open={!!open["damage"]}
          onToggle={() => toggle("damage")}
          stats={[
            { label: "Avg Dealt", value: fmtK(averages.totalDamageDealtToChampions) },
            { label: "Taken", value: fmtK(averages.totalDamageTaken) },
            { label: "Healing", value: fmtK(averages.totalHeal) },
          ]}
        />
        {open["damage"] && (
          <div className="overflow-x-auto rounded-lg border border-[#1e2436]">
            <table className="w-full min-w-[600px] text-xs">
              <thead>
                <tr className="bg-[#121620] text-gray-500 uppercase text-[10px] tracking-wide">
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Champion</th>
                  <th className="px-3 py-2 text-left">W/L</th>
                  <th className="px-3 py-2 text-right">Total Dealt</th>
                  <th className="px-3 py-2 text-right">Physical</th>
                  <th className="px-3 py-2 text-right">Magic</th>
                  <th className="px-3 py-2 text-right">True</th>
                  <th className="px-3 py-2 text-right">Dmg Taken</th>
                  <th className="px-3 py-2 text-right">Healing</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <MatchRow key={m.matchId} m={m}>
                    <td className="px-3 py-2 text-right text-purple-300 font-medium">
                      {fmtK(m.totalDamageDealtToChampions)}
                    </td>
                    <td className="px-3 py-2 text-right text-orange-300">
                      {fmtK(m.physicalDamageDealtToChampions)}
                    </td>
                    <td className="px-3 py-2 text-right text-blue-300">
                      {fmtK(m.magicDamageDealtToChampions)}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-300">
                      {fmtK(m.trueDamageDealtToChampions)}
                    </td>
                    <td className="px-3 py-2 text-right text-red-300">
                      {fmtK(m.totalDamageTaken)}
                    </td>
                    <td className="px-3 py-2 text-right text-green-300">
                      {fmtK(m.totalHeal)}
                    </td>
                  </MatchRow>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── ECONOMY ── */}
        <SectionHeader
          icon="💰"
          title="Economy"
          open={!!open["economy"]}
          onToggle={() => toggle("economy")}
          stats={[
            { label: "Avg Gold", value: fmtK(averages.goldEarned) },
            { label: "CS", value: averages.cs?.toFixed(0) },
            { label: "CS/min", value: averages.csPerMin?.toFixed(1) },
          ]}
        />
        {open["economy"] && (
          <div className="overflow-x-auto rounded-lg border border-[#1e2436]">
            <table className="w-full min-w-[480px] text-xs">
              <thead>
                <tr className="bg-[#121620] text-gray-500 uppercase text-[10px] tracking-wide">
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Champion</th>
                  <th className="px-3 py-2 text-left">W/L</th>
                  <th className="px-3 py-2 text-right">Gold Earned</th>
                  <th className="px-3 py-2 text-right">CS</th>
                  <th className="px-3 py-2 text-right">CS/min</th>
                  <th className="px-3 py-2 text-right">Duration</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <MatchRow key={m.matchId} m={m}>
                    <td className="px-3 py-2 text-right text-yellow-300 font-medium">
                      {fmtK(m.goldEarned)}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-300">{m.cs}</td>
                    <td className="px-3 py-2 text-right text-purple-300">{m.csPerMin}</td>
                    <td className="px-3 py-2 text-right text-gray-400 font-mono">
                      {fmtDuration(m.gameDuration)}
                    </td>
                  </MatchRow>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
