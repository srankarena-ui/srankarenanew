import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, rateLimitResponse, clientIp } from "@/core/lib/rate-limit"

const OPENDOTA = "https://api.opendota.com/api"

const GAME_MODES: Record<number, string> = {
  0: "Unknown", 1: "All Pick", 2: "CM", 3: "RD", 4: "SD",
  5: "All Random", 22: "Ranked AP", 23: "Turbo",
}

type RawMatch = {
  match_id: number
  player_slot: number   // 0-4 radiant, 128-132 dire
  radiant_win: boolean
  duration: number      // seconds
  start_time: number    // unix
  game_mode: number
  hero_id: number
  kills: number
  deaths: number
  assists: number
  gold_per_min: number
  xp_per_min: number
  hero_damage: number
  tower_damage: number
  hero_healing: number
  last_hits: number
  denies: number
  party_size: number | null
}

type HeroMap = Record<number, { localized_name: string; name: string }>

export async function GET(req: NextRequest) {
  if (!(await checkRateLimit(`dota2-stats:${clientIp(req)}`, 30, 60))) return rateLimitResponse()

  const { searchParams } = req.nextUrl
  const accountId = searchParams.get("account_id")
  const count = Math.min(parseInt(searchParams.get("count") ?? "20"), 50)

  if (!accountId) return NextResponse.json({ error: "account_id required" }, { status: 400 })

  try {
    const [matchesRes, heroesRes] = await Promise.all([
      fetch(`${OPENDOTA}/players/${accountId}/matches?limit=${count}`, {
        next: { revalidate: 300 },
      }),
      fetch(`${OPENDOTA}/constants/heroes`, {
        next: { revalidate: 86400 },
      }),
    ])

    if (matchesRes.status === 404) return NextResponse.json({ error: "Player not found" }, { status: 404 })
    if (!matchesRes.ok) return NextResponse.json({ error: "OpenDota unavailable" }, { status: 502 })

    const raw: RawMatch[] = await matchesRes.json()
    const heroes: HeroMap = heroesRes.ok ? await heroesRes.json() : {}

    if (!Array.isArray(raw) || raw.length === 0)
      return NextResponse.json({ matches: [], averages: null, totals: null, matchCount: 0 })

    const matches = raw.map((m) => {
      const isRadiant = m.player_slot < 128
      const win = isRadiant ? m.radiant_win : !m.radiant_win
      const kda = m.deaths === 0 ? m.kills + m.assists : (m.kills + m.assists) / m.deaths
      return {
        matchId: m.match_id,
        heroId: m.hero_id,
        heroName: heroes[m.hero_id]?.localized_name ?? `Hero ${m.hero_id}`,
        win,
        duration: m.duration,
        startTime: m.start_time * 1000,
        gameMode: GAME_MODES[m.game_mode] ?? `Mode ${m.game_mode}`,
        kills: m.kills,
        deaths: m.deaths,
        assists: m.assists,
        kda: parseFloat(kda.toFixed(2)),
        goldPerMin: m.gold_per_min,
        xpPerMin: m.xp_per_min,
        heroDamage: m.hero_damage,
        towerDamage: m.tower_damage,
        heroHealing: m.hero_healing,
        lastHits: m.last_hits,
        denies: m.denies,
        partySize: m.party_size ?? 1,
      }
    })

    const n = matches.length
    const avg = (key: keyof typeof matches[0]): number | null => {
      const vals = matches.map(m => m[key] as number | null).filter((v): v is number => v != null && !isNaN(v))
      if (!vals.length) return null
      return parseFloat((vals.reduce((a, v) => a + v, 0) / vals.length).toFixed(2))
    }

    const averages = {
      kills: avg("kills"), deaths: avg("deaths"), assists: avg("assists"), kda: avg("kda"),
      goldPerMin: avg("goldPerMin"), xpPerMin: avg("xpPerMin"),
      heroDamage: avg("heroDamage"), towerDamage: avg("towerDamage"), heroHealing: avg("heroHealing"),
      lastHits: avg("lastHits"), denies: avg("denies"),
    }

    const wins = matches.filter(m => m.win).length
    const totals = { wins, losses: n - wins }

    return NextResponse.json({ matches, averages, totals, matchCount: n })
  } catch {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
