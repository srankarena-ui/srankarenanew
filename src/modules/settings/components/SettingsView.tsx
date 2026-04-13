"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getRiotRegionTranslationKey } from "@/core/lib/riot-regions";
import { getRiotVerificationTargetIconId } from "@/core/lib/riot-verification";
import { Card } from "@/core/ui/Card";
import { Button } from "@/core/ui/Button";
import { Input } from "@/core/ui/Input";
import { Badge } from "@/core/ui/Badge";
import { useToast } from "@/core/ui/Toast";
import {
  startRiotIconVerification,
  completeRiotIconVerification,
  cancelRiotIconVerification,
  linkRiotAccountDirect,
  unlinkRiotAccount,
  verifyCRAccount,
  linkCRAccountDirect,
  unlinkCRAccount,
  updateProfile,
} from "@/modules/settings/actions";
import type { Profile, RiotVerificationChallenge, VerificationConfig } from "@/core/types";

interface SettingsViewProps {
  profile: Profile;
  riotVerificationChallenge: RiotVerificationChallenge | null;
  verificationConfig: VerificationConfig;
}

const PROFILE_ICON_CDN_VERSION = "14.10.1";

const LOL_REGIONS = [
  "br1",
  "eun1",
  "euw1",
  "jp1",
  "kr",
  "la1",
  "la2",
  "na1",
  "oc1",
  "tr1",
  "ru",
  "ph2",
  "sg2",
  "th2",
  "tw2",
  "vn2",
] as const;

function getProfileIconUrl(iconId: number) {
  return `https://ddragon.leagueoflegends.com/cdn/${PROFILE_ICON_CDN_VERSION}/img/profileicon/${iconId}.png`;
}

function ProfileIconPreview({ iconId, label }: { iconId: number; label: string }) {
  return (
    <div className="rounded-2xl border border-gray-800/60 bg-[#0d1017] p-4 text-center">
      <div className="mx-auto h-20 w-20 overflow-hidden rounded-2xl border border-gray-800 bg-[#121620]">
        <img
          src={getProfileIconUrl(iconId)}
          alt={label}
          className="h-full w-full object-cover"
        />
      </div>
      <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-black text-white">#{iconId}</p>
    </div>
  );
}

