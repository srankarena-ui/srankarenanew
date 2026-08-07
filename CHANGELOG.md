# Changelog

Resumen breve de cada implementación (feature, fix, refactor pedido). Una entrada nueva arriba de todo, formato: fecha, qué se hizo y por qué, archivos principales. El objetivo es que una sesión nueva pueda entender el estado del proyecto leyendo esto en vez de re-derivar todo del historial de git.

## 2026-08-07 — El aviso de castigo se pulsa y lleva a decidirlo

Enterarse de que tienes un castigo sin decidir no servía de nada si luego había que buscar dónde aceptarlo. Ahora el aviso lleva a la ficha del torneo, en la pestaña de clasificación, que es donde están los botones.

Solo se puede pulsar el que está sin decidir. El resto siguen ignorando el ratón, y no por descuido: encima de una partida, una ventana que traga clics es peor que no tener aviso. Y el pulsable dura el doble — nueve segundos dan para leerlo, no para leerlo, decidir y llegar a pulsarlo.

El clic viaja por el hash de la ventana, que es el canal que ya usaba para avisar de que se iba; montar un puente entre procesos para dos mensajes sería más pieza que problema. Y la interfaz no se recarga: expone una función que Electron llama, porque recargarla perdería lo que estuvieras haciendo dentro.

`/api/me/inbox` devuelve ahora el torneo de cada reto — sin eso el aviso solo sabe abrir la lista.

`desktop-client/main.js`, `desktop-client/src/aviso.html`, `desktop-client/src/main.js`, `desktop-client/server.mjs`, `src/app/api/me/inbox/route.ts`.

## 2026-08-07 — Autofill avisa como el resto de castigos

El aviso va en el **lobby**, no en selección de campeón: la posición se elige antes de buscar partida y al pulsar buscar queda congelada, así que avisar en selección llegaría tarde para lo único que se puede hacer, cambiarla. Si tiene un rol concreto puesto en vez de Autofill, salta el aviso; sin posición todavía no dice nada.

**El veredicto sale al entrar en selección de campeón, no al buscar partida.** Buscar y cancelar no es jugar, y juzgarlo ahí castigaría una cola que nunca llegó a nada. La posición se guarda al buscar —el instante en que se congela— y se juzga al llegar a selección: leerla entonces del cliente no vale, el lobby ya se está deshaciendo.

`check-autofill.mjs` destapó que cancelar la cola y volver a buscar se colaba sin comprobar: el rearme solo ocurría al salir del lobby y de la cola, y entre esas dos fases se puede ir y venir.

Sigue fuera de la ruleta (`CLIENTE_DISPONIBLE`): sin cliente abierto nadie reporta y el castigo se quedaría eterno.

`desktop-client/server.mjs`, `scripts/check-autofill.mjs`.

## 2026-08-06 — El cliente de escritorio existe y se instala

**Se abandona Tauri.** Necesita el SDK de Windows para enlazar, no está instalado, y el cliente llevaba meses sin poder compilarse ni una vez. Pasa a **Electron**, que es lo que ya usaba el overlay de streamer —cadena probada en la máquina— y que empaqueta Node dentro: el streamer no instala nada aparte. Salen instalador NSIS y portable, 89 MB.

**Un solo programa.** El overlay de streamer vive ahora en `desktop-client/overlay` y lo arranca el cliente como proceso hijo, sin portar ni una línea: su `server.mjs` ya era Node puro. La pestaña Streamer solo aparece con distintivo o siendo admin, y el servidor comprueba lo mismo antes de arrancar nada.

**Login por navegador.** Supabase tiene captcha activo, así que el login por contraseña desde fuera de la web está prohibido. El cliente abre `/es/client-auth` en el navegador y la sesión vuelve por bucle invertido. El destino no sale de la URL —solo un número de puerto, validado— o sería un redirector abierto; y lleva nonce de un solo uso, o cualquier página podría dejar el cliente con la sesión de otro.

**El overlay usa la clave de la plataforma.** Fuera el campo de clave de desarrollador, que caducaba cada 24 h. No se reparte la clave: va por pasarela (`/api/riot/proxy`) con lista blanca de host y ruta. Bastó cambiar `riotGet()`, por donde pasan todas sus llamadas.

