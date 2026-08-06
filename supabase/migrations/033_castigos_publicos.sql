-- Los castigos impuestos se ven en la clasificación, igual que los sellos.
--
-- Mismo motivo que en `seals`: si no se ve quién lleva un castigo encima, media
-- gracia del sistema desaparece. La política original solo dejaba ver los
-- propios, así que la tabla salía vacía para cualquier visitante.
--
-- Las políticas permisivas se suman (OR), así que basta con añadir esta; la de
-- «los míos» sigue valiendo para quien no esté logueado en el navegador.
-- `drop if exists` antes de crear: `create policy` no admite `if not exists`, y
-- sin esto reejecutar la migración falla con 42710 en vez de no hacer nada.
drop policy if exists "challenge_assignments_select_public" on public.challenge_assignments;
create policy "challenge_assignments_select_public" on public.challenge_assignments
  for select using (true);

-- El reto en sí ya era visible (`is_active or created_by = auth.uid()`), pero
-- un castigo desactivado dejaría huérfana la asignación al pintarla.
drop policy if exists "challenges_select" on public.challenges;
create policy "challenges_select" on public.challenges
  for select using (true);
