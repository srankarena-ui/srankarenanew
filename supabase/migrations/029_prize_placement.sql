-- Premios por puesto: hasta ahora un objeto del vault se vinculaba al torneo
-- pero sin decir a qué posición corresponde. Nulo = premio del torneo sin
-- puesto asignado (comportamiento anterior, que se conserva).
alter table public.vault_items
  add column if not exists prize_placement integer;

comment on column public.vault_items.prize_placement is
  'Puesto que gana este objeto: 1 = primero, 2 = segundo... Nulo si es premio del torneo sin posición concreta.';

-- Se consulta siempre junto al torneo, para pintar los premios ordenados.
create index if not exists vault_items_prize_idx
  on public.vault_items(tournament_id, prize_placement)
  where tournament_id is not null;
