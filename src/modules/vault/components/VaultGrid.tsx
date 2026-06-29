"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

type VaultItem = {
  asset_id: string
  name: string
  icon_url: string
  rarity: string | null
  status: string
  price_cents: number | null
  tournament_id: string | null
  tournaments?: { id: string; title: string } | null
  donor?: { username: string | null } | null
}

type Filter = "all" | "available" | "assigned"
type Counts = { all: number; available: number; assigned: number; priced: number }

const RARITY_COLORS: Record<string, string> = {
  "Common":      "border-gray-600",
  "Uncommon":    "border-green-600",
  "Rare":        "border-blue-500",
  "Mythical":    "border-purple-500",
  "Legendary":   "border-yellow-500",
  "Immortal":    "border-orange-400",
  "Arcana":      "border-red-400",
  "Ancient":     "border-yellow-300",
}

function fmtPrice(cents: number | null) {
  if (cents == null) return null
  return `$${(cents / 100).toFixed(2)}`
}

function DonorEditor({ item }: { item: VaultItem }) {
  const [value, setValue] = useState(item.donor?.username ?? "")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(false)
  const router = useRouter()

  async function save() {
    if (value.trim() === (item.donor?.username ?? "")) return
    setSaving(true); setErr(false)
    const r = await fetch("/api/vault/donor", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asset_id: item.asset_id, username: value.trim() || null }),
    })
    setSaving(false)
    if (!r.ok) { setErr(true); return }
    router.refresh()
  }

  return (
    <input
      value={value}
      onChange={e => setValue(e.target.value)}
      onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
      onBlur={save}
      disabled={saving}
      placeholder="donante (username)"
      className={`mt-1 w-full text-[9px] bg-[#1a1f2e] border rounded px-1.5 py-0.5 text-gray-300 ${err ? "border-red-500" : "border-gray-700"}`}
    />
  )
}

function ItemCard({ item, isAdmin, locale }: { item: VaultItem; isAdmin: boolean; locale: string }) {
  const borderColor = RARITY_COLORS[item.rarity ?? ""] ?? "border-gray-700"
  const price = fmtPrice(item.price_cents)

  return (
    <div className={`rounded-lg border ${borderColor} bg-[#0f1117] overflow-hidden flex flex-col`}>
      <div className="relative bg-[#0a0c12] flex items-center justify-center h-20">
        {/* ponytail: Steam CDN image, no next/image needed since it's external and not optimized anyway */}
        <img
          src={`https://community.cloudflare.steamstatic.com/economy/image/${item.icon_url}/128x128`}
          alt={item.name}
          loading="lazy"
          decoding="async"
          className="h-full object-contain"
        />
        {price && (
          <span className="absolute bottom-0.5 left-0.5 text-[9px] font-bold px-1 py-0.5 rounded bg-black/70 text-green-400">
            {price}
          </span>
        )}
      </div>

      <div className="px-2 py-1.5 flex-1 flex flex-col gap-0.5">
        <p className="text-white text-[11px] font-semibold leading-tight truncate" title={item.name}>{item.name}</p>
        {item.rarity && <p className="text-[9px] font-bold" style={{ color: item.rarity === "Immortal" ? "#e07b39" : undefined }}>{item.rarity}</p>}
        {item.tournaments?.title && (
          <p className="text-[9px] text-yellow-400 truncate">🏆 {item.tournaments.title}</p>
        )}
        {item.donor?.username && (
          <Link href={`/${locale}/profile/${encodeURIComponent(item.donor.username)}`}
            className="text-[9px] text-sky-400 hover:text-sky-300 truncate mt-auto pt-0.5">
            🎁 {item.donor.username}
          </Link>
        )}
        {isAdmin && <DonorEditor item={item} />}
      </div>
    </div>
  )
}

