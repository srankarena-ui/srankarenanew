"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Input } from "@/core/ui/Input";
import { Button } from "@/core/ui/Button";
import { useToast } from "@/core/ui/Toast";
import { RichTextEditor } from "@/core/ui/RichTextEditor";
import { createTournament } from "@/modules/admin/actions";
import { VaultPrizePicker, type PickableItem } from "@/modules/vault/components/VaultPrizePicker";
import type { Game } from "@/core/types";

interface Props {
  games: Game[];
  vaultItems?: PickableItem[];
}

const STEPS = ["basics", "info", "settings"] as const;
type Step = (typeof STEPS)[number];

const SERIES_FORMATS = ["bo1", "bo3", "bo5"];
const CONTACT_METHODS = ["discord", "whatsapp", "telegram", "other"];
const PLAYER_LIMITS = ["limited", "unlimited"];

const RIOT_REGIONS: { value: string; label: string }[] = [
  { value: "na1",  label: "North America" },
  { value: "euw1", label: "Europe West" },
  { value: "eun1", label: "Europe Nordic & East" },
  { value: "kr",   label: "Korea" },
  { value: "br1",  label: "Brazil" },
  { value: "la1",  label: "Latin America North" },
  { value: "la2",  label: "Latin America South" },
  { value: "jp1",  label: "Japan" },
  { value: "tr1",  label: "Turkey" },
  { value: "ru",   label: "Russia" },
  { value: "oc1",  label: "Oceania" },
  { value: "ph2",  label: "Philippines" },
  { value: "sg2",  label: "Singapore" },
  { value: "th2",  label: "Thailand" },
  { value: "tw2",  label: "Taiwan" },
  { value: "vn2",  label: "Vietnam" },
];

const TRIAL_MATCH_TYPES = [
  {
    value: "solo" as const,
    label: "🎯 Solo",
    desc: "Ranked Solo/Duo (queue 420) — only solo games, no duo partner",
  },
  {
    value: "duo" as const,
    label: "👥 Duo",
    desc: "Ranked Solo/Duo (queue 420) — only with registered duo partner",
  },
  {
    value: "flex" as const,
    label: "🛡️ Flex",
    desc: "Ranked Flex (queue 440) — only with registered team",
  },
  {
    value: "draft" as const,
    label: "📋 Draft",
    desc: "Normal Draft Pick (queue 400)",
  },
];

