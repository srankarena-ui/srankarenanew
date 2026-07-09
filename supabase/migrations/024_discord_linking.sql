alter table public.profiles add column if not exists discord_id text;

create unique index if not exists profiles_discord_id_key
  on public.profiles (discord_id) where discord_id is not null;

-- Short-lived claim code: generated on the website (logged in), redeemed via
-- the /vincular slash command in Discord (where we learn the Discord user id).
create table if not exists public.discord_link_challenges (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  code        text        not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  verified_at timestamptz
);

alter table public.discord_link_challenges enable row level security;

create policy "users own discord challenges" on public.discord_link_challenges
  for all using (auth.uid() = user_id);