export function VaultGrid({ items, counts, filter, page, pageCount, isAdmin, locale }: {
  items: VaultItem[]
  counts: Counts
  filter: Filter
  page: number
  pageCount: number
  isAdmin: boolean
  locale: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [syncing, setSyncing] = useState(false)
  const [pricing, setPricing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  function navigate(next: { filter?: Filter; page?: number }) {
    const p = new URLSearchParams(searchParams.toString())
    if (next.filter) { p.set("filter", next.filter); p.set("page", "1") }
    if (next.page) p.set("page", String(next.page))
    router.push(`${pathname}?${p.toString()}`)
  }

  async function sync() {
    setSyncing(true); setMsg(null)
    const r = await fetch("/api/vault/sync", { method: "POST" })
    const d = await r.json()
    setMsg(d.error ? `Error: ${d.error}` : `Synced ${d.synced} items`)
    setSyncing(false)
    if (!d.error) router.refresh()
  }

  // The market-search endpoint is fast and not hard rate-limited, so batches
  // chain back-to-back.
  async function updatePrices() {
    setPricing(true); setMsg(null)
    let total = 0
    for (let i = 0; i < 200; i++) {
      const r = await fetch("/api/vault/prices", { method: "POST" })
      const d = await r.json()
      if (d.error) { setMsg(`Error: ${d.error}`); break }
      total += d.updated
      setMsg(`Updated ${total} · ${d.remaining} left…`)
      if (d.remaining === 0 || d.updated === 0) { setMsg(`Done — ${total} prices updated.`); break }
    }
    setPricing(false)
    router.refresh()
  }

  const chips: { key: Filter; n: number }[] = [
    { key: "all", n: counts.all },
    { key: "available", n: counts.available },
    { key: "assigned", n: counts.assigned },
  ]

  if (counts.all === 0) return (
    <div className="text-center text-gray-500 py-20">
      <p className="text-4xl mb-3">🎁</p>
      <p className="font-semibold">The vault is empty.</p>
      {isAdmin && (
        <button onClick={sync} disabled={syncing}
          className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-bold rounded-lg">
          {syncing ? "Syncing…" : "Sync from Steam"}
        </button>
      )}
      {msg && <p className="mt-3 text-xs text-gray-400">{msg}</p>}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-[#0f1117] border border-gray-800 rounded-lg p-1">
          {chips.map(c => (
            <button key={c.key} onClick={() => navigate({ filter: c.key })}
              className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${filter === c.key ? "bg-[#1a1f2e] text-white" : "text-gray-500 hover:text-gray-300"}`}>
              {c.key} ({c.n})
            </button>
          ))}
        </div>
        {isAdmin && (
          <div className="ml-auto flex items-center gap-2">
            <button onClick={updatePrices} disabled={pricing || syncing}
              className="px-3 py-1.5 bg-[#1a1f2e] hover:bg-[#242b3d] border border-gray-700 text-gray-300 text-xs font-bold rounded-lg transition-colors disabled:opacity-50">
              {pricing ? "Updating…" : `↻ Update prices (${counts.priced}/${counts.all})`}
            </button>
            <button onClick={sync} disabled={pricing || syncing}
              className="px-3 py-1.5 bg-[#1a1f2e] hover:bg-[#242b3d] border border-gray-700 text-gray-300 text-xs font-bold rounded-lg transition-colors disabled:opacity-50">
              {syncing ? "Syncing…" : "↻ Sync Steam"}
            </button>
          </div>
        )}
        {msg && <span className="text-xs text-gray-400 w-full">{msg}</span>}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {items.map(item => (
          <ItemCard key={item.asset_id} item={item} isAdmin={isAdmin} locale={locale} />
        ))}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button onClick={() => navigate({ page: page - 1 })} disabled={page <= 1}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#1a1f2e] border border-gray-700 text-gray-300 disabled:opacity-40 hover:bg-[#242b3d] transition-colors">
            ← Prev
          </button>
          <span className="text-xs text-gray-400">Page {page} / {pageCount}</span>
          <button onClick={() => navigate({ page: page + 1 })} disabled={page >= pageCount}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#1a1f2e] border border-gray-700 text-gray-300 disabled:opacity-40 hover:bg-[#242b3d] transition-colors">
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
