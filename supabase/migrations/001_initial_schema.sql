-- =============================================================================
-- S-Rank Arena: Initial Schema
-- =============================================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  rank text default 'unranked',
  role text not null default 'usuario' check (role in ('admin', 'organizador', 'usuario')),
  experience int default 0,
  riot_puuid text,
  riot_gamename text,
  riot_tagline text,
  lol_region text,
  cr_tag text,
  cr_name text,
  riot_linked_at timestamptz,
  is_dummy boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || left(new.id::text, 8))
  );
  -- Also create empty arena stats
  insert into public.user_arena_stats (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- GAMES
-- ─────────────────────────────────────────────────────────────────────────────
create table public.games (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  created_at timestamptz default now()
);

-- Seed default games
insert into public.games (name) values ('League of Legends'), ('Clash Royale');

-- ─────────────────────────────────────────────────────────────────────────────
-- TOURNAMENTS
-- ─────────────────────────────────────────────────────────────────────────────
create table public.tournaments (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  game text not null,
  mode text,
  status text not null default 'draft' check (status in ('draft', 'registration', 'active', 'completed', 'cancelled')),
  reward_points int default 0,
  created_by uuid references public.profiles(id) not null,
  max_participants int default 16,
  series_format text default 'bo1' check (series_format in ('bo1', 'bo3', 'bo5')),
  rules text,
  prizes text,
  region text,
  map text,
  banner_url text,
  start_date date,
  start_time time,
  contact_method text,
  registration_open boolean default true,
  check_in_enabled boolean default false,
  score_reporting text,
  tournament_format text default 'single_elimination',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger tournaments_updated_at
  before update on public.tournaments
  for each row execute function public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- TOURNAMENT PARTICIPANTS
-- ─────────────────────────────────────────────────────────────────────────────
create table public.tournament_participants (
  id uuid default uuid_generate_v4() primary key,
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (tournament_id, user_id)
);

create index idx_tp_tournament on public.tournament_participants(tournament_id);
create index idx_tp_user on public.tournament_participants(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TOURNAMENT MATCHES
-- ─────────────────────────────────────────────────────────────────────────────
create table public.tournament_matches (
  id uuid default uuid_generate_v4() primary key,
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  round_number int not null,
  match_number int not null,
  player1_id uuid references public.profiles(id),
  player2_id uuid references public.profiles(id),
  winner_id uuid references public.profiles(id),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'bye')),
  player1_score int default 0,
  player2_score int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_tm_tournament on public.tournament_matches(tournament_id);
create index idx_tm_round on public.tournament_matches(tournament_id, round_number);

create trigger matches_updated_at
  before update on public.tournament_matches
  for each row execute function public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- USER ARENA STATS
-- ─────────────────────────────────────────────────────────────────────────────
create table public.user_arena_stats (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  penta_kills_total int default 0,
  wards_placed_total int default 0,
  ping_missing_count int default 0,
  tournament_wins int default 0,
  dragon_souls_total int default 0,
  kills_total int default 0,
  deaths_total int default 0,
  assists_total int default 0,
  games_played int default 0,
  updated_at timestamptz default now()
);

create trigger arena_stats_updated_at
  before update on public.user_arena_stats
  for each row execute function public.update_updated_at();
