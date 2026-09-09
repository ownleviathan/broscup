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

NOTIFY pgrst, 'reload schema';
