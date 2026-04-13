-- =============================================================================
-- S-Rank Arena: RPCs (Remote Procedure Calls)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SYNC MATCH STATS
-- Incrementally update user arena stats from external API data
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.sync_match_stats(p_user_id uuid, stats jsonb)
returns void as $$
begin
  update public.user_arena_stats set
    penta_kills_total = penta_kills_total + coalesce((stats->>'penta_kills')::int, 0),
    wards_placed_total = wards_placed_total + coalesce((stats->>'wards_placed')::int, 0),
    ping_missing_count = ping_missing_count + coalesce((stats->>'missing_pings')::int, 0),
    dragon_souls_total = dragon_souls_total + coalesce((stats->>'dragon_souls')::int, 0),
    kills_total = kills_total + coalesce((stats->>'kills')::int, 0),
    deaths_total = deaths_total + coalesce((stats->>'deaths')::int, 0),
    assists_total = assists_total + coalesce((stats->>'assists')::int, 0),
    games_played = games_played + coalesce((stats->>'games')::int, 0)
  where user_id = p_user_id;
end;
$$ language plpgsql security definer;

-- ─────────────────────────────────────────────────────────────────────────────
-- GENERATE BRACKET
-- Creates single elimination bracket with seeding and BYEs
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.generate_bracket(p_tournament_id uuid)
returns void as $$
declare
  v_participants uuid[];
  v_num_participants int;
  v_bracket_size int;
  v_num_rounds int;
  v_match_num int;
  v_round int;
  v_matches_in_round int;
  v_p1 uuid;
  v_p2 uuid;
  v_idx int;
begin
  -- Delete existing matches
  delete from public.tournament_matches where tournament_id = p_tournament_id;

  -- Get shuffled participants
  select array_agg(user_id order by random())
  into v_participants
  from public.tournament_participants
  where tournament_id = p_tournament_id;

  v_num_participants := array_length(v_participants, 1);
  if v_num_participants is null or v_num_participants < 2 then
    raise exception 'Need at least 2 participants';
  end if;

  -- Calculate bracket size (next power of 2)
  v_bracket_size := 1;
  while v_bracket_size < v_num_participants loop
    v_bracket_size := v_bracket_size * 2;
  end loop;

  v_num_rounds := (ln(v_bracket_size) / ln(2))::int;
  v_match_num := 0;

  -- Generate round 1 matches
  v_matches_in_round := v_bracket_size / 2;
  for i in 1..v_matches_in_round loop
    v_match_num := v_match_num + 1;
    v_idx := (i - 1) * 2;

    -- Get player 1 (always exists for first half)
    if v_idx + 1 <= v_num_participants then
      v_p1 := v_participants[v_idx + 1];
    else
      v_p1 := null;
    end if;

    -- Get player 2
    if v_idx + 2 <= v_num_participants then
      v_p2 := v_participants[v_idx + 2];
    else
      v_p2 := null;
    end if;

    -- Insert match
    if v_p1 is not null and v_p2 is null then
      -- BYE: player1 auto-advances
      insert into public.tournament_matches
        (tournament_id, round_number, match_number, player1_id, player2_id, winner_id, status)
      values
        (p_tournament_id, 1, v_match_num, v_p1, null, v_p1, 'bye');
    elsif v_p1 is null and v_p2 is null then
      -- Empty slot
      insert into public.tournament_matches
        (tournament_id, round_number, match_number, player1_id, player2_id, status)
      values
        (p_tournament_id, 1, v_match_num, null, null, 'pending');
    else
      -- Normal match
      insert into public.tournament_matches
        (tournament_id, round_number, match_number, player1_id, player2_id, status)
      values
        (p_tournament_id, 1, v_match_num, v_p1, v_p2, 'pending');
    end if;
  end loop;

  -- Generate subsequent round shells (empty matches)
  for v_round in 2..v_num_rounds loop
    v_matches_in_round := v_bracket_size / (2 ^ v_round);
    for i in 1..v_matches_in_round loop
      v_match_num := v_match_num + 1;
      insert into public.tournament_matches
        (tournament_id, round_number, match_number, status)
      values
        (p_tournament_id, v_round, v_match_num, 'pending');
    end loop;
  end loop;

  -- Auto-advance BYE winners to next round
  perform public.propagate_byes(p_tournament_id);

  -- Set tournament to active
  update public.tournaments
  set status = 'active', registration_open = false
  where id = p_tournament_id;
end;
$$ language plpgsql security definer;

