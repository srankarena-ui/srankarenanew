import { Badge } from "@/core/ui/Badge";
import { Card } from "@/core/ui/Card";
import { getRankForXp } from "@/core/lib/ranks";
import { formatProfileSlug } from "@/core/lib/tag";
import { donorTier, fmtUsd } from "@/modules/vault/donor-tiers";
import type { Profile } from "@/core/types";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface ProfileHeaderProps {
  profile: Profile;
  locale: string;
  donationTotalCents?: number;
}

export function ProfileHeader({ profile, locale, donationTotalCents = 0 }: ProfileHeaderProps) {
  const t = useTranslations("profile");
  const xp = profile.experience ?? 0;
  const currentRank = getRankForXp(xp);
  const tier = donorTier(donationTotalCents);

  return (
    <Card className="relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute -right-10 -top-10 h-48 w-48 rounded-full blur-[80px] opacity-20"
        style={{ backgroundColor: currentRank.color }}
      />

      <div className="relative flex items-center gap-6">
        {/* Avatar */}
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[2rem] bg-gradient-to-br from-purple-600 to-purple-900 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
          <span className="text-3xl text-white">
            {profile.username?.charAt(0).toUpperCase() || "?"}
          </span>
        </div>

        {/* Info */}
        <div>
          <h1 className="text-3xl uppercase italic tracking-tighter text-white">
            {profile.username}
            {profile.discriminator && (
              <span className="ml-1 text-lg not-italic tracking-normal text-gray-600">
                #{profile.discriminator}
              </span>
            )}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={profile.role === "admin" ? "danger" : profile.role === "organizador" ? "warning" : "success"}>
              {profile.role === "admin" ? t("roleAdmin") : profile.role === "organizador" ? t("roleOrganizer") : t("roleCompetitor")}
            </Badge>
            <Badge variant="accent">
              {t("levelLabel", { level: Math.floor(xp / 100) + 1 })}
            </Badge>
            {tier && (
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ color: tier.color, borderColor: tier.color }}
                title={`Donante ${tier.name} · ${fmtUsd(donationTotalCents)} donados`}
              >
                {tier.emoji} Donante {tier.name}
              </span>
            )}
          </div>
          <Link
            href={`/${locale}/profile/${encodeURIComponent(formatProfileSlug(profile.username, profile.discriminator))}/achievements`}
            className="mt-2 inline-block text-[10px] font-bold text-gray-500 hover:text-[var(--color-accent)] transition-colors"
          >
            {t("viewAchievements")} →
          </Link>
        </div>
      </div>
    </Card>
  );
}
