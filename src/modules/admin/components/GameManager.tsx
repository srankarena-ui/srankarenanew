"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/core/ui/Card";
import { Button } from "@/core/ui/Button";
import { Input } from "@/core/ui/Input";
import { Badge } from "@/core/ui/Badge";
import { Modal } from "@/core/ui/Modal";
import { useToast } from "@/core/ui/Toast";
import { createGame, deleteGame } from "@/modules/admin/actions";
import { useRouter } from "next/navigation";
import type { Game } from "@/core/types";

interface GameManagerProps {
  games: Game[];
}

export function GameManager({ games }: GameManagerProps) {
  const t = useTranslations("admin");
  const { toast } = useToast();
  const router = useRouter();
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleCreate(formData: FormData) {
    const result = await createGame(formData);
    if (result.error) toast(result.error, "error");
    else {
      toast(t("gameCreated"), "success");
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!gameToDelete) return;
    setIsDeleting(true);
    const result = await deleteGame(gameToDelete.id);
    setIsDeleting(false);
    if (result.error) toast(result.error, "error");
    else {
      toast(t("gameDeleted"), "success");
      setGameToDelete(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {/* New game form */}
      <Card>
        <h3 className="mb-3 text-sm uppercase tracking-wider text-white">
          {t("addGame")}
        </h3>
        <form action={handleCreate} className="grid grid-cols-3 gap-3">
          <Input name="name" label={t("gameName")} placeholder="League of Legends" required />
          <Input name="slug" label={t("slug")} placeholder="lol" required />
          <Input name="modes" label={t("modes")} placeholder="1v1, 5v5" required />
          <div className="col-span-3 flex justify-end">
            <Button type="submit">+ {t("addGame")}</Button>
          </div>
        </form>
      </Card>

      {/* Existing games */}
      {games.map((game) => (
        <Card key={game.id}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm font-bold text-white">{game.name}</p>
                <p className="text-[9px] font-bold text-gray-500">
                  {game.slug}
                </p>
              </div>
              <div className="flex gap-1">
                {game.modes?.map((mode: string) => (
                  <Badge key={mode} variant="accent">
                    {mode}
                  </Badge>
                ))}
              </div>
              {game.active ? (
                <Badge variant="success">{t("active")}</Badge>
              ) : (
                <Badge variant="danger">{t("inactive")}</Badge>
              )}
            </div>
            <Button variant="danger" size="sm" onClick={() => setGameToDelete(game)}>
              {t("delete")}
            </Button>
          </div>
        </Card>
      ))}

      <Modal isOpen={!!gameToDelete} onClose={() => !isDeleting && setGameToDelete(null)} title={t("deleteGameTitle")}>
        <p className="text-sm text-gray-400">
          {t("deleteGameConfirm", { name: gameToDelete?.name ?? "" })}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setGameToDelete(null)} disabled={isDeleting}>
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
