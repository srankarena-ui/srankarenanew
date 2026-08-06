-- Un castigo aceptado que no se cumple necesita estado propio.
--
-- No vale reutilizar 'rejected': rechazar es una decisión legítima y anunciada,
-- incumplir es aceptar y luego no hacerlo. Cuestan lo mismo en puntos, pero
-- conviene poder distinguirlos al mirar el historial de alguien.
alter table public.challenge_assignments
  drop constraint if exists challenge_assignments_status_check;

alter table public.challenge_assignments
  add constraint challenge_assignments_status_check
  check (status in ('pending', 'accepted', 'rejected', 'completed', 'failed', 'expired'));

-- Partida en la que se resolvió, para poder enseñar la prueba: «lo incumpliste
-- en esta partida, llevabas Destello». Sin esto, discutir un caso obliga a
-- rebuscar a mano en el historial.
alter table public.challenge_assignments
  add column if not exists resolved_match_id text;

comment on column public.challenge_assignments.resolved_match_id is
  'Partida que cumplió o incumplió el castigo. La evidencia de la decisión.';
