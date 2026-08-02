# Verificación de retos — decisiones de diseño

Notas para cuando se implementen los retos. Recogen hallazgos medidos contra la
API real, no suposiciones. El esquema de datos y los endpoints ya existen
(migración `028_challenges.sql`, `src/app/api/challenges/*`); esto cubre lo que
falta decidir antes de escribir la lógica de cada tipo de reto.

## Contexto del juego

Los retos **no los elige el jugador**: los lanzan otros participantes dentro de
un torneo. Alguien gana un objeto (trébol, cofre...), se lo envía a otro
jugador, y a ese le cae un reto al azar.

Eso impone una regla de diseño: **un reto sorteado tiene que poder cumplirlo
alguien que no tenga el cliente de escritorio instalado**, salvo que el tipo de
reto declare explícitamente que lo requiere. Si no, se percibe como injusto o se
explota cerrando el cliente.

## Las tres familias de reto

| Familia | Se verifica con | Requiere cliente |
|---|---|---|
| Solo en vivo | Live Client Data API | Sí |
| Solo post-partida | match-v5 y su timeline | No |
| Ambas | las dos, se confirman entre sí | No (el cliente solo da feedback inmediato) |

Para el sorteo entre participantes, preferir **post-partida** y **ambas**.

## Dato clave: Spectator-V5 tapa los huecos de la API local

La Live Client Data API **no expone el `gameId` real ni el `queueId`** (solo
`gameMode`). Spectator-V5 sí: consultando por PUUID desde el servidor sabes si
alguien está en partida ahora mismo y obtienes ambos, **sin cliente instalado**.

Consecuencia: los retos por cola se pueden verificar en vivo, y el identificador
de partida no hace falta inventarlo.

## match-v5 trae ~129 métricas ya calculadas

El bloque `challenges` de cada participante no hay que derivarlo. Medido sobre
una partida real (`LA1_1736497344`): 129 métricas por jugador. Incluye
participación en asesinatos, asesinatos en solitario, habilidades acertadas y
esquivadas, placas de torreta, ventaja de CS y de nivel sobre el rival de línea,
bajas bajo torre, sobrevivir con menos de 10 de vida, robos de épicos, bajas en
inferioridad, sobrevivir a tres inmovilizaciones, partida perfecta.

Antes de inventar un cálculo, mirar si Riot ya lo da.

## Reto "hechizos cambiados" — diseño completo

### Hallazgo: el orden de los hechizos es estable por jugador

Medido sobre 24 partidas de 3 jugadores distintos: **100% de consistencia**.