**Distintivo de streamer** (migración 037): columna propia y no un valor de `role`, porque es ortogonal a admin u organizador. Protegida con trigger como `role`.

Cuatro trampas del empaquetado, resueltas: la carpeta del programa no es escribible instalada (datos a `userData`); no se puede lanzar un proceso desde `app.asar` (`asarUnpack` + reescritura de ruta); `process.execPath` dentro de Electron es Electron y no node (`ELECTRON_RUN_AS_NODE`); e instancia única, porque dos procesos peleando por el puerto se ven como "no abre".

## 2026-08-06 — Castigos: imponerlos, decidirlos y verificarlos solos

**Imponer.** Con un sello le impones un castigo a otro participante. Lo sortea el servidor —el giro del modal es adorno; si decidiera el navegador, cualquiera recargaría hasta sacar el más suave— filtrando por el rol del castigado y pesando por dureza, así que los duros salen a un tercio de los suaves. Un castigo a la vez por persona: mientras tenga uno sin resolver no puede recibir otro. No es enfriamiento por tiempo sino por estado, sin temporizador ni tabla nueva.

**Decidir.** Aceptar o rechazar. Rechazar cuesta 100 puntos, calibrado sobre 10.020 partidas: una vale 92,6 de media y entre ganarla y perderla hay 76,4, así que rechazar duele más que cumplir aunque el castigo te haga perder. Sin decidir, las partidas nuevas dejan de contar — es una pausa, no un castigo, y `decided_at` hace que lo jugado en ese hueco no cuente nunca, ni al resincronizar. Sin esa marca, aceptar tres días tarde recuperaría todo y volveríamos a premiar el ignorar.

**Verificar.** Los 12 se comprueban solos contra match-v5, sin peticiones extra salvo una de maestría al imponerlos. Hechizos, usos de la ultimate, guardianes de control, consumibles y los catorce campos de ping salen del participante que el sync ya descarga; botas y presupuesto, del catálogo de Data Dragon en vez de una lista de IDs que se quedaría vieja en silencio. Los de campeón congelan la maestría al imponerse: mirarla después daría otro resultado, porque sube al jugar.

**Avisos.** Primer canal de la plataforma: tabla `notifications`, campana con contador y `/api/me/inbox` como fuente única para web, cliente de escritorio y overlay. Avisa al recibir el castigo y al resolverse.

Migraciones 032-036. Comprobaciones: `check-castigos.mjs` (3.000 tiradas por rol) y `check-verificacion.mjs` (cada castigo detecta su infracción y la ruleta nunca reparte lo que no sabe comprobar).

**Tres veces el mismo fallo**, y merece quedar escrito: lógica que no depende de partidas nuevas enterrada detrás de los `continue` del camino de las partidas. Primero el rango, luego la resta por rechazar, luego otra vez. La descarga es ahora un bloque etiquetado y el recálculo vive fuera.

## 2026-08-05 — Sellos: 14 reglas, tope de 3 y cápsula visible

Cinco reglas nuevas tomadas de las normas de Blue Shell, todas medidas sobre el dataset unido (que sí separa kills de asistencias): masacre 22+ kills 1,37% · orquesta 30+ asistencias 0,68% · KDA de 20 0,77% · cuadrakill 0,88% · maratón (ganar en 40+ min) 5,99%. Sus dos umbrales estaban bien calibrados: 22 kills y 30 asistencias salen casi igual de raros, que es lo que hace falta para que un carry y un support tengan la misma oportunidad.

**Producción total: 0,236 sellos por partida** — 2,36 en un torneo de 10, 4,72 en uno de 20. Con eso el tope de 3 casi nunca muerde en el corto y obliga a gastar en el largo, que es su función. El check falla si la producción se sale de esa banda por arriba o por abajo, no solo si una regla concreta se dispara.

**Cápsula de 3 huecos** en la clasificación en vez de un contador: los vacíos en gris, los ganados encendidos. Se ve de un vistazo cuánta munición tiene y cuánta le cabe. Nueva pestaña «Sellos» en la tarjeta lateral con las 14 reglas, su «?» explicativo y la frecuencia real de cada una.

