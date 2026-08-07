-- Fuera el marcador de fútbol.
--
-- Era un encargo provisional para retransmitir partidos, con su propio panel de
-- admin y su propio overlay, y no tiene nada que ver con lo que hace la
-- plataforma. El código ya no existe; esto retira la tabla, que era de una sola
-- fila y no la lee nadie más.
--
-- Se pierde el marcador guardado (equipos, resultado y reloj). No hay nada que
-- conservar: se rellenaba a mano antes de cada partido.

drop table if exists public.football_scoreboard;
