"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/core/ui/Button";
import { Card } from "@/core/ui/Card";
import { useToast } from "@/core/ui/Toast";
import { updateAboutConfig } from "@/modules/admin/actions";
import type { AboutConfig, LocalizedString, TeamMember } from "@/core/types/site-content";

type Lang = "es" | "en";

const LANG_LABELS: Record<Lang, string> = { es: "Español", en: "English" };

interface AboutManagerProps {
  initialConfig: AboutConfig;
}

export function AboutManager({ initialConfig }: AboutManagerProps) {
  const t = useTranslations("admin");
  const { toast } = useToast();
  const [config, setConfig] = useState<AboutConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [lang, setLang] = useState<Lang>("es");

  function updateParagraph(idx: number, value: string) {
    const paragraphs = config.paragraphs.map((p, i) =>
      i === idx ? { ...p, [lang]: value } : p
    );
    setConfig({ ...config, paragraphs });
  }

  function addParagraph() {
    setConfig({ ...config, paragraphs: [...config.paragraphs, { es: "", en: "" }] });
  }

  function removeParagraph(idx: number) {
    setConfig({ ...config, paragraphs: config.paragraphs.filter((_, i) => i !== idx) });
  }

  function updateMember(idx: number, field: keyof TeamMember, value: string) {
    const members = config.members.map((m, i) => (i === idx ? { ...m, [field]: value } : m));
    setConfig({ ...config, members });
  }

  function addMember() {
    setConfig({
      ...config,
      members: [
        ...config.members,
        { id: crypto.randomUUID(), name: "", nickname: "", role: "", photo_url: "" },
      ],
    });
  }

  function removeMember(idx: number) {
    setConfig({ ...config, members: config.members.filter((_, i) => i !== idx) });
  }

  async function handleSave() {
    setSaving(true);
    const result = await updateAboutConfig(config);
    if (result.error) toast(result.error, "error");
    else toast(t("aboutPageSaved"), "success");
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg uppercase italic tracking-tighter text-white">
            {t("aboutTitle")}
          </h2>
          <p className="mt-0.5 text-[10px] font-bold text-gray-500">
            {t("aboutSubtitle")}
          </p>
        </div>
        <Button onClick={handleSave} isLoading={saving}>{t("save")}</Button>
      </div>

      {/* Language toggle */}
      <div className="flex gap-2">
        {(["es", "en"] as Lang[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={`rounded-lg px-4 py-1.5 text-[9px] transition-colors ${
              lang === l
                ? "bg-[var(--color-accent)] text-white"
                : "border border-gray-700 text-gray-500 hover:text-gray-300"
            }`}
          >
            {LANG_LABELS[l]}
          </button>
        ))}
      </div>

      {/* Paragraphs */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm uppercase tracking-wider text-white">{t("descriptionSection", { language: LANG_LABELS[lang] })}</h3>
          <button
            type="button"
            onClick={addParagraph}
            className="text-[9px] font-bold text-[var(--color-accent)] hover:text-purple-300"
          >
            + {t("addParagraph")}
          </button>
        </div>
        <div className="space-y-3">
          {config.paragraphs.map((p, i) => (
            <div key={i} className="flex gap-2">
              <textarea
                value={(p as LocalizedString)[lang]}
                onChange={(e) => updateParagraph(i, e.target.value)}
                rows={3}
                className="flex-1 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-sm text-gray-200 outline-none focus:border-[var(--color-accent)]"
              />
              <button type="button" onClick={() => removeParagraph(i)} className="text-gray-600 hover:text-red-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Team Members */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm uppercase tracking-wider text-white">{t("teamMembers")}</h3>
          <button
            type="button"
            onClick={addMember}
            className="rounded-lg border border-dashed border-purple-700 px-3 py-1.5 text-[9px] font-bold text-[var(--color-accent)] hover:bg-purple-900/20"
          >
            + {t("addMember")}
          </button>
        </div>

        <div className="space-y-4">
          {config.members.length === 0 && (
            <p className="text-center text-sm text-gray-600">{t("noMembersYet")}</p>
          )}
          {config.members.map((m, i) => (
            <div key={m.id} className="rounded-xl border border-gray-800 bg-[#0b0e14] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-500">
                  {t("memberNumber", { index: i + 1 })}
                </span>
                <button type="button" onClick={() => removeMember(i)} className="text-[9px] font-bold text-red-500 hover:text-red-400">
                  {t("delete")}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[9px] font-bold text-gray-500">{t("fullName")}</label>
                  <input
                    value={m.name}
                    onChange={(e) => updateMember(i, "name", e.target.value)}
                    placeholder='Luis "Hydro" Domínguez'
                    className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[9px] font-bold text-gray-500">{t("nicknameLabel")}</label>
                  <input
                    value={m.nickname}
                    onChange={(e) => updateMember(i, "nickname", e.target.value)}
                    placeholder="Hydro"
                    className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[9px] font-bold text-gray-500">{t("roleLabel")}</label>
                  <input
                    value={m.role}
                    onChange={(e) => updateMember(i, "role", e.target.value)}
                    placeholder="Co-founder & Project Manager"
                    className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[9px] font-bold text-gray-500">{t("photoUrl")}</label>
                  <input
                    value={m.photo_url}
                    onChange={(e) => updateMember(i, "photo_url", e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} isLoading={saving}>{t("save")}</Button>
      </div>
    </div>
  );
}
