alter table public.profiles add column if not exists onboarded boolean not null default false;

-- Users still on an auto-generated username need onboarding; everyone else is done.
update public.profiles set onboarded = (username !~ '^user_[0-9a-f]{8}$');

-- New signups: onboarded only if a username was supplied (email form). OAuth signups
-- get the placeholder username and onboarded=false, so we prompt them to choose one.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, onboarded)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || left(new.id::text, 8)),
    (new.raw_user_meta_data ->> 'username') is not null
  );
  insert into public.user_arena_stats (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;
