-- Retos (challenges): condiciones verificables sobre partidas de LoL, por dos
-- caminos complementarios — en vivo (cliente de escritorio leyendo la Live
-- Client Data API) y post-partida (job de sync contra match-v5). Qué camino
-- puede verificar cada tipo de condición se decide en código, ver
-- src/core/lib/challenge-conditions.ts.
create table public.challenges (
  id            uuid        primary key default uuid_generate_v4(),
  tournament_id uuid        references public.tournaments(id) on delete cascade,
  title         text        not null,
  description   text,
  game          text        not null default 'League of Legends',
  -- ChallengeCondition serializada. Se valida en la capa de aplicación (mismo
  -- criterio que tournaments.trials_config), no con un check rígido, para poder
  -- agregar tipos de condición nuevos sin migración.
  conditions    jsonb       not null,
  is_active     boolean     not null default true,
  starts_at     timestamptz,
  ends_at       timestamptz,
  created_by    uuid        references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_challenges_tournament on public.challenges(tournament_id);
create index idx_challenges_active on public.challenges(is_active) where is_active;

create trigger challenges_updated_at
  before update on public.challenges
  for each row execute function public.update_updated_at();

alter table public.challenges enable row level security;

create policy "challenges_select" on public.challenges
  for select using (is_active or created_by = auth.uid());

create policy "challenges_staff_write" on public.challenges
  for all using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'organizador')
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- ASIGNACIONES: qué reto le toca a qué usuario
-- ─────────────────────────────────────────────────────────────────────────────
create table public.challenge_assignments (
  id           uuid        primary key default uuid_generate_v4(),
  challenge_id uuid        not null references public.challenges(id) on delete cascade,
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  status       text        not null default 'pending' check (status in ('pending', 'completed', 'expired')),
  assigned_at  timestamptz not null default now(),
  completed_at timestamptz,
  unique (challenge_id, user_id)
);

create index idx_challenge_assignments_user on public.challenge_assignments(user_id);
create index idx_challenge_assignments_pending on public.challenge_assignments(status) where status = 'pending';

alter table public.challenge_assignments enable row level security;

create policy "challenge_assignments_select_own" on public.challenge_assignments
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'organizador'))
  );

create policy "challenge_assignments_staff_write" on public.challenge_assignments
  for all using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'organizador')
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- CUMPLIMIENTOS: registro auditable de cada reto cumplido, con la evidencia
-- de la partida que lo disparó. Solo se escribe con service role desde los
-- endpoints de reporte/sync — sin policy de insert para usuarios.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.challenge_completions (
  id            uuid        primary key default uuid_generate_v4(),
  challenge_id  uuid        not null references public.challenges(id) on delete cascade,
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  assignment_id uuid        references public.challenge_assignments(id) on delete cascade,
  -- gameId de la Live Client Data API / match-v5. Evita que el polling del
  -- cliente registre la misma partida en cada tick.
  riot_game_id  bigint      not null,
  -- Snapshot de lo que se verificó: campeón, rol, cola, puntos de maestría.
  evidence      jsonb       not null default '{}'::jsonb,
  -- true si el backend corroboró contra la Riot API; false si solo se apoyó en
  -- lo que reportó el cliente (rol/cola en vivo no son verificables aparte).
  verified      boolean     not null default false,
  source        text        not null default 'live' check (source in ('live', 'match_history')),
  reported_at   timestamptz not null default now(),
  unique (challenge_id, user_id, riot_game_id)
);

create index idx_challenge_completions_user on public.challenge_completions(user_id);
create index idx_challenge_completions_challenge on public.challenge_completions(challenge_id);

alter table public.challenge_completions enable row level security;

create policy "challenge_completions_select_own" on public.challenge_completions
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'organizador'))
  );
