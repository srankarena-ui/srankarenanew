"use client";

import { useState } from "react";
import { Card } from "@/core/ui/Card";
import { Button } from "@/core/ui/Button";
import { useToast } from "@/core/ui/Toast";
import { registerDiscordCommands } from "@/modules/admin/actions";

export function DiscordSetupPanel({ linkedCount }: { linkedCount: number }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setLoading(true);
    const result = await registerDiscordCommands();
    setLoading(false);
    if ("error" in result) toast(result.error, "error");
    else toast("Slash commands registered — may take up to 1h to appear everywhere.", "success");
  }

  return (
    <Card>
      <h1 className="mb-2 text-lg font-bold text-white">Discord Bot Setup</h1>
      <p className="mb-6 text-xs text-gray-500">
        One-time setup: registers <code>/vincular</code> and <code>/perfil</code> as global slash commands.
        Re-run this only if the command list changes.
      </p>

      <div className="mb-6 rounded-xl border border-gray-800 bg-[#0b0e14] p-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">Accounts linked</p>
        <p className="mt-1 text-2xl font-bold text-white">{linkedCount}</p>
      </div>

      <Button onClick={handleRegister} isLoading={loading}>
        Register Slash Commands
      </Button>
    </Card>
  );
}
