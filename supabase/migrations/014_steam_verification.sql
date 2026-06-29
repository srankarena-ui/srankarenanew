create table steam_verification_challenges (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  account_id bigint      not null,
  code       text        not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  verified_at timestamptz
);

alter table steam_verification_challenges enable row level security;

create policy "users own steam challenges" on steam_verification_challenges
  for all using (auth.uid() = user_id);
