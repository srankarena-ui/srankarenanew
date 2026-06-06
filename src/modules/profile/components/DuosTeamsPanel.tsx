"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/core/ui/Card";
import { Button } from "@/core/ui/Button";
import { useToast } from "@/core/ui/Toast";
import {
  inviteDuo,
  respondDuoInvite,
  disbandDuo,
  createTeam,
  inviteTeamMember,
  respondTeamInvite,
  leaveTeam,
  dissolveTeam,
} from "@/modules/profile/actions";
import type { DuoRow, TeamRow } from "@/modules/profile/actions";

interface DuosTeamsPanelProps {
  isOwner: boolean;
  viewerUserId: string | null;
  profileUserId: string;
  duos: DuoRow[];
  teams: TeamRow[];
  pendingDuoInvites: DuoRow[];
  pendingTeamInvites: { id: string; team_id: string; status: string; player_teams: { id: string; name: string; tag: string | null } }[];
}

export function DuosTeamsPanel({
  isOwner,
  viewerUserId,
  profileUserId,
  duos,
  teams,
  pendingDuoInvites,
  pendingTeamInvites,
}: DuosTeamsPanelProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<"duos" | "teams">("duos");

  // Duo invite modal state
  const [showDuoInvite, setShowDuoInvite] = useState(false);
  const [duoUsername, setDuoUsername] = useState("");
  const [sendingDuo, setSendingDuo] = useState(false);

  // Team create modal state
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamTag, setTeamTag] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Team invite state
  const [inviteTeamId, setInviteTeamId] = useState<string | null>(null);
  const [inviteUsername, setInviteUsername] = useState("");
  const [sendingTeamInvite, setSendingTeamInvite] = useState(false);

  const totalPending = pendingDuoInvites.length + pendingTeamInvites.length;

  async function handleDuoInvite() {
    if (!duoUsername.trim()) return;
    setSendingDuo(true);
    const result = await inviteDuo(duoUsername);
    setSendingDuo(false);
    if (result.error) { toast(result.error, "error"); return; }
    toast("Duo invite sent!", "success");
    setDuoUsername("");
    setShowDuoInvite(false);
    router.refresh();
  }

  async function handleRespondDuo(duoId: string, action: "accept" | "reject") {
    const result = await respondDuoInvite(duoId, action);
    if (result.error) toast(result.error, "error");
    else { toast(action === "accept" ? "Duo accepted!" : "Invite rejected", action === "accept" ? "success" : "info"); router.refresh(); }
  }

  async function handleDisbandDuo(duoId: string) {
    const result = await disbandDuo(duoId);
    if (result.error) toast(result.error, "error");
    else { toast("Duo disbanded", "info"); router.refresh(); }
  }

  async function handleCreateTeam() {
    if (!teamName.trim()) return;
    setCreatingTeam(true);
    const result = await createTeam(teamName, teamTag);
    setCreatingTeam(false);
    if (result.error) { toast(result.error, "error"); return; }
    toast("Team created!", "success");
    setTeamName(""); setTeamTag("");
    setShowCreateTeam(false);
    router.refresh();
  }

  async function handleTeamInvite(teamId: string) {
    if (!inviteUsername.trim()) return;
    setSendingTeamInvite(true);
    const result = await inviteTeamMember(teamId, inviteUsername);
    setSendingTeamInvite(false);
    if (result.error) { toast(result.error, "error"); return; }
    toast("Invite sent!", "success");
    setInviteUsername("");
    setInviteTeamId(null);
    router.refresh();
  }

  async function handleRespondTeam(memberId: string, action: "accept" | "reject") {
    const result = await respondTeamInvite(memberId, action);
    if (result.error) toast(result.error, "error");
    else { toast(action === "accept" ? "Joined team!" : "Invite rejected", action === "accept" ? "success" : "info"); router.refresh(); }
  }

  async function handleLeaveTeam(teamId: string) {
    const result = await leaveTeam(teamId);
    if (result.error) toast(result.error, "error");
    else { toast("Left team", "info"); router.refresh(); }
  }

  async function handleDissolveTeam(teamId: string) {
    const result = await dissolveTeam(teamId);
    if (result.error) toast(result.error, "error");
    else { toast("Team dissolved", "info"); router.refresh(); }
  }

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-gray-400">
          Duos &amp; Teams
        </h3>
        {isOwner && totalPending > 0 && (
          <span className="rounded-full bg-[var(--color-accent-hover)] px-2 py-0.5 text-[9px] text-white">
            {totalPending} pending
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-3 flex gap-1 rounded-xl bg-[#0b0e14] p-1">
        {(["duos", "teams"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-1.5 text-[10px] transition-colors ${
              tab === t
                ? "bg-[var(--color-accent-hover)]/20 text-purple-300"
                : "text-gray-600 hover:text-gray-400"
            }`}
          >
            {t}
            {t === "duos" && isOwner && pendingDuoInvites.length > 0 && (
              <span className="ml-1 rounded-full bg-[var(--color-accent-hover)] px-1 text-[8px] text-white">
                {pendingDuoInvites.length}
              </span>
            )}
            {t === "teams" && isOwner && pendingTeamInvites.length > 0 && (
              <span className="ml-1 rounded-full bg-[var(--color-accent-hover)] px-1 text-[8px] text-white">
                {pendingTeamInvites.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── DUOS TAB ── */}
      {tab === "duos" && (
        <div className="mt-4 space-y-3">
          {/* Pending invites (own profile only) */}
          {isOwner && pendingDuoInvites.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-bold text-yellow-500">
                Pending Invites
              </p>
              {pendingDuoInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-2 rounded-xl border border-yellow-800/30 bg-yellow-900/10 px-3 py-2"
                >
                  <span className="flex-1 text-xs font-bold text-white">
                    {inv.requester?.username ?? "Unknown"}
                  </span>
                  <button
                    onClick={() => handleRespondDuo(inv.id, "accept")}
                    className="rounded-lg bg-green-600 px-2 py-1 text-[10px] text-white hover:bg-green-500"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespondDuo(inv.id, "reject")}
                    className="rounded-lg bg-gray-800 px-2 py-1 text-[10px] font-bold text-gray-400 hover:bg-gray-700"
                  >
                    Reject
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Active duos */}
          {duos.length === 0 && pendingDuoInvites.length === 0 ? (
            <p className="py-2 text-center text-[10px] text-gray-600">No active duos</p>
          ) : (
            duos.map((duo) => {
              const partner =
                duo.requester_id === profileUserId ? duo.partner : duo.requester;
              return (
                <div
                  key={duo.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-800 bg-[#0b0e14] px-3 py-2.5"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-900/40 text-xs text-[var(--color-accent)]">
                    {partner?.username?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                  <span className="flex-1 text-xs font-bold text-white">
                    {partner?.username ?? "Unknown"}
                  </span>
                  {isOwner && (
                    <button
                      onClick={() => handleDisbandDuo(duo.id)}
                      className="text-[10px] text-gray-600 hover:text-red-400"
                    >
                      Disband
                    </button>
                  )}
                </div>
              );
            })
          )}

          {/* Invite button */}
          {isOwner && duos.length < 2 && (
            <>
              {showDuoInvite ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={duoUsername}
                    onChange={(e) => setDuoUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleDuoInvite()}
                    placeholder="Username…"
                    className="flex-1 rounded-xl border border-gray-800 bg-[#0b0e14] px-3 py-2 text-xs text-gray-200 outline-hidden focus:border-[var(--color-accent)]"
                    autoFocus
                  />
                  <Button onClick={handleDuoInvite} isLoading={sendingDuo} className="text-xs px-3 py-2">
                    Send
                  </Button>
                  <button onClick={() => setShowDuoInvite(false)} className="text-[10px] text-gray-600 hover:text-gray-400">
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDuoInvite(true)}
                  className="w-full rounded-xl border border-dashed border-gray-800 py-2 text-[10px] font-bold text-gray-600 hover:border-purple-800 hover:text-[var(--color-accent)] transition-colors"
                >
                  + Invite Duo Partner
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TEAMS TAB ── */}
      {tab === "teams" && (
        <div className="mt-4 space-y-3">
          {/* Pending team invites */}
          {isOwner && pendingTeamInvites.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-bold text-yellow-500">
                Pending Invites
              </p>
              {pendingTeamInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-2 rounded-xl border border-yellow-800/30 bg-yellow-900/10 px-3 py-2"
                >
                  <div className="flex-1">
                    <p className="text-xs font-bold text-white">{inv.player_teams.name}</p>
                    {inv.player_teams.tag && (
                      <p className="text-[10px] text-gray-500">[{inv.player_teams.tag}]</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRespondTeam(inv.id, "accept")}
                    className="rounded-lg bg-green-600 px-2 py-1 text-[10px] text-white hover:bg-green-500"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespondTeam(inv.id, "reject")}
                    className="rounded-lg bg-gray-800 px-2 py-1 text-[10px] font-bold text-gray-400 hover:bg-gray-700"
                  >
                    Reject
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Active teams */}
          {teams.length === 0 && pendingTeamInvites.length === 0 ? (
            <p className="py-2 text-center text-[10px] text-gray-600">No active teams</p>
          ) : (
            teams.map((team) => {
              const accepted = team.members?.filter((m) => m.status === "accepted") ?? [];
              const pending = team.members?.filter((m) => m.status === "pending") ?? [];
              return (
                <div key={team.id} className="rounded-xl border border-gray-800 bg-[#0b0e14] p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white">{team.name}</span>
                    {team.tag && (
                      <span className="rounded bg-purple-900/40 px-1.5 py-0.5 text-[9px] font-bold text-[var(--color-accent)]">
                        {team.tag}
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-gray-600">
                      {accepted.length}/5
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {accepted.map((m) => (
                      <span
                        key={m.id}
                        className="rounded-lg bg-gray-800 px-2 py-0.5 text-[10px] font-bold text-gray-300"
                      >
                        {m.profile?.username ?? "?"}
                      </span>
                    ))}
                    {pending.map((m) => (
                      <span
                        key={m.id}
                        className="rounded-lg border border-dashed border-yellow-800/50 px-2 py-0.5 text-[10px] font-bold text-yellow-600"
                      >
                        {m.profile?.username ?? "?"} ⏳
                      </span>
                    ))}
                  </div>

                  {/* Invite button for this team */}
                  {isOwner && accepted.length < 5 && (
                    <>
                      {inviteTeamId === team.id ? (
                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            value={inviteUsername}
                            onChange={(e) => setInviteUsername(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleTeamInvite(team.id)}
                            placeholder="Username…"
                            className="flex-1 rounded-xl border border-gray-700 bg-[#17191f] px-3 py-1.5 text-xs text-gray-200 outline-hidden focus:border-[var(--color-accent)]"
                            autoFocus
                          />
                          <Button onClick={() => handleTeamInvite(team.id)} isLoading={sendingTeamInvite} className="text-xs px-3 py-1.5">
                            Invite
                          </Button>
                          <button onClick={() => setInviteTeamId(null)} className="text-[10px] text-gray-600 hover:text-gray-400">
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setInviteTeamId(team.id)}
                          className="w-full rounded-lg border border-dashed border-gray-800 py-1 text-[10px] font-bold text-gray-600 hover:border-purple-800 hover:text-[var(--color-accent)] transition-colors"
                        >
                          + Invite Player
                        </button>
                      )}
                    </>
                  )}

                  {isOwner && (
                    team.created_by === profileUserId ? (
                      <button
                        onClick={() => handleDissolveTeam(team.id)}
                        className="text-[10px] text-gray-600 hover:text-red-400"
                      >
                        Dissolve team
                      </button>
                    ) : (
                      <button
                        onClick={() => handleLeaveTeam(team.id)}
                        className="text-[10px] text-gray-600 hover:text-red-400"
                      >
                        Leave team
                      </button>
                    )
                  )}
                </div>
              );
            })
          )}

          {/* Create team button */}
          {isOwner && teams.length < 2 && (
            <>
              {showCreateTeam ? (
                <div className="space-y-2 rounded-xl border border-gray-800 bg-[#0b0e14] p-3">
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Team name…"
                    className="w-full rounded-xl border border-gray-800 bg-[#17191f] px-3 py-2 text-xs text-gray-200 outline-hidden focus:border-[var(--color-accent)]"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={teamTag}
                    onChange={(e) => setTeamTag(e.target.value.slice(0, 5))}
                    placeholder="Tag (max 5 chars)…"
                    className="w-full rounded-xl border border-gray-800 bg-[#17191f] px-3 py-2 text-xs text-gray-200 outline-hidden focus:border-[var(--color-accent)]"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleCreateTeam} isLoading={creatingTeam} className="flex-1 text-xs py-2">
                      Create
                    </Button>
                    <button onClick={() => setShowCreateTeam(false)} className="text-[10px] text-gray-600 hover:text-gray-400">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreateTeam(true)}
                  className="w-full rounded-xl border border-dashed border-gray-800 py-2 text-[10px] font-bold text-gray-600 hover:border-purple-800 hover:text-[var(--color-accent)] transition-colors"
                >
                  + Create Team
                </button>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}
