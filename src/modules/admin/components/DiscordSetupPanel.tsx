"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/core/ui/Card";
import { Button } from "@/core/ui/Button";
import { useToast } from "@/core/ui/Toast";
import { registerDiscordCommands } from "@/modules/admin/actions";

type EnvStatus = Record<"DISCORD_PUBLIC_KEY" | "DISCORD_APPLICATION_ID" | "DISCORD_BOT_TOKEN" | "DISCORD_GUILD_ID" | "DISCORD_VERIFIED_ROLE_ID", boolean>;
type CommandsResult = { error: string } | { commands: { name: string; description: string }[] };
type GuildResult = { error: string } | { guildName: string; roleFound: boolean; roleName?: string };

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`} />;
}

export function DiscordSetupPanel({
  linkedCount,
  envStatus,
  commandsResult,
  guildResult,
}: {
  linkedCount: number;
  envStatus: EnvStatus;
  commandsResult: CommandsResult;
  guildResult: GuildResult;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setLoading(true);
    const result = await registerDiscordCommands();
    setLoading(false);
    if ("error" in result) toast(result.error, "error");
    else {
      toast("Slash commands registered — may take up to 1h to appear everywhere.", "success");
      router.refresh();
    }
  }

  return (
    <Card>
      <h1 className="mb-2 text-lg font-bold text-white">Discord Bot Setup</h1>
      <p className="mb-6 text-xs text-gray-500">
        One-time setup: registers <code>/vincular</code>, <code>/perfil</code>, and <code>/verificar</code> as global slash commands.
        Re-run this only if the command list changes.
      </p>

      <div className="mb-6 rounded-xl border border-gray-800 bg-[#0b0e14] p-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">Accounts linked</p>
        <p className="mt-1 text-2xl font-bold text-white">{linkedCount}</p>
      </div>

      <div className="mb-6 rounded-xl border border-gray-800 bg-[#0b0e14] p-4">
        <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">Environment variables</p>
        <ul className="space-y-1.5 text-xs">
          {(Object.keys(envStatus) as (keyof EnvStatus)[]).map((key) => (
            <li key={key} className="flex items-center gap-2 text-gray-300">
              <StatusDot ok={envStatus[key]} />
              <code>{key}</code>
              <span className="text-gray-600">{envStatus[key] ? "set" : "missing"}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-6 rounded-xl border border-gray-800 bg-[#0b0e14] p-4">
        <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">Server connection</p>
        {"error" in guildResult ? (
          <p className="flex items-center gap-2 text-xs text-red-400">
            <StatusDot ok={false} /> {guildResult.error}
          </p>
        ) : (
          <ul className="space-y-1.5 text-xs text-gray-300">
            <li className="flex items-center gap-2">
              <StatusDot ok /> Bot connected to <span className="text-white">{guildResult.guildName}</span>
            </li>
            <li className="flex items-center gap-2">
              <StatusDot ok={guildResult.roleFound} />
              {guildResult.roleFound ? (
                <>Role found: <span className="text-white">{guildResult.roleName}</span></>
              ) : (
                "Verificado role not found — check DISCORD_VERIFIED_ROLE_ID"
              )}
            </li>
          </ul>
        )}
      </div>

      <div className="mb-6 rounded-xl border border-gray-800 bg-[#0b0e14] p-4">
        <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">Live registered commands (from Discord)</p>
        {"error" in commandsResult ? (
          <p className="flex items-center gap-2 text-xs text-red-400">
            <StatusDot ok={false} /> {commandsResult.error}
          </p>
        ) : commandsResult.commands.length === 0 ? (
          <p className="text-xs text-gray-500">No commands registered yet — click the button below.</p>
        ) : (
          <ul className="space-y-1.5 text-xs text-gray-300">
            {commandsResult.commands.map((c) => (
              <li key={c.name}>
                <code className="text-white">/{c.name}</code> — {c.description}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button onClick={handleRegister} isLoading={loading}>
        Register Slash Commands
      </Button>
    </Card>
  );
}