export function SettingsView({ profile, riotVerificationChallenge, verificationConfig }: SettingsViewProps) {
  const t = useTranslations("settings");
  const router = useRouter();
  const { toast } = useToast();
  const requireRiotVerification = verificationConfig.require_riot_verification;
  const requireCrVerification = verificationConfig.require_clash_royale_verification;
  const linkedRegionKey = getRiotRegionTranslationKey(profile.lol_region);
  const targetProfileIconId = riotVerificationChallenge ? getRiotVerificationTargetIconId(riotVerificationChallenge) : null;
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const verificationExpiresLabel = riotVerificationChallenge
    ? hasMounted
      ? new Date(riotVerificationChallenge.expires_at).toLocaleTimeString()
      : "--:--:--"
    : null;

  // Riot state
  const [gameName, setGameName] = useState("");
  const [tagline, setTagline] = useState("");
  const [region, setRegion] = useState("na1");
  const [riotLoading, setRiotLoading] = useState(false);

  // CR state
  const [crTag, setCrTag] = useState("");
  const [crToken, setCrToken] = useState("");
  const [crLoading, setCrLoading] = useState(false);

  // Profile state
  const [profileLoading, setProfileLoading] = useState(false);

  async function handleStartRiotVerification() {
    setRiotLoading(true);
    const result = requireRiotVerification
      ? await startRiotIconVerification(gameName, tagline, region)
      : await linkRiotAccountDirect(gameName, tagline, region);
    if ("error" in result && result.error) {
      toast(result.error, "error");
    } else {
      toast(requireRiotVerification ? t("verificationChallengeCreated") : t("riotLinkedDirectly"), requireRiotVerification ? "info" : "success");
      router.refresh();
    }
    setRiotLoading(false);
  }

  async function handleCompleteRiotVerification() {
    setRiotLoading(true);
    const result = await completeRiotIconVerification();
    if ("error" in result && result.error) toast(result.error, "error");
    else {
      toast(t("verificationSuccess"), "success");
      router.refresh();
    }
    setRiotLoading(false);
  }

  async function handleCancelRiotVerification() {
    setRiotLoading(true);
    const result = await cancelRiotIconVerification();
    if ("error" in result && result.error) toast(result.error, "error");
    else {
      toast(t("verificationReset"), "info");
      router.refresh();
    }
    setRiotLoading(false);
  }

  async function handleUnlinkRiot() {
    setRiotLoading(true);
    const result = await unlinkRiotAccount();
    if ("error" in result && result.error) toast(result.error, "error");
    else {
      toast(t("riotUnlinked"), "info");
      router.refresh();
    }
    setRiotLoading(false);
  }

  async function handleLinkCR() {
    setCrLoading(true);
    const result = requireCrVerification
      ? await verifyCRAccount(crTag, crToken)
      : await linkCRAccountDirect(crTag);
    if ("error" in result && result.error) toast(result.error, "error");
    else {
      toast(requireCrVerification ? t("crVerificationSuccess") : t("crLinkedDirectly"), "success");
      router.refresh();
    }
    setCrLoading(false);
  }

  async function handleUnlinkCR() {
    setCrLoading(true);
    const result = await unlinkCRAccount();
    if ("error" in result && result.error) toast(result.error, "error");
    else {
      toast(t("crUnlinked"), "info");
      router.refresh();
    }
    setCrLoading(false);
  }

  async function handleUpdateProfile(formData: FormData) {
    setProfileLoading(true);
    const result = await updateProfile(formData);
    if ("error" in result && result.error) toast(result.error, "error");
    else {
      toast(t("profileUpdated"), "success");
      router.refresh();
    }
    setProfileLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
      </div>

      {/* Profile settings */}
      <Card>
        <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-white">
          {t("profileSettings")}
        </h3>
        <form action={handleUpdateProfile} className="flex gap-3">
          <Input
            name="username"
            defaultValue={profile.username || ""}
            label={t("username")}
            className="flex-1"
          />
          <div className="flex items-end">
            <Button type="submit" isLoading={profileLoading}>
              {t("save")}
            </Button>
          </div>
        </form>
      </Card>

      {/* Riot Account */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            {t("riotAccount")}
          </h3>
          {profile.riot_gamename ? (
            <Badge variant="success">{t("linked")}</Badge>
          ) : (
            <Badge variant="default">{t("notLinked")}</Badge>
          )}
        </div>

        {profile.riot_gamename ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">
                {profile.riot_gamename}#{profile.riot_tagline}
              </p>
              <p className="text-xs text-gray-500">
                {linkedRegionKey ? t(linkedRegionKey as Parameters<typeof t>[0]) : profile.lol_region?.toUpperCase()}
              </p>
            </div>
            <Button variant="danger" size="sm" onClick={handleUnlinkRiot} isLoading={riotLoading}>
              {t("unlink")}
            </Button>
          </div>
        ) : requireRiotVerification && riotVerificationChallenge ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-purple-800/30 bg-purple-900/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-purple-300">
                {t("verificationPending")}
              </p>
              <p className="mt-2 text-sm font-bold text-white">
                {riotVerificationChallenge.game_name}#{riotVerificationChallenge.tagline}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {t("verificationInstructions")}
              </p>
              <p className="mt-3 rounded-xl border border-yellow-700/30 bg-yellow-900/10 px-3 py-2 text-xs text-yellow-200">
                {t("verificationMayTakeMinutes")}
              </p>
              <p className="mt-2 text-[11px] text-gray-500">
                {t("verificationExpires")}: <span suppressHydrationWarning>{verificationExpiresLabel}</span>
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ProfileIconPreview
                iconId={riotVerificationChallenge.initial_profile_icon_id}
                label={t("verificationIconStart")}
              />
              {targetProfileIconId !== null ? (
                <ProfileIconPreview
                  iconId={targetProfileIconId}
                  label={t("verificationIconTarget")}
                />
              ) : null}
            </div>

            <div className="rounded-xl border border-blue-800/30 bg-blue-900/10 px-4 py-3 text-xs text-blue-100">
              {t("verificationAnyDifferentIcon", { iconId: targetProfileIconId ?? 0 })}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleCompleteRiotVerification} isLoading={riotLoading}>
                {t("completeVerification")}
              </Button>
              <Button variant="secondary" onClick={handleCancelRiotVerification} isLoading={riotLoading}>
                {t("restartVerification")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {requireRiotVerification ? (
              <div className="rounded-xl border border-yellow-700/30 bg-yellow-900/10 px-4 py-3 text-xs text-yellow-200">
                {t("verificationMayTakeMinutes")}
              </div>
            ) : (
              <div className="rounded-xl border border-green-700/30 bg-green-900/10 px-4 py-3 text-xs text-green-100">
                {t("riotVerificationDisabledNotice")}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                label={t("gameName")}
                placeholder="PlayerName"
              />
              <Input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                label={t("tagline")}
                placeholder="NA1"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
                {t("region")}
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-[#0b0e14] px-4 py-3 text-sm text-gray-200 outline-hidden focus:border-purple-500"
              >
                {LOL_REGIONS.map((regionCode) => (
                  <option key={regionCode} value={regionCode}>
                    {t(`region_${regionCode}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={handleStartRiotVerification} isLoading={riotLoading} disabled={!gameName || !tagline}>
              {requireRiotVerification ? t("startVerification") : t("link")}
            </Button>
          </div>
        )}
      </Card>

      {/* Clash Royale Account */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            {t("clashRoyaleAccount")}
          </h3>
          {profile.cr_tag ? (
            <Badge variant="success">{t("linked")}</Badge>
          ) : (
            <Badge variant="default">{t("notLinked")}</Badge>
          )}
        </div>

        {profile.cr_tag ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white">{profile.cr_name || profile.cr_tag}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
                {profile.cr_tag}
              </p>
            </div>
            <Button variant="danger" size="sm" onClick={handleUnlinkCR} isLoading={crLoading}>
              {t("unlink")}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className={`rounded-xl px-4 py-3 text-xs ${requireCrVerification ? "border border-blue-800/30 bg-blue-900/10 text-blue-100" : "border border-green-700/30 bg-green-900/10 text-green-100"}`}>
              {requireCrVerification ? t("crVerificationInstructions") : t("crVerificationDisabledNotice")}
            </div>
            <div className={`grid gap-3 ${requireCrVerification ? "md:grid-cols-2" : ""}`}>
              <Input
                value={crTag}
                onChange={(e) => setCrTag(e.target.value)}
                label={t("playerTag")}
                placeholder="#2PP"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                className="flex-1"
              />
              {requireCrVerification && (
                <Input
                  value={crToken}
                  onChange={(e) => setCrToken(e.target.value)}
                  label={t("crVerificationToken")}
                  placeholder="a1b2c3d4"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  className="flex-1"
                />
              )}
            </div>
            <p className="text-xs text-gray-500">{requireCrVerification ? t("crVerificationHint") : t("crDirectLinkHint")}</p>
            <Button onClick={handleLinkCR} isLoading={crLoading} disabled={requireCrVerification ? !crTag || !crToken : !crTag}>
              {requireCrVerification ? t("verifyAndLink") : t("link")}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