ponytail: los sellos que no caben quedan en cola, no se pierden — al gastar uno, el siguiente sync mete el que se quedó fuera. Perderlos de verdad (como en Blue Shell) exige columna `void` y reproducir en orden cronológico ganancias y gastos, porque el sync no sabe cuándo estuvo lleno.

## 2026-08-05 — Historial de partidas al pulsar un jugador del leaderboard

Al pulsar una fila de la clasificación se despliega debajo su historial del torneo: campeón con icono, rol, duración, K/D/A y KDA, KP, CS y CS/min, daño, visión, rendimiento, los retos conseguidos en esa partida y los puntos que sumó o restó. Marco verde/rojo según el resultado.

**Sin endpoint nuevo ni datos nuevos.** `match_data` ya guardaba todo esto por partida, y `summoner_trials_matches` tiene política `for select using (true)`, así que se lee desde el navegador con la clave anónima. Se pide al desplegar y no con la página: con 50 inscritos serían 500 filas de jsonb en el HTML inicial de una página que ya era lenta. Solo se abre uno a la vez.

Los iconos de campeón salen de `cdn.communitydragon.org/latest/champion/<nombre>/square`, que no obliga a fijar versión de parche como sí hace Data Dragon.

**Arreglada la raíz de un problema mío**: `collect-challenges.mjs` guardaba solo el bloque `challenges` más seis campos elegidos a mano, y `challenges` da `takedowns` (kills + asistencias) pero nunca los separa. Por eso no pude medir "22 kills" sobre ese fichero. Ahora guarda el participante entero (menos `perks`). Nada se perdió: `data/matches.csv` sí traía kills/deaths/assists del mismo crawl, y el nuevo `scripts/dataset.mjs` une los dos por (match_id, rol, victoria) — clave única, casa 10.020/10.020. Ejecutarlo directamente comprueba la unión y falla si no cuadra.

## 2026-08-05 — Sellos: la moneda para imponer castigos (mitad de ganarlos)

El ítem se llama **sello**. Se descartó "castigo" porque choca con el hechizo de invocador — Smite es *Castigar* en el cliente en español.

**Nueve reglas, todas medidas** sobre las 10.020 actuaciones de `data/challenges.jsonl` antes de fijarlas, no estimadas: KDA perfecto 1,77% · pentakill 0,10% · doble barrido 0,20% · desde las cenizas 1,75% · robo ancestral 2,20% · carga del equipo 3,32% · cargaste y perdiste 4,62% · rachas de 5 victorias y de 5 derrotas (no medibles: el dataset son actuaciones sueltas, no secuencias). Se descartaron *3+ asesinatos en solitario* (24,54%) y *morir 10+ veces* (22,72%) por inundar la economía.

**El KDA perfecto lleva suelo de 8 participaciones.** Un 2/1/1 en una partida de cuatro asesinatos cumplía "una muerte y KP > 50%" sin haber hecho nada. El suelo solo recorta del 2,13% al 1,77%, o sea que casi todo lo que filtra es ese caso.

**Modelo de datos**: `seals`, una fila por sello (migración 032). El saldo es contar las que tienen `spent_at` nulo — sin tabla de monedero ni triggers. El índice único `(user_id, reason, riot_match_id)` es lo que sostiene todo: el sync recalcula **todas** las partidas cada vez, así que cambiar una regla reparte hacia atrás sin backfill y reejecutar es inofensivo. Sin `WHERE` a propósito: los NULL ya son distintos entre sí en un índice único, y uno parcial no siempre sirve para `ON CONFLICT`.

Comprobación: `node --experimental-strip-types scripts/check-seal-rules.mjs` — casos límite de rachas, el 2/1/1, y falla si alguna regla salta en más del 10% de las partidas.

**Falta la otra mitad**: gastar el sello para imponerle un castigo a otro jugador. El catálogo de castigos está diseñado en `docs/retos-verificacion.md` pero sin construir.

## 2026-08-04 — Cada pestaña de torneo con URL propia, y arreglo del leaderboard

