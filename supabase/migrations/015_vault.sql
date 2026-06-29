create table public.vault_items (
  asset_id   text primary key,
  class_id   text        not null,
  name       text        not null,
  icon_url   text        not null,
  rarity     text,
  hero       text,
  item_type  text,
  tournament_id uuid references public.tournaments(id) on delete set null,
  status     text        not null default 'available'
               check (status in ('available', 'assigned', 'delivered')),
  synced_at  timestamptz not null default now()
);

alter table public.vault_items enable row level security;

create policy "vault items are public"
  on public.vault_items for select using (true);

create policy "admins manage vault"
  on public.vault_items for all
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ));
