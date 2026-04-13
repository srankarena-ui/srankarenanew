"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Input } from "@/core/ui/Input";
import { Button } from "@/core/ui/Button";
import { useToast } from "@/core/ui/Toast";
import { RichTextEditor } from "@/core/ui/RichTextEditor";
import { updateTournament } from "@/modules/admin/actions";
import type { Game, Tournament } from "@/core/types";

interface Props {
  tournament: Tournament;
  games: Game[];
}

const STEPS = ["basics", "info", "settings"] as const;
const SERIES_FORMATS = ["bo1", "bo3", "bo5"];
const CONTACT_METHODS = ["discord", "whatsapp", "telegram", "other"];
const PLAYER_LIMITS = ["limited", "unlimited"];

export function EditTournamentWizard({ tournament, games }: Props) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Parse existing contact_method → method + link
  const existingContact = tournament.contact_method || "";
  const contactParts = existingContact.includes(": ")
    ? existingContact.split(": ")
    : [existingContact, ""];

  // Step 1 — Basics
  const [bannerUrl, setBannerUrl] = useState(tournament.banner_url || "");
  const [title, setTitle] = useState(tournament.title);
  const [gameName, setGameName] = useState(tournament.game);
  const [startDate, setStartDate] = useState(tournament.start_date || "");
  const [startTime, setStartTime] = useState(tournament.start_time || "");

  // Step 2 — Info
  const [contactMethod, setContactMethod] = useState(contactParts[0] || "discord");
  const [contactLink, setContactLink] = useState(contactParts[1] || "");
  const [rules, setRules] = useState(tournament.rules || "");
  const [prizes, setPrizes] = useState(tournament.prizes || "");

  // Step 3 — Settings
  const [seriesFormat, setSeriesFormat] = useState(tournament.series_format || "bo1");
  const [map, setMap] = useState(tournament.map || "");
  const [region, setRegion] = useState(tournament.region || "");
  const initialMax = tournament.max_participants;
  const [playerLimitType, setPlayerLimitType] = useState(
    initialMax >= 128 ? "unlimited" : "limited"
  );
  const [maxParticipants, setMaxParticipants] = useState(String(initialMax));
  const [rewardPoints, setRewardPoints] = useState(String(tournament.reward_points));

  const isLoL = gameName === "League of Legends";

  function goTo(step: number) {
    if (step >= 0 && step <= 2) setCurrentStep(step);
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast("Tournament name is required", "error");
      return;
    }

    setLoading(true);

    const result = await updateTournament(tournament.id, {
      title,
      description: tournament.description,
      game: gameName,
      series_format: seriesFormat,
      max_participants: playerLimitType === "unlimited" ? 128 : Number(maxParticipants),
      start_date: startDate || null,
      start_time: startTime || null,
      rules: rules || null,
      prizes: prizes || null,
      region: isLoL ? region || null : null,
      map: isLoL ? map || null : null,
      banner_url: bannerUrl || null,
      contact_method: contactLink ? `${contactMethod}: ${contactLink}` : contactMethod,
      reward_points: Number(rewardPoints) || 0,
    });

    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Tournament updated!", "success");
      router.push(`/${locale}/admin`);
    }
    setLoading(false);
  }

  // ── Stepper ──
  function StepIndicator() {
    return (
      <div className="mb-8 flex overflow-hidden rounded-2xl border border-gray-800/60 bg-[#0d1017]">
        {STEPS.map((step, i) => {
          const isActive = i === currentStep;
          const isCompleted = i < currentStep;
          return (
            <button
              key={step}
              type="button"
              onClick={() => goTo(i)}
              className={`relative flex flex-1 items-center justify-center gap-2.5 py-3.5 text-[10px] font-black uppercase tracking-[0.25em] transition-all ${
                isActive
                  ? "bg-gradient-to-b from-purple-500/20 to-transparent text-white"
                  : isCompleted
                    ? "text-purple-400 hover:bg-purple-500/5"
                    : "text-gray-600 hover:text-gray-500"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black ${
                  isActive
                    ? "bg-purple-500 text-white"
                    : isCompleted
                      ? "bg-purple-500/30 text-purple-400"
                      : "bg-gray-800 text-gray-600"
                }`}
              >
                {i + 1}
              </span>
              {t(step)}
              {isActive && (
                <span className="absolute bottom-0 left-0 h-[2px] w-full bg-purple-500" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // ── Step 1: Basics ──
  function StepBasics() {
    return (
      <div className="space-y-6">
        <h2 className="text-sm font-black uppercase italic tracking-tighter text-white">
          Step 1: Tournament Basics
        </h2>

        <Input
          label="Banner URL"
          value={bannerUrl}
          onChange={(e) => setBannerUrl(e.target.value)}
          placeholder="https://imgur.com/your-image.png"
        />

        <Input
          label="Tournament Name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. S-Rank Tournament 3.0"
          required
        />

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
              Game
            </label>
            <select
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-[#0b0e14] px-4 py-3 text-sm font-bold uppercase text-gray-200 outline-hidden transition-colors focus:border-purple-500"
            >
              {games.map((g) => (
                <option key={g.id} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <Input
            label="Time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
      </div>
    );
  }

  // ── Step 2: Contact & Rules ──
  function StepInfo() {
    return (
      <div className="space-y-6">
        <h2 className="text-sm font-black uppercase italic tracking-tighter text-white">
          {t("wizardStep2")}
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
              {t("contactMethod")}
            </label>
            <select
              value={contactMethod}
              onChange={(e) => setContactMethod(e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-[#0b0e14] px-4 py-3 text-sm font-bold uppercase text-gray-200 outline-hidden transition-colors focus:border-purple-500"
            >
              {CONTACT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <Input
            label={`${contactMethod === "discord" ? "Discord" : contactMethod} ${t("linkLabel")}`}
            value={contactLink}
            onChange={(e) => setContactLink(e.target.value)}
            placeholder={
              contactMethod === "discord"
                ? "https://discord.gg/..."
                : "https://..."
            }
          />
        </div>

        <RichTextEditor
            label={t("rules")}
            value={rules}
            onChange={setRules}
            placeholder={t("describeRulesPlaceholder")}
            rows={4}
          />

        <div>
          <RichTextEditor
            label={t("prizes")}
            value={prizes}
            onChange={setPrizes}
            placeholder={t("describePrizesPlaceholder")}
            rows={3}
          />
        </div>
      </div>
    );
  }

  // ── Step 3: Match Settings ──
  function StepSettings() {
    return (
      <div className="space-y-6">
        <h2 className="text-sm font-black uppercase italic tracking-tighter text-white">
          Step 3: Match Settings
        </h2>

        <div className={`grid gap-4 ${isLoL ? "grid-cols-3" : "grid-cols-1"}`}>
          <div>
            <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
              Best Of
            </label>
            <select
              value={seriesFormat}
              onChange={(e) => setSeriesFormat(e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-[#0b0e14] px-4 py-3 text-sm font-bold uppercase text-gray-200 outline-hidden transition-colors focus:border-purple-500"
            >
              {SERIES_FORMATS.map((sf) => (
                <option key={sf} value={sf}>
                  {sf.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {isLoL && (
            <Input
              label="Map"
              value={map}
              onChange={(e) => setMap(e.target.value)}
              placeholder="Summoner's Rift"
            />
          )}

          {isLoL && (
            <Input
              label="Region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="North America"
            />
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
              Player Limit
            </label>
            <select
              value={playerLimitType}
              onChange={(e) => setPlayerLimitType(e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-[#0b0e14] px-4 py-3 text-sm font-bold uppercase text-gray-200 outline-hidden transition-colors focus:border-purple-500"
            >
              {PLAYER_LIMITS.map((pl) => (
                <option key={pl} value={pl}>
                  {pl}
                </option>
              ))}
            </select>
          </div>

          {playerLimitType === "limited" && (
            <Input
              label="Max"
              type="number"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              min={2}
              max={128}
            />
          )}

          <Input
            label="Reward Points"
            type="number"
            value={rewardPoints}
            onChange={(e) => setRewardPoints(e.target.value)}
            min={0}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">
          Edit Tournament
        </h1>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
          {tournament.title}
        </p>
      </div>

      <StepIndicator />

      <div className="rounded-2xl border border-gray-800/50 bg-[#121620] p-6 md:p-8">
        {currentStep === 0 && <StepBasics />}
        {currentStep === 1 && <StepInfo />}
        {currentStep === 2 && <StepSettings />}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between border-t border-gray-800/50 pt-6">
          {currentStep > 0 ? (
            <Button variant="ghost" onClick={() => goTo(currentStep - 1)}>
              ← Back
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => router.push(`/${locale}/admin`)}>
              Cancel
            </Button>
          )}

          {currentStep < 2 ? (
            <Button onClick={() => goTo(currentStep + 1)} disabled={currentStep === 0 && !title.trim()}>
              Next →
            </Button>
          ) : (
            <Button onClick={handleSubmit} isLoading={loading} disabled={!title.trim()}>
              Save Changes
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