**Crash del leaderboard.** Al rellenar el rango de las inscripciones sin partidas, `stats_snapshot` pasó de `null` a un objeto **solo con el rango**. La tabla comprobaba `snap ? snap.avg_kda.toFixed(2) : "—"`: con snapshot presente pero sin medias, `toFixed` de `undefined`. `tsc` no lo vio porque `StatsSnapshot` declaraba las medias como obligatorias — el mismo patrón que ya mordió con `config.scoring_weights`. Ahora todos los campos son opcionales, así que el compilador exige comprobar cada uno, y se comprueba campo a campo en vez de `snap ?`.

**Pestañas en la URL.** `activeTab`, `overviewSubTab` y `bracketSubTab` vivían en el store de zustand: no se podían compartir ni recargar. Pasan a `?tab=` y `?sub=` mediante `useTabParam` (nuevo, `src/modules/tournaments/useTabParam.ts`), y esos tres campos desaparecen del store. La tercera pestaña usa el nombre que ve el usuario — `?tab=leaderboard` en Summoner Trials, `?tab=bracket` en el resto. El valor por defecto no se escribe en la URL para no tener dos direcciones de la misma página, y se usa `push` para que el botón atrás deshaga el cambio de pestaña.

Verificado con `npm run start` sobre un torneo real: las cinco combinaciones de URL devuelven 200 sin excepciones, y los cuatro rangos se pintan.

## 2026-08-04 — Arreglo: el rango no aparecía para casi nadie

El rango se pedía **dentro** del bloque `if (addedCount > 0)`, que a su vez cuelga de `if (!newIds.length) continue`. O sea: solo se guardaba para quien tuviera partidas nuevas en ese sync concreto. Quien acababa de inscribirse, quien no había jugado desde el último sync, o quien ya había completado el torneo no llegaba nunca a tener rango — las cuatro inscripciones reales estaban así. La "optimización" de pedirlo solo cuando hay partidas nuevas era justo el fallo.

Ahora se refresca para todas las inscripciones al principio del bucle, antes de mirar partidas, y se funde en `stats_snapshot` sin tocar el resto. Cuesta una petición por jugador y sync.

De paso, `fetchRank` ya no se traga los fallos: caen en el array `errors` que el sync devolvía y que el botón de sincronizar ignoraba. Se añadió también el fallback a `by-summoner` copiando el overlay de `ropa proyecto`, aunque comprobado con clave válida `by-puuid` responde 200 en las cuatro regiones — el fallback es red de seguridad, no el arreglo.

Comprobación: `node scripts/check-rank.mjs` falla si alguna inscripción se queda sin rango.

## 2026-08-04 — El rango de liga sustituye al rol en la clasificación

En diez partidas un jugador puede pasar por tres posiciones, así que "su rol" no concluía nada. La columna pasa a ser el rango de solo/dúo con emblema, división y LP. El sync pide `league/v4/entries/by-puuid` **solo cuando el jugador tiene partidas nuevas** — que es justo cuando su rango puede haber cambiado, así que un sync en vacío no gasta peticiones — y lo guarda en `stats_snapshot` (jsonb, sin migración). Si la llamada falla, `fetchRank` devuelve `null` y la fila se pinta como "Sin clasificar".

Los emblemas salen de **CommunityDragon**, no de Data Dragon: DDragon solo sirve campeones e iconos de invocador, no emblemas de liga. Formato `.svg` porque el `.png` de Esmeralda no existe (los otros diez sí). El rol se sigue guardando en el snapshot: es contra lo que se compara el rendimiento.

Archivos: `api/lol/trials/sync/route.ts`, `SummonerTrialsLeaderboard.tsx`.

## 2026-08-04 — La tarjeta de premios pasa a tener pestañas

**Premios / Premios EXP / Puntos en un solo cuadro.** El catálogo de retos estaba en un desplegable al final de la clasificación, donde nadie llegaba a leerlo, y la XP por puesto se repetía en una insignia del encabezado de la tabla. Ahora los tres viven en la tarjeta lateral con pestañas: `TournamentRewardsPanel` (nuevo, `src/modules/tournaments/components/`). Las pestañas se muestran solo si tienen contenido — con una sola, la tarjeta se ve igual que antes, con su título y sin pestañas.

