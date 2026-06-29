import { NextResponse } from "next/server"
import { createClient } from "@/core/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

const SRANK_STEAM_ID64 = process.env.SRANK_STEAM_ID64!

type SteamAsset = { assetid: string; classid: string; instanceid: string }
type SteamDescription = {
  classid: string; instanceid: string
  name: string; icon_url: string; type: string
  market_hash_name?: string
  tradable?: number
  tags?: { category: string; localized_tag_name: string }[]
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  if (!SRANK_STEAM_ID64) return NextResponse.json({ error: "SRANK_STEAM_ID64 not configured" }, { status: 500 })

  // Steam caps each request at 2000 items and paginates via last_assetid.
  // ponytail: cap at 10 pages (20k items) — far beyond any realistic vault.
  const assets: SteamAsset[] = []
  const descMap = new Map<string, SteamDescription>()
  let startAssetId: string | undefined
  for (let page = 0; page < 10; page++) {
    const url = `https://steamcommunity.com/inventory/${SRANK_STEAM_ID64}/570/2?l=english&count=2000`
      + (startAssetId ? `&start_assetid=${startAssetId}` : "")
    const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } })
    if (!res.ok) return NextResponse.json({ error: `Steam API ${res.status}` }, { status: 502 })

    const inv = await res.json() as {
      assets?: SteamAsset[]; descriptions?: SteamDescription[]
      more_items?: number; last_assetid?: string
    }
    if (!inv.assets?.length) break
    assets.push(...inv.assets)
    inv.descriptions?.forEach(d => descMap.set(`${d.classid}_${d.instanceid}`, d))
    if (!inv.more_items || !inv.last_assetid) break
    startAssetId = inv.last_assetid
  }

  if (!assets.length) return NextResponse.json({ synced: 0 })

  const syncedAt = new Date().toISOString()

  // Only tradeable Immortal items — these are the hero cosmetics worth using as prizes.
  const items = assets
    .map(a => ({ asset: a, desc: descMap.get(`${a.classid}_${a.instanceid}`) }))
    .filter(({ desc }) =>
      desc?.tradable === 1 &&
      desc.tags?.find(t => t.category === "Rarity")?.localized_tag_name === "Immortal"
    )
    .map(({ asset, desc }) => ({
      asset_id: asset.assetid,
      class_id: asset.classid,
      name: desc!.name,
      icon_url: desc!.icon_url,
      market_hash_name: desc!.market_hash_name ?? desc!.name,
      rarity: desc!.tags?.find(t => t.category === "Rarity")?.localized_tag_name ?? null,
      hero: desc!.tags?.find(t => t.category === "HeroID")?.localized_tag_name ?? null,
      item_type: desc!.type ?? null,
      synced_at: syncedAt,
    }))

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ponytail: batch 200 to avoid Supabase request size limits
  for (let i = 0; i < items.length; i += 200) {
    const { error } = await admin.from("vault_items").upsert(items.slice(i, i + 200), {
      onConflict: "asset_id",
      ignoreDuplicates: false,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Drop unassigned rows this sync didn't touch (non-tradeable junk, or items
  // that left the inventory). Assigned/delivered prizes are kept.
  const { error: delErr } = await admin
    .from("vault_items")
    .delete()
    .eq("status", "available")
    .lt("synced_at", syncedAt)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  return NextResponse.json({ synced: items.length })
}
