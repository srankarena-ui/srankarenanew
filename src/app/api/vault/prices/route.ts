import { NextResponse } from "next/server"
import { createClient } from "@/core/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

const BATCH = 80            // names per request — the search endpoint isn't hard rate-limited
const DELAY_MS = 250
const STALE_DAYS = 7

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// "$1.23" / "1,23€" -> 123 cents
function parseCents(price: string | undefined): number | null {
  if (!price) return null
  const n = parseFloat(price.replace(/[^0-9.,]/g, "").replace(",", "."))
  return isNaN(n) ? null : Math.round(n * 100)
}

// Steam Market search returns the price + exact hash_name in one call, no login
// and no aggressive rate-limit — far faster than per-item priceoverview.
async function fetchPrice(name: string): Promise<number | null> {
  const res = await fetch(
    `https://steamcommunity.com/market/search/render/?appid=570&norender=1&count=10&query=${encodeURIComponent(name)}`,
    { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } }
  )
  if (!res.ok) return null
  const data = await res.json() as { results?: { hash_name: string; sell_price_text?: string }[] }
  const hit = data.results?.find(r => r.hash_name === name) ?? data.results?.[0]
  return parseCents(hit?.sell_price_text)
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const staleBefore = new Date(Date.now() - STALE_DAYS * 86400_000).toISOString()
  const { data: rows, error } = await admin
    .from("vault_items")
    .select("market_hash_name")
    .not("market_hash_name", "is", null)
    // PostgREST needs the dotted ISO timestamp quoted inside or()
    .or(`price_updated_at.is.null,price_updated_at.lt."${staleBefore}"`)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const names = [...new Set((rows ?? []).map(r => r.market_hash_name as string))]
  if (!names.length) return NextResponse.json({ updated: 0, remaining: 0 })

  const now = new Date().toISOString()
  let updated = 0
  for (const name of names.slice(0, BATCH)) {
    const cents = await fetchPrice(name)
    // Bump price_updated_at even when priceless so we don't keep retrying it.
    await admin.from("vault_items")
      .update({ price_cents: cents, price_updated_at: now })
      .eq("market_hash_name", name)
    updated++
    await sleep(DELAY_MS)
  }

  return NextResponse.json({ updated, remaining: Math.max(0, names.length - updated) })
}