**La pestaña Puntos tiene selector de rol.** 18 de los 20 retos son comunes y 2 dependen del rol, así que hay botones Top/Jungla/Mid/ADC/Support y la lista se reordena por puntos marcando cuáles son "tu rol". Solo aparece en formato `summoner_trials`; un bracket normal no puntúa por partida.

**Cada reto explica qué hay que hacer.** "Sin salida" o "Territorio tomado" no dicen nada por sí solos, así que `Feat` lleva un campo `how` obligatorio (lo exige el tipo, no hace falta test) y un "?" al lado del nombre lo despliega junto al porcentaje de partidas que lo consiguen. Se abre en su sitio y de uno en uno en vez de un tooltip flotante: la tarjeta es estrecha y así funciona tocando en móvil.

Archivos: `TournamentRewardsPanel.tsx` (nuevo), `TournamentDetail.tsx`, `SummonerTrialsLeaderboard.tsx` (fuera `ScoringWeightsInfo` y el prop `xpTable`), `core/lib/tournament-feats.ts`.

## 2026-08-03 — Requisitos de inscripción y vault oculto mientras solo haya LoL

**Vault fuera de la vista.** El picker "Premios del Vault" salía en el paso 2 de creación en cualquier torneo, ofreciendo 108 cosméticos de Dota 2 a un evento de LoL — el editor, en cambio, ya lo escondía (`isDota`), así que los dos asistentes se contradecían. Se corta en las **consultas**, no en los componentes: `VAULT_ENABLED` (derivado de que Dota 2 esté en `ACTIVE_GAMES`) apaga las cuatro queries y los componentes reciben listas vacías, con lo que dejan de pintarse solos — incluido el distintivo de donante, porque `donorTier(0)` ya devolvía `null`. La página `/vault` sigue siendo admin-only como estaba y no había ningún enlace visible que quitar.

**Cuenta de Riot obligatoria en todo torneo de LoL.** La comprobación de `riot_puuid` vivía dentro de la rama de `summoner_trials`; un bracket normal caía al `else` e inscribía sin mirar nada. Ahora se valida antes de bifurcar, para cualquier torneo cuyo juego sea League of Legends.

**Flex exige 5 miembros aceptados.** Antes inscribía el equipo que hubiera, fueran 2 o 7, dejando el torneo con equipos que no pueden jugar una cola de 5. El umbral (`TEAM_MIN_MEMBERS`) vive en `core/config/tournaments.ts` porque `actions.ts` es "use server" y no puede exportar constantes; lo comparten el filtro de la UI y la validación del servidor.

**Alerta con botón en vez de error al pulsar.** `RegistrationRequirement` sustituye al botón de inscripción cuando falta el requisito y lleva al perfil, que es donde se resuelven los tres casos (vincular cuenta, crear dúo, completar equipo). Distingue "no tienes equipo" de "tu equipo está incompleto", que antes eran el mismo mensaje.

Sin verificar en vivo: la tabla `tournaments` está vacía, así que el flujo de inscripción no se pudo ejercitar con datos reales — solo `tsc` limpio y las páginas sirviendo 200.

Archivos: `src/core/config/games.ts`, `src/core/config/tournaments.ts` (nuevo), `src/modules/tournaments/actions.ts`, `src/modules/tournaments/components/RegistrationRequirement.tsx` (nuevo), `TeamRegisterButton.tsx`, `TournamentDetail.tsx`, y las páginas de crear/editar torneo, ficha de torneo y perfil.

## 2026-08-03 — Iconos de verificación, tabla de premios en el editor y foco perdido

**Iconos que no cargaban.** `SettingsView` fijaba Data Dragon a `14.10.1`: cualquier icono posterior a ese parche devolvía 403 y el `<img>` quedaba roto. Se pasa a CommunityDragon `/latest`, que sigue el parche actual sin pinear nada. (`src/app/[locale]/lol/page.tsx` mantiene el mismo pin — mismo bug latente, no tocado por ser fuera de alcance.)

**Tabla de premios también al editar.** El editor de `prize_table` por puesto/rango solo estaba en el asistente de creación; el de edición seguía con el campo viejo "Reward Points", así que el premio no se podía cambiar después de crear el torneo.

