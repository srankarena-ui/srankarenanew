import Link from "next/link"
import { donorTier, fmtUsd } from "../donor-tiers"
import { formatProfileSlug } from "@/core/lib/tag"

type Donor = { id: string; username: string; discriminator: string | null; count: number; totalCents: number }

export function DonorWall({ donors, locale }: { donors: Donor[]; locale: string }) {
  if (!donors.length) return null

  return (
    <div className="rounded-xl bg-[#0f1117] border border-[#1e2436] p-5">
      <h2 className="text-white font-bold text-lg mb-1">🏅 Muro de Donantes</h2>
      <p className="text-gray-500 text-xs mb-4">Gracias a quienes hacen posibles los premios.</p>

      <div className="flex flex-wrap gap-3">
        {donors.map((d, i) => {
          const tier = donorTier(d.totalCents)
          return (
            <Link
              key={d.id}
              href={`/${locale}/profile/${encodeURIComponent(formatProfileSlug(d.username, d.discriminator))}`}
              className="flex items-center gap-3 rounded-lg bg-[#1a1f2e] hover:bg-[#242b3d] border border-gray-800 px-4 py-2.5 transition-colors"
            >
              <span className="text-gray-600 font-bold text-sm w-5 text-center">{i + 1}</span>
              <div>
                <p className="text-white text-sm font-semibold leading-tight">
                  {tier && <span title={tier.name}>{tier.emoji} </span>}
                  {d.username}
                </p>
                <p className="text-[11px] text-gray-400">
                  <span className="text-green-400 font-medium">{fmtUsd(d.totalCents)}</span>
                  <span className="text-gray-600"> · {d.count} {d.count === 1 ? "item" : "items"}</span>
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
