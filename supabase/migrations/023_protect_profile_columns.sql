-- CRITICAL: the "Users can update own profile" RLS policy lets a user update
-- any column of their own row — including `role`. That means any logged-in user
-- could `update profiles set role='admin'` and take over the platform. RLS
-- can't do column-level restrictions, so a trigger enforces it: normal users
-- may not touch privilege/score columns; only service-role (server-side admin
-- code) can.
create or replace function public.protect_profile_columns()
returns trigger as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.role       is distinct from old.role
     or new.experience is distinct from old.experience
     or new.rank       is distinct from old.rank
     or new.is_dummy   is distinct from old.is_dummy then
    raise exception 'Not allowed to modify protected profile fields (role/experience/rank/is_dummy)';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists protect_profile_columns_trigger on public.profiles;
create trigger protect_profile_columns_trigger
  before update on public.profiles
  for each row execute function public.protect_profile_columns();