**Foco que se perdía al escribir.** En `EditTournamentWizard` los pasos se renderizaban como `<StepSettings />`: al ser funciones redefinidas en cada render, React los trataba como componentes distintos y desmontaba el subárbol en cada tecla, sacando el cursor del input. Se invocan como funciones (`StepSettings()`), que es lo que ya hacía el asistente de creación.

Archivos: `src/modules/settings/components/SettingsView.tsx`, `src/modules/admin/components/EditTournamentWizard.tsx`.

## 2026-08-02 — El resultado de la partida pasa a pesar: +30 / −20 y castigo por balance

Calibrado contra dos simulaciones con jugadores reales (192 partidas en total). Con la escala inicial de +20 al ganar y 0 al perder, **la clasificación no cambiaba ni un puesto**: el resultado era decorativo. Se sube a +30 / −20, con lo que el porcentaje de victorias empieza a decidir entre jugadores parejos.

Pero eso solo no bastaba: un 3-7 con muchos retos seguía colándose en el podio por delante de varios 6-4. Se añade un **castigo de 25 puntos por cada derrota que exceda a las victorias**, aplicado al total del torneo y no partida a partida. Solo afecta a quien pierde más de lo que gana; con récord positivo o empatado es cero. Con eso el podio queda reservado a récords positivos.

La clasificación avisa del castigo bajo la puntuación cuando existe, para que no parezca un error de cálculo.

Dos hallazgos de las simulaciones que conviene conservar: la correlación entre liga del jugador y puntuación es **−0,06**, es decir que el sistema es ciego al rango y se pueden mezclar niveles en un mismo torneo sin injusticia. Y con −20 por derrota apareció una partida negativa de 94 (−0,5 puntos), un caso raro pero posible que queda pendiente de decidir si se le pone suelo.

Archivos: `src/app/api/lol/trials/sync/route.ts`, `src/modules/tournaments/components/SummonerTrialsLeaderboard.tsx`.

## 2026-08-02 — Summoner Trials pasa a puntuar por percentil de rol y retos

El sync ya no puntúa valores crudos por pesos: `computeMatchScore` se sustituye por la fórmula calibrada — 10 de participación + rendimiento 0-100 (`roleScore()`, el percentil medio dentro del rol) + 20 por victoria + puntos de los 20 retos. Nadie saca cero. Los pesos configurables del torneo se siguen respetando: se mapean a las claves de los baselines (`damage` → `damage_per_min`, etc.) y `objectives` se ignora porque no hay percentil medido para eso.

Los 20 retos viven ahora en `src/core/lib/tournament-feats.ts` con su tasa real de consecución. Cada rol tiene exactamente 20: los 18 del fondo común más 2 de firma a 5 puntos, verificado en el self-check. Las métricas de umbral (una diferencia, una cobertura, una bandera) pagan una vez en vez de multiplicar por su valor, que era lo que daba puntos fraccionarios absurdos.

La clasificación muestra rol, rendimiento y puntos de retos por separado — sin el rol, la puntuación no se puede interpretar, porque se compara contra ese rol. El explicador de la fórmula estaba describiendo el sistema viejo y se reescribió.

Validado con los 10 jugadores de una partida real: los cuatro del equipo ganador arriba, un jugador que ganó sin aportar (14% de participación, 0 retos) cae al octavo puesto por debajo de tres rivales, y el peor de la partida saca 43 en vez de cero.

Archivos: `src/core/lib/tournament-feats.ts` (+ self-check), `src/app/api/lol/trials/sync/route.ts`, `src/modules/tournaments/components/SummonerTrialsLeaderboard.tsx`, `src/app/api/me/inbox/route.ts` (nuevo, agregador de avisos para el futuro cliente).

## 2026-08-02 — Puntuación de partida y retos de torneo, calibrados con datos reales

Se cerró el diseño del sistema de puntos y los 20 retos de torneo, todo medido contra la API en vez de estimado. Está documentado en `docs/retos-verificacion.md`; aquí solo lo que cambió en código.

