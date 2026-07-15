-- Provisional live football scoreboard for stream overlays, controlled from
-- the admin panel. Single row (id=1), no multi-scoreboard support needed yet.
create table public.football_scoreboard (
  id                 integer     primary key default 1,
  home_team          text        not null default 'Inglaterra',
  away_team          text        not null default 'Argentina',
  home_abbr          text        not null default 'ENG',
  away_abbr          text        not null default 'ARG',
  home_flag_url      text,
  away_flag_url      text,
  home_score         integer     not null default 0,
  away_score         integer     not null default 0,
  -- Elapsed seconds accumulated while paused; while running, the live value
  -- is clock_seconds + (now - clock_started_at), computed client-side.
  clock_seconds      integer     not null default 0,
  clock_running      boolean     not null default false,
  clock_started_at   timestamptz,
  added_time_minutes integer     not null default 0,
  updated_at         timestamptz not null default now(),
  constraint football_scoreboard_singleton check (id = 1)
);

insert into public.football_scoreboard (id, home_team, away_team, home_abbr, away_abbr, home_score, away_score)
values (1, 'Inglaterra', 'Argentina', 'ENG', 'ARG', 0, 0);

alter table public.football_scoreboard enable row level security;

create policy "scoreboard is public"
  on public.football_scoreboard for select using (true);

create policy "admins manage scoreboard"
  on public.football_scoreboard for all
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ));
