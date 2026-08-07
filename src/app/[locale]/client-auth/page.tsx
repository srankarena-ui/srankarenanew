"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/core/supabase/browser";

/**
 * Puente entre la web y el cliente de escritorio.
 *
 * El cliente abre esta página en el navegador; aquí el usuario ya tiene (o
 * inicia) su sesión normal —con captcha, con Google, con lo que sea— y la
 * sesión se devuelve al servidor local por la interfaz de bucle invertido.
 *
 * Se hace así y no pidiendo la contraseña dentro del cliente porque Supabase
 * tiene el captcha activo: el login por contraseña desde fuera de la web
 * responde «captcha protection: request disallowed». Además es mejor: la
 * contraseña nunca pasa por el cliente.
 */
export default function ClientAuthPage() {
  const params = useSearchParams();
  const [estado, setEstado] = useState<"comprobando" | "sin-sesion" | "enviando" | "error">("comprobando");
  const [detalle, setDetalle] = useState("");

  const puertoCrudo = params.get("port") ?? "";
  const state = params.get("state") ?? "";

  useEffect(() => {
    // El destino NO sale de la URL. Solo el número de puerto, y validado: si se
    // aceptara una dirección completa, cualquiera podría mandar aquí a un
    // usuario con `?redirect=https://malo.example` y quedarse con su sesión.
    const puerto = Number(puertoCrudo);
    if (!Number.isInteger(puerto) || puerto < 1024 || puerto > 65535) {
      setEstado("error");
      setDetalle("Puerto inválido. Abre esta página desde el cliente, no a mano.");
      return;
    }

    createClient().auth.getSession().then(({ data }) => {
      const s = data.session;
      if (!s) { setEstado("sin-sesion"); return; }

      setEstado("enviando");
      const destino = new URL(`http://127.0.0.1:${puerto}/callback`);
      destino.searchParams.set("access_token", s.access_token);
      destino.searchParams.set("refresh_token", s.refresh_token);
      destino.searchParams.set("expires_at", String(s.expires_at ?? 0));
      destino.searchParams.set("state", state);
      window.location.href = destino.toString();
    });
  }, [puertoCrudo, state]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-6 text-center">
      <h1 className="mb-3 text-lg font-bold text-white">Conectar el cliente</h1>

      {estado === "comprobando" && <p className="text-sm text-gray-400">Comprobando tu sesión…</p>}

      {estado === "enviando" && (
        <p className="text-sm text-gray-400">
          Listo. Devolviéndote al cliente… ya puedes cerrar esta pestaña.
        </p>
      )}

      {estado === "sin-sesion" && (
        <>
          <p className="mb-4 text-sm text-gray-400">
            Inicia sesión y vuelve a pulsar «Entrar» en el cliente.
          </p>
          {/* Con el idioma delante: las rutas del sitio lo llevan, y sin él
              esto no lleva a ninguna parte. Y `next` para volver aquí — antes
              se iniciaba sesión y se acababa en la portada, con el cliente
              esperando una sesión que no llegaba nunca. */}
          <a
            href={`/es/login?next=${encodeURIComponent(`/es/client-auth?port=${puertoCrudo}&state=${state}`)}`}
            className="rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] text-white"
          >
            Iniciar sesión
          </a>
        </>
      )}

      {estado === "error" && <p className="text-sm text-red-400">{detalle}</p>}
    </div>
  );
}