`scripts/collect-matches.mjs`: cuotas por rango (reparte el objetivo entre los tiers pedidos), filtro `startTime` en la petición de identificadores —los jugadores de rango bajo devolvían sobre todo partidas de parches viejos y se gastaba una petición por cada descarte, pasó de ~4 a 20 partidas cada 5 minutos— y candado por PID, porque llegaron a correr tres crawls a la vez pisándose el rate limit y escribiendo duplicados. `scripts/analyze-roles.mjs` deriva la participación en asesinatos del propio CSV y desglosa por rango. Nuevos `collect-challenges.mjs` (recoge el bloque `challenges` de partidas ya conocidas, reanudable) y `analyze-feats.mjs` (frecuencia real de cada gesta).

`role-score.ts`: por debajo del p10 ahora interpola de 0 a 0,1 en vez de cortar en cero, para que el 10% inferior no sea indistinguible y nadie salga con la nada.

Además, la página de Ajustes seguía mostrando las tarjetas de vinculación de Clash Royale y Steam pese a `ACTIVE_GAMES`, y la portada prometía "League of Legends, Clash Royale y más próximamente". Ambos corregidos.

Dataset: 1.002 partidas del parche 16.15 repartidas entre seis rangos, en `data/` (ignorado por git); los baselines derivados sí se commitean en `src/core/config/role-baselines.json`.

Archivos: `docs/retos-verificacion.md`, `scripts/*.mjs`, `src/core/lib/role-score.ts`, `src/core/config/role-baselines.json`, `src/modules/settings/components/SettingsView.tsx`, `src/core/i18n/dictionaries/*.json`.

## 2026-08-02 — SEO: sitemap, robots, metadata por página y arreglo de layouts duplicados

El sitio no aparecía en Google. Dos bugs de fondo, además de la falta de metadatos:

1. **`app/layout.tsx` y `[locale]/layout.tsx` renderizaban ambos `<html>` y `<body>`**, así que cada página salía con las etiquetas duplicadas y **sin `lang`**. Se eliminó `app/layout.tsx`: al no haber layout raíz, `[locale]/` y `overlay/` pasan a ser cada uno su propia raíz (patrón documentado de multiple root layouts). `[locale]` ahora pone `lang={locale}` y ambos importan `globals.css`.
2. **`/robots.txt` y `/sitemap.xml` los interceptaba el middleware de i18n** y los redirigía a `/es/robots.txt` — inalcanzables para cualquier buscador. Se excluyeron del matcher en `proxy.ts`.

Añadido: `sitemap.ts` (páginas estáticas × idioma + torneos publicados reales, con hreflang), `robots.ts`, `metadataBase` + OpenGraph/Twitter, y metadata propia por página vía el helper `pageMetadata()` — antes todas compartían el título "S-Rank Arena" y Google las veía como duplicados. El canonical se pone por página, nunca en el layout (si no, todas dirían ser la home). `help` y `lol` son client components, por eso su metadata va en un `layout.tsx` propio.

Pendiente y no automatizable: registrar el dominio en Google Search Console y enviar el sitemap. Sin eso Google no descubre el sitio por mucho metadato que tenga.

Archivos: `src/app/layout.tsx` (eliminado), `src/app/overlay/layout.tsx`, `src/app/[locale]/layout.tsx`, `src/app/{sitemap,robots}.ts`, `src/core/config/site.ts`, `src/core/lib/seo.ts`, `src/proxy.ts`, y `generateMetadata` en las páginas públicas.

## 2026-08-01 — Puntuación por rol: normalización por percentiles + dataset propio

Base para que los puntos sean comparables entre roles. En vez de mantener 5 juegos de pesos sobre valores crudos (que castigan al support en CS y al jungla en visión), se puntúa **en qué percentil de tu rol caes**: un support en el p90 de visión suma lo mismo que un mid en el p90 de CS. Los pesos siguen diciendo qué se valora (un solo juego); la tabla de baselines dice qué es normal en cada rol y se regenera por parche.

`scripts/collect-matches.mjs` baja partidas del parche actual vía Riot API (semilla desde league-exp-v4 por tier; cada partida da 10 filas con rol ya etiquetado) a CSV. `scripts/analyze-roles.mjs` lo resume en percentiles por rol y escribe `src/core/config/role-baselines.json`, que es lo que consume `roleScore()`. Ambos sin dependencias, con espera fija para no pasar el rate limit de la key personal.

