"use client"

import { useEffect, useState } from "react"

type Match = {
  matchId: number
  heroName: string
  win: boolean
  duration: number
  startTime: number
  gameMode: string
  kills: number
  deaths: number
  assists: number
  kda: number
  goldPerMin: number | null
  xpPerMin: number | null
  heroDamage: number | null
  towerDamage: number | null
  heroHealing: number | null
  lastHits: number | null
  denies: number | null
}

type StatsData = {
  matches: Match[]
  averages: Record<string, number | null> | null
  totals: { wins: number; losses: number } | null
  matchCount: number
}

function fmtK(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n))
}

function fmtDuration(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function WinBadge({ win }: { win: boolean }) {
  return (
    <span className={`inline-block w-8 rounded text-center text-xs font-bold py-0.5 ${
      win ? "bg-green-900/60 text-green-300" : "bg-red-900/60 text-red-300"
    }`}>
      {win ? "W" : "L"}
    </span>
  )
}

function SectionHeader({
  icon, title, stats, open, onToggle,
}: {
  icon: string; title: string; stats: { label: string; value: string | undefined }[]
  open: boolean; onToggle: () => void
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
            <span className="text-red-300 font-medium">{s.value ?? "—"}</span>
          </span>
        ))}
      </div>
      <span className={`ml-auto text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
    </button>
  )
}

function THead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="bg-[#121620] text-gray-500 uppercase text-[10px] tracking-wide">
        <th className="px-3 py-2 text-left">Date</th>
        <th className="px-3 py-2 text-left">Hero</th>
        <th className="px-3 py-2 text-left">W/L</th>
        {cols.map(c => <th key={c} className="px-3 py-2 text-right">{c}</th>)}
      </tr>
    </thead>
  )
}

function MRow({ m, children }: { m: Match; children: React.ReactNode }) {
  return (
    <tr className={`border-b border-[#1e2436] text-sm ${m.win ? "bg-green-950/20" : "bg-red-950/20"}`}>
      <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{fmtDate(m.startTime)}</td>
      <td className="px-3 py-2 text-red-200 font-medium whitespace-nowrap">{m.heroName}</td>
      <td className="px-3 py-2"><WinBadge win={m.win} /></td>
      {children}
    </tr>
  )
}

