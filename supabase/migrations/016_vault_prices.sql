alter table public.vault_items add column if not exists market_hash_name text;
alter table public.vault_items add column if not exists price_cents int;
alter table public.vault_items add column if not exists price_updated_at timestamptz;
