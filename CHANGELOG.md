# Changelog

Resumen breve de cada implementación (feature, fix, refactor pedido). Una entrada nueva arriba de todo, formato: fecha, qué se hizo y por qué, archivos principales. El objetivo es que una sesión nueva pueda entender el estado del proyecto leyendo esto en vez de re-derivar todo del historial de git.

## 2026-07-09 — Marcador de fútbol provisional para stream overlay

Feature rápida y provisional (no relacionada al roadmap del producto): panel admin en `/admin/scoreboard` para controlar un marcador en vivo (equipos, siglas, banderas por URL, marcador, reloj con inicio/pausa/reinicio y tiempo agregado), consumido por `/overlay/football` como fuente transparente para OBS. Se actualiza solo cada 3 segundos por polling (sin Supabase Realtime, no había precedente de esto en el proyecto). El reloj no simula medio tiempo/45 min exactos, cuenta corrido en MM:SS con el tiempo agregado mostrado aparte.

Archivos: `supabase/migrations/027_football_scoreboard.sql`, `src/core/lib/football-clock.ts`, `src/modules/admin/actions.ts`, `src/modules/admin/components/FootballScoreboardPanel.tsx`, `src/app/api/football-scoreboard/route.ts`, `src/app/overlay/football/`.

## 2026-07-09 — Perfil: mover edición de bio/tema al perfil público

El botón "Editar perfil" ahora vive en la página pública del perfil (debajo de "Ver logros"), no en Ajustes — se quitó la tarjeta duplicada de Ajustes. Al hacer clic se despliega inline el formulario de bio y tema de color, mismo server action de antes (`updateProfileCustomization`).

Archivos: `src/modules/profile/components/ProfileEditToggle.tsx` (nuevo), `src/modules/profile/components/ProfileHeader.tsx`, `src/app/[locale]/profile/[username]/page.tsx`, `src/modules/settings/components/SettingsView.tsx`.

## 2026-07-09 — Revertir banner de perfil como URL libre

El usuario frenó el campo de texto libre para el banner apenas subido: riesgo de que se pegue una imagen inapropiada. El banner será un premio otorgado por admin/torneos (sistema por construir), no algo que el usuario escriba directo. Se quitó el input y la validación de `banner_url` en Ajustes; la columna sigue en la BD para cuando exista el catálogo de premios.

Archivos: `src/modules/settings/actions.ts`, `src/modules/settings/components/SettingsView.tsx`, `src/core/i18n/dictionaries/{es,en}.json`.

## 2026-07-09 — Discord: consolidar /perfil-imagen y /perfil-embed en un solo /perfil

El usuario prefirió la versión de imagen tras probar ambas. `/perfil` (texto) y `/perfil-embed` se eliminaron; `/perfil` ahora siempre devuelve el banner generado por `/api/discord/profile-card`.

Archivos: `src/app/api/discord/interactions/route.ts`, `src/modules/admin/actions.ts`.

## 2026-07-09 — Perfil: personalización tipo Steam (bio, banner, tema de color)

Nueva sección en Ajustes para personalizar el perfil público: bio corta (280 caracteres), banner (URL pegada — mismo patrón que los banners de torneo, no hay infraestructura de subida de archivos en el proyecto todavía) y tema de color por perfil (reutiliza la paleta `challenger/volt/ember/aurora` que ya existía como preferencia de navegador — ahora se puede fijar por usuario y se ve así para cualquier visitante, vía `data-accent` escoped al `Card` del perfil en vez de `document.documentElement`).

Pendiente/decisión abierta: avatar real con imagen subida (Steam-style) quedó fuera de esta ronda — requeriría armar Supabase Storage desde cero. El usuario no lo pidió esta vez, pero puede ser la siguiente fase.

Archivos: `supabase/migrations/026_profile_customization.sql`, `src/core/types/database.ts`, `src/modules/settings/actions.ts` (`updateProfileCustomization`), `src/modules/settings/components/SettingsView.tsx`, `src/modules/profile/components/ProfileHeader.tsx`, `src/core/i18n/dictionaries/{es,en}.json`.

## 2026-07-09 — Panel admin de Discord: diagnóstico en vivo

`/es/admin/discord` ya no solo registra comandos: consulta directo a la API de Discord y muestra estado real — qué env vars están cargadas, si el bot está conectado al servidor (nombre de la guild), si el rol `Verificado` existe, y la lista de comandos efectivamente registrados en Discord (fuente de verdad, no lo que asumimos). Motivo: el usuario quería confirmar que `/vincular` y compañía sí se desplegaron sin tener que probarlo a ciegas en Discord.

Archivos: `src/core/lib/discord.ts` (`getRegisteredCommands`, `getGuildStatus`), `src/app/[locale]/admin/discord/page.tsx`, `src/modules/admin/components/DiscordSetupPanel.tsx`.

## 2026-07-09 — Bot de Discord: comandos de prueba `/perfil-imagen` y `/perfil-embed`

Dos variantes de `/perfil` para que el usuario compare y elija: `/perfil-imagen` genera un PNG en el servidor (`next/og`, sin dependencias nuevas) que replica la tarjeta de perfil de la web (avatar con gradiente+inicial, nombre#tag, badge de rol, badge de rango); `/perfil-embed` usa el embed nativo de Discord (título con link a logros, color según rango, campos de rol/rango/cuentas). Pendiente: decidir cuál se queda como `/perfil` definitivo (o dejar ambas) una vez probadas en el servidor real.

Archivos: `src/app/api/discord/profile-card/route.tsx` (nuevo), `src/app/api/discord/interactions/route.ts` (`handlePerfilImagen`, `handlePerfilEmbed`), `src/modules/admin/actions.ts` (registro de los 2 comandos).

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
