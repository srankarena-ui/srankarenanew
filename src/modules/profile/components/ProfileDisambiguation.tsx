import Link from "next/link";
import { Card } from "@/core/ui/Card";
import { formatProfileSlug } from "@/core/lib/tag";
import type { Profile } from "@/core/types";

export function ProfileDisambiguation({ matches, locale }: { matches: Profile[]; locale: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="mb-2 text-2xl uppercase italic tracking-tighter text-white">
        Varios jugadores usan este nombre
      </h1>
      <p className="mb-6 text-sm text-gray-500">Elige a cuál te refieres.</p>

      <div className="space-y-3">
        {matches.map((profile) => (
          <Link key={profile.id} href={`/${locale}/profile/${encodeURIComponent(formatProfileSlug(profile.username, profile.discriminator))}`}>
            <Card hover className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-purple-900">
                <span className="text-lg text-white">
                  {profile.username?.charAt(0).toUpperCase() || "?"}
                </span>
              </div>
              <span className="text-sm font-bold text-white">
                {profile.username}
                {profile.discriminator && (
                  <span className="ml-1 font-normal text-gray-600">#{profile.discriminator}</span>
                )}
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