export function CreateTournamentWizard({ games, vaultItems = [] }: Props) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1 — Basics
  const [bannerUrl, setBannerUrl] = useState("");
  const [title, setTitle] = useState("");
  const [gameName, setGameName] = useState(games[0]?.name || "");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");

  // Step 2 — Info
  const [contactMethod, setContactMethod] = useState("discord");
  const [contactLink, setContactLink] = useState("");
  const [rules, setRules] = useState("");
  const [prizes, setPrizes] = useState("");
  const [prizeItemIds, setPrizeItemIds] = useState<Set<string>>(new Set());

  // Step 3 — Settings
  const [seriesFormat, setSeriesFormat] = useState("bo1");
  const [map, setMap] = useState("");
  const [region, setRegion] = useState("");
  const [playerLimitType, setPlayerLimitType] = useState("limited");
  const [maxParticipants, setMaxParticipants] = useState("16");
  const [rewardPoints, setRewardPoints] = useState("100");

  // Summoner Trials
  const [teamSize, setTeamSize] = useState<1 | 2 | 5>(1);
  const [tournamentFormat, setTournamentFormat] = useState<"standard" | "summoner_trials">("standard");
  const [trialMatchType, setTrialMatchType] = useState<"solo" | "duo" | "flex" | "draft">("solo");
  const [matchesToTrack, setMatchesToTrack] = useState("10");
  const [trialEndDate, setTrialEndDate] = useState("");
  const [rewardDistribution, setRewardDistribution] = useState("100,75,50,25,10");
  const [weights, setWeights] = useState({
    kda: 10, kill_participation: 1, vision_score: 1, cs_per_min: 2,
    damage: 0.001, wards_placed: 0.5, objectives: 3,
  });

  const selectedGame = useMemo(() => games.find((g) => g.name === gameName), [games, gameName]);
  const isLoL = gameName === "League of Legends";
  const isDota = gameName === "Dota 2";
  const isSummonerTrials = isLoL && tournamentFormat === "summoner_trials";

  function goTo(step: number) {
    if (step >= 0 && step <= 2) setCurrentStep(step);
  }

  function togglePrize(assetId: string) {
    setPrizeItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId); else next.add(assetId);
      return next;
    });
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast("Tournament name is required", "error");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.set("title", title);
    formData.set("description", "");
    formData.set("game", gameName);
    formData.set("series_format", seriesFormat);
    formData.set("max_participants", playerLimitType === "unlimited" ? "128" : maxParticipants);
    formData.set("start_date", startDate);
    formData.set("start_time", startTime);
    formData.set("rules", rules);
    formData.set("prizes", prizes);
    formData.set("region", isLoL ? region : "");
    formData.set("map", isLoL ? map : "");
    formData.set("banner_url", bannerUrl);
    formData.set("contact_method", contactLink ? `${contactMethod}: ${contactLink}` : contactMethod);
    formData.set("reward_points", rewardPoints);
    if (isDota && prizeItemIds.size) {
      formData.set("prize_item_ids", JSON.stringify([...prizeItemIds]));
    }
    if (!isSummonerTrials) {
      formData.set("team_size", String(teamSize));
    }
    if (isSummonerTrials) {
      formData.set("tournament_format", "summoner_trials");
      formData.set("trials_config", JSON.stringify({
        matches_to_track: parseInt(matchesToTrack) || 10,
        ...(trialEndDate ? { end_date: trialEndDate } : {}),
        match_type: trialMatchType,
        scoring_weights: weights,
        point_distribution: rewardDistribution.split(",").map(n => parseInt(n.trim())).filter(n => !isNaN(n)),
      }));
    }

    const result = await createTournament(formData);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Tournament created!", "success");
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
              className={`relative flex flex-1 items-center justify-center gap-2.5 py-3.5 text-[10px] uppercase tracking-[0.25em] transition-all ${
                isActive
                  ? "bg-gradient-to-b from-purple-500/20 to-transparent text-white"
                  : isCompleted
                    ? "text-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]/5"
                    : "text-gray-600 hover:text-gray-500"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] ${
                  isActive
                    ? "bg-[var(--color-accent-hover)] text-white"
                    : isCompleted
                      ? "bg-[var(--color-accent-hover)]/30 text-[var(--color-accent)]"
                      : "bg-gray-800 text-gray-600"
                }`}
              >
                {i + 1}
              </span>
              {t(step)}
              {/* Active indicator line */}
              {isActive && (
                <span className="absolute bottom-0 left-0 h-[2px] w-full bg-[var(--color-accent-hover)]" />
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
        <h2 className="text-sm uppercase italic tracking-tighter text-white">
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
          {/* Game select */}
          <div>
            <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
              Game
            </label>
            <select
              value={gameName}
              onChange={(e) => { setGameName(e.target.value); setTournamentFormat("standard"); }}
              className="w-full rounded-xl border border-gray-800 bg-[#0b0e14] px-4 py-3 text-sm font-bold uppercase text-gray-200 outline-hidden transition-colors focus:border-[var(--color-accent)]"
            >
              {games.map((g) => (
                <option key={g.id} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <Input
            label="Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          {/* Time */}
          <Input
            label="Time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        {/* Tournament Format — only for LoL */}
        {isLoL && (
          <div>
            <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
              Tournament Format
            </label>
            <div className="flex gap-3">
              {(["standard", "summoner_trials"] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setTournamentFormat(fmt)}
                  className={`flex-1 rounded-xl border px-4 py-3 text-[10px] transition-colors ${
                    tournamentFormat === fmt
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-hover)]/10 text-purple-300"
                      : "border-gray-800 bg-[#0b0e14] text-gray-500 hover:border-gray-600"
                  }`}
                >
                  {fmt === "summoner_trials" ? "⚔️ Summoner Trials" : "🏆 Standard Bracket"}
                </button>
              ))}
            </div>
            {isSummonerTrials && (
              <p className="mt-2 text-[9px] text-[var(--color-accent)]/80">
                Players earn points based on ranked matches played after registering. Top scorers win.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Step 2: Contact & Rules ──
  function StepInfo() {
    return (
      <div className="space-y-6">
        <h2 className="text-sm uppercase italic tracking-tighter text-white">
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
              className="w-full rounded-xl border border-gray-800 bg-[#0b0e14] px-4 py-3 text-sm font-bold uppercase text-gray-200 outline-hidden transition-colors focus:border-[var(--color-accent)]"
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

        {/* Dota 2: pick real items from the vault as prizes */}
        {isDota && (
          <div className="rounded-xl border border-gray-800 bg-[#0b0e14] p-4">
            <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
              🎁 Premios del Vault (Dota 2)
            </label>
            <p className="mb-3 text-[10px] text-gray-600">
              Selecciona items donados para asignarlos como premios de este torneo.
            </p>
            <VaultPrizePicker items={vaultItems} selected={prizeItemIds} onToggle={togglePrize} />
          </div>
        )}
      </div>
    );
  }

  // ── Step 3: Match Settings ──
  function StepSettings() {
    // ── Summoner Trials has its own dedicated layout ──
    if (isSummonerTrials) {
      return (
        <div className="space-y-6">
          <h2 className="text-sm uppercase italic tracking-tighter text-white">
            Step 3: Summoner Trials Settings
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
                Region
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-[#0b0e14] px-4 py-3 text-sm font-bold text-gray-200 outline-hidden transition-colors focus:border-[var(--color-accent)]"
              >
                <option value="">Select region…</option>
                {RIOT_REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
                Match Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TRIAL_MATCH_TYPES.map((mt) => (
                  <button
                    key={mt.value}
                    type="button"
                    onClick={() => setTrialMatchType(mt.value)}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      trialMatchType === mt.value
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-hover)]/10 text-purple-300"
                        : "border-gray-800 bg-[#0b0e14] text-gray-500 hover:border-gray-700"
                    }`}
                  >
                    <span className="block text-[10px]">{mt.label}</span>
                  </button>
                ))}
              </div>
              {TRIAL_MATCH_TYPES.find((m) => m.value === trialMatchType) && (
                <p className="mt-1.5 text-[9px] text-gray-600">
                  {TRIAL_MATCH_TYPES.find((m) => m.value === trialMatchType)!.desc}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
                Player Limit
              </label>
              <select
                value={playerLimitType}
                onChange={(e) => setPlayerLimitType(e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-[#0b0e14] px-4 py-3 text-sm font-bold uppercase text-gray-200 outline-hidden transition-colors focus:border-[var(--color-accent)]"
              >
                {PLAYER_LIMITS.map((pl) => (
                  <option key={pl} value={pl}>{pl}</option>
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

          {/* Summoner Trials config */}
          <div className="space-y-4 rounded-xl border border-purple-800/40 bg-purple-900/10 p-5">
            <h3 className="text-[10px] text-[var(--color-accent)]">
              ⚔️ Summoner Trials Configuration
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Matches to Track (per player)"
                type="number"
                value={matchesToTrack}
                onChange={(e) => setMatchesToTrack(e.target.value)}
                min={1}
                max={30}
              />
              <Input
                label="Event End Date"
                type="date"
                value={trialEndDate}
                onChange={(e) => setTrialEndDate(e.target.value)}
                placeholder="Optional"
              />
            </div>
            {trialEndDate && (
              <p className="-mt-2 text-[9px] text-[var(--color-accent)]/80">
                When the event ends, players with fewer than {matchesToTrack || 10} games will have missing games counted as 0 — scores are averaged over the full {matchesToTrack || 10} games.
              </p>
            )}

            <div>
              <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
                Scoring Weights
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    ["kda", "KDA"],
                    ["kill_participation", "Kill Part. (÷10)"],
                    ["vision_score", "Vision Score (÷10)"],
                    ["cs_per_min", "CS/min"],
                    ["damage", "Damage (÷10k)"],
                    ["wards_placed", "Wards Placed"],
                    ["objectives", "Objectives"],
                  ] as [keyof typeof weights, string][]
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="mb-1 block text-[8px] font-bold text-gray-600">
                      {label}
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min={0}
                      value={weights[key]}
                      onChange={(e) =>
                        setWeights((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))
                      }
                      className="w-full rounded-xl border border-gray-800 bg-[#0b0e14] px-3 py-2 text-sm font-bold text-gray-200 outline-hidden transition-colors focus:border-[var(--color-accent)]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Input
              label="Point Distribution (comma-separated, 1st→2nd→3rd…)"
              value={rewardDistribution}
              onChange={(e) => setRewardDistribution(e.target.value)}
              placeholder="100,75,50,25,10"
            />
          </div>
        </div>
      );
    }

    // ── Standard bracket settings ──
    return (
      <div className="space-y-6">
        <h2 className="text-sm uppercase italic tracking-tighter text-white">
          Step 3: Match Settings
        </h2>

        <div className={`grid gap-4 ${isLoL ? "grid-cols-3" : "grid-cols-1"}`}>
          {/* Best Of */}
          <div>
            <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
              Best Of
            </label>
            <select
              value={seriesFormat}
              onChange={(e) => setSeriesFormat(e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-[#0b0e14] px-4 py-3 text-sm font-bold uppercase text-gray-200 outline-hidden transition-colors focus:border-[var(--color-accent)]"
            >
              {SERIES_FORMATS.map((sf) => (
                <option key={sf} value={sf}>
                  {sf.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Map — only for LoL */}
          {isLoL && (
            <Input
              label="Map"
              value={map}
              onChange={(e) => setMap(e.target.value)}
              placeholder="Summoner's Rift"
            />
          )}

          {/* Region — only for LoL */}
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
          {/* Player Limit */}
          <div>
            <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
              Player Limit
            </label>
            <select
              value={playerLimitType}
              onChange={(e) => setPlayerLimitType(e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-[#0b0e14] px-4 py-3 text-sm font-bold uppercase text-gray-200 outline-hidden transition-colors focus:border-[var(--color-accent)]"
            >
              {PLAYER_LIMITS.map((pl) => (
                <option key={pl} value={pl}>
                  {pl}
                </option>
              ))}
            </select>
          </div>

          {/* Max */}
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

        {/* Team size — for LoL */}
        {isLoL && (
          <div>
            <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
              Team Size
            </label>
            <div className="flex gap-3">
              {([1, 2, 5] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setTeamSize(sz)}
                  className={`flex-1 rounded-xl border px-4 py-3 text-[10px] transition-colors ${
                    teamSize === sz
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-hover)]/10 text-purple-300"
                      : "border-gray-800 bg-[#0b0e14] text-gray-500 hover:border-gray-600"
                  }`}
                >
                  {sz === 1 ? "1v1 — Solo" : sz === 2 ? "2v2 — Duo" : "5v5 — Team"}
                </button>
              ))}
            </div>
            {teamSize > 1 && (
              <p className="mt-2 text-[9px] text-[var(--color-accent)]/80">
                {teamSize === 2
                  ? "Players must register with a linked duo partner."
                  : "Players must register with a linked team (up to 5)."}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {StepIndicator()}

      <div className="rounded-2xl border border-gray-800/50 bg-[#121620] p-6 md:p-8">
        {currentStep === 0 && StepBasics()}
        {currentStep === 1 && StepInfo()}
        {currentStep === 2 && StepSettings()}

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
              Create Tournament
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
