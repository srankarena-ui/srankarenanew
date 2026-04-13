"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/core/ui/Button";
import { Card } from "@/core/ui/Card";
import { useToast } from "@/core/ui/Toast";
import { updateContactConfig } from "@/modules/admin/actions";
import type { ContactConfig, LocalizedString } from "@/core/types/site-content";

type Lang = "es" | "en";
const LANG_LABELS: Record<Lang, string> = { es: "Español", en: "English" };

interface ContactManagerProps {
  initialConfig: ContactConfig;
}

export function ContactManager({ initialConfig }: ContactManagerProps) {
  const t = useTranslations("admin");
  const { toast } = useToast();
  const [config, setConfig] = useState<ContactConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [lang, setLang] = useState<Lang>("es");

  function updateLocalized(field: "heading" | "description", value: string) {
    setConfig({ ...config, [field]: { ...(config[field] as LocalizedString), [lang]: value } });
  }

  function set(field: "email" | "discord" | "instagram" | "twitter" | "phone", value: string) {
    setConfig({ ...config, [field]: value });
  }

  async function handleSave() {
    setSaving(true);
    const result = await updateContactConfig(config);
    if (result.error) toast(result.error, "error");
    else toast(t("contactPageSaved"), "success");
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black uppercase italic tracking-tighter text-white">{t("contactTitle")}</h2>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            {t("contactSubtitle")}
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
            className={`rounded-lg px-4 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${
              lang === l
                ? "bg-purple-600 text-white"
                : "border border-gray-700 text-gray-500 hover:text-gray-300"
            }`}
          >
            {LANG_LABELS[l]}
          </button>
        ))}
      </div>

      <Card>
        <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-white">{t("headerSection", { language: LANG_LABELS[lang] })}</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-gray-500">{t("titleField")}</label>
            <input
              value={(config.heading as LocalizedString)[lang]}
              onChange={(e) => updateLocalized("heading", e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-gray-500">{t("descriptionField")}</label>
            <textarea
              value={(config.description as LocalizedString)[lang]}
              onChange={(e) => updateLocalized("description", e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-purple-500"
            />
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-white">{t("contactInfo")}</h3>
        <p className="mb-4 text-[9px] font-bold uppercase tracking-widest text-gray-600">
          {t("contactSharedBoth")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { field: "email" as const, label: "Email", placeholder: "contacto@srankArena.com" },
            { field: "discord" as const, label: "Discord (invite link)", placeholder: "https://discord.gg/..." },
            { field: "instagram" as const, label: "Instagram (@user)", placeholder: "@srankArena" },
            { field: "twitter" as const, label: "Twitter / X (@user)", placeholder: "@srankArena" },
            { field: "phone" as const, label: "Phone / WhatsApp", placeholder: "+1 234 567 8900" },
          ].map(({ field, label, placeholder }) => (
            <div key={field}>
              <label className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-gray-500">{label}</label>
              <input
                value={config[field]}
                onChange={(e) => set(field, e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-purple-500"
              />
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
