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
import { PrizesEditor } from "@/modules/admin/components/PrizesEditor";
import { parsePrizeTable, type PrizeRow } from "@/core/lib/prize-table";
import { parseXpTable, type XpRow } from "@/core/lib/xp-table";
import { GLOBAL_REGION, RIOT_REGIONS_WITH_GLOBAL } from "@/core/lib/riot-regions";
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
  const [prizeRows, setPrizeRows] = useState<PrizeRow[]>([]);
  const [xpRows, setXpRows] = useState<XpRow[]>([]);
  const [prizeItemIds, setPrizeItemIds] = useState<Set<string>>(new Set());
  // Puesto que gana cada premio; sin entrada = premio sin posicion concreta.
  const [prizePlacements, setPrizePlacements] = useState<Record<string, number>>({});

  // Step 3 — Settings
  const [seriesFormat, setSeriesFormat] = useState("bo1");
  const [map, setMap] = useState("");
  const [region, setRegion] = useState<string>(GLOBAL_REGION);
  const [playerLimitType, setPlayerLimitType] = useState("limited");
  const [maxParticipants, setMaxParticipants] = useState("16");

  // Summoner Trials
  const [teamSize, setTeamSize] = useState<1 | 2 | 5>(1);
  const [tournamentFormat, setTournamentFormat] = useState<"standard" | "summoner_trials">("standard");
  const [trialMatchType, setTrialMatchType] = useState<"solo" | "duo" | "flex" | "draft">("solo");
  const [matchesToTrack, setMatchesToTrack] = useState("10");
  const [trialEndDate, setTrialEndDate] = useState("");

  const selectedGame = useMemo(() => games.find((g) => g.name === gameName), [games, gameName]);
  const isLoL = gameName === "League of Legends";
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
    formData.set("prize_table", JSON.stringify(parsePrizeTable(prizeRows)));
    formData.set("xp_table", JSON.stringify(parseXpTable(xpRows)));
    if (prizeItemIds.size) {
      formData.set("prize_item_ids", JSON.stringify(
        [...prizeItemIds].map((asset_id) => ({ asset_id, placement: prizePlacements[asset_id] ?? null }))
      ));
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

        {/* Premios del vault. No se limita a Dota: los objetos son de ese
            juego, pero cualquier torneo puede repartirlos. */}
        {/* Premios por puesto: Prize Pool (texto libre) y XP Prizes (numérico)
            en la misma ventana, porque son la misma mecánica de puesto/rango
            aplicada a dos tipos de premio distintos. */}
        <PrizesEditor
          prizeRows={prizeRows}
          onPrizeRowsChange={setPrizeRows}
          xpRows={xpRows}
          onXpRowsChange={setXpRows}
        />

        {vaultItems.length > 0 && (
          <div className="rounded-xl border border-gray-800 bg-[#0b0e14] p-4">
            <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
              🎁 Premios del Vault
            </label>
            <p className="mb-3 text-[10px] text-gray-600">
              Selecciona items donados para asignarlos como premios de este torneo.
            </p>
            <VaultPrizePicker
              items={vaultItems}
              selected={prizeItemIds}
              onToggle={togglePrize}
              placements={prizePlacements}
              onPlacement={(assetId, placement) =>
                setPrizePlacements((prev) => {
                  const next = { ...prev };
                  if (placement == null) delete next[assetId];
                  else next[assetId] = placement;
                  return next;
                })
              }
            />
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
                {RIOT_REGIONS_WITH_GLOBAL.map((r) => (
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
                Al terminar el evento cuentan las partidas jugadas hasta ese momento.
                Quien juegue menos de {matchesToTrack || 10} simplemente acumula menos puntos.
              </p>
            )}

            {/* Los pesos de puntuación no se configuran por torneo: están
                calibrados contra partidas reales y viven en SCORING_WEIGHTS
                (src/core/lib/role-score.ts). Dejar que cada organizador los
                retocara rompería la comparación entre eventos. La XP por
                puesto se define en el paso 2, pestaña "XP Prizes". */}
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
            <div>
              <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
                Region
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-[#0b0e14] px-4 py-3 text-sm font-bold text-gray-200 outline-hidden transition-colors focus:border-[var(--color-accent)]"
              >
                {RIOT_REGIONS_WITH_GLOBAL.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
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
