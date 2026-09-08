CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

﻿--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tournament_id text NOT NULL,
    stage text NOT NULL,
    jornada integer,
    group_id uuid,
    bracket_round integer,
    bracket_round_name text,
    bracket_position integer,
    side_a_profile_id uuid,
    side_b_profile_id uuid,
    side_a_label text,
    side_b_label text,
    bye_profile_id uuid,
    score_a integer,
    score_b integer,
    score_a_leg2 integer,
    score_b_leg2 integer,
    legs smallint DEFAULT 1 NOT NULL,
    played boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    penalty_winner text,
    CONSTRAINT chk_bracket_has_round CHECK (((stage <> 'bracket'::text) OR ((bracket_round IS NOT NULL) AND (bracket_position IS NOT NULL)))),
    CONSTRAINT chk_group_has_group CHECK (((stage <> 'group'::text) OR (group_id IS NOT NULL))),
    CONSTRAINT chk_league_has_jornada CHECK (((stage <> 'league'::text) OR (jornada IS NOT NULL))),
    CONSTRAINT matches_legs_check CHECK ((legs = ANY (ARRAY[1, 2]))),
    CONSTRAINT matches_penalty_winner_check CHECK ((penalty_winner = ANY (ARRAY['a'::text, 'b'::text]))),
    CONSTRAINT matches_stage_check CHECK ((stage = ANY (ARRAY['league'::text, 'bracket'::text, 'group'::text])))
);

ALTER TABLE ONLY public.matches REPLICA IDENTITY FULL;


--
-- Name: _match_aggregate(public.matches); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._match_aggregate(m public.matches) RETURNS TABLE(agg_a integer, agg_b integer)
    LANGUAGE sql IMMUTABLE
    AS $$
  select coalesce(m.score_a, 0) + case when m.legs = 2 then coalesce(m.score_a_leg2, 0) else 0 end,
         coalesce(m.score_b, 0) + case when m.legs = 2 then coalesce(m.score_b_leg2, 0) else 0 end;
$$;


