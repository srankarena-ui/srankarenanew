-- Distintivo de streamer.
--
-- Lo concede un admin desde el panel de usuarios; nadie se lo pone solo. En el
-- cliente de escritorio desbloquea el apartado de streamer (el overlay para
-- OBS), que no tiene sentido para un participante normal.
--
-- Columna propia y no un valor de `role`: ser streamer es ortogonal a ser
-- admin, organizador o usuario. Un organizador puede streamear, y meterlo en
-- `role` obligaría a inventar combinaciones.
alter table public.profiles
  add column if not exists is_streamer boolean not null default false;

-- Protegida igual que `role` (migración 023): que un usuario no pueda
-- concedérsela editando su propio perfil. Solo la service role la escribe, y
-- quien autoriza es `requireAdmin` en la capa de aplicación.
create or replace function public.protect_streamer_badge()
returns trigger language plpgsql security definer as $$
begin
  if new.is_streamer is distinct from old.is_streamer
     and current_setting('request.jwt.claims', true)::jsonb->>'role' <> 'service_role' then
    raise exception 'is_streamer solo lo cambia un administrador';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_streamer on public.profiles;
create trigger profiles_protect_streamer
  before update on public.profiles
  for each row execute function public.protect_streamer_badge();

create index if not exists idx_profiles_streamer
  on public.profiles(id) where is_streamer;

comment on column public.profiles.is_streamer is
  'Concedido por un admin. Desbloquea el apartado de streamer en el cliente.';
