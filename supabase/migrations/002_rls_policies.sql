-- =============================================================================
-- S-Rank Arena: Row Level Security Policies
-- =============================================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_participants enable row level security;
alter table public.tournament_matches enable row level security;
alter table public.user_arena_stats enable row level security;
alter table public.games enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────────────────────
create policy "Profiles are publicly viewable"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TOURNAMENTS
-- ─────────────────────────────────────────────────────────────────────────────
create policy "Tournaments are publicly viewable"
  on public.tournaments for select
  using (true);

create policy "Admins and organizers can create tournaments"
  on public.tournaments for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('admin', 'organizador')
    )
  );

create policy "Admins and organizers can update tournaments"
  on public.tournaments for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('admin', 'organizador')
    )
  );

create policy "Admins can delete tournaments"
  on public.tournaments for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- TOURNAMENT PARTICIPANTS
-- ─────────────────────────────────────────────────────────────────────────────
create policy "Participants are publicly viewable"
  on public.tournament_participants for select
  using (true);

create policy "Users can register for tournaments"
  on public.tournament_participants for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.tournaments
      where id = tournament_id
      and registration_open = true
    )
  );

create policy "Users can unregister from tournaments"
  on public.tournament_participants for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TOURNAMENT MATCHES
-- ─────────────────────────────────────────────────────────────────────────────
create policy "Matches are publicly viewable"
  on public.tournament_matches for select
  using (true);

create policy "Admins and organizers can insert matches"
  on public.tournament_matches for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('admin', 'organizador')
    )
  );

create policy "Admins and organizers can update matches"
  on public.tournament_matches for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('admin', 'organizador')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- USER ARENA STATS
-- ─────────────────────────────────────────────────────────────────────────────
create policy "Arena stats are publicly viewable"
  on public.user_arena_stats for select
  using (true);

-- Stats are only updated via RPC with service role, so no direct update policy for users

-- ─────────────────────────────────────────────────────────────────────────────
-- GAMES
-- ─────────────────────────────────────────────────────────────────────────────
create policy "Games are publicly viewable"
  on public.games for select
  using (true);

create policy "Admins can manage games"
  on public.games for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

create policy "Admins can update games"
  on public.games for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

create policy "Admins can delete games"
  on public.games for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );
