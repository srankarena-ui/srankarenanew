"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card } from "@/core/ui/Card";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/Button";
import { Modal } from "@/core/ui/Modal";
import { useToast } from "@/core/ui/Toast";
import { deleteTournament, updateTournament } from "@/modules/admin/actions";
import { useRouter } from "next/navigation";
import type { Tournament } from "@/core/types";

interface TournamentTableProps {
  tournaments: Tournament[];
}

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "purple" | "outline"> = {
  draft: "outline",
  upcoming: "purple",
  registration: "purple",
  active: "success",
  completed: "default",
  cancelled: "danger",
};

const STATUS_OPTIONS = ["draft", "registration", "active", "completed", "cancelled"] as const;

export function TournamentTable({ tournaments }: TournamentTableProps) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const { toast } = useToast();
  const router = useRouter();
  const [tournamentToDelete, setTournamentToDelete] = useState<Tournament | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!tournamentToDelete) return;
    setIsDeleting(true);
    const result = await deleteTournament(tournamentToDelete.id);
    setIsDeleting(false);
    if (result.error) toast(result.error, "error");
    else {
      toast(t("tournamentDeleted"), "success");
      setTournamentToDelete(null);
      router.refresh();
    }
  }

  async function handleToggleRegistration(id: string, current: boolean) {
    const result = await updateTournament(id, { registration_open: !current });
    if (result.error) toast(result.error, "error");
    else router.refresh();
  }

  async function handleStatusChange(id: string, newStatus: string) {
    const result = await updateTournament(id, { status: newStatus });
    if (result.error) toast(result.error, "error");
    else {
      toast(t("statusUpdated", { status: newStatus }), "success");
      router.refresh();
    }
  }

  if (tournaments.length === 0) {
    return (
      <Card>
        <p className="text-center text-sm text-gray-500">{t("noTournaments")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {tournaments.map((t_item) => (
        <Card key={t_item.id}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm font-bold text-white">{t_item.title}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
                  {t_item.mode} · {t_item.series_format} · {t_item.start_date ? new Date(t_item.start_date).toLocaleDateString() : "—"}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[t_item.status] || "default"}>
                {t_item.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {/* Status dropdown */}
              <select
                value={t_item.status}
                onChange={(e) => handleStatusChange(t_item.id, e.target.value)}
                className="rounded-lg border border-gray-700 bg-[#0b0e14] px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-300 outline-none focus:border-purple-500"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/${locale}/admin/edit-tournament/${t_item.id}`)}
              >
                {t("edit")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleRegistration(t_item.id, t_item.registration_open)}
              >
                {t_item.registration_open ? t("closeRegistration") : t("openRegistration")}
              </Button>
              <Button variant="danger" size="sm" onClick={() => setTournamentToDelete(t_item)}>
                {t("delete")}
              </Button>
            </div>
          </div>
        </Card>
      ))}

      <Modal isOpen={!!tournamentToDelete} onClose={() => !isDeleting && setTournamentToDelete(null)} title={t("deleteTournamentTitle")}>
        <p className="text-sm text-gray-400">
          {t("deleteTournamentConfirm", { name: tournamentToDelete?.title ?? "" })}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setTournamentToDelete(null)} disabled={isDeleting}>
            {t("cancel")}
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
            {t("delete")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
