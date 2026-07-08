-- Fixed-window rate limiter backed by Postgres (no Redis/Upstash needed at
-- this traffic level — swap for Redis if this table ever becomes a hot spot).
create table if not exists public.rate_limit_hits (
  bucket_key text not null,
  window_start timestamptz not null,
  count int not null default 1,
  primary key (bucket_key, window_start)
);

-- Cheap cleanup target for old windows (no cron needed yet — rows are tiny
-- and PK-scoped; a periodic delete can be added later if the table grows).
create index if not exists rate_limit_hits_window_idx on public.rate_limit_hits (window_start);

alter table public.rate_limit_hits enable row level security;
-- Service role only — this table is never touched by user-facing queries.
create policy "rate_limit_hits no public access" on public.rate_limit_hits
  for all using (false);

-- Atomically bumps the counter for (key, current window) and reports whether
-- the caller is still under `p_limit`. window_seconds buckets time so old
-- windows are just abandoned rows (cheap to ignore, fine to prune later).
create or replace function public.check_rate_limit(
  p_key text,
  p_limit int,
  p_window_seconds int
) returns boolean as $$
declare
  v_window timestamptz;
  v_count int;
begin
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limit_hits (bucket_key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (bucket_key, window_start)
    do update set count = rate_limit_hits.count + 1
  returning count into v_count;

  return v_count <= p_limit;
end;
$$ language plpgsql security definer;
