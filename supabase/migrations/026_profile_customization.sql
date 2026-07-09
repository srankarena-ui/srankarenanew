-- Steam-like profile customization: short bio, banner image (pasted URL,
-- same pattern as tournaments.banner_url — no upload infra), and a
-- per-profile accent theme (reuses the existing challenger/volt/ember/aurora
-- palette from globals.css, but persisted per-user instead of only in the
-- viewer's localStorage).
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists banner_url text;
alter table public.profiles add column if not exists theme text;

alter table public.profiles
  add constraint profiles_bio_length check (bio is null or char_length(bio) <= 280);

alter table public.profiles
  add constraint profiles_theme_valid check (theme is null or theme in ('challenger', 'volt', 'ember', 'aurora'));