- Un jugador llevó Destello en el slot 2 en 8/8 partidas (Tryndamere, Jhin,
  Mordekaiser, Dr. Mundo, Kha'Zix, Briar, Master Yi, Irelia — superior y jungla).
- Los otros dos, en el slot 1 en 8/8 cada uno, con variedad parecida.

Es una **preferencia personal, no del campeón ni del rol**: cambian de campeón,
de línea y de hechizo acompañante, y el Destello no se mueve. Por eso el
historial basta para establecer el patrón, sin segmentar por campeón.

`summoner1Id` / `summoner2Id` de match-v5 conservan el orden real del loadout
(verificado: en una misma partida, Destello salió en slot 1 para 6 jugadores y
en slot 2 para 4 — la API no normaliza).

### Lo que la API no da, y de dónde sale

La API da el **orden del loadout**, no la **tecla**. La tecla está en el archivo
de configuración local del juego:

```
C:\Riot Games\League of Legends\Config\input.ini    → sección [GameEvents]
  evtCastAvatarSpell1=[d]
  evtCastAvatarSpell2=[f]
```

Texto plano, dos líneas. **No hace falta la LCU**: leer el archivo evita el
lockfile, la autenticación y depender de una API no documentada que Riot puede
cambiar sin aviso. Ojo con las variantes `evtSmartCast...` y `evtSelfCast...`:
son modificadores con Shift/Alt sobre la misma tecla, no sirven.

Slot (match-v5) + tecla (input.ini) = en qué tecla jugó el Destello.

### Flujo de verificación

1. **Patrón, siempre.** El cliente lee `input.ini` siempre que esté abierto, no
   solo en partidas con reto, y lo reporta con fecha. El patrón es el valor
   estable en el tiempo. Se recoge cuando el jugador no tiene ningún reto
   encima, así que no tiene motivo para mentir.
2. **Congelar al asignar.** Al sortear el reto, se guarda el patrón vigente
   junto al reto. La referencia queda fijada a lo que usaba *antes* de saberlo.
3. **Leer durante la partida.** Al detectar partida activa y en cada sondeo
   (ya son cada 15 s), releer el archivo.
4. **Verificar al terminar.** Cruzar el slot de match-v5 con la tecla leída y
   comparar contra el patrón congelado. Distinta tecla = cumplido.

### Trampas que aguanta

- **Cambiar hechizos y teclas a la vez** para jugar igual de cómodo: el slot
  cambia pero la tecla acaba siendo la de siempre. No cumplido.
- **Fabricar un patrón falso con antelación**: exige jugar realmente incómodo
  durante días, que es el sacrificio que el reto pedía. Aceptable.
- **Cerrar el cliente**: sin lecturas no hay verificación. No cumplido.

### El agujero conocido

`input.ini` es editable por el usuario. El ataque: lanzar la partida con las
teclas cambiadas (cómodo) y **editar el archivo ya dentro** — el juego cargó la
configuración al arrancar y sigue igual, pero el archivo miente.

Mitigación: leer al arrancar y al terminar, y exigir que coincidan. Un cambio
del archivo con partida en curso no pasa por accidente: se marca como no
cumplido.

**Límite honesto:** nada verificado desde la máquina del jugador es infalible.
Esto encarece la trampa hasta hacerla absurda, no la impide. Suficiente para
retos con puntos; para un premio grande, apoyar la decisión en algo que quede
en los datos de la partida.

## Puntuación de partida (decidido y validado)

```
puntos = 10 (participación) + rendimiento (0-100) + 20 si ganó + puntos de retos
```

Sin techo: un partidazo pasa de 125. **Nadie saca cero** — el suelo de 10 por
terminar la partida es deliberado.

El **rendimiento** sale de `roleScore()` (`src/core/lib/role-score.ts`): el
percentil medio del jugador dentro de su rol, sobre cinco aspectos con pesos
`kda 2 · kill_participation 2 · damage_per_min 2 · vision_score 1.5 · [cs_per_min | assists] 1.5`.
El quinto hueco es "la estadística que define tu rol": CS por minuto para los
cuatro carriles, asistencias para el soporte — medido, el CS del soporte **baja**
al subir de rango (1,63 en Bronce → 1,19 en Diamante), así que premiarlo sería
premiar jugar mal.

Los baselines viven en `src/core/config/role-baselines.json`, generados por
`scripts/collect-matches.mjs` + `scripts/analyze-roles.mjs`. Regenerar por parche.

Validado sobre una partida real (`LA1_1736497344`): un tirador 19/4/9 saca 125,9
y un soporte 2/8/24 saca 119,7 — líneas opuestas, puntuaciones equivalentes, que
es exactamente el objetivo. Un jugador que ganó sin aportar (14% de participación)
queda octavo, por debajo de tres del equipo perdedor. Se consideró correcto.

## Retos de torneo (20, fijos)

Tres bloques, **18 idénticos para todos**: 10 de equipo (Riot los acredita a los
cinco jugadores por igual, reparto exacto 20%/rol), 8 individuales universales
(ningún rol por debajo del 12% ni por encima del 32%), y 2 de firma por rol a
**5 puntos fijos** para que ninguna diferencia residual desequilibre.

Los puntos del fondo común salen del **porcentaje real de consecución**, medido
sobre 10.020 actuaciones (`data/retos-torneo.json`, generado desde
`data/challenges.jsonl`):

| Se consigue en | Puntos |
|---|---|
| ≤ 1% | 100 |
| ≤ 3% | 50 |
| ≤ 10% | 20 |
| ≤ 30% | 8 |
| > 30% | 3 |

**Dos trampas que costaron encontrar:**

1. Hay métricas que **no son contadores** sino valores continuos
   (`visionScoreAdvantageLaneOpponent` es una diferencia,
   `controlWardTimeCoverageInRiverOrEnemyHalf` una cobertura 0-1) o banderas
   (`highest*`). Multiplicar puntos por su valor da fracciones absurdas. Se
   tratan como umbral: se cumple o no, paga una vez.
2. La frecuencia **no se mide como suma/partidas** sino como *porcentaje de
   actuaciones que lo consiguen al menos una vez*. Con el método malo,
   "más visión que tu rival" salía 1 de cada 6; el real es **49,67%**, porque
   por definición lo cumple la mitad de los jugadores.

**Fuera del torneo a propósito:** penta (1/1.002), barón en solitario (1/716) y
Mejai's a pila completa (1/1.670). Son de tres roles distintos y el soporte no
tiene nada comparable — su gesta más rara es 1 de cada 18. Meterlas repartiría
puntos por el puesto jugado. Van a las insignias de perfil.

## Logros de perfil (F→S)

El sistema ya existe (`src/core/lib/achievements.ts`, tabla `user_arena_stats`,
página en `/profile/[usuario]/achievements`) con cinco niveles
`bronze…s_rank`. Para pasar a **F→S** hay que tocar `AchievementTier`,
`TIER_COLORS`, `TIER_BG_CLASSES` y la columna en base de datos.

Cada logro tiene dos planos: puntos por vez en partida, y un contador histórico
que sube la letra. Frecuencias reales en `data/feat-frequency.json` — de las 129
métricas, **47 son comunes** (varias por partida: no sirven como logro) y solo
13 son muy raras.

**22 de las 129 están acaparadas por un rol** en más del 70% (Mejai's es 83%
central, robar buffs 77% jungla, misión de soporte 100%). Conviene agruparlas
por rol en el perfil, o la mayoría las verá siempre en gris.

## Datos que NO se pueden obtener

- **Aspectos o campeones que posee una cuenta.** No hay endpoint público. La LCU
  los expone, pero es API no soportada y compromete la solicitud de production
  key. Sí se puede saber **qué aspecto usa cada jugador en una partida** (Live
  Client Data), y su rareza cruzando con datos estáticos.
- **Cualquier cosa que no deje rastro en los datos de la partida.** Si el reto
  es una promesa sobre la conducta del jugador y no sobre el estado del juego,
  ninguna API lo verifica. Buscar siempre la variante que sí deja rastro: en vez
  de "juega con los hechizos cambiados" a secas, "juega sin Destello" es
  verificable, no falseable y produce la misma incomodidad.

## Rate limit

La key personal es de 100 peticiones / 2 minutos y **caduca cada 24 h**. La
comparten el sitio en producción y cualquier script. Ir al borde sale caro: cada
429 cuesta hasta 30 s de espera. Ver `scripts/collect-matches.mjs` para el
patrón de espera fija que funciona (2 s).

Verificar un reto con maestría cuesta 1 petición; con historial, 1 + N. Cachear
el PUUID (ya está en `profiles.riot_puuid`) y los patrones que no cambien.
