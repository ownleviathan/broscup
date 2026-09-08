-- Migration: 20260907203000_admin_players_and_invites.sql
-- 1. Add is_blocked column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;

-- 2. Update get_all_tournaments_admin to include creator_name
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
      'champion_name', (select p.nickname from public.profiles p where p.id = t.champion_profile_id),
      'creator_name', coalesce((select p.nickname from public.profiles p where p.id = t.created_by), 'Creador desconocido')
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

-- 3. Superadmin RPC: get_all_players_admin
CREATE OR REPLACE FUNCTION public.get_all_players_admin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  caller uuid := auth.uid();
  caller_email text;
  v_players jsonb;
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
      'id', p.id,
      'nickname', p.nickname,
      'email', coalesce(u.email, 'Sin correo (presencial)'),
      'is_blocked', coalesce(p.is_blocked, false),
      'created_at', p.created_at,
      'tournaments', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'tournament_id', t.id,
            'tournament_name', t.name,
            'role', tm.role,
            'paid', tm.paid,
            'closed', t.closed,
            'type', t.type,
            'team_name', tm.team_name,
            'joined_at', tm.joined_at
          ) order by tm.joined_at desc
        )
        from public.tournament_members tm
        join public.tournaments t on t.id = tm.tournament_id
        where tm.profile_id = p.id
      ), '[]'::jsonb)
    ) order by p.created_at desc
  ), '[]'::jsonb)
  into v_players
  from public.profiles p
  left join auth.users u on u.id = p.id;

  return v_players;
end;
$function$;

GRANT EXECUTE ON FUNCTION public.get_all_players_admin() TO authenticated;

-- 4. Superadmin RPC: admin_remove_player_from_tournament
CREATE OR REPLACE FUNCTION public.admin_remove_player_from_tournament(
  p_tournament_id text,
  p_profile_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  caller uuid := auth.uid();
  caller_email text;
begin
  if caller is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select email into caller_email from auth.users where id = caller;
  if caller_email is null or lower(caller_email) <> 'test@broscup.com' then
    raise exception 'not_authorized: superadmin only' using errcode = '42501';
  end if;

  -- Delete from tournament_members
  delete from public.tournament_members
  where tournament_id = p_tournament_id and profile_id = p_profile_id;

  -- Delete from group_members if applicable
  delete from public.group_members
  where profile_id = p_profile_id
    and group_id in (select id from public.groups where tournament_id = p_tournament_id);

  return jsonb_build_object('success', true, 'tournament_id', p_tournament_id, 'profile_id', p_profile_id);
end;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_remove_player_from_tournament(text, uuid) TO authenticated;

-- 5. Superadmin RPC: admin_toggle_block_player
CREATE OR REPLACE FUNCTION public.admin_toggle_block_player(
  p_profile_id uuid,
  p_blocked boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  caller uuid := auth.uid();
  caller_email text;
begin
  if caller is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select email into caller_email from auth.users where id = caller;
  if caller_email is null or lower(caller_email) <> 'test@broscup.com' then
    raise exception 'not_authorized: superadmin only' using errcode = '42501';
  end if;

  update public.profiles
  set is_blocked = p_blocked,
      updated_at = now()
  where id = p_profile_id;

  return jsonb_build_object('success', true, 'profile_id', p_profile_id, 'is_blocked', p_blocked);
end;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_toggle_block_player(uuid, boolean) TO authenticated;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
