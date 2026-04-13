"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/core/ui/Button";
import { Modal } from "@/core/ui/Modal";
import { useToast } from "@/core/ui/Toast";
import {
  getUserDuosAndTeamsForTournament,
  registerTeamForTournament,
  unregisterTeamFromTournament,
} from "@/modules/tournaments/actions";
import type { UserDuoOption, UserTeamOption } from "@/modules/tournaments/actions";

interface TeamRegisterButtonProps {
  tournamentId: string;
  queueType: "duo" | "flex";
  registrationOpen: boolean;
  currentUserId: string;
}

export function TeamRegisterButton({
  tournamentId,
  queueType,
  registrationOpen,
  currentUserId,
}: TeamRegisterButtonProps) {
  const t = useTranslations("tournaments");
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [duos, setDuos] = useState<UserDuoOption[]>([]);
  const [teams, setTeams] = useState<UserTeamOption[]>([]);
  const [registeredDuoId, setRegisteredDuoId] = useState<string | null>(null);
  const [registeredTeamId, setRegisteredTeamId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [fetched, setFetched] = useState(false);

  const isRegistered = !!(registeredDuoId || registeredTeamId);

  async function fetchOptions() {
    if (fetched) return;
    setLoading(true);
    const result = await getUserDuosAndTeamsForTournament(tournamentId);
    setDuos(result.duos);
    setTeams(result.teams);
    setRegisteredDuoId(result.registeredDuoId);
    setRegisteredTeamId(result.registeredTeamId);
    setFetched(true);
    setLoading(false);
  }

  async function handleOpen() {
    await fetchOptions();
    setShowModal(true);
  }

  async function handleRegister() {
    if (!selected) return;
    setLoading(true);
    const isDuo = queueType === "duo";
    const result = await registerTeamForTournament(tournamentId, {
      duoId: isDuo ? selected : undefined,
      teamId: !isDuo ? selected : undefined,
    });
    setLoading(false);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast(t("registeredSuccess"), "success");
      setShowModal(false);
      router.refresh();
    }
  }

  async function handleUnregister() {
    setLoading(true);
    const result = await unregisterTeamFromTournament(tournamentId, {
      duoId: registeredDuoId ?? undefined,
      teamId: registeredTeamId ?? undefined,
    });
    setLoading(false);
    if (result.error) toast(result.error, "error");
    else {
      toast(t("unregisteredSuccess"), "info");
      router.refresh();
    }
  }

  const options = queueType === "duo" ? duos : teams;
  const label = queueType === "duo" ? t("duoLabel") : t("teamLabel");
  const emptyMsg =
    queueType === "duo"
      ? t("noActiveDuos")
      : t("noActiveTeams");

  if (isRegistered) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-xl border border-green-800/40 bg-green-900/10 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-xs font-bold text-green-400">
            {t("teamRegistered", { label })}
          </span>
        </div>
        {registrationOpen && (
          <Button
            onClick={handleUnregister}
            disabled={loading}
            variant="secondary"
            className="w-full"
          >
            {loading ? "..." : t("withdraw")}
          </Button>
        )}
      </div>
    );
  }

  if (!registrationOpen) {
    return (
      <p className="text-xs text-gray-500">
        {t("registrationClosed")}
      </p>
    );
  }

  return (
    <>
      <Button
        onClick={handleOpen}
        disabled={loading}
        className="w-full"
      >
        {loading ? "..." : queueType === "duo" ? t("registerDuo") : t("registerTeam")}
      </Button>

      {showModal && (
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={queueType === "duo" ? t("registerDuo") : t("registerTeam")} className="max-w-sm">

            {options.length === 0 ? (
              <div className="rounded-xl border border-gray-800 bg-[#0b0e14] p-4">
                <p className="text-xs text-gray-500">{emptyMsg}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  {queueType === "duo" ? t("selectYourDuo") : t("selectYourTeam")}
                </p>
                {options.map((opt) => {
                  const isDuo = queueType === "duo";
                  const duoOpt = opt as UserDuoOption;
                  const teamOpt = opt as UserTeamOption;
                  const isSelected = selected === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setSelected(opt.id)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? "border-purple-500 bg-purple-900/20"
                          : "border-gray-800 bg-[#0b0e14] hover:border-gray-700"
                      }`}
                    >
                      {isDuo ? (
                        <div>
                          <p className="text-xs font-bold text-white">
                            + {duoOpt.partner_username}
                          </p>
                          <p className="text-[10px] text-gray-500">{t("duoPartner")}</p>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-white">{teamOpt.name}</p>
                            {teamOpt.tag && (
                              <span className="rounded bg-purple-900/40 px-1.5 py-0.5 text-[9px] font-bold text-purple-400">
                                {teamOpt.tag}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500">
                            {t("memberCount", { count: teamOpt.member_count })}
                          </p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {options.length > 0 && (
              <Button
                onClick={handleRegister}
                disabled={!selected || loading}
                className="mt-4 w-full"
              >
                {loading ? t("registering") : t("confirmRegistration")}
              </Button>
            )}
        </Modal>
      )}
    </>
  );
}
