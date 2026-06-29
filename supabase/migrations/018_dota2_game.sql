insert into public.games (name, slug) values ('Dota 2', 'dota2')
on conflict (name) do nothing;
