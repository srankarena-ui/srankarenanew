-- Tabla de premios por puesto. Cada fila cubre un puesto suelto o un rango,
-- porque según el formato el 3º y el 4º pueden empatar (semifinalistas), o el
-- 5º al 8º (cuartos). El premio es texto libre: "500 RP", "50€", "Skin a
-- elegir" — el sistema lo muestra, no lo entrega ni lo valida.
--
-- Forma: [{ "from": 1, "to": 1, "prize": "500 RP" },
--         { "from": 3, "to": 4, "prize": "100 RP" }]
alter table public.tournaments
  add column if not exists prize_table jsonb not null default '[]'::jsonb;

comment on column public.tournaments.prize_table is
  'Premios por puesto o rango: [{from, to, prize}]. Texto libre, solo informativo.';
