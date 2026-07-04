-- Riot-style tags: usernames may repeat; uniqueness lives on (username + discriminator).
alter table public.profiles drop constraint if exists profiles_username_key;
alter table public.profiles add column if not exists discriminator text;

-- Backfill: existing usernames are currently unique, so any random discriminator is
-- collision-free against the tag index.
update public.profiles
set discriminator = lpad((floor(random() * 900000) + 100000)::text, 6, '0')
where discriminator is null;

-- The tag (case-insensitive username + discriminator) is the unique identity.
create unique index if not exists profiles_tag_key
  on public.profiles (lower(username), discriminator);
