"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/core/supabase/browser";

/**
 * Deja la sesión del cliente de escritorio dentro de la web incrustada.
 *
 * Sin esto la aplicación pide iniciar sesión dos veces: la barra del cliente
 * lleva su propio token, pero la web que va debajo se maneja por cookies suyas,
 * y esas cookies se quedaron en el navegador donde se hizo el login.
 *
 * Los tokens llegan por el fragmento de la URL —lo que va detrás de la
 * almohadilla— y no por la consulta, porque el fragmento no se envía al
 * servidor: no acaba en los registros ni en ningún intermediario. Es el mismo
 * sitio por donde Supabase devuelve la sesión en sus propios flujos.
 *
 * Hermana de `/client-auth`, que hace el camino contrario: aquella saca la
 * sesión de la web hacia el cliente, esta la mete de vuelta.
 */
export default function ClientSessionPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    const frag = new URLSearchParams(location.hash.slice(1));
    const access_token = frag.get("access_token") ?? "";
    const refresh_token = frag.get("refresh_token") ?? "";

    // El destino no puede salir de la URL sin más: una dirección completa
    // convertiría esto en un redirector abierto. Solo una ruta de este sitio.
    const pedido = frag.get("next") ?? "";
    const destino = /^\/(?!\/)/.test(pedido) ? pedido : "/es/tournaments";

    if (!access_token || !refresh_token) {
      setError("Faltan los datos de sesión. Abre esto desde el cliente, no a mano.");
      return;
    }

    createClient()
      .auth.setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) { setError(error.message); return; }
        // Se va con replace para que el fragmento no quede en el historial.
        location.replace(destino);
      });
  }, []);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-6 text-center">
      {error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <p className="text-sm text-gray-400">Entrando…</p>
      )}
    </div>
  );
}
