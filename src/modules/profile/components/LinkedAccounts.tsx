import { Badge } from "@/core/ui/Badge";
import { Card } from "@/core/ui/Card";
import { useTranslations } from "next-intl";
import { getRiotRegionTranslationKey } from "@/core/lib/riot-regions";
import type { Profile } from "@/core/types";

interface GameConnectionsProps {
  profile: Profile;
  locale: string;
  dotaPersonaName?: string | null;
}

export function GameConnections({ profile, locale, dotaPersonaName }: GameConnectionsProps) {
  const t = useTranslations("profile");
  const settingsT = useTranslations("settings");
  const hasRiot = !!profile.riot_gamename;
  const hasCR = !!profile.cr_tag;
  const hasDota2 = !!profile.dota2_account_id;
  const riotRegionKey = getRiotRegionTranslationKey(profile.lol_region);

  return (
    <Card>
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-gray-400">
        {t("gameConnections")}
      </h3>

      {/* Riot / LoL */}
      <div className="mt-4 rounded-xl border border-gray-800 bg-[#0b0e14] p-4">
        {hasRiot ? (
          <a
            href={`/${locale}/lol?name=${encodeURIComponent(profile.riot_gamename!)}&tag=${encodeURIComponent(profile.riot_tagline!)}&region=${encodeURIComponent(profile.lol_region || "na1")}`}
            className="block transition-opacity hover:opacity-80"
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-500">
              {t("riotGames")}
            </p>
            <p className="mt-1 text-sm font-bold text-white">
              {profile.riot_gamename}
              <span className="text-gray-500">#{profile.riot_tagline}</span>
            </p>
            <div className="mt-1 flex items-center gap-2">
              {riotRegionKey && (
                <span className="text-[10px] font-bold text-purple-300">
                  {settingsT(riotRegionKey as Parameters<typeof settingsT>[0])}
                </span>
              )}
              <span className="text-[8px] font-bold text-[var(--color-accent)]">
                {t("viewStats")} →
              </span>
            </div>
          </a>
        ) : (
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-600">
              {t("noLolAccountLinked")}
            </p>
            <a
              href={`/${locale}/settings`}
              className="mt-2 inline-block text-xs font-bold text-[var(--color-accent)] hover:text-purple-300"
            >
              {t("linkRiotId")}
            </a>
          </div>
        )}
      </div>

      {/* Clash Royale */}
      <div className="mt-3 rounded-xl border border-gray-800 bg-[#0b0e14] p-4">
        {hasCR ? (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-500">
              Clash Royale
            </p>
            <p className="mt-1 text-sm font-bold text-white">
              {profile.cr_name || profile.cr_tag}
            </p>
            <Badge variant="warning" className="mt-1">
              {profile.cr_tag}
            </Badge>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-600">
              {t("noCrAccountLinked")}
            </p>
            <a
              href={`/${locale}/settings`}
              className="mt-2 inline-block text-xs font-bold text-[var(--color-accent)] hover:text-purple-300"
            >
              {t("linkCrTag")}
            </a>
          </div>
        )}
      </div>

      {/* Dota 2 */}
      <div className="mt-3 rounded-xl border border-gray-800 bg-[#0b0e14] p-4">
        {hasDota2 ? (
          <a
            href={`https://www.opendota.com/players/${profile.dota2_account_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block transition-opacity hover:opacity-80"
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-500">
              Dota 2
            </p>
            <p className="mt-1 text-sm font-bold text-white">
              {dotaPersonaName ?? `ID: ${profile.dota2_account_id}`}
            </p>
            {dotaPersonaName && (
              <p className="text-[10px] text-gray-500">ID: {profile.dota2_account_id}</p>
            )}
            <span className="text-[8px] font-bold text-red-400">
              Ver en OpenDota →
            </span>
          </a>
        ) : (
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-600">
              No Dota 2 account linked
            </p>
            <a
              href={`/${locale}/settings`}
              className="mt-2 inline-block text-xs font-bold text-[var(--color-accent)] hover:text-purple-300"
            >
              Link Dota 2
            </a>
          </div>
        )}
      </div>
    </Card>
  );
}
