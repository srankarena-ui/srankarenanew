import { notFound } from "next/navigation"
import { createClient } from "@/core/supabase/server"
import { VaultGrid } from "@/modules/vault/components/VaultGrid"
import { DonorWall } from "@/modules/vault/components/DonorWall"

const PAGE_SIZE = 40

type Filter = "all" | "available" | "assigned"

export default async function VaultPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string; filter?: string }>
}) {
  const { locale } = await params
  const sp = await searchParams
  const filter: Filter = sp.filter === "available" || sp.filter === "assigned" ? sp.filter : "all"
  const page = Math.max(1, parseInt(sp.page ?? "1") || 1)

  const supabase = await createClient()

  // ponytail: vault is built but hidden for now — admin-only until we launch it.
  // Remove this guard to make it public.
  const { data: { user: gateUser } } = await supabase.auth.getUser()
  const { data: gateProfile } = gateUser
    ? await supabase.from("profiles").select("role").eq("id", gateUser.id).single()
    : { data: null }
  if (gateProfile?.role !== "admin") notFound()

  // Cheap count-only queries for the chips + page count (no rows fetched).
  const countQ = (f?: Filter) => {
    let q = supabase.from("vault_items").select("asset_id", { count: "exact", head: true })
    if (f && f !== "all") q = q.eq("status", f)
    return q
  }

  // Only the current page's rows ship to the client.
  const from = (page - 1) * PAGE_SIZE
  let rowsQ = supabase
    .from("vault_items")
    .select("asset_id, name, icon_url, rarity, price_cents, status, tournament_id, tournaments(id, title), donor:profiles!vault_items_donor_profile_id_fkey(username)")
    .order("name")
    .range(from, from + PAGE_SIZE - 1)
  if (filter !== "all") rowsQ = rowsQ.eq("status", filter)

  const [
    { data: items },
    { count: countAll },
    { count: countAvailable },
    { count: countAssigned },
    { count: countPriced },
    { data: { user } },
  ] = await Promise.all([
    rowsQ,
    countQ("all"),
    countQ("available"),
    countQ("assigned"),
    supabase.from("vault_items").select("asset_id", { count: "exact", head: true }).not("price_cents", "is", null),
    supabase.auth.getUser(),
  ])

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null }

  // Donor leaderboard — small aggregate over all donated items.
  const { data: donatedRows } = await supabase
    .from("vault_items")
    .select("price_cents, donor:profiles!vault_items_donor_profile_id_fkey(username)")
    .not("donor_profile_id", "is", null)

  const donorMap = new Map<string, { count: number; totalCents: number }>()
  for (const row of donatedRows ?? []) {
    const username = (row.donor as { username: string } | null)?.username
    if (!username) continue
    const cur = donorMap.get(username) ?? { count: 0, totalCents: 0 }
    cur.count += 1
    cur.totalCents += row.price_cents ?? 0
    donorMap.set(username, cur)
  }
  const donors = [...donorMap.entries()]
    .map(([username, s]) => ({ username, ...s }))
    .sort((a, b) => b.totalCents - a.totalCents)

  const counts = {
    all: countAll ?? 0,
    available: countAvailable ?? 0,
    assigned: countAssigned ?? 0,
    priced: countPriced ?? 0,
  }
  const filteredCount = counts[filter]
  const pageCount = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE))

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Prize Vault</h1>
        <p className="text-gray-400 text-sm mt-1">
          Items donated to S-Rank Arena — assigned as prizes for upcoming tournaments.
        </p>
      </div>
      <DonorWall donors={donors} locale={locale} />
      <VaultGrid
        items={items ?? []}
        counts={counts}
        filter={filter}
        page={page}
        pageCount={pageCount}
        isAdmin={profile?.role === "admin"}
        locale={locale}
      />
    </div>
  )
}
