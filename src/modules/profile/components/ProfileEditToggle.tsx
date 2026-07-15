"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/core/ui/Button";
import { useToast } from "@/core/ui/Toast";
import { updateProfileCustomization } from "@/modules/settings/actions";
import type { Profile } from "@/core/types";

const THEMES = ["", "challenger", "volt", "ember", "aurora"] as const;
const THEME_COLORS: Record<string, string> = {
  "": "#4b5563",
  challenger: "#3E6BFF",
  volt: "#C6F24E",
  ember: "#FF6A3D",
  aurora: "#8B6CFF",
};

export function ProfileEditToggle({ profile }: { profile: Profile }) {
  const t = useTranslations("settings");
  const { toast } = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(profile.bio || "");
  const [theme, setTheme] = useState(profile.theme || "");
  const [loading, setLoading] = useState(false);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="mt-2 text-[10px] font-bold uppercase tracking-wide text-gray-500 hover:text-[var(--color-accent)] transition-colors"
      >
        {t("editProfile")}
      </button>
    );
  }

  async function handleSave() {
    setLoading(true);
    const formData = new FormData();
    formData.set("bio", bio);
    formData.set("theme", theme);
    const result = await updateProfileCustomization(formData);
    setLoading(false);
    if ("error" in result && result.error) toast(result.error, "error");
    else {
      toast(t("profileUpdated"), "success");
      setEditing(false);
      router.refresh();
    }
  }

  return (
    <div className="mt-3 w-full max-w-sm rounded-xl border border-gray-800 bg-[#0b0e14] p-4">
      <label className="mb-1 block text-[10px] font-bold text-gray-400">{t("bio")}</label>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        maxLength={280}
        rows={3}
        placeholder={t("bioPlaceholder")}
        className="mb-3 w-full rounded-lg border border-gray-800 bg-[#0d1117] px-3 py-2 text-xs text-gray-200 outline-hidden focus:border-[var(--color-accent)]"
      />
      <label className="mb-2 block text-[10px] font-bold text-gray-400">{t("profileTheme")}</label>
      <div className="mb-3 flex items-center gap-2">
        {THEMES.map((acc) => (
          <button
            key={acc || "default"}
            type="button"
            onClick={() => setTheme(acc)}
            title={acc || "default"}
            className={`h-6 w-6 rounded-full border-2 transition-all ${
              theme === acc ? "border-white" : "border-gray-700 hover:border-gray-500"
            }`}
            style={{ backgroundColor: THEME_COLORS[acc] }}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSave} isLoading={loading} className="flex-1">
          {t("save")}
        </Button>
        <Button variant="ghost" onClick={() => setEditing(false)}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
