"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/core/ui/Button";
import { Input } from "@/core/ui/Input";
import { useAdminStore } from "@/modules/admin/store";
import { createTournament } from "@/modules/admin/actions";
import { useToast } from "@/core/ui/Toast";
import { useRouter } from "next/navigation";
import type { Game } from "@/core/types";

interface TournamentWizardProps {
  games: Game[];
  onClose: () => void;
}

const SERIES_FORMATS = ["bo1", "bo3", "bo5"];

export function TournamentWizard({ games, onClose }: TournamentWizardProps) {
  const t = useTranslations("admin");
  const { wizardStep, nextStep, prevStep } = useAdminStore();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gameId, setGameId] = useState(games[0]?.id || "");
  const [mode, setMode] = useState("");
  const [seriesFormat, setSeriesFormat] = useState("bo1");
  const [maxPlayers, setMaxPlayers] = useState("8");
  const [startDate, setStartDate] = useState("");
  const [rules, setRules] = useState("");
  const [rewardPoints, setRewardPoints] = useState("100");

  const selectedGame = games.find((g) => g.id === gameId);
  const modes = selectedGame?.modes || [];

  async function handleSubmit() {
    setLoading(true);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("description", description);
    formData.set("game_id", gameId);
    formData.set("mode", mode || modes[0] || "1v1");
    formData.set("series_format", seriesFormat);
    formData.set("max_players", maxPlayers);
    formData.set("start_date", startDate);
    formData.set("rules", rules);
    formData.set("reward_points", rewardPoints);

    const result = await createTournament(formData);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Tournament created!", "success");
      router.refresh();
      onClose();
    }
    setLoading(false);
  }

  const steps = [
    // Step 0: Basic info
    <div key="basic" className="space-y-3">
      <h3 className="text-sm font-black uppercase tracking-wider text-white">
        {t("step")} 1: {t("basicInfo")}
      </h3>
      <Input
        label={t("tournamentName")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="S-Rank Invitational"
        required
      />
      <div>
        <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
          {t("description")}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-gray-800 bg-[#0b0e14] px-4 py-3 text-sm text-gray-200 outline-hidden focus:border-purple-500"
        />
      </div>
    </div>,

    // Step 1: Game settings
    <div key="game" className="space-y-3">
      <h3 className="text-sm font-black uppercase tracking-wider text-white">
        {t("step")} 2: {t("gameSettings")}
      </h3>
      <div>
        <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
          {t("game")}
        </label>
        <select
          value={gameId}
          onChange={(e) => {
            setGameId(e.target.value);
            setMode("");
          }}
          className="w-full rounded-xl border border-gray-800 bg-[#0b0e14] px-4 py-3 text-sm text-gray-200 outline-hidden focus:border-purple-500"
        >
          {games.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>
      {modes.length > 0 && (
        <div>
          <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
            {t("mode")}
          </label>
          <div className="flex gap-2">
            {modes.map((m: string) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-xl border px-4 py-2 text-xs font-bold transition-colors ${
                  mode === m
                    ? "border-purple-500 bg-purple-500/20 text-purple-400"
                    : "border-gray-800 bg-[#0b0e14] text-gray-500 hover:border-gray-600"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
          {t("seriesFormat")}
        </label>
        <div className="flex gap-2">
          {SERIES_FORMATS.map((sf) => (
            <button
              key={sf}
              type="button"
              onClick={() => setSeriesFormat(sf)}
              className={`rounded-xl border px-4 py-2 text-xs font-bold uppercase transition-colors ${
                seriesFormat === sf
                  ? "border-purple-500 bg-purple-500/20 text-purple-400"
                  : "border-gray-800 bg-[#0b0e14] text-gray-500 hover:border-gray-600"
              }`}
            >
              {sf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>,

    // Step 2: Players & schedule
    <div key="players" className="space-y-3">
      <h3 className="text-sm font-black uppercase tracking-wider text-white">
        {t("step")} 3: {t("playersAndSchedule")}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t("maxPlayers")}
          type="number"
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(e.target.value)}
          min={2}
          max={128}
        />
        <Input
          label={t("rewardPoints")}
          type="number"
          value={rewardPoints}
          onChange={(e) => setRewardPoints(e.target.value)}
          min={0}
        />
      </div>
      <Input
        label={t("startDate")}
        type="datetime-local"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        required
      />
    </div>,

    // Step 3: Rules & confirm
    <div key="rules" className="space-y-3">
      <h3 className="text-sm font-black uppercase tracking-wider text-white">
        {t("step")} 4: {t("rulesAndConfirm")}
      </h3>
      <div>
        <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
          {t("rules")}
        </label>
        <textarea
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          rows={4}
          placeholder={t("rulesPlaceholder")}
          className="w-full rounded-xl border border-gray-800 bg-[#0b0e14] px-4 py-3 text-sm text-gray-200 outline-hidden focus:border-purple-500"
        />
      </div>
      <div className="rounded-xl border border-gray-800 bg-[#0b0e14] p-4">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-gray-500">
          {t("summary")}
        </p>
        <div className="space-y-1 text-sm text-gray-300">
          <p><span className="text-gray-500">Name:</span> {name}</p>
          <p><span className="text-gray-500">Game:</span> {selectedGame?.name}</p>
          <p><span className="text-gray-500">Mode:</span> {mode || modes[0]}</p>
          <p><span className="text-gray-500">Format:</span> {seriesFormat.toUpperCase()}</p>
          <p><span className="text-gray-500">Players:</span> {maxPlayers}</p>
          <p><span className="text-gray-500">Date:</span> {startDate || "—"}</p>
          <p><span className="text-gray-500">Points:</span> {rewardPoints}</p>
        </div>
      </div>
    </div>,
  ];

  return (
    <div className="w-full max-w-lg space-y-6">
      {/* Step indicators */}
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= wizardStep ? "bg-purple-500" : "bg-gray-800"
            }`}
          />
        ))}
      </div>

      {steps[wizardStep]}

      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={wizardStep === 0 ? onClose : prevStep}
        >
          {wizardStep === 0 ? t("cancel") : t("back")}
        </Button>
        {wizardStep < 3 ? (
          <Button onClick={nextStep} disabled={wizardStep === 0 && !name}>
            {t("next")}
          </Button>
        ) : (
          <Button onClick={handleSubmit} isLoading={loading} disabled={!name || !startDate}>
            {t("createTournament")}
          </Button>
        )}
      </div>
    </div>
  );
}
