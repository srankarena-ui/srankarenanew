-- AVISOS: el primer canal que tiene la plataforma para hablarle a un jugador.
--
-- Hasta ahora no había ninguno: ni campana, ni bandeja, ni feed. Solo un correo
-- que dispara un admin a mano. Por eso un sello lanzado se registraba bien y el
-- castigado no se enteraba salvo que mirase la clasificación.
--
-- El cliente de escritorio y el overlay leerán de aquí a través de
-- /api/me/inbox, así que esta tabla es la fuente única y no un canal paralelo.
create table public.notifications (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  -- Clave del tipo de aviso, para que el cliente pueda decidir cómo mostrarlo
  -- (un castigo recibido merece ventana superpuesta; uno lanzado, no).
  type       text        not null,
  title      text        not null,
  body       text,
  -- A dónde lleva al pulsarlo. Relativa, incluyendo el idioma.
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- La consulta que se hace en cada carga: los no leídos de un usuario.
create index idx_notifications_unread
  on public.notifications(user_id, created_at desc)
  where read_at is null;

create index idx_notifications_user on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

-- Privados, al revés que los sellos y los castigos: aquí no hay nada que
-- presumir, es correo.
create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());

-- Marcar como leído desde el navegador sin endpoint intermedio. El `with check`
-- impide que alguien se reasigne un aviso a otra persona.
create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Sin policy de insert: los avisos los escribe el servidor con service role.
-- Si un usuario pudiera insertarlos, podría fabricarse avisos falsos.

comment on table public.notifications is
  'Avisos por usuario. Fuente única para la web, el cliente de escritorio y el overlay.';
