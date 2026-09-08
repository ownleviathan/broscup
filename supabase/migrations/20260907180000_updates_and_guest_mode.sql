-- Migration: 20260907180000_updates_and_guest_mode.sql
-- 1. Update apply_match_score to allow match participants (side_a or side_b) in addition to admin/ayudante
-- 2. Public read RPC for guest mode: get_tournament_public
-- 3. Superadmin RPC for test@broscup.com: get_all_tournaments_admin
-- 4. Seed test@broscup.com if not exists

-- 1. Update apply_match_score
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

GRANT EXECUTE ON FUNCTION public.apply_match_score TO anon, authenticated;

-- 2. Public read RPC for guest mode: get_tournament_public
CREATE OR REPLACE FUNCTION public.get_tournament_public(p_tournament_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION public.get_tournament_public(text) TO anon, authenticated;

-- 3. Superadmin RPC for test@broscup.com: get_all_tournaments_admin
CREATE OR REPLACE FUNCTION public.get_all_tournaments_admin(p_filter text DEFAULT 'all')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION public.get_all_tournaments_admin(text) TO authenticated;

-- 4. Seed test@broscup.com user if not already existing
DO $$
DECLARE
  v_user_id uuid := '3e617f60-ff3f-42e2-b9e6-a9a9fad59d70'::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test@broscup.com') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      email_change_token_current,
      phone,
      phone_change,
      phone_change_token,
      reauthentication_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'test@broscup.com',
      crypt('1q2w3e4r', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nickname":"AdminBros"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at,
      email
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      format('{"sub": "%s", "email": "test@broscup.com", "nickname": "AdminBros"}', v_user_id)::jsonb,
      'email',
      now(),
      now(),
      now(),
      'test@broscup.com'
    );

    INSERT INTO public.profiles (id, nickname, created_at, updated_at)
    VALUES (v_user_id, 'AdminBros', now(), now())
    ON CONFLICT (id) DO UPDATE SET nickname = 'AdminBros';
  END IF;
END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

