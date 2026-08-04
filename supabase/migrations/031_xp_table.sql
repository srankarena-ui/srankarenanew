-- XP por puesto o rango, hermana de prize_table (migración 030) pero con un
-- número en vez de texto libre. Sustituye a reward_points y a
-- trials_config.point_distribution, que eran decorativos (nunca escribían en
-- profiles.experience) y competían visualmente por el mismo hueco del wizard.
--
-- Forma: [{ "from": 1, "to": 1, "xp": 100 },
--         { "from": 3, "to": 4, "xp": 25 }]
alter table public.tournaments
  add column if not exists xp_table jsonb not null default '[]'::jsonb;

comment on column public.tournaments.xp_table is
  'XP por puesto o rango: [{from, to, xp}]. Sustituye a reward_points y trials_config.point_distribution.';
