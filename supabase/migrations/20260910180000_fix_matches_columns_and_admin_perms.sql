-- Migration: 20260910180000_fix_matches_columns_and_admin_perms.sql

-- 1. Add missing last_client_id and last_client_seq to matches table
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS last_client_id uuid;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS last_client_seq bigint;

-- 1b. Allow cup/groups tournaments to have 2-leg earlier rounds
ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS chk_legs_only_liga;

-- 2. Update simulate_remaining_members to allow admin, ayudante, tournament creator, OR superadmin (test@broscup.com)
CREATE OR REPLACE FUNCTION public.simulate_remaining_members(p_tournament_id text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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
    select (lower(email) = 'test@broscup.com') into can_manage from auth.users where id = caller;
  end if;
  if not coalesce(can_manage, false) then
    select (created_by = caller) into can_manage from public.tournaments where id = p_tournament_id;
  end if;

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
      seed_ids := array[]::uuid[];
      for g in 0 .. group_count - 1 loop
        seed_ids := seed_ids || null::uuid;
        seed_labels := seed_labels || ('1º ' || letters[g + 1]);
        seed_ids := seed_ids || null::uuid;
        seed_labels := seed_labels || ('2º ' || letters[(g + 1) % group_count + 1]);
      end loop;

      perform public.generate_bracket(p_tournament_id, seed_ids, seed_labels);
    end;
  end if;

  return jsonb_build_object(
    'success', true,
    'tournamentId', p_tournament_id,
    'added', needed,
    'total', member_count + needed
  );
end;
$$;

GRANT EXECUTE ON FUNCTION public.simulate_remaining_members(text) TO authenticated;

-- 3. Update start_playoff to allow admin, ayudante, tournament creator, OR superadmin (test@broscup.com)
CREATE OR REPLACE FUNCTION public.start_playoff(p_tournament_id text) RETURNS jsonb
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
  is_superadmin boolean := false;
begin
  if caller is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into t from public.tournaments where id = p_tournament_id and closed = false;
  if t.id is null then
    raise exception 'tournament_not_found' using errcode = 'P0002';
  end if;

  select exists(select 1 from auth.users where id = caller and lower(email) = 'test@broscup.com') into is_superadmin;

  select role into caller_role from public.tournament_members
    where tournament_id = p_tournament_id and profile_id = caller;

  if (caller_role is null or caller_role not in ('admin', 'ayudante'))
     and not is_superadmin
     and (t.created_by is distinct from caller) then
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

GRANT EXECUTE ON FUNCTION public.start_playoff(text) TO authenticated;

-- 4. Update apply_match_score to allow test@broscup.com and creator as well
CREATE OR REPLACE FUNCTION public.apply_match_score(
    p_match_id uuid,
    p_score_a integer,
    p_score_b integer,
    p_score_a_leg2 integer DEFAULT NULL::integer,
    p_score_b_leg2 integer DEFAULT NULL::integer,
    p_client_id uuid DEFAULT NULL::uuid,
    p_client_seq bigint DEFAULT NULL::bigint,
    p_penalty_winner text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  caller uuid := auth.uid();
  caller_role text;
  m public.matches;
  t public.tournaments;
  v_played boolean;
  is_superadmin boolean := false;
begin
  if caller is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into m from public.matches where id = p_match_id;
  if m.id is null then
    raise exception 'match_not_found' using errcode = 'P0002';
  end if;

  select * into t from public.tournaments where id = m.tournament_id;

  select exists(select 1 from auth.users where id = caller and lower(email) = 'test@broscup.com') into is_superadmin;

  select role into caller_role from public.tournament_members
    where tournament_id = m.tournament_id and profile_id = caller;

  -- Allow tournament admin/ayudante, either match participant, tournament creator, OR superadmin
  if (caller_role is null or caller_role not in ('admin', 'ayudante'))
     and (m.side_a_profile_id is null or m.side_a_profile_id <> caller)
     and (m.side_b_profile_id is null or m.side_b_profile_id <> caller)
     and not is_superadmin
     and (t.created_by is distinct from caller) then
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
        and bm.side_a_label = (case when sub.pos = 1 then '1º ' else '2º ' end || sub.letter);

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
        and bm.side_b_label = (case when sub.pos = 1 then '1º ' else '2º ' end || sub.letter);
    end if;
  end if;

  return jsonb_build_object(
    'matchId', p_match_id,
    'played', v_played,
    'appliedAt', now()
  );
end;
$function$;

-- 5. Update close_tournament to allow admin, tournament creator, OR superadmin (test@broscup.com)
CREATE OR REPLACE FUNCTION public.close_tournament(p_tournament_id text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
  caller_role text;
  final_match public.matches;
  agg record;
  champion uuid;
  is_superadmin boolean := false;
  t public.tournaments;
begin
  if caller is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into t from public.tournaments where id = p_tournament_id;
  if t.id is null then
    raise exception 'tournament_not_found' using errcode = 'P0002';
  end if;

  select exists(select 1 from auth.users where id = caller and lower(email) = 'test@broscup.com') into is_superadmin;

  select role into caller_role from public.tournament_members
    where tournament_id = p_tournament_id and profile_id = caller;

  if caller_role is distinct from 'admin'
     and not is_superadmin
     and (t.created_by is distinct from caller) then
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

GRANT EXECUTE ON FUNCTION public.close_tournament(text) TO authenticated;

-- 6. Update join_tournament to use generate_bracket instead of non-existent generate_bracket_from_groups
CREATE OR REPLACE FUNCTION public.join_tournament(
  p_tournament_id text,
  p_team_name text DEFAULT NULL::text
) RETURNS jsonb
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
  clean_id text;
  caller_nick text;
begin
  if caller is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  clean_id := upper(trim(p_tournament_id));

  -- Ensure caller profile exists to satisfy foreign key constraint tournament_members_profile_id_fkey
  if not exists (select 1 from public.profiles where id = caller) then
    select coalesce(
      (select raw_user_meta_data->>'nickname' from auth.users where id = caller),
      split_part((select email from auth.users where id = caller), '@', 1),
      'jugador'
    ) into caller_nick;

    insert into public.profiles (id, nickname, nickname_confirmed)
    values (caller, caller_nick || '_' || substr(caller::text, 1, 4), false)
    on conflict (id) do nothing;
  end if;

  select * into t from public.tournaments
    where (id = clean_id or id = trim(p_tournament_id)) and closed = false;

  if t.id is null then
    raise exception 'tournament_not_found' using errcode = 'P0002';
  end if;

  select exists(
    select 1 from public.tournament_members
    where tournament_id = t.id and profile_id = caller
  ) into already_member;

  if already_member then
    return jsonb_build_object('tournamentId', t.id, 'already_member', true, 'full', false);
  end if;

  select count(*) into member_count
    from public.tournament_members
    where tournament_id = t.id;

  if member_count >= t.teams then
    raise exception 'tournament_full' using errcode = 'P0001';
  end if;

  insert into public.tournament_members (tournament_id, profile_id, role, paid, team_name)
    values (t.id, caller, 'jugador', false, nullif(trim(p_team_name), ''));

  member_count := member_count + 1;

  if member_count = t.teams then
    select array_agg(profile_id order by joined_at) into participant_ids
      from public.tournament_members where tournament_id = t.id;

    if t.type = 'liga' then
      perform public.generate_round_robin(t.id, participant_ids, t.legs, 'league');
    elsif t.type = 'copa' then
      seed_labels := array_fill(null::text, array[array_length(participant_ids, 1)]);
      perform public.generate_bracket(t.id, participant_ids, seed_labels);
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
          from public.tournament_members where tournament_id = t.id;

        for g in 0..(group_count - 1) loop
          letter := chr(65 + g);
          letters := array_append(letters, letter);
          insert into public.groups (tournament_id, letter)
            values (t.id, letter)
            returning id into gid;

          group_participants := shuffled[(g * 4 + 1):(g * 4 + 4)];

          insert into public.group_members (group_id, profile_id)
            select gid, unnest(group_participants);

          perform public.generate_round_robin(t.id, group_participants, coalesce(t.group_legs, 1), 'group', gid);
        end loop;

        seed_labels := array[]::text[];
        seed_ids := array[]::uuid[];
        for g in 0 .. group_count - 1 loop
          seed_ids := seed_ids || null::uuid;
          seed_labels := seed_labels || ('1º ' || letters[g + 1]);
          seed_ids := seed_ids || null::uuid;
          seed_labels := seed_labels || ('2º ' || letters[(g + 1) % group_count + 1]);
        end loop;

        perform public.generate_bracket(t.id, seed_ids, seed_labels);
      end;
    end if;
  end if;

  return jsonb_build_object('tournamentId', t.id, 'already_member', false, 'full', member_count = t.teams);
end;
$$;

GRANT EXECUTE ON FUNCTION public.join_tournament(text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
