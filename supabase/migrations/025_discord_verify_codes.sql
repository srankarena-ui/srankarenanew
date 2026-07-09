-- Anti-raid captcha: /verificar DMs a short-lived code, redeemed with
-- /verificar <codigo> in the server. Independent of any S-Rank Arena
-- account link (see discord_link_challenges).
create table if not exists public.discord_verify_codes (
  discord_user_id text        primary key,
  code            text        not null,
  expires_at      timestamptz not null
);

alter table public.discord_verify_codes enable row level security;
