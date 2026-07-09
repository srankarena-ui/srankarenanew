# Changelog

Resumen breve de cada implementación (feature, fix, refactor pedido). Una entrada nueva arriba de todo, formato: fecha, qué se hizo y por qué, archivos principales. El objetivo es que una sesión nueva pueda entender el estado del proyecto leyendo esto en vez de re-derivar todo del historial de git.

## 2026-07-09 — Bot de Discord: comandos localizados a inglés (link/profile/verify)

Los 3 comandos (`/vincular`, `/perfil`, `/verificar`) ahora usan `name_localizations` de Discord: un usuario con el cliente en inglés ve `/link`, `/profile`, `/verify` en vez de los nombres en español — es el mismo comando registrado una sola vez, Discord solo cambia el nombre mostrado. El handler sigue enrutando por el nombre base, sin cambios. Falta re-registrar comandos desde el panel admin para que tome efecto. Los mensajes de respuesta del bot siguen en español únicamente.

Archivos: `src/core/lib/discord.ts` (tipo `DiscordCommand`), `src/modules/admin/actions.ts`.

## 2026-07-09 — Bot de Discord: comando `/verificar` (captcha por DM), desacoplado de la cuenta

Reemplaza el diseño anterior (rol al vincular cuenta) por un gate anti-raid independiente: `/verificar` sin argumentos manda un código de un solo uso por DM (vence en 10 min, tabla nueva `discord_verify_codes`); `/verificar <código>` lo redime y asigna el rol `Verificado`. Motivo: el usuario no quería exigir cuenta de S-Rank Arena para entrar al servidor, solo un filtro simple anti-bot. `/vincular` y "Unlink" en Ajustes ya no tocan el rol — quedan solo para `/perfil` y fases futuras.

Deploy en producción ya hecho (env vars cargadas, bot invitado, rol `Verificado` configurado, endpoint de interacciones verificado en `www.srankarena.com`). Pendiente: re-registrar comandos desde el panel admin (`/es/admin/discord`) para que Discord reconozca `/verificar`, y prueba end-to-end.

Archivos: `src/core/lib/discord.ts` (`assignVerifiedRole`, `sendDirectMessage`), `src/app/api/discord/interactions/route.ts` (`handleVerificar`), `src/modules/admin/actions.ts` (registro del comando), `src/modules/settings/actions.ts` (`unlinkDiscord` revertido), `supabase/migrations/025_discord_verify_codes.sql`.

## 2026-07-08 — Bot de Discord, Fase 1: rol "Verificado" al vincular cuenta (superado por la entrada de arriba)

Al vincular Discord (`/vincular <código>`) o desvincularlo desde Ajustes, el bot ahora otorga/retira automáticamente un rol `Verificado` en el servidor — es el mecanismo anti-raid/anti-spam (combinado con restringir `@everyone` a un canal `#verifícate` en la config del servidor, hecho a mano en Discord). Falla en modo best-effort: si el bot no tiene permisos, el vínculo en la base de datos igual se completa y se avisa con un mensaje de advertencia.

Archivos: `src/core/lib/discord.ts` (`assignVerifiedRole`/`removeVerifiedRole`), `src/app/api/discord/interactions/route.ts`, `src/modules/settings/actions.ts` (`unlinkDiscord`), `src/modules/settings/components/SettingsView.tsx` (copy).

Pendiente: cargar env vars `DISCORD_PUBLIC_KEY`, `DISCORD_APPLICATION_ID`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_VERIFIED_ROLE_ID` y hacer la config manual del servidor antes de que esto quede activo. Roadmap de fases futuras (consultas, anuncios, etc.) en el plan guardado.