export function Dota2StatsPanel({ accountId }: { accountId: number }) {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    fetch(`/api/dota2/stats?account_id=${accountId}&count=20`)
      .then(r => r.json())
      .then((d: StatsData & { error?: string }) => {
        if (cancelled) return
        if (d.error) { setError(d.error); return }
        setData(d)
      })
      .catch(() => { if (!cancelled) setError("Failed to load stats") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [accountId])

  const toggle = (k: string) => setOpen(p => ({ ...p, [k]: !p[k] }))

  if (loading) return (
    <div className="rounded-xl bg-[#0f1117] border border-[#1e2436] p-6 space-y-3 animate-pulse">
      <div className="h-5 w-48 bg-[#1a1f2e] rounded" />
      {[1,2,3,4].map(i => <div key={i} className="h-12 bg-[#1a1f2e] rounded-lg" />)}
    </div>
  )

  if (error || !data?.averages || data.matchCount === 0) return (
    <div className="rounded-xl bg-[#0f1117] border border-[#1e2436] p-6 text-center text-gray-500 text-sm">
      {error ?? "No recent Dota 2 matches found."}
    </div>
  )

  const { matches, averages, totals, matchCount } = data
  const winRate = totals ? Math.round((totals.wins / matchCount) * 100) : 0
  const avgKda = `${averages.kills?.toFixed(1)} / ${averages.deaths?.toFixed(1)} / ${averages.assists?.toFixed(1)}`

  return (
    <div className="rounded-xl bg-[#0f1117] border border-[#1e2436] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1e2436] flex flex-wrap items-center gap-x-6 gap-y-2">
        <h3 className="text-white font-bold text-lg">Dota 2 Stats</h3>
        <span className="text-gray-400 text-sm">Last {matchCount} matches</span>
        <span className="text-sm">
          <span className="text-green-400 font-semibold">{totals?.wins}W</span>
          <span className="text-gray-500 mx-1">–</span>
          <span className="text-red-400 font-semibold">{totals?.losses}L</span>
          <span className="text-gray-500 ml-1">({winRate}%)</span>
        </span>
        <span className="text-sm text-gray-400">
          Avg KDA: <span className="text-red-300 font-medium">{avgKda}</span>{" "}
          <span className="text-gray-500">({averages.kda?.toFixed(2)})</span>
        </span>
      </div>

      <div className="p-4 space-y-2">
        {/* COMBAT */}
        <SectionHeader icon="⚔️" title="Combat" open={!!open.combat} onToggle={() => toggle("combat")}
          stats={[
            { label: "Avg K/D/A", value: avgKda },
            { label: "KDA", value: averages.kda?.toFixed(2) },
          ]}
        />
        {open.combat && (
          <div className="overflow-x-auto rounded-lg border border-[#1e2436]">
            <table className="w-full min-w-[480px] text-xs">
              <THead cols={["K/D/A", "KDA", "Mode", "Duration"]} />
              <tbody>
                {matches.map(m => (
                  <MRow key={m.matchId} m={m}>
                    <td className="px-3 py-2 text-right font-mono text-gray-200">{m.kills}/{m.deaths}/{m.assists}</td>
                    <td className="px-3 py-2 text-right text-gray-300">{m.kda.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-gray-500 whitespace-nowrap">{m.gameMode}</td>
                    <td className="px-3 py-2 text-right text-gray-400 font-mono">{fmtDuration(m.duration)}</td>
                  </MRow>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ECONOMY */}
        <SectionHeader icon="💰" title="Economy" open={!!open.economy} onToggle={() => toggle("economy")}
          stats={[
            { label: "Avg GPM", value: averages.goldPerMin?.toFixed(0) },
            { label: "XPM", value: averages.xpPerMin?.toFixed(0) },
            { label: "LH", value: averages.lastHits?.toFixed(0) },
          ]}
        />
        {open.economy && (
          <div className="overflow-x-auto rounded-lg border border-[#1e2436]">
            <table className="w-full min-w-[480px] text-xs">
              <THead cols={["GPM", "XPM", "Last Hits", "Denies"]} />
              <tbody>
                {matches.map(m => (
                  <MRow key={m.matchId} m={m}>
                    <td className="px-3 py-2 text-right text-yellow-300 font-medium">{m.goldPerMin ?? "—"}</td>
                    <td className="px-3 py-2 text-right text-blue-300">{m.xpPerMin ?? "—"}</td>
                    <td className="px-3 py-2 text-right text-gray-300">{m.lastHits ?? "—"}</td>
                    <td className="px-3 py-2 text-right text-gray-400">{m.denies ?? "—"}</td>
                  </MRow>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* DAMAGE */}
        <SectionHeader icon="💥" title="Damage" open={!!open.damage} onToggle={() => toggle("damage")}
          stats={[
            { label: "Avg Hero Dmg", value: averages.heroDamage != null ? fmtK(averages.heroDamage) : undefined },
            { label: "Tower Dmg", value: averages.towerDamage != null ? fmtK(averages.towerDamage) : undefined },
            { label: "Healing", value: averages.heroHealing != null ? fmtK(averages.heroHealing) : undefined },
          ]}
        />
        {open.damage && (
          <div className="overflow-x-auto rounded-lg border border-[#1e2436]">
            <table className="w-full min-w-[480px] text-xs">
              <THead cols={["Hero Damage", "Tower Damage", "Healing"]} />
              <tbody>
                {matches.map(m => (
                  <MRow key={m.matchId} m={m}>
                    <td className="px-3 py-2 text-right text-red-300 font-medium">{m.heroDamage != null ? fmtK(m.heroDamage) : "—"}</td>
                    <td className="px-3 py-2 text-right text-orange-300">{m.towerDamage != null ? fmtK(m.towerDamage) : "—"}</td>
                    <td className="px-3 py-2 text-right text-green-300">{m.heroHealing != null ? fmtK(m.heroHealing) : "—"}</td>
                  </MRow>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
