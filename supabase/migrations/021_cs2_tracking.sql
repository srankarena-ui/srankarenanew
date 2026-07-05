insert into public.games (name, slug) values ('Counter-Strike 2', 'cs2')
on conflict (name) do nothing;

-- Generic verified SteamID64, separate from the Dota-specific 32-bit account_id.
-- Populated by the existing Steam verification flow (completeSteamVerification).
alter table public.profiles add column if not exists steam_id64 text;

-- DatHost CS2 Match API connect link. The match id itself reuses the existing
-- generic api_match_id column (already used by the Riot scan flow).
alter table public.tournament_matches add column if not exists cs2_connect_url text;

create unique index if not exists tournament_matches_api_match_id_key
  on public.tournament_matches (api_match_id) where api_match_id is not null;
