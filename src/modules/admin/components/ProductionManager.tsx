"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/core/ui/Button";
import { Card } from "@/core/ui/Card";
import { useToast } from "@/core/ui/Toast";
import { updateProductionConfig } from "@/modules/admin/actions";
import type { ProductionConfig, ProductionService, LocalizedString } from "@/core/types/site-content";

type Lang = "es" | "en";
const LANG_LABELS: Record<Lang, string> = { es: "Español", en: "English" };

interface ProductionManagerProps {
  initialConfig: ProductionConfig;
}

export function ProductionManager({ initialConfig }: ProductionManagerProps) {
  const t = useTranslations("admin");
  const { toast } = useToast();
  const [config, setConfig] = useState<ProductionConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [lang, setLang] = useState<Lang>("es");

  function updateLocalized(field: "heading" | "subheading", value: string) {
    setConfig({ ...config, [field]: { ...(config[field] as LocalizedString), [lang]: value } });
  }

  function updateServiceLocalized(idx: number, field: "title" | "description", value: string) {
    const services = config.services.map((s, i) =>
      i === idx ? { ...s, [field]: { ...(s[field] as LocalizedString), [lang]: value } } : s
    );
    setConfig({ ...config, services });
  }

  function updateServiceIcon(idx: number, value: string) {
    const services = config.services.map((s, i) => (i === idx ? { ...s, icon: value } : s));
    setConfig({ ...config, services });
  }

  function addService() {
    setConfig({
      ...config,
      services: [...config.services, { id: crypto.randomUUID(), title: { es: "", en: "" }, description: { es: "", en: "" }, icon: "🎯" }],
    });
  }

  function removeService(idx: number) {
    setConfig({ ...config, services: config.services.filter((_, i) => i !== idx) });
  }

  async function handleSave() {
    setSaving(true);
    const result = await updateProductionConfig(config);
    if (result.error) toast(result.error, "error");
    else toast(t("productionPageSaved"), "success");
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg uppercase italic tracking-tighter text-white">
            {t("productionTitle")}
          </h2>
          <p className="mt-0.5 text-[10px] font-bold text-gray-500">
            {t("productionSubtitle")}
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

      {/* Page header text */}
      <Card>
        <h3 className="mb-4 text-sm uppercase tracking-wider text-white">{t("headerSection", { language: LANG_LABELS[lang] })}</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[9px] font-bold text-gray-500">{t("titleField")}</label>
            <input
              value={(config.heading as LocalizedString)[lang]}
              onChange={(e) => updateLocalized("heading", e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[9px] font-bold text-gray-500">{t("subtitleField")}</label>
            <textarea
              value={(config.subheading as LocalizedString)[lang]}
              onChange={(e) => updateLocalized("subheading", e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        </div>
      </Card>

      {/* Services */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm uppercase tracking-wider text-white">{t("servicesSection", { language: LANG_LABELS[lang] })}</h3>
          <button
            type="button"
            onClick={addService}
            className="rounded-lg border border-dashed border-purple-700 px-3 py-1.5 text-[9px] font-bold text-[var(--color-accent)] hover:bg-purple-900/20"
          >
            + {t("addService")}
          </button>
        </div>
        <div className="space-y-4">
          {config.services.map((s, i) => (
            <div key={s.id} className="rounded-xl border border-gray-800 bg-[#0b0e14] p-4">
              <div className="mb-3 flex justify-between">
                <span className="text-[10px] font-bold text-gray-500">{t("serviceNumber", { index: i + 1 })}</span>
                <button type="button" onClick={() => removeService(i)} className="text-[9px] font-bold uppercase text-red-500 hover:text-red-400">{t("delete")}</button>
              </div>
              <div className="grid grid-cols-[64px_1fr] gap-3">
                <div>
                  <label className="mb-1 block text-[9px] font-bold text-gray-500">{t("icon")}</label>
                  <input
                    value={s.icon}
                    onChange={(e) => updateServiceIcon(i, e.target.value)}
                    placeholder="🎬"
                    className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-center text-xl outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[9px] font-bold text-gray-500">{t("titleField")}</label>
                  <input
                    value={(s.title as LocalizedString)[lang]}
                    onChange={(e) => updateServiceLocalized(i, "title", e.target.value)}
                    placeholder={lang === "es" ? "Transmisión en Vivo" : "Live Broadcasting"}
                    className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="mb-1 block text-[9px] font-bold text-gray-500">{t("descriptionField")}</label>
                <textarea
                  value={(s.description as LocalizedString)[lang]}
                  onChange={(e) => updateServiceLocalized(i, "description", e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-[var(--color-accent)]"
                />
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