Pendiente: correr el crawl (la key de `.env.local` devolvía 401, caducada) y recién ahí enganchar `roleScore()` en `computeMatchScore` de `lol/trials/sync`, que sigue usando valores crudos.

Archivos: `src/core/lib/role-score.ts` (+ self-check `.test.ts`), `scripts/collect-matches.mjs`, `scripts/analyze-roles.mjs`, `.gitignore`.

## 2026-08-01 — Retos (challenges) verificados en vivo + cliente de escritorio

Sistema de retos de LoL ("juega X campeón teniendo Y maestría", rol, cola), verificable por dos caminos complementarios: el cliente de escritorio nuevo (`desktop-client/`, Tauri) lee la Live Client Data API local mientras juegas y reporta campeón/rol al backend, y `POST /api/challenges/sync` cierra post-partida los retos derivables del historial (match-v5) aunque el cliente no haya estado abierto. El cliente **no lleva la key de Riot**: es solo un sensor, la maestría la resuelve el backend con su propia key.

Detalles que condicionaron el diseño: la Live Client Data API da el **nombre** del campeón (no el id) y no expone `queueId` ni `gameId` — por eso las condiciones usan nombre de campeón (el id se resuelve contra Data Dragon solo para champion-mastery-v4), los retos por cola solo los cierra el sync, y el cliente genera un id de partida propio para deduplicar sus reportes. Auth: `requireAuthedRequestFlexible` acepta Bearer token de Supabase además de cookie (el cliente no tiene cookies de navegador); `requireAuthedRequest` quedó intacta. El cliente arranca con Windows y pide confirmación al cerrar.

Migración `028_challenges.sql` creada pero **sin aplicar todavía** (hace falta el token `sbp_` de la Management API, ver memoria del proyecto).

Archivos: `supabase/migrations/028_challenges.sql`, `src/core/lib/challenge-conditions.ts` (+ self-check `.test.ts`, se corre con `node`), `src/core/lib/challenge-verify.ts`, `src/core/lib/require-auth.ts`, `src/app/api/challenges/{active,report,sync,admin,admin/assign}/route.ts`, `desktop-client/`.

## 2026-08-01 — Ocultar temporalmente Dota 2/CS2/Clash Royale, solo LoL activo

Se agregó `src/core/config/games.ts` (`ACTIVE_GAMES = ["League of Legends"]`) y se filtró con esa constante todo lo que ve el usuario final: dropdown de juego al crear/editar torneo, listas públicas de torneos (`/tournaments`, `/past-events`), y las secciones de Dota 2/Clash Royale en el perfil (`Dota2StatsPanel`, bloques de `LinkedAccounts`). No se tocó la base de datos (no hay CHECK constraint sobre `game`) ni el panel admin `GameManager` (sigue gestionando todos los juegos). Mismo patrón que ya usaba `vault/page.tsx` para ocultar temporalmente una feature sin borrarla — reactivar un juego es agregar su nombre a `ACTIVE_GAMES`, sin migración.

Archivos: `src/core/config/games.ts`, `src/app/[locale]/admin/create-tournament/page.tsx`, `src/app/[locale]/admin/edit-tournament/[id]/page.tsx`, `src/app/[locale]/tournaments/page.tsx`, `src/app/[locale]/past-events/page.tsx`, `src/app/[locale]/profile/[username]/page.tsx`, `src/modules/profile/components/LinkedAccounts.tsx`.

## 2026-07-19 — Marcador de fútbol: fijar el reloj manualmente

Se agregó un input "Fijar reloj" (MM:SS o minutos sueltos) en `/admin/scoreboard` para poner el cronómetro en cualquier valor cuando el operador quiera. Nueva acción `setFootballClock` que congela el reloj (lo deja pausado) en el valor dado; luego se presiona Iniciar para reanudar desde ahí.

Archivos: `src/modules/admin/actions.ts`, `src/modules/admin/components/FootballScoreboardPanel.tsx`.

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
