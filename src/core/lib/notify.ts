import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/core/types/database";

/**
 * Escribir avisos. Un único sitio: el día que haya un segundo canal —Discord
 * tiene `postDiscordMessage` escrito y sin usar desde hace tiempo— se engancha
 * aquí y lo hereda todo lo que ya avisa, en vez de repartir la lógica.
 *
 * Requiere service role: `notifications` no tiene policy de insert a propósito,
 * o cualquiera podría fabricarse avisos.
 */
export interface NotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  /** Ruta relativa con idioma, p. ej. `/es/tournaments/abc?tab=leaderboard`. */
  link?: string;
}

export async function notify(
  admin: SupabaseClient<Database>,
  avisos: NotificationInput | NotificationInput[]
): Promise<void> {
  const lista = Array.isArray(avisos) ? avisos : [avisos];
  if (!lista.length) return;

  const { error } = await admin.from("notifications").insert(
    lista.map((a) => ({
      user_id: a.userId,
      type: a.type,
      title: a.title,
      body: a.body ?? null,
      link: a.link ?? null,
    }))
  );

  // Un aviso que no sale no debe tumbar la acción que lo provocó: el sello ya
  // está gastado y el castigo impuesto. Se registra y se sigue.
  if (error) console.error("[notify] no se pudo escribir el aviso:", error.message);
}

/** Tipos de aviso que existen. Los usa el cliente para decidir cómo mostrarlos. */
export const NOTIFICATION_TYPES = {
  /** Te han impuesto un castigo. El cliente lo saca por encima del juego. */
  castigoRecibido: "castigo_recibido",
  /** Confirmación para quien lanzó el sello. */
  castigoLanzado: "castigo_lanzado",
} as const;