-- ─────────────────────────────────────────────────────────────────────────────
-- PROPAGATE BYES
-- Move BYE winners to their next round matches
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.propagate_byes(p_tournament_id uuid)
returns void as $$
declare
  v_bye_match record;
  v_next_match record;
  v_next_match_number int;
  v_is_upper boolean;
begin
  for v_bye_match in
    select * from public.tournament_matches
    where tournament_id = p_tournament_id
    and status = 'bye'
    and winner_id is not null
    order by round_number, match_number
  loop
    -- Calculate which match in next round this feeds into
    -- Matches pair up: (1,2)->1, (3,4)->2, etc. relative to round
    -- First get the match's position within its round
    v_next_match_number := ((v_bye_match.match_number - 1) / 2) + 1;
    v_is_upper := (v_bye_match.match_number % 2) = 1;

    -- Find the next round match
    select * into v_next_match
    from public.tournament_matches
    where tournament_id = p_tournament_id
    and round_number = v_bye_match.round_number + 1
    order by match_number
    limit 1 offset (v_next_match_number - 1);

    if v_next_match is not null then
      if v_is_upper then
        update public.tournament_matches
        set player1_id = v_bye_match.winner_id
        where id = v_next_match.id;
      else
        update public.tournament_matches
        set player2_id = v_bye_match.winner_id
        where id = v_next_match.id;
      end if;
    end if;
  end loop;
end;
$$ language plpgsql security definer;

-- ─────────────────────────────────────────────────────────────────────────────
-- ADVANCE WINNER
-- Marks a match as completed and advances winner to next round
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.advance_winner(p_match_id uuid, p_winner_id uuid)
returns void as $$
declare
  v_match record;
  v_next_match record;
  v_next_match_number int;
  v_is_upper boolean;
  v_total_rounds int;
  v_matches_round1 record;
begin
  -- Get the match
  select * into v_match
  from public.tournament_matches
  where id = p_match_id;

  if v_match is null then
    raise exception 'Match not found';
  end if;

  -- Update match with winner
  update public.tournament_matches
  set winner_id = p_winner_id, status = 'completed'
  where id = p_match_id;

  -- Check if this is the final match
  select max(round_number) into v_total_rounds
  from public.tournament_matches
  where tournament_id = v_match.tournament_id;

  if v_match.round_number = v_total_rounds then
    -- Tournament complete
    update public.tournaments
    set status = 'completed'
    where id = v_match.tournament_id;

    -- Increment winner's tournament_wins
    update public.user_arena_stats
    set tournament_wins = tournament_wins + 1
    where user_id = p_winner_id;
    return;
  end if;

  -- Find position within this round
  -- We need to figure out the relative position among matches of the same round
  select count(*) into v_next_match_number
  from public.tournament_matches
  where tournament_id = v_match.tournament_id
  and round_number = v_match.round_number
  and match_number <= v_match.match_number;

  v_is_upper := (v_next_match_number % 2) = 1;
  v_next_match_number := ((v_next_match_number - 1) / 2) + 1;

  -- Find next round match
  select * into v_next_match
  from public.tournament_matches
  where tournament_id = v_match.tournament_id
  and round_number = v_match.round_number + 1
  order by match_number
  limit 1 offset (v_next_match_number - 1);

  if v_next_match is not null then
    if v_is_upper then
      update public.tournament_matches
      set player1_id = p_winner_id
      where id = v_next_match.id;
    else
      update public.tournament_matches
      set player2_id = p_winner_id
      where id = v_next_match.id;
    end if;
  end if;
end;
$$ language plpgsql security definer;

-- ─────────────────────────────────────────────────────────────────────────────
-- GET USER ACHIEVEMENTS
-- Returns computed achievements with current tier for a user
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_user_achievements(p_user_id uuid)
returns jsonb as $$
declare
  v_stats record;
  v_result jsonb;
begin
  select * into v_stats
  from public.user_arena_stats
  where user_id = p_user_id;

  if v_stats is null then
    return '[]'::jsonb;
  end if;

  v_result := jsonb_build_array(
    jsonb_build_object(
      'id', 'pentakills',
      'value', v_stats.penta_kills_total
    ),
    jsonb_build_object(
      'id', 'wards',
      'value', v_stats.wards_placed_total
    ),
    jsonb_build_object(
      'id', 'missing_pings',
      'value', v_stats.ping_missing_count
    ),
    jsonb_build_object(
      'id', 'tournament_wins',
      'value', v_stats.tournament_wins
    ),
    jsonb_build_object(
      'id', 'dragon_souls',
      'value', v_stats.dragon_souls_total
    )
  );

  return v_result;
end;
$$ language plpgsql security definer;
