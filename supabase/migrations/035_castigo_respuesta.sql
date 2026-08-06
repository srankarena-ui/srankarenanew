-- Aceptar o rechazar un castigo.
--
-- Mientras no decidas, tus partidas dejan de contar para el torneo. No es una
-- penalización: es una pausa. Así nadie se come puntos de menos por estar
-- desconectado, y a la vez ignorar el castigo deja de ser la jugada óptima —
-- que es lo que pasaba con «ignorar = rechazar»: quedarse quieto salía gratis.
--
-- `decided_at` es lo que hace la regla reproducible: las partidas jugadas entre
-- `assigned_at` y `decided_at` no cuentan NUNCA, ni siquiera al resincronizar
-- después. Sin esa marca, aceptar tres días tarde recuperaría todo lo jugado
-- mientras tanto y volveríamos a premiar el ignorar.
alter table public.challenge_assignments
  add column if not exists decided_at timestamptz;

-- El estado tenía solo pending/completed/expired. Un castigo ahora se decide
-- antes de cumplirse, así que hacen falta los dos intermedios.
alter table public.challenge_assignments
  drop constraint if exists challenge_assignments_status_check;

alter table public.challenge_assignments
  add constraint challenge_assignments_status_check
  check (status in ('pending', 'accepted', 'rejected', 'completed', 'expired'));

-- El sync pregunta «¿tiene este usuario algo sin decidir?» en cada pasada.
create index if not exists idx_assignments_sin_decidir
  on public.challenge_assignments(user_id, assigned_at)
  where status = 'pending';

comment on column public.challenge_assignments.decided_at is
  'Cuándo se aceptó o rechazó. Las partidas entre assigned_at y decided_at no cuentan.';