--
-- Name: _round_name(integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._round_name(n integer, p_locale text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  select case
    when n >= 16 then case when p_locale = 'en' then 'Round of 16' else 'Octavos' end
    when n = 8 then case when p_locale = 'en' then 'Quarter-finals' else 'Cuartos' end
    when n = 4 then case when p_locale = 'en' then 'Semi-final' else 'Semifinal' end
    else case when p_locale = 'en' then 'Final' else 'Final' end
  end;
$$;


--
-- Name: _round_robin_pairs(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._round_robin_pairs(participant_ids uuid[]) RETURNS TABLE(jornada integer, side_a uuid, side_b uuid, bye_id uuid)
    LANGUAGE plpgsql
    AS $$
declare
  arr uuid[] := participant_ids;
  n int;
  r int;
  i int;
  x uuid;
  y uuid;
  last_elem uuid;
begin
  if array_length(arr, 1) % 2 = 1 then
    arr := arr || null::uuid;
  end if;
  n := array_length(arr, 1);
  for r in 0 .. (n - 2) loop
    for i in 0 .. (n / 2 - 1) loop
      x := arr[i + 1];
      y := arr[n - i];
      if x is not null and y is not null then
        jornada := r + 1; side_a := x; side_b := y; bye_id := null;
      else
        jornada := r + 1; side_a := null; side_b := null; bye_id := coalesce(x, y);
      end if;
      return next;
    end loop;
    -- circle method: keep index 1 fixed, rotate everyone else ΓÇö mirrors the prototype's
    -- `a.splice(1, 0, a.pop())`.
    last_elem := arr[n];
    arr := arr[1:1] || last_elem || arr[2:n - 1];
  end loop;
  return;
end;
$$;


--
-- Name: add_offline_member(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_offline_member(p_tournament_id text, p_nickname text, p_team_name text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
  t public.tournaments;
  can_manage boolean;
  member_count int;
  v_nickname text;
  v_team text;
  v_profile_id uuid;
  participant_ids uuid[];
  seed_labels text[];
begin
  if caller is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  v_nickname := trim(p_nickname);
  if v_nickname is null or length(v_nickname) < 2 then
    raise exception 'nickname_invalid' using errcode = 'P0003';
  end if;

  v_team := nullif(trim(p_team_name), '');

  select * into t from public.tournaments where id = p_tournament_id and closed = false;
  if t.id is null then
    raise exception 'tournament_not_found' using errcode = 'P0002';
  end if;

  select (t.created_by = caller or role in ('admin', 'ayudante')) into can_manage
    from public.tournament_members
    where tournament_id = p_tournament_id and profile_id = caller;

  if not coalesce(can_manage, false) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select count(*) into member_count
    from public.tournament_members
    where tournament_id = p_tournament_id;

  if member_count >= t.teams then
    raise exception 'tournament_full' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.tournament_members tm
    join public.profiles p on tm.profile_id = p.id
    where tm.tournament_id = p_tournament_id and lower(p.nickname) = lower(v_nickname)
  ) then
    raise exception 'member_already_in_tournament' using errcode = 'P0004';
  end if;

  select id into v_profile_id from public.profiles where lower(nickname) = lower(v_nickname);
  if v_profile_id is null then
    v_profile_id := gen_random_uuid();
    insert into public.profiles (id, nickname, nickname_confirmed)
      values (v_profile_id, v_nickname, true);
  end if;

  insert into public.tournament_members (tournament_id, profile_id, role, paid, team_name)
    values (p_tournament_id, v_profile_id, 'jugador', true, v_team);

  member_count := member_count + 1;

  if member_count = t.teams then
    select array_agg(profile_id order by joined_at) into participant_ids
      from public.tournament_members where tournament_id = p_tournament_id;

    if t.type = 'liga' then
      perform public.generate_round_robin(p_tournament_id, participant_ids, t.legs, 'league');
    elsif t.type = 'copa' then
      seed_labels := array_fill(null::text, array[array_length(participant_ids, 1)]);
      perform public.generate_bracket(p_tournament_id, participant_ids, seed_labels);
    elsif t.type = 'grupos' then
      declare
        group_count int := array_length(participant_ids, 1) / 4;
        shuffled uuid[];
        g int;
        gid uuid;
        letter char(1);
        group_participants uuid[];
        letters text[] := array[]::text[];
        seed_ids uuid[] := array[]::uuid[];
      begin
        select array_agg(profile_id order by random()) into shuffled
          from public.tournament_members where tournament_id = p_tournament_id;

        for g in 0 .. group_count - 1 loop
          letter := chr(65 + g);
          insert into public.groups (tournament_id, letter) values (p_tournament_id, letter) returning id into gid;
          group_participants := shuffled[g * 4 + 1 : g * 4 + 4];
          insert into public.group_members (group_id, profile_id) select gid, unnest(group_participants);
          perform public.generate_round_robin(p_tournament_id, group_participants, coalesce(t.group_legs, 1)::smallint, 'group'::text, gid);
          letters := letters || letter;
        end loop;

        seed_labels := array[]::text[];
        for g in 0 .. group_count - 1 loop
          seed_ids := seed_ids || null::uuid;
          seed_labels := seed_labels || ('1┬║ ' || letters[g + 1]);
          seed_ids := seed_ids || null::uuid;
          seed_labels := seed_labels || ('2┬║ ' || letters[(g + 1) % group_count + 1]);
        end loop;

        perform public.generate_bracket(p_tournament_id, seed_ids, seed_labels);
      end;
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'tournamentId', p_tournament_id,
    'profileId', v_profile_id,
    'nickname', v_nickname,
    'teamName', v_team,
    'full', member_count = t.teams
  );
end;
$$;


--
-- Name: apply_match_score(uuid, integer, integer, integer, integer, uuid, bigint, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_match_score(p_match_id uuid, p_score_a integer, p_score_b integer, p_score_a_leg2 integer DEFAULT NULL::integer, p_score_b_leg2 integer DEFAULT NULL::integer, p_client_id uuid DEFAULT NULL::uuid, p_client_seq bigint DEFAULT NULL::bigint, p_penalty_winner text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  caller uuid := auth.uid();
  caller_role text;
  m public.matches;
  v_played boolean;
begin
  if caller is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into m from public.matches where id = p_match_id;
  if m.id is null then
    raise exception 'match_not_found' using errcode = 'P0002';
  end if;

  select role into caller_role from public.tournament_members
    where tournament_id = m.tournament_id and profile_id = caller;

  -- Allow tournament admin/ayudante, OR either match participant
  if (caller_role is null or caller_role not in ('admin', 'ayudante'))
     and (m.side_a_profile_id is null or m.side_a_profile_id <> caller)
     and (m.side_b_profile_id is null or m.side_b_profile_id <> caller) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  v_played := case when m.legs = 2 then (p_score_a_leg2 is not null and p_score_b_leg2 is not null) else true end;

  update public.matches
    set score_a = p_score_a,
        score_b = p_score_b,
        score_a_leg2 = p_score_a_leg2,
        score_b_leg2 = p_score_b_leg2,
        penalty_winner = p_penalty_winner,
        played = v_played,
        last_client_id = coalesce(p_client_id, last_client_id),
        last_client_seq = coalesce(p_client_seq, last_client_seq),
        updated_at = now()
    where id = p_match_id;

  if m.stage = 'bracket' and v_played then
    perform public.propagate_bracket(m.tournament_id);
  elsif m.stage = 'group' and v_played then
    if not exists (
      select 1 from public.matches
        where group_id = m.group_id and side_a_profile_id is not null and side_b_profile_id is not null and not played
    ) then
      update public.matches bm set
        side_a_profile_id = coalesce(bm.side_a_profile_id, sub.profile_id),
        side_a_label = case when sub.profile_id is not null then null else bm.side_a_label end
      from (
        select s.profile_id, s.pos, g.letter from public.standings(
          (select array_agg(profile_id) from public.group_members where group_id = m.group_id),
          (select array_agg(id) from public.matches where group_id = m.group_id)
        ) s, public.groups g where g.id = m.group_id
      ) sub
      where bm.tournament_id = m.tournament_id and bm.stage = 'bracket'
        and bm.side_a_label = (case when sub.pos = 1 then '1?? ' else '2?? ' end || sub.letter);

      update public.matches bm set
        side_b_profile_id = coalesce(bm.side_b_profile_id, sub.profile_id),
        side_b_label = case when sub.profile_id is not null then null else bm.side_b_label end
      from (
        select s.profile_id, s.pos, g.letter from public.standings(
          (select array_agg(profile_id) from public.group_members where group_id = m.group_id),
          (select array_agg(id) from public.matches where group_id = m.group_id)
        ) s, public.groups g where g.id = m.group_id
      ) sub
      where bm.tournament_id = m.tournament_id and bm.stage = 'bracket'
        and bm.side_b_label = (case when sub.pos = 1 then '1?? ' else '2?? ' end || sub.letter);
    end if;
  end if;

  return jsonb_build_object(
    'matchId', p_match_id,
    'played', v_played,
    'appliedAt', now()
  );
end;
$$;


--
-- Name: close_tournament(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.close_tournament(p_tournament_id text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
  caller_role text;
  final_match public.matches;
  agg record;
  champion uuid;
begin
  if caller is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select role into caller_role from public.tournament_members
    where tournament_id = p_tournament_id and profile_id = caller;
  if caller_role is distinct from 'admin' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select m.* into final_match from public.matches m
    where m.tournament_id = p_tournament_id and m.stage = 'bracket'
    order by m.bracket_round desc limit 1;

  if final_match.id is not null then
    select * into agg from public._match_aggregate(final_match);
    champion := case when agg.agg_a >= agg.agg_b then final_match.side_a_profile_id else final_match.side_b_profile_id end;
  else
    select profile_id into champion from public.standings(
      (select array_agg(profile_id) from public.tournament_members where tournament_id = p_tournament_id),
      (select array_agg(id) from public.matches where tournament_id = p_tournament_id and stage = 'league')
    ) order by pos limit 1;
  end if;

  update public.tournaments set closed = true, champion_profile_id = champion where id = p_tournament_id;
  return jsonb_build_object('tournamentId', p_tournament_id, 'championProfileId', champion);
end;
$$;


--
-- Name: create_tournament(text, text, date, text, integer, boolean, integer, text, integer, integer, integer, text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_tournament(p_name text, p_game text, p_start_date date, p_type text, p_teams integer, p_fee_on boolean, p_fee_amount_cents integer, p_final_format text, p_legs integer, p_semi_legs integer, p_final_legs integer, p_team_name text DEFAULT NULL::text, p_mode text DEFAULT 'online'::text, p_group_legs integer DEFAULT 1) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
  new_id text;
  prefix text;
  num text;
  tries int := 0;
  v_mode text;
begin
  if caller is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  v_mode := lower(coalesce(nullif(trim(p_mode), ''), 'online'));
  if v_mode not in ('online', 'offline') then
    v_mode := 'online';
  end if;

  prefix := upper(substr(regexp_replace(p_game, '[^a-zA-Z0-9]', '', 'g'), 1, 3));
  if length(prefix) < 3 then
    prefix := rpad(prefix, 3, 'X');
  end if;

  loop
    num := lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
    new_id := prefix || '-' || num;
    exit when not exists (select 1 from public.tournaments where id = new_id);
    tries := tries + 1;
    if tries > 20 then
      new_id := 'T-' || substr(gen_random_uuid()::text, 1, 6);
      exit;
    end if;
  end loop;

  insert into public.tournaments (
    id, name, game, start_date, type, teams, fee_on, fee_amount_cents,
    final_format, legs, semi_legs, final_legs, closed, created_by, mode, group_legs
  ) values (
    new_id, p_name, p_game, p_start_date, p_type, p_teams, p_fee_on, p_fee_amount_cents,
    p_final_format, coalesce(p_legs, 1), coalesce(p_semi_legs, 1), coalesce(p_final_legs, 1), false, caller, v_mode, coalesce(p_group_legs, 1)
  );

  insert into public.tournament_members (
    tournament_id, profile_id, role, paid, team_name
  ) values (
    new_id, caller, 'admin', true, p_team_name
  );

  return jsonb_build_object('tournamentId', new_id, 'id', new_id, 'mode', v_mode);
end;
$$;


--
-- Name: find_open_tournament(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_open_tournament(p_query text) RETURNS TABLE(id text, name text, game text, type text, teams integer, fee_on boolean, fee_amount_cents integer, closed boolean, member_count bigint)
    LANGUAGE sql SECURITY DEFINER
    AS $$select t.id, t.name, t.game, t.type, t.teams, t.fee_on, t.fee_amount_cents, t.closed, count(m.profile_id) as member_count from public.tournaments t left join public.tournament_members m on m.tournament_id = t.id where t.closed = false and (t.id = upper(trim(p_query)) or t.name ilike '%' || trim(p_query) || '%') group by t.id;$$;


--
-- Name: generate_bracket(text, uuid[], text[], text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_bracket(p_tournament_id text, p_seed_ids uuid[], p_seed_labels text[], p_locale text DEFAULT 'es'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
declare
  cur_ids uuid[] := p_seed_ids;
  cur_labels text[] := p_seed_labels;
  cur_len int := array_length(p_seed_ids, 1);
  round_no int := 0;
  i int;
  match_id uuid;
  next_ids uuid[];
  next_labels text[];
  t_legs smallint;
  t_semi_legs smallint;
  t_final_legs smallint;
  round_legs smallint;
begin
  select coalesce(legs, 1), coalesce(semi_legs, 1), coalesce(final_legs, 1)
    into t_legs, t_semi_legs, t_final_legs
    from public.tournaments where id = p_tournament_id;

  while cur_len > 1 loop
    next_ids := array[]::uuid[];
    next_labels := array[]::text[];
    round_legs := case
      when cur_len = 2 then t_final_legs
      when cur_len = 4 then t_semi_legs
      else t_legs
    end;
    i := 1;
    while i <= cur_len loop
      insert into public.matches (
        tournament_id, stage, bracket_round, bracket_position, bracket_round_name,
        side_a_profile_id, side_a_label, side_b_profile_id, side_b_label, legs
      ) values (
        p_tournament_id, 'bracket', round_no, (i - 1) / 2,
        public._round_name(cur_len, p_locale) || (case when round_legs = 2 then (case when p_locale = 'en' then ' ┬╖ 2 Legs' else ' ┬╖ Ida y Vuelta' end) else '' end),
        cur_ids[i], cur_labels[i], cur_ids[i + 1], coalesce(cur_labels[i + 1], case when cur_ids[i + 1] is null and cur_labels[i + 1] is null then 'BYE' end),
        round_legs
      ) returning id into match_id;
      next_ids := next_ids || null::uuid;
      next_labels := next_labels || (case when p_locale = 'en' then 'Winner ' else 'Ganador ' end || ((i - 1) / 2 + 1));
      i := i + 2;
    end loop;
    cur_ids := next_ids;
    cur_labels := next_labels;
    cur_len := array_length(cur_ids, 1);
    round_no := round_no + 1;
  end loop;
end;
$$;


--
-- Name: generate_round_robin(text, uuid[], smallint, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_round_robin(p_tournament_id text, p_participant_ids uuid[], p_legs smallint, p_stage text, p_group_id uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
declare
  rec record;
  round_count int;
begin
  for rec in select * from public._round_robin_pairs(p_participant_ids) loop
    insert into public.matches (tournament_id, stage, jornada, group_id, side_a_profile_id, side_b_profile_id, bye_profile_id, legs)
    values (p_tournament_id, p_stage, rec.jornada, p_group_id, rec.side_a, rec.side_b, rec.bye_id, p_legs);
  end loop;

  if p_legs = 2 then
    -- Second leg: same pairings with sides swapped, jornada offset by `round_count`, mirroring
    -- rrMatches's `rounds = nicks.length % 2 === 1 ? nicks.length : nicks.length - 1`.
    round_count := case when array_length(p_participant_ids, 1) % 2 = 1
      then array_length(p_participant_ids, 1) else array_length(p_participant_ids, 1) - 1 end;
    for rec in select * from public._round_robin_pairs(p_participant_ids) loop
      if rec.side_a is not null then
        insert into public.matches (tournament_id, stage, jornada, group_id, side_a_profile_id, side_b_profile_id, legs)
        values (p_tournament_id, p_stage, rec.jornada + round_count, p_group_id, rec.side_b, rec.side_a, p_legs);
      end if;
    end loop;
  end if;
end;
$$;


--
-- Name: get_all_tournaments_admin(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_all_tournaments_admin(p_filter text DEFAULT 'all'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  caller uuid := auth.uid();
  caller_email text;
  v_tournaments jsonb;
begin
  if caller is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select email into caller_email from auth.users where id = caller;
  if caller_email is null or lower(caller_email) <> 'test@broscup.com' then
    raise exception 'not_authorized: superadmin only' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'game', t.game,
      'type', t.type,
      'teams', t.teams,
      'closed', t.closed,
      'mode', coalesce(t.mode, 'online'),
      'created_at', t.created_at,
      'start_date', t.start_date,
      'member_count', (select count(*) from public.tournament_members tm where tm.tournament_id = t.id),
      'total_matches', (select count(*) from public.matches m where m.tournament_id = t.id),
      'played_matches', (select count(*) from public.matches m where m.tournament_id = t.id and m.played = true),
      'champion_name', (select p.nickname from public.profiles p where p.id = t.champion_profile_id)
    ) order by t.created_at desc
  ), '[]'::jsonb)
  into v_tournaments
  from public.tournaments t
  where (p_filter = 'all')
     or (p_filter = 'active' and t.closed = false)
     or (p_filter = 'archived' and t.closed = true);

  return v_tournaments;
end;
$$;


--
-- Name: get_tournament_public(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_tournament_public(p_tournament_id text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  t_row public.tournaments%ROWTYPE;
  v_members jsonb;
  v_matches jsonb;
  v_groups jsonb;
  v_champ_nickname text;
  v_result jsonb;
begin
  -- Find tournament by ID or uppercase/trimmed ID
  select * into t_row
  from public.tournaments
  where id = p_tournament_id or upper(id) = upper(trim(p_tournament_id))
  limit 1;

  if t_row.id is null then
    return null;
  end if;

  -- Get members with nickname and team_name
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'tournament_id', tm.tournament_id,
      'profile_id', tm.profile_id,
      'role', tm.role,
      'paid', tm.paid,
      'team_name', tm.team_name,
      'profiles', jsonb_build_object('nickname', coalesce(p.nickname, 'Jugador'))
    ) order by tm.joined_at asc
  ), '[]'::jsonb)
  into v_members
  from public.tournament_members tm
  left join public.profiles p on p.id = tm.profile_id
  where tm.tournament_id = t_row.id;

  -- Get matches with nicknames
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'tournament_id', m.tournament_id,
      'stage', m.stage,
      'jornada', m.jornada,
      'group_id', m.group_id,
      'bracket_round', m.bracket_round,
      'bracket_round_name', m.bracket_round_name,
      'bracket_position', m.bracket_position,
      'side_a_label', m.side_a_label,
      'side_b_label', m.side_b_label,
      'score_a', m.score_a,
      'score_b', m.score_b,
      'score_a_leg2', m.score_a_leg2,
      'score_b_leg2', m.score_b_leg2,
      'legs', m.legs,
      'played', m.played,
      'penalty_winner', m.penalty_winner,
      'side_a_profile_id', m.side_a_profile_id,
      'side_b_profile_id', m.side_b_profile_id,
      'side_a', case when pa.nickname is not null then jsonb_build_object('nickname', pa.nickname) else null end,
      'side_b', case when pb.nickname is not null then jsonb_build_object('nickname', pb.nickname) else null end,
      'bye', case when pbye.nickname is not null then jsonb_build_object('nickname', pbye.nickname) else null end
    ) order by m.jornada asc nulls last, m.bracket_round asc nulls last, m.bracket_position asc nulls last
  ), '[]'::jsonb)
  into v_matches
  from public.matches m
  left join public.profiles pa on pa.id = m.side_a_profile_id
  left join public.profiles pb on pb.id = m.side_b_profile_id
  left join public.profiles pbye on pbye.id = m.bye_profile_id
  where m.tournament_id = t_row.id;

  -- Get groups
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', g.id,
      'tournament_id', g.tournament_id,
      'letter', g.letter
    ) order by g.letter asc
  ), '[]'::jsonb)
  into v_groups
  from public.groups g
  where g.tournament_id = t_row.id;

  -- Get champion nickname
  if t_row.champion_profile_id is not null then
    select nickname into v_champ_nickname
    from public.profiles
    where id = t_row.champion_profile_id;
  end if;

  v_result := jsonb_build_object(
    'tournament', to_jsonb(t_row),
    'members', v_members,
    'matches', v_matches,
    'groups', v_groups,
    'champion_nickname', v_champ_nickname
  );

  return v_result;
end;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  candidate text;
begin
  candidate := coalesce(split_part(new.email, '@', 1), 'jugador');
  insert into public.profiles (id, nickname)
  values (new.id, candidate || '_' || substr(new.id::text, 1, 4))
  on conflict (id) do nothing;
  return new;
end;
$$;


--
-- Name: is_member_of(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_member_of(p_tournament_id text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from public.tournament_members
    where tournament_id = p_tournament_id and profile_id = auth.uid()
  );
$$;


--
-- Name: join_tournament(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.join_tournament(p_tournament_id text, p_team_name text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
  t public.tournaments;
  member_count int;
  already_member boolean;
  participant_ids uuid[];
  seed_labels text[];
begin
  if caller is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into t from public.tournaments where id = p_tournament_id and closed = false;
  if t.id is null then
    raise exception 'tournament_not_found' using errcode = 'P0002';
  end if;

  select exists(
    select 1 from public.tournament_members
    where tournament_id = p_tournament_id and profile_id = caller
  ) into already_member;

  if already_member then
    return jsonb_build_object('tournamentId', p_tournament_id, 'already_member', true);
  end if;

  select count(*) into member_count
    from public.tournament_members
    where tournament_id = p_tournament_id;

  if member_count >= t.teams then
    raise exception 'tournament_full' using errcode = 'P0001';
  end if;

  insert into public.tournament_members (tournament_id, profile_id, role, paid, team_name)
    values (p_tournament_id, caller, 'jugador', false, p_team_name);

  member_count := member_count + 1;

  if member_count = t.teams then
    select array_agg(profile_id order by joined_at) into participant_ids
      from public.tournament_members where tournament_id = p_tournament_id;

    if t.type = 'liga' then
      perform public.generate_round_robin(p_tournament_id, participant_ids, t.legs, 'league');
    elsif t.type = 'copa' then
      seed_labels := array_fill(null::text, array[array_length(participant_ids, 1)]);
      perform public.generate_bracket(p_tournament_id, participant_ids, seed_labels);
    elsif t.type = 'grupos' then
      declare
        group_count int := array_length(participant_ids, 1) / 4;
        shuffled uuid[];
        g int;
        gid uuid;
        letter char(1);
        group_participants uuid[];
        letters text[] := array[]::text[];
        seed_ids uuid[] := array[]::uuid[];
      begin
        select array_agg(profile_id order by random()) into shuffled
          from public.tournament_members where tournament_id = p_tournament_id;

        for g in 0 .. group_count - 1 loop
          letter := chr(65 + g);
          insert into public.groups (tournament_id, letter) values (p_tournament_id, letter) returning id into gid;
          group_participants := shuffled[g * 4 + 1 : g * 4 + 4];
          insert into public.group_members (group_id, profile_id) select gid, unnest(group_participants);
          perform public.generate_round_robin(p_tournament_id, group_participants, coalesce(t.group_legs, 1)::smallint, 'group'::text, gid);
          letters := letters || letter;
        end loop;

        seed_labels := array[]::text[];
        for g in 0 .. group_count - 1 loop
          seed_ids := seed_ids || null::uuid;
          seed_labels := seed_labels || ('1┬║ ' || letters[g + 1]);
          seed_ids := seed_ids || null::uuid;
          seed_labels := seed_labels || ('2┬║ ' || letters[(g + 1) % group_count + 1]);
        end loop;

        perform public.generate_bracket(p_tournament_id, seed_ids, seed_labels);
      end;
    end if;
  end if;

  return jsonb_build_object('tournamentId', p_tournament_id, 'full', member_count = t.teams);
end;
$$;


--
-- Name: leave_tournament(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.leave_tournament(p_tournament_id text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
  caller_role text;
  t public.tournaments;
begin
  if caller is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into t from public.tournaments where id = p_tournament_id;
  select role into caller_role from public.tournament_members
    where tournament_id = p_tournament_id and profile_id = caller;
  if caller_role is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if t.fee_on and caller_role <> 'admin' then
    raise exception 'leave_locked' using errcode = 'P0001';
  end if;

  delete from public.tournament_members where tournament_id = p_tournament_id and profile_id = caller;
  return jsonb_build_object('tournamentId', p_tournament_id, 'left', true);
end;
$$;


--
-- Name: propagate_bracket(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.propagate_bracket(p_tournament_id text) RETURNS void
    LANGUAGE plpgsql
    AS $$
declare
  m public.matches;
  next_match record;
  winner uuid;
  slot_is_a boolean;
  agg record;
  max_round int;
begin
  select max(bracket_round) into max_round from public.matches
    where tournament_id = p_tournament_id and stage = 'bracket';
  if max_round is null then return; end if;

  for m in select * from public.matches
    where tournament_id = p_tournament_id and stage = 'bracket' and bracket_round < max_round
    order by bracket_round, bracket_position
  loop
    select * into next_match from public.matches
      where tournament_id = p_tournament_id and stage = 'bracket'
        and bracket_round = m.bracket_round + 1 and bracket_position = m.bracket_position / 2;
    if next_match.id is null then continue; end if;
    slot_is_a := (m.bracket_position % 2 = 0);

    if m.played then
      select * into agg from public._match_aggregate(m);
      if agg.agg_a > agg.agg_b then
        winner := m.side_a_profile_id;
      elsif agg.agg_b > agg.agg_a then
        winner := m.side_b_profile_id;
      else
        -- Tie: check penalty_winner
        if m.penalty_winner = 'b' then
          winner := m.side_b_profile_id;
        else
          winner := m.side_a_profile_id;
        end if;
      end if;

      if slot_is_a then
        update public.matches set side_a_profile_id = winner, side_a_label = null where id = next_match.id;
      else
        update public.matches set side_b_profile_id = winner, side_b_label = null where id = next_match.id;
      end if;
    end if;
  end loop;
end;
$$;


--
-- Name: remove_member(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remove_member(p_tournament_id text, p_profile_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
  caller_role text;
  removed uuid;
begin
  if caller is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select role into caller_role from public.tournament_members
    where tournament_id = p_tournament_id and profile_id = caller;
  if caller_role is distinct from 'admin' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  delete from public.tournament_members
    where tournament_id = p_tournament_id and profile_id = p_profile_id and role <> 'admin'
    returning profile_id into removed;
  if removed is null then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;

  return jsonb_build_object('tournamentId', p_tournament_id, 'profileId', removed);
end;
$$;


--
-- Name: rename_tournament(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rename_tournament(p_tournament_id text, p_name text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
  caller_role text;
begin
  if caller is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select role into caller_role from public.tournament_members
    where tournament_id = p_tournament_id and profile_id = caller;
  if caller_role is distinct from 'admin' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update public.tournaments set name = p_name where id = p_tournament_id;
  return jsonb_build_object('tournamentId', p_tournament_id, 'name', p_name);
end;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


--
-- Name: simulate_remaining_members(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.simulate_remaining_members(p_tournament_id text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  caller uuid := auth.uid();
  t public.tournaments;
  can_manage boolean;
  member_count int;
  needed int;
  bot_names text[] := array[
    'sara.gg', 'mrpato', 'jandro', 'kiki_22', 'tono', 'valen',
    'rmz', 'lolo', 'bruno', 'ceci', 'fer', 'moni', 'zeta__',
    'gigi', 'pau.rl', 'tincho', 'marukk'
  ];
  bot_nick text;
  bot_id uuid;
  participant_ids uuid[];
  seed_labels text[];
  i int;
begin
  select * into t from public.tournaments where id = p_tournament_id and closed = false;
  if t.id is null then
    raise exception 'tournament_not_found' using errcode = 'P0002';
  end if;

  select (role in ('admin', 'ayudante')) into can_manage
    from public.tournament_members
    where tournament_id = p_tournament_id and profile_id = caller;

  if not coalesce(can_manage, false) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select count(*) into member_count from public.tournament_members where tournament_id = p_tournament_id;
  needed := t.teams - member_count;

  if needed <= 0 then
    return jsonb_build_object('success', true, 'message', 'tournament_already_full');
  end if;

  for i in 1 .. needed loop
    select b into bot_nick
      from unnest(bot_names) b
      where not exists (
        select 1 from public.tournament_members tm
        join public.profiles p on tm.profile_id = p.id
        where tm.tournament_id = p_tournament_id and lower(p.nickname) = lower(b)
      )
      limit 1;

    if bot_nick is null then
      bot_nick := 'bot_' || (100 + floor(random() * 900))::int::text;
    end if;

    select id into bot_id from public.profiles where lower(nickname) = lower(bot_nick);
    if bot_id is null then
      bot_id := gen_random_uuid();
      insert into public.profiles (id, nickname, nickname_confirmed)
        values (bot_id, bot_nick, true);
    end if;

    insert into public.tournament_members (tournament_id, profile_id, role, paid)
      values (p_tournament_id, bot_id, 'jugador', true)
      on conflict (tournament_id, profile_id) do nothing;
  end loop;

  select array_agg(profile_id order by joined_at) into participant_ids
    from public.tournament_members where tournament_id = p_tournament_id;

  if t.type = 'liga' then
    perform public.generate_round_robin(p_tournament_id, participant_ids, t.legs, 'league');
  elsif t.type = 'copa' then
    seed_labels := array_fill(null::text, array[array_length(participant_ids, 1)]);
    perform public.generate_bracket(p_tournament_id, participant_ids, seed_labels);
  elsif t.type = 'grupos' then
    declare
      group_count int := array_length(participant_ids, 1) / 4;
      shuffled uuid[];
      g int;
      gid uuid;
      letter char(1);
      group_participants uuid[];
      letters text[] := array[]::text[];
      seed_ids uuid[] := array[]::uuid[];
    begin
      select array_agg(profile_id order by random()) into shuffled
        from public.tournament_members where tournament_id = p_tournament_id;

      for g in 0 .. group_count - 1 loop
        letter := chr(65 + g);
        insert into public.groups (tournament_id, letter) values (p_tournament_id, letter) returning id into gid;
        group_participants := shuffled[g * 4 + 1 : g * 4 + 4];
        insert into public.group_members (group_id, profile_id) select gid, unnest(group_participants);
        perform public.generate_round_robin(p_tournament_id, group_participants, coalesce(t.group_legs, 1)::smallint, 'group'::text, gid);
        letters := letters || letter;
      end loop;

      seed_labels := array[]::text[];
      for g in 0 .. group_count - 1 loop
        seed_ids := seed_ids || null::uuid;
        seed_labels := seed_labels || ('1┬║ ' || letters[g + 1]);
        seed_ids := seed_ids || null::uuid;
        seed_labels := seed_labels || ('2┬║ ' || letters[(g + 1) % group_count + 1]);
      end loop;

      perform public.generate_bracket(p_tournament_id, seed_ids, seed_labels);
    end;
  end if;

  return jsonb_build_object('success', true, 'full', true);
end;
$$;


--
-- Name: standings(uuid[], uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.standings(p_participant_ids uuid[], p_match_ids uuid[]) RETURNS TABLE(profile_id uuid, played integer, goals_for integer, goals_against integer, points integer, pos integer)
    LANGUAGE sql STABLE
    AS $$
  with base as (
    select p as profile_id, 0 as played, 0 as goals_for, 0 as goals_against, 0 as points
    from unnest(p_participant_ids) as p
  ),
  results as (
    select side_a_profile_id as profile_id, 1 as played, score_a as goals_for, score_b as goals_against,
           case when score_a > score_b then 3 when score_a = score_b then 1 else 0 end as points
    from public.matches where id = any(p_match_ids) and played and side_a_profile_id is not null and side_b_profile_id is not null
    union all
    select side_b_profile_id, 1, score_b, score_a,
           case when score_b > score_a then 3 when score_a = score_b then 1 else 0 end
    from public.matches where id = any(p_match_ids) and played and side_a_profile_id is not null and side_b_profile_id is not null
  ),
  agg as (
    select b.profile_id,
           b.played + coalesce(sum(r.played), 0) as played,
           b.goals_for + coalesce(sum(r.goals_for), 0) as goals_for,
           b.goals_against + coalesce(sum(r.goals_against), 0) as goals_against,
           b.points + coalesce(sum(r.points), 0) as points
    from base b left join results r on r.profile_id = b.profile_id
    group by b.profile_id, b.played, b.goals_for, b.goals_against, b.points
  )
  select profile_id, played::int, goals_for::int, goals_against::int, points::int,
         row_number() over (order by points desc, (goals_for - goals_against) desc, goals_for desc)::int as pos
  from agg;
$$;


--
-- Name: start_playoff(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.start_playoff(p_tournament_id text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
  caller_role text;
  t public.tournaments;
  bracket_count int;
  fixture_count int;
  played_count int;
  participant_ids uuid[];
  ranked uuid[];
  seed_ids uuid[];
  seed_labels text[];
begin
  if caller is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into t from public.tournaments where id = p_tournament_id and closed = false;
  if t.id is null then
    raise exception 'tournament_not_found' using errcode = 'P0002';
  end if;

  select role into caller_role from public.tournament_members
    where tournament_id = p_tournament_id and profile_id = caller;
  if caller_role is null or caller_role not in ('admin', 'ayudante') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if t.type <> 'liga' or t.final_format = 'none' then
    raise exception 'invalid_playoff_request' using errcode = 'P0001';
  end if;

  select count(*) into bracket_count from public.matches where tournament_id = p_tournament_id and stage = 'bracket';
  if bracket_count > 0 then
    raise exception 'playoff_already_started' using errcode = 'P0001';
  end if;

  select count(*) into fixture_count from public.matches
    where tournament_id = p_tournament_id and stage = 'league'
      and side_a_profile_id is not null and side_b_profile_id is not null;
  select count(*) into played_count from public.matches
    where tournament_id = p_tournament_id and stage = 'league' and played;
  if fixture_count = 0 or played_count < fixture_count then
    raise exception 'league_not_finished' using errcode = 'P0001';
  end if;

  select array_agg(profile_id) into participant_ids
    from public.tournament_members where tournament_id = p_tournament_id;
  select array_agg(profile_id order by pos) into ranked from public.standings(
    participant_ids,
    (select array_agg(id) from public.matches where tournament_id = p_tournament_id and stage = 'league')
  );

  if t.final_format = 'top4' then
    seed_ids := array[ranked[1], ranked[4], ranked[2], ranked[3]];
  elsif t.final_format = 'top2' then
    seed_ids := array[ranked[1], ranked[2]];
  end if;
  seed_labels := array_fill(null::text, array[array_length(seed_ids, 1)]);

  perform public.generate_bracket(p_tournament_id, seed_ids, seed_labels);

  return jsonb_build_object('tournamentId', p_tournament_id, 'seeded', array_length(seed_ids, 1));
end;
$$;


--
-- Name: toggle_helper_role(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.toggle_helper_role(p_tournament_id text, p_profile_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
  caller_role text;
  new_role text;
begin
  if caller is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select role into caller_role from public.tournament_members
    where tournament_id = p_tournament_id and profile_id = caller;
  if caller_role is distinct from 'admin' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update public.tournament_members
    set role = case when role = 'ayudante' then 'jugador' else 'ayudante' end
    where tournament_id = p_tournament_id and profile_id = p_profile_id and role <> 'admin'
    returning role into new_role;
  if new_role is null then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;

  return jsonb_build_object('tournamentId', p_tournament_id, 'profileId', p_profile_id, 'role', new_role);
end;
$$;


--
-- Name: toggle_member_paid(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.toggle_member_paid(p_tournament_id text, p_profile_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
  caller_role text;
  new_paid boolean;
begin
  if caller is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select role into caller_role from public.tournament_members
    where tournament_id = p_tournament_id and profile_id = caller;
  if caller_role is distinct from 'admin' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update public.tournament_members set paid = not paid
    where tournament_id = p_tournament_id and profile_id = p_profile_id
    returning paid into new_paid;
  if new_paid is null then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;

  return jsonb_build_object('tournamentId', p_tournament_id, 'profileId', p_profile_id, 'paid', new_paid);
end;
$$;


--
-- Name: tournament_phase(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tournament_phase(p_tournament_id text) RETURNS jsonb
    LANGUAGE plpgsql STABLE
    AS $$
declare
  t public.tournaments;
  member_count int;
  fixture_count int;
  bracket_round_count int;
  final_match public.matches;
  played_count int;
begin
  select * into t from public.tournaments where id = p_tournament_id;
  if t.closed then
    return jsonb_build_object('key', 'closed', 'championProfileId', t.champion_profile_id);
  end if;

  select count(*) into member_count from public.tournament_members where tournament_id = p_tournament_id;
  select count(*) into fixture_count from public.matches
    where tournament_id = p_tournament_id and stage in ('league', 'group')
      and side_a_profile_id is not null and side_b_profile_id is not null;
  select count(*) into bracket_round_count from public.matches
    where tournament_id = p_tournament_id and stage = 'bracket';

  if member_count < t.teams or (fixture_count = 0 and bracket_round_count = 0) then
    return jsonb_build_object('key', 'reg', 'missing', greatest(0, t.teams - member_count));
  end if;

  if bracket_round_count > 0 then
    select m.* into final_match from public.matches m
      where m.tournament_id = p_tournament_id and m.stage = 'bracket'
      order by m.bracket_round desc limit 1;
    if final_match.played then
      declare agg record; winner uuid;
      begin
        select * into agg from public._match_aggregate(final_match);
        winner := case when agg.agg_a >= agg.agg_b then final_match.side_a_profile_id else final_match.side_b_profile_id end;
        return jsonb_build_object('key', 'done', 'championProfileId', winner);
      end;
    end if;
    if t.type = 'liga' then
      return jsonb_build_object('key', 'playoff');
    end if;
  end if;

  select count(*) into played_count from public.matches
    where tournament_id = p_tournament_id and stage in ('league', 'group') and played;

  if t.type = 'liga' and t.final_format = 'none' and fixture_count > 0 and played_count = fixture_count then
    return jsonb_build_object('key', 'done', 'championProfileId', (
      select profile_id from public.standings(
        (select array_agg(profile_id) from public.tournament_members where tournament_id = p_tournament_id),
        (select array_agg(id) from public.matches where tournament_id = p_tournament_id and stage = 'league')
      ) order by pos limit 1
    ));
  end if;

  return jsonb_build_object('key', 'playing', 'played', played_count, 'total', fixture_count);
end;
$$;


--
-- Name: update_member_team(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_member_team(p_tournament_id text, p_team_name text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update public.tournament_members
    set team_name = nullif(trim(p_team_name), '')
    where tournament_id = p_tournament_id and profile_id = caller;

  return jsonb_build_object('success', true, 'teamName', p_team_name);
end;
$$;


--
-- Name: device_push_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_push_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    token text NOT NULL,
    platform text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT device_push_tokens_platform_check CHECK ((platform = ANY (ARRAY['ios'::text, 'android'::text])))
);


--
-- Name: group_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_members (
    group_id uuid NOT NULL,
    profile_id uuid NOT NULL
);


--
-- Name: groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tournament_id text NOT NULL,
    letter character(1) NOT NULL
);


--
-- Name: mutation_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mutation_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    client_seq bigint NOT NULL,
    profile_id uuid NOT NULL,
    mutation_name text NOT NULL,
    tournament_id text,
    response jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification_prefs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_prefs (
    profile_id uuid NOT NULL,
    category text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    CONSTRAINT notification_prefs_category_check CHECK ((category = ANY (ARRAY['score_entered'::text, 'playoff_ready'::text, 'tournament_full'::text, 'tournament_closed'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    nickname text NOT NULL,
    avatar_initial text GENERATED ALWAYS AS (upper("left"(nickname, 1))) STORED,
    locale text DEFAULT 'es'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    nickname_confirmed boolean DEFAULT false NOT NULL,
    CONSTRAINT profiles_locale_check CHECK ((locale = ANY (ARRAY['es'::text, 'en'::text])))
);


--
-- Name: tournament_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournament_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tournament_id text NOT NULL,
    profile_id uuid NOT NULL,
    role text DEFAULT 'jugador'::text NOT NULL,
    paid boolean DEFAULT false NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    team_name text,
    CONSTRAINT tournament_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'ayudante'::text, 'jugador'::text])))
);

ALTER TABLE ONLY public.tournament_members REPLICA IDENTITY FULL;


--
-- Name: tournaments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournaments (
    id text NOT NULL,
    name text NOT NULL,
    game text NOT NULL,
    start_date date,
    type text NOT NULL,
    teams integer NOT NULL,
    fee_on boolean DEFAULT false NOT NULL,
    fee_amount_cents integer,
    fee_currency character(3) DEFAULT 'EUR'::bpchar NOT NULL,
    final_format text DEFAULT 'top4'::text NOT NULL,
    legs smallint DEFAULT 1 NOT NULL,
    semi_legs smallint DEFAULT 1 NOT NULL,
    final_legs smallint DEFAULT 1 NOT NULL,
    closed boolean DEFAULT false NOT NULL,
    champion_profile_id uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    mode text DEFAULT 'online'::text,
    group_legs smallint DEFAULT 1,
    CONSTRAINT chk_copa_power_of_two CHECK (((type <> 'copa'::text) OR (teams = ANY (ARRAY[4, 8, 16])))),
    CONSTRAINT chk_grupos_multiple_of_four CHECK (((type <> 'grupos'::text) OR ((teams % 4) = 0))),
    CONSTRAINT chk_legs_only_liga CHECK (((type = 'liga'::text) OR (legs = 1))),
    CONSTRAINT tournaments_fee_amount_cents_check CHECK (((fee_amount_cents IS NULL) OR (fee_amount_cents >= 0))),
    CONSTRAINT tournaments_final_format_check CHECK ((final_format = ANY (ARRAY['top4'::text, 'top2'::text, 'none'::text]))),
    CONSTRAINT tournaments_final_legs_check CHECK ((final_legs = ANY (ARRAY[1, 2]))),
    CONSTRAINT tournaments_game_check CHECK (((char_length(game) >= 1) AND (char_length(game) <= 40))),
    CONSTRAINT tournaments_group_legs_check CHECK ((group_legs = ANY (ARRAY[1, 2]))),
    CONSTRAINT tournaments_id_check CHECK ((id ~ '^[A-Z0-9]{3}-[0-9]{4}$'::text)),
    CONSTRAINT tournaments_legs_check CHECK ((legs = ANY (ARRAY[1, 2]))),
    CONSTRAINT tournaments_mode_check CHECK ((mode = ANY (ARRAY['online'::text, 'offline'::text]))),
    CONSTRAINT tournaments_name_check CHECK (((char_length(name) >= 1) AND (char_length(name) <= 80))),
    CONSTRAINT tournaments_semi_legs_check CHECK ((semi_legs = ANY (ARRAY[1, 2]))),
    CONSTRAINT tournaments_teams_check CHECK (((teams >= 3) AND (teams <= 20))),
    CONSTRAINT tournaments_type_check CHECK ((type = ANY (ARRAY['liga'::text, 'copa'::text, 'grupos'::text])))
);

ALTER TABLE ONLY public.tournaments REPLICA IDENTITY FULL;


--
-- Name: device_push_tokens device_push_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_push_tokens
    ADD CONSTRAINT device_push_tokens_pkey PRIMARY KEY (id);


--
-- Name: device_push_tokens device_push_tokens_profile_id_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_push_tokens
    ADD CONSTRAINT device_push_tokens_profile_id_token_key UNIQUE (profile_id, token);


--
-- Name: group_members group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_pkey PRIMARY KEY (group_id, profile_id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: groups groups_tournament_id_letter_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_tournament_id_letter_key UNIQUE (tournament_id, letter);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: mutation_log mutation_log_client_id_client_seq_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mutation_log
    ADD CONSTRAINT mutation_log_client_id_client_seq_key UNIQUE (client_id, client_seq);


--
-- Name: mutation_log mutation_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mutation_log
    ADD CONSTRAINT mutation_log_pkey PRIMARY KEY (id);


--
-- Name: notification_prefs notification_prefs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_prefs
    ADD CONSTRAINT notification_prefs_pkey PRIMARY KEY (profile_id, category);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: tournament_members tournament_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_members
    ADD CONSTRAINT tournament_members_pkey PRIMARY KEY (id);


--
-- Name: tournament_members tournament_members_tournament_id_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_members
    ADD CONSTRAINT tournament_members_tournament_id_profile_id_key UNIQUE (tournament_id, profile_id);


--
-- Name: tournaments tournaments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_pkey PRIMARY KEY (id);


--
-- Name: idx_matches_bracket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_bracket ON public.matches USING btree (tournament_id, bracket_round) WHERE (stage = 'bracket'::text);


--
-- Name: idx_matches_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_group ON public.matches USING btree (group_id) WHERE (group_id IS NOT NULL);


--
-- Name: idx_matches_tournament; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_tournament ON public.matches USING btree (tournament_id);


--
-- Name: idx_members_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_members_profile ON public.tournament_members USING btree (profile_id);


--
-- Name: idx_members_tournament; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_members_tournament ON public.tournament_members USING btree (tournament_id);


--
-- Name: idx_tournaments_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournaments_created_by ON public.tournaments USING btree (created_by);


--
-- Name: uq_profiles_nickname_ci; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_profiles_nickname_ci ON public.profiles USING btree (lower(nickname));


--
-- Name: matches trg_matches_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: profiles trg_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: tournaments trg_tournaments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tournaments_updated_at BEFORE UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: device_push_tokens device_push_tokens_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_push_tokens
    ADD CONSTRAINT device_push_tokens_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: group_members group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_members group_members_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id);


--
-- Name: groups groups_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: matches matches_bye_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_bye_profile_id_fkey FOREIGN KEY (bye_profile_id) REFERENCES public.profiles(id);


--
-- Name: matches matches_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);


--
-- Name: matches matches_side_a_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_side_a_profile_id_fkey FOREIGN KEY (side_a_profile_id) REFERENCES public.profiles(id);


--
-- Name: matches matches_side_b_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_side_b_profile_id_fkey FOREIGN KEY (side_b_profile_id) REFERENCES public.profiles(id);


--
-- Name: matches matches_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: mutation_log mutation_log_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mutation_log
    ADD CONSTRAINT mutation_log_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id);


--
-- Name: mutation_log mutation_log_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mutation_log
    ADD CONSTRAINT mutation_log_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id);


--
-- Name: notification_prefs notification_prefs_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_prefs
    ADD CONSTRAINT notification_prefs_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: tournament_members tournament_members_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_members
    ADD CONSTRAINT tournament_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id);


--
-- Name: tournament_members tournament_members_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_members
    ADD CONSTRAINT tournament_members_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: tournaments tournaments_champion_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_champion_profile_id_fkey FOREIGN KEY (champion_profile_id) REFERENCES public.profiles(id);


--
-- Name: tournaments tournaments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: device_push_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: group_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

--
-- Name: group_members group_members_select_member; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_members_select_member ON public.group_members FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.groups g
  WHERE ((g.id = group_members.group_id) AND public.is_member_of(g.tournament_id)))));


--
-- Name: groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

--
-- Name: groups groups_select_member; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY groups_select_member ON public.groups FOR SELECT USING (public.is_member_of(tournament_id));


--
-- Name: matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

--
-- Name: matches matches_select_member; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY matches_select_member ON public.matches FOR SELECT USING (public.is_member_of(tournament_id));


--
-- Name: tournament_members members_select_same_tournament; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY members_select_same_tournament ON public.tournament_members FOR SELECT USING (public.is_member_of(tournament_id));


--
-- Name: mutation_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mutation_log ENABLE ROW LEVEL SECURITY;

--
-- Name: mutation_log mutation_log_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mutation_log_select_own ON public.mutation_log FOR SELECT USING ((profile_id = auth.uid()));


--
-- Name: notification_prefs notif_prefs_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notif_prefs_own ON public.notification_prefs USING ((profile_id = auth.uid())) WITH CHECK ((profile_id = auth.uid()));


--
-- Name: notification_prefs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (((id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM (public.tournament_members m1
     JOIN public.tournament_members m2 ON ((m1.tournament_id = m2.tournament_id)))
  WHERE ((m1.profile_id = auth.uid()) AND (m2.profile_id = profiles.id))))));


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING ((id = auth.uid()));


--
-- Name: device_push_tokens push_tokens_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY push_tokens_own ON public.device_push_tokens USING ((profile_id = auth.uid())) WITH CHECK ((profile_id = auth.uid()));


--
-- Name: tournament_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tournament_members ENABLE ROW LEVEL SECURITY;

--
-- Name: tournaments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

--
-- Name: tournaments tournaments_select_member; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tournaments_select_member ON public.tournaments FOR SELECT USING (public.is_member_of(id));


--
-- PostgreSQL database dump complete
--

