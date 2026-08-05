-- SELLOS: la moneda con la que un jugador le impone un castigo a otro.
--
-- Una fila por sello ganado, no un saldo. El saldo es contar las filas sin
-- gastar, y a cambio queda el registro de por qué se ganó cada uno y en qué
-- partida — que es lo que permite responder a «¿por qué tiene ese 6 sellos?»
-- sin tener que reconstruirlo.
--
-- La clave única es la que sostiene todo: el sync recalcula las mismas partidas
-- una y otra vez, así que sin ella cada sincronización regalaría sellos de nuevo.
create table public.seals (
  id            uuid        primary key default uuid_generate_v4(),
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  tournament_id uuid        references public.tournaments(id) on delete cascade,
  -- Clave de la regla que lo otorgó. Ver src/core/lib/seal-rules.ts.
  reason        text        not null,
  -- Partida que lo disparó. Las rachas guardan la última partida de la racha.
  -- Nulo para los que no vienen de una partida (completar el torneo, etc.).
  riot_match_id text,
  earned_at     timestamptz not null default now(),

  -- Gasto. Nulo = disponible. El castigo concreto vive en `challenges`, que ya
  -- existe; aquí solo se guarda a quién se lo impuso y cuándo.
  spent_at      timestamptz,
  spent_on      uuid        references public.profiles(id) on delete set null,
  challenge_id  uuid        references public.challenges(id) on delete set null
);

-- Un sello por regla y partida: reejecutar el sync no regala de nuevo.
-- Las rachas usan la última partida como identificador, así que una misma racha
-- tampoco puede pagar dos veces.
--
-- Sin WHERE a propósito: en Postgres los NULL son distintos entre sí en un
-- índice único, así que las filas sin partida (completar el torneo, etc.) nunca
-- chocan igualmente — y un índice completo sí sirve para ON CONFLICT, que es lo
-- que usa el sync. Uno parcial no siempre.
create unique index seals_once on public.seals(user_id, reason, riot_match_id);

create index idx_seals_wallet on public.seals(user_id) where spent_at is null;
create index idx_seals_tournament on public.seals(tournament_id);

alter table public.seals enable row level security;

-- Los sellos son públicos a propósito: saber cuántos tiene cada uno es parte
-- del juego — si nadie ve tu munición, la amenaza no existe.
create policy "seals_select" on public.seals
  for select using (true);

-- Sin policy de insert/update: solo se escriben con service role desde el sync
-- y desde el endpoint de gasto, que es donde se valida el saldo.

comment on table public.seals is
  'Sellos: moneda para imponer castigos. Una fila por sello; saldo = filas con spent_at nulo.';
