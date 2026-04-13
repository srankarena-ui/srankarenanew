"use client";

import { useState } from "react";
import { Card } from "@/core/ui/Card";
import { Button } from "@/core/ui/Button";
import { useToast } from "@/core/ui/Toast";
import { updateHelpConfig } from "@/modules/admin/actions";
import type { HelpConfig, HelpCategory, HelpFaqItem } from "@/core/types/site-content";

type Lang = "es" | "en";

interface HelpManagerProps {
  initialConfig: HelpConfig;
}

export function HelpManager({ initialConfig }: HelpManagerProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<HelpConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [lang, setLang] = useState<Lang>("es");
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  // ── Heading / subheading ────────────────────────────────────────────────────
  function updateHeading(field: "heading" | "subheading", value: string) {
    setConfig({ ...config, [field]: { ...config[field], [lang]: value } });
  }

  // ── Categories ──────────────────────────────────────────────────────────────
  function addCategory() {
    const id = crypto.randomUUID();
    setConfig({
      ...config,
      categories: [
        ...config.categories,
        { id, title: { es: "Nueva categoría", en: "New category" }, icon: "📋", items: [] },
      ],
    });
    setExpandedCat(id);
  }

  function removeCategory(id: string) {
    setConfig({ ...config, categories: config.categories.filter((c) => c.id !== id) });
    if (expandedCat === id) setExpandedCat(null);
  }

  function updateCategory(id: string, field: keyof Pick<HelpCategory, "title" | "icon">, value: string | { es: string; en: string }) {
    setConfig({
      ...config,
      categories: config.categories.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    });
  }

  // ── FAQ items ───────────────────────────────────────────────────────────────
  function addItem(catId: string) {
    const itemId = crypto.randomUUID();
    setConfig({
      ...config,
      categories: config.categories.map((c) =>
        c.id === catId
          ? { ...c, items: [...c.items, { id: itemId, question: { es: "", en: "" }, answer: { es: "", en: "" } }] }
          : c
      ),
    });
  }

  function removeItem(catId: string, itemId: string) {
    setConfig({
      ...config,
      categories: config.categories.map((c) =>
        c.id === catId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
      ),
    });
  }

  function updateItem(catId: string, itemId: string, field: keyof Pick<HelpFaqItem, "question" | "answer">, value: string) {
    setConfig({
      ...config,
      categories: config.categories.map((c) =>
        c.id === catId
          ? {
              ...c,
              items: c.items.map((i) =>
                i.id === itemId ? { ...i, [field]: { ...i[field], [lang]: value } } : i
              ),
            }
          : c
      ),
    });
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    const result = await updateHelpConfig(config);
    setSaving(false);
    if (result.error) toast(result.error, "error");
    else toast("Help Centre saved!", "success");
  }

  return (
    <div className="space-y-6">
      {/* Lang toggle */}
      <div className="flex gap-2">
        {(["es", "en"] as Lang[]).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
              lang === l ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {l === "es" ? "Español" : "English"}
          </button>
        ))}
      </div>

      {/* Heading */}
      <Card>
        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
          Page Heading
        </p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Heading
            </label>
            <input
              type="text"
              value={config.heading[lang]}
              onChange={(e) => updateHeading("heading", e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-[#0b0e14] px-3 py-2 text-sm text-gray-200 outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Subheading
            </label>
            <input
              type="text"
              value={config.subheading[lang]}
              onChange={(e) => updateHeading("subheading", e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-[#0b0e14] px-3 py-2 text-sm text-gray-200 outline-none focus:border-purple-500"
            />
          </div>
        </div>
      </Card>

      {/* Categories */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Categories & FAQs
          </p>
          <button
            onClick={addCategory}
            className="rounded-lg bg-purple-600/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-purple-300 hover:bg-purple-600/30 transition-colors"
          >
            + Add Category
          </button>
        </div>

        <div className="space-y-4">
          {config.categories.map((cat) => {
            const isOpen = expandedCat === cat.id;
            return (
              <div key={cat.id} className="rounded-xl border border-gray-800 bg-[#0b0e14]">
                {/* Category header */}
                <div className="flex items-center gap-3 p-3">
                  <input
                    type="text"
                    value={cat.icon}
                    onChange={(e) => updateCategory(cat.id, "icon", e.target.value)}
                    className="w-10 rounded-lg border border-gray-700 bg-[#17191f] px-2 py-1.5 text-center text-sm outline-none focus:border-purple-500"
                    title="Emoji icon"
                  />
                  <input
                    type="text"
                    value={cat.title[lang]}
                    onChange={(e) =>
                      updateCategory(cat.id, "title", { ...cat.title, [lang]: e.target.value })
                    }
                    className="flex-1 rounded-xl border border-gray-700 bg-[#17191f] px-3 py-1.5 text-sm text-gray-200 outline-none focus:border-purple-500"
                    placeholder="Category name…"
                  />
                  <button
                    onClick={() => setExpandedCat(isOpen ? null : cat.id)}
                    className="text-[10px] font-bold text-gray-500 hover:text-gray-300"
                  >
                    {isOpen ? "▲ Collapse" : "▼ Expand"}
                  </button>
                  <button
                    onClick={() => removeCategory(cat.id)}
                    className="text-[10px] font-bold text-red-700 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>

                {/* FAQ items */}
                {isOpen && (
                  <div className="border-t border-gray-800 p-3 space-y-3">
                    {cat.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-gray-700 bg-[#17191f] p-3 space-y-2"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={item.question[lang]}
                              onChange={(e) => updateItem(cat.id, item.id, "question", e.target.value)}
                              placeholder="Question…"
                              className="w-full rounded-lg border border-gray-700 bg-[#0b0e14] px-3 py-1.5 text-xs text-gray-200 outline-none focus:border-purple-500"
                            />
                            <textarea
                              value={item.answer[lang]}
                              onChange={(e) => updateItem(cat.id, item.id, "answer", e.target.value)}
                              placeholder="Answer…"
                              rows={3}
                              className="w-full resize-none rounded-lg border border-gray-700 bg-[#0b0e14] px-3 py-1.5 text-xs text-gray-200 outline-none focus:border-purple-500"
                            />
                          </div>
                          <button
                            onClick={() => removeItem(cat.id, item.id)}
                            className="mt-1 text-[10px] text-red-700 hover:text-red-400"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => addItem(cat.id)}
                      className="w-full rounded-xl border border-dashed border-gray-700 py-2 text-[10px] font-bold text-gray-600 hover:border-purple-700 hover:text-purple-400 transition-colors"
                    >
                      + Add FAQ Item
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {config.categories.length === 0 && (
            <p className="py-4 text-center text-[10px] text-gray-600">
              No categories yet. Add one above.
            </p>
          )}
        </div>
      </Card>

      <Button onClick={handleSave} isLoading={saving}>
        Save Help Centre
      </Button>
    </div>
  );
}
