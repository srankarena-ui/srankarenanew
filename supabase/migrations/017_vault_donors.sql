alter table public.vault_items
  add column if not exists donor_profile_id uuid references public.profiles(id) on delete set null;

create index if not exists vault_items_donor_idx on public.vault_items(donor_profile_id);
