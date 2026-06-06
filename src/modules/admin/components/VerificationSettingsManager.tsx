"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/core/ui/Card";
import { Button } from "@/core/ui/Button";
import { Badge } from "@/core/ui/Badge";
import { useToast } from "@/core/ui/Toast";
import { updateVerificationConfig } from "@/modules/admin/actions";
import type { VerificationConfig } from "@/core/types/site-content";

interface VerificationSettingsManagerProps {
  initialConfig: VerificationConfig;
}

function ToggleRow({
  title,
  description,
  enabled,
  onToggle,
  enabledLabel,
  disabledLabel,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  enabledLabel: string;
  disabledLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-800 bg-[#0b0e14] p-4">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm text-white">{title}</p>
          <Badge variant={enabled ? "warning" : "success"}>{enabled ? enabledLabel : disabledLabel}</Badge>
        </div>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`relative h-8 w-16 rounded-full border transition-colors ${enabled ? "border-yellow-600 bg-yellow-500/20" : "border-green-700 bg-green-500/20"}`}
        aria-pressed={enabled}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full transition-all ${enabled ? "left-8 bg-yellow-400" : "left-1 bg-green-400"}`}
        />
      </button>
    </div>
  );
}

export function VerificationSettingsManager({ initialConfig }: VerificationSettingsManagerProps) {
  const t = useTranslations("admin");
  const { toast } = useToast();
  const [config, setConfig] = useState<VerificationConfig>(initialConfig);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const result = await updateVerificationConfig(config);
    setSaving(false);

    if (result.error) {
      toast(result.error, "error");
    } else {
      toast(t("verificationSettingsSaved"), "success");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg uppercase italic tracking-tighter text-white">
          {t("verificationSettingsTitle")}
        </h2>
        <p className="mt-1 text-sm text-gray-500">{t("verificationSettingsSubtitle")}</p>
      </div>

      <Card>
        <div className="space-y-4">
          <ToggleRow
            title={t("riotVerificationToggleTitle")}
            description={t("riotVerificationToggleDescription")}
            enabled={config.require_riot_verification}
            onToggle={() => setConfig((current) => ({ ...current, require_riot_verification: !current.require_riot_verification }))}
            enabledLabel={t("verificationRequired")}
            disabledLabel={t("verificationBypassed")}
          />

          <ToggleRow
            title={t("crVerificationToggleTitle")}
            description={t("crVerificationToggleDescription")}
            enabled={config.require_clash_royale_verification}
            onToggle={() => setConfig((current) => ({ ...current, require_clash_royale_verification: !current.require_clash_royale_verification }))}
            enabledLabel={t("verificationRequired")}
            disabledLabel={t("verificationBypassed")}
          />
        </div>

        <div className="mt-6 rounded-xl border border-blue-800/30 bg-blue-900/10 px-4 py-3 text-sm text-blue-100">
          {t("verificationSettingsHint")}
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} isLoading={saving}>
            {t("saveVerificationSettings")}
          </Button>
        </div>
      </Card>
    </div>
  );
}