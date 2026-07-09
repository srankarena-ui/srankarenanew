# Changelog

Resumen breve de cada implementación (feature, fix, refactor pedido). Una entrada nueva arriba de todo, formato: fecha, qué se hizo y por qué, archivos principales. El objetivo es que una sesión nueva pueda entender el estado del proyecto leyendo esto en vez de re-derivar todo del historial de git.

## 2026-07-08 — Bot de Discord, Fase 1: rol "Verificado" al vincular cuenta

Al vincular Discord (`/vincular <código>`) o desvincularlo desde Ajustes, el bot ahora otorga/retira automáticamente un rol `Verificado` en el servidor — es el mecanismo anti-raid/anti-spam (combinado con restringir `@everyone` a un canal `#verifícate` en la config del servidor, hecho a mano en Discord). Falla en modo best-effort: si el bot no tiene permisos, el vínculo en la base de datos igual se completa y se avisa con un mensaje de advertencia.

Archivos: `src/core/lib/discord.ts` (`assignVerifiedRole`/`removeVerifiedRole`), `src/app/api/discord/interactions/route.ts`, `src/modules/settings/actions.ts` (`unlinkDiscord`), `src/modules/settings/components/SettingsView.tsx` (copy).

Pendiente: cargar env vars `DISCORD_PUBLIC_KEY`, `DISCORD_APPLICATION_ID`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_VERIFIED_ROLE_ID` y hacer la config manual del servidor antes de que esto quede activo. Roadmap de fases futuras (consultas, anuncios, etc.) en el plan guardado.
