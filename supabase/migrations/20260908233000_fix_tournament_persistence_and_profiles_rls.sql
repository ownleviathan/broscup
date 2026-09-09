-- Migration: 20260908233000_fix_tournament_persistence_and_profiles_rls.sql
-- 1. Ensure authenticated users can insert their own profile row (required for upsert and initial setup)
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- 2. Update create_tournament to guarantee caller profile exists before foreign keys are validated
CREATE OR REPLACE FUNCTION public.create_tournament(
  p_name text,
  p_game text,
  p_start_date date,
  p_type text,
  p_teams integer,
  p_fee_on boolean,
  p_fee_amount_cents integer,
  p_final_format text,
  p_legs integer,
  p_semi_legs integer,
  p_final_legs integer,
  p_team_name text DEFAULT NULL::text,
  p_mode text DEFAULT 'online'::text,
  p_group_legs integer DEFAULT 1
) RETURNS jsonb
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
  caller_nick text;
begin
  if caller is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  -- Ensure caller profile exists to satisfy foreign key constraints (created_by and tournament_members.profile_id)
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

GRANT EXECUTE ON FUNCTION public.create_tournament(text, text, date, text, integer, boolean, integer, text, integer, integer, integer, text, text, integer) TO authenticated;

-- 3. Update join_tournament to support case-insensitive/trimmed ID and guarantee caller profile exists
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

        seed_ids := array_fill(null::uuid, array[group_count * 2]);
        perform public.generate_bracket_from_groups(t.id, seed_ids, letters, t.final_format);
      end;
    end if;
  end if;

  return jsonb_build_object('tournamentId', t.id, 'already_member', false, 'full', member_count = t.teams);
end;
$$;

GRANT EXECUTE ON FUNCTION public.join_tournament(text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
