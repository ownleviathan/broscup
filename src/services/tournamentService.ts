import { supabase } from './supabase';
import {
  Tournament,
  Match,
  Round,
  TournamentGroup,
  Member,
  FormState,
  AdminTournamentSummary,
  AdminPlayerSummary
} from '../types/tournament';

// Helper to extract nickname from Supabase join whether object or array
export function extractNickname(prof: any): string | undefined {
  if (!prof) return undefined;
  if (Array.isArray(prof)) return prof[0]?.nickname;
  if (typeof prof === 'object') return prof.nickname;
  return undefined;
}

// Helper to construct a unified Tournament model from DB rows
export function mapSingleTournament(
  t: any,
  allMembers: any[],
  allMatches: any[],
  allGroups: any[],
  champNickname?: string
): Tournament {
  // Map members
  const members: Member[] = (allMembers || [])
    .filter((m) => m.tournament_id === t.id)
    .map((m) => ({
      nick: extractNickname(m.profiles) || 'Jugador',
      role: m.role,
      paid: m.paid,
      profileId: m.profile_id,
      teamName: m.team_name || undefined
    }));

  // Map raw matches
  const tMatches = (allMatches || []).filter((m) => m.tournament_id === t.id);

  const parsedMatches: Match[] = tMatches.map((m) => {
    const aNick = extractNickname(m.side_a) || m.side_a_label || '';
    const bNick = extractNickname(m.side_b) || m.side_b_label || '';
    const byeNick = extractNickname(m.bye) || null;

    return {
      id: m.id,
      jornada: m.jornada || undefined,
      a: aNick,
      b: bNick,
      sa: m.score_a,
      sb: m.score_b,
      s2a: m.score_a_leg2,
      s2b: m.score_b_leg2,
      legs: m.legs,
      played: m.played,
      bye: byeNick,
      penaltyWinner: (m.penalty_winner as 'a' | 'b') || null,
      sideAProfileId: m.side_a_profile_id,
      sideBProfileId: m.side_b_profile_id
    };
  });

  // Map rounds (for bracket)
  const bracketMatches = tMatches.filter((m) => m.stage === 'bracket');
  let rounds: Round[] | undefined;
  if (bracketMatches.length > 0) {
    const roundMap: Record<number, { name: string; matches: Match[] }> = {};
    bracketMatches.forEach((m) => {
      const rIdx = m.bracket_round || 0;
      if (!roundMap[rIdx]) {
        roundMap[rIdx] = {
          name: m.bracket_round_name || 'Ronda',
          matches: []
        };
      }
      const posA = (m.bracket_position || 0) * 2 + 1;
      const posB = (m.bracket_position || 0) * 2 + 2;
      const aNick =
        extractNickname(m.side_a) ||
        m.side_a_label ||
        `Ganador ${posA}`;
      const bNick =
        extractNickname(m.side_b) ||
        m.side_b_label ||
        `Ganador ${posB}`;

      roundMap[rIdx].matches.push({
        id: m.id,
        a: aNick,
        b: bNick,
        sa: m.score_a,
        sb: m.score_b,
        s2a: m.score_a_leg2,
        s2b: m.score_b_leg2,
        legs: m.legs,
        played: m.played,
        penaltyWinner: (m.penalty_winner as 'a' | 'b') || null,
        sideAProfileId: m.side_a_profile_id,
        sideBProfileId: m.side_b_profile_id
      });
    });

    rounds = Object.keys(roundMap)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => roundMap[Number(k)]);
  }

  // Map groups
  const tGroups = (allGroups || []).filter((g) => g.tournament_id === t.id);
  let groups: TournamentGroup[] | undefined;
  if (tGroups.length > 0) {
    groups = tGroups.map((g) => {
      const groupMatches = tMatches.filter((m) => m.group_id === g.id);
      const nicksSet = new Set<string>();
      groupMatches.forEach((m) => {
        const a = extractNickname(m.side_a);
        const b = extractNickname(m.side_b);
        if (a) nicksSet.add(a);
        if (b) nicksSet.add(b);
      });

      return {
        name: `Grupo ${g.letter}`,
        letter: g.letter,
        nicks: Array.from(nicksSet),
        matches: groupMatches.map((m) => ({
          id: m.id,
          jornada: m.jornada || undefined,
          a: extractNickname(m.side_a) || '',
          b: extractNickname(m.side_b) || '',
          sa: m.score_a,
          sb: m.score_b,
          s2a: m.score_a_leg2,
          s2b: m.score_b_leg2,
          legs: m.legs,
          played: m.played,
          penaltyWinner: (m.penalty_winner as 'a' | 'b') || null,
          sideAProfileId: m.side_a_profile_id,
          sideBProfileId: m.side_b_profile_id
        }))
      };
    });
  }

  const feeFormatted = t.fee_amount_cents
    ? `${(t.fee_amount_cents / 100).toFixed(0)} €`
    : '0 €';

  return {
    id: t.id,
    name: t.name,
    game: t.game,
    date: t.start_date || '',
    type: t.type,
    teams: t.teams,
    finals: t.final_format,
    legs: t.legs,
    semiLegs: t.semi_legs,
    finalLegs: t.final_legs,
    groupLegs: t.group_legs || 1,
    feeOn: t.fee_on,
    fee: feeFormatted,
    closed: t.closed,
    started: t.started !== undefined ? Boolean(t.started) : (t.type === 'liga' ? parsedMatches.length > 0 : true),
    mode: (t.mode as 'online' | 'offline') || 'online',
    champ: champNickname,
    createdBy: t.created_by,
    members,
    matches: parsedMatches.filter((m) => !bracketMatches.some((bm) => bm.id === m.id)),
    rounds,
    groups
  };
}

export const tournamentService = {
  // 1. Fetch all tournaments where user is a member
  async fetchUserTournaments(userId?: string): Promise<Tournament[]> {
    let query = supabase.from('tournament_members').select('tournament_id');
    if (userId) {
      query = query.eq('profile_id', userId);
    }
    const { data: memberRows, error: mError } = await query;

    if (mError) throw mError;
    if (!memberRows || memberRows.length === 0) return [];

    const tourIds = [...new Set(memberRows.map((r) => r.tournament_id))];

    // Fetch tournament rows
    const { data: tourRows, error: tError } = await supabase
      .from('tournaments')
      .select('*')
      .in('id', tourIds);

    if (tError) throw tError;
    if (!tourRows) return [];

    // Fetch all members for these tournaments with profile nicknames
    const { data: allMembers, error: memError } = await supabase
      .from('tournament_members')
      .select('tournament_id, profile_id, role, paid, team_name, profiles(nickname)')
      .in('tournament_id', tourIds);

    if (memError) throw memError;

    // Fetch all matches for these tournaments with profile nicknames
    const { data: allMatches, error: matchError } = await supabase
      .from('matches')
      .select(
        `id, tournament_id, stage, jornada, group_id, bracket_round, bracket_round_name, bracket_position,
         side_a_profile_id, side_b_profile_id,
         side_a_label, side_b_label, score_a, score_b, score_a_leg2, score_b_leg2, legs, played, penalty_winner,
         side_a:profiles!matches_side_a_profile_id_fkey(nickname),
         side_b:profiles!matches_side_b_profile_id_fkey(nickname),
         bye:profiles!matches_bye_profile_id_fkey(nickname)`
      )
      .in('tournament_id', tourIds)
      .order('jornada', { ascending: true })
      .order('bracket_round', { ascending: true })
      .order('bracket_position', { ascending: true });

    if (matchError) throw matchError;

    // Fetch groups
    const { data: allGroups } = await supabase
      .from('groups')
      .select('id, tournament_id, letter')
      .in('tournament_id', tourIds)
      .order('letter', { ascending: true });

    // Fetch champions nicknames
    const champIds = tourRows.map((t) => t.champion_profile_id).filter(Boolean);
    const champMap: Record<string, string> = {};
    if (champIds.length > 0) {
      const { data: champProfiles } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', champIds);
      if (champProfiles) {
        champProfiles.forEach((p) => {
          champMap[p.id] = p.nickname;
        });
      }
    }

    // Build tournament models
    return tourRows.map((t) =>
      mapSingleTournament(
        t,
        allMembers || [],
        allMatches || [],
        allGroups || [],
        t.champion_profile_id ? champMap[t.champion_profile_id] : undefined
      )
    );
  },

  // Fetch tournament in public / guest mode
  async fetchPublicTournament(tournamentId: string): Promise<Tournament | null> {
    const { data, error } = await supabase.rpc('get_tournament_public', {
      p_tournament_id: tournamentId
    });

    if (error) throw error;
    if (!data || !data.tournament) return null;

    return mapSingleTournament(
      data.tournament,
      data.members || [],
      data.matches || [],
      data.groups || [],
      data.champion_nickname || undefined
    );
  },

  // Fetch all tournaments for superadmin test@broscup.com
  async fetchAllTournamentsAdmin(
    filter: 'all' | 'active' | 'archived' = 'all'
  ): Promise<AdminTournamentSummary[]> {
    const { data, error } = await supabase.rpc('get_all_tournaments_admin', {
      p_filter: filter
    });

    if (error) throw error;
    return (data as AdminTournamentSummary[]) || [];
  },

  // Fetch all players for superadmin test@broscup.com
  async fetchAllPlayersAdmin(): Promise<AdminPlayerSummary[]> {
    const { data, error } = await supabase.rpc('get_all_players_admin');
    if (error) throw error;
    return (data as AdminPlayerSummary[]) || [];
  },

  // Admin remove a player from a tournament
  async adminRemovePlayerFromTournament(tournamentId: string, profileId: string) {
    const { data, error } = await supabase.rpc('admin_remove_player_from_tournament', {
      p_tournament_id: tournamentId,
      p_profile_id: profileId
    });
    if (error) throw error;
    return data;
  },

  // Admin block/unblock a player
  async adminToggleBlockPlayer(profileId: string, blocked: boolean) {
    const { data, error } = await supabase.rpc('admin_toggle_block_player', {
      p_profile_id: profileId,
      p_blocked: blocked
    });
    if (error) throw error;
    return data;
  },

  // 2. Search open tournament by ID or name
  async searchOpenTournament(query: string) {
    const { data, error } = await supabase.rpc('find_open_tournament', { p_query: query });
    if (error) throw error;
    return (data as Array<{
      id: string;
      name: string;
      game: string;
      type: string;
      teams: number;
      fee_on: boolean;
      fee_amount_cents: number | null;
      closed: boolean;
      member_count: number;
    }>)?.[0] || null;
  },

  // 3. Create tournament via RPC
  async createTournament(form: FormState) {
    const feeCents = form.feeOn
      ? Math.round(parseFloat(form.fee.replace(/[^0-9.]/g, '') || '0') * 100)
      : null;

    const { data, error } = await supabase.rpc('create_tournament', {
      p_name: form.name.trim(),
      p_game: form.game.trim(),
      p_start_date: form.date || null,
      p_type: form.type,
      p_teams: Number(form.teams),
      p_fee_on: form.feeOn,
      p_fee_amount_cents: feeCents,
      p_final_format: form.finals,
      p_legs: Number(form.legs || 1),
      p_semi_legs: Number(form.semiLegs || 1),
      p_final_legs: Number(form.finalLegs || 1),
      p_team_name: form.teamName?.trim() || null,
      p_mode: form.mode || 'online',
      p_group_legs: Number(form.groupLegs || 1)
    });

    if (error) throw error;
    return data as { id: string; name: string; game: string; type: string };
  },

  // 4. Join tournament via RPC
  async joinTournament(tournamentId: string, teamName?: string) {
    const { data, error } = await supabase.rpc('join_tournament', {
      p_tournament_id: tournamentId,
      p_team_name: teamName?.trim() || null
    });
    if (error) throw error;
    return data as { tournamentId: string; full: boolean; already_member?: boolean };
  },

  // 4b. Add offline member via RPC
  async addOfflineMember(tournamentId: string, nickname: string, teamName?: string) {
    const { data, error } = await supabase.rpc('add_offline_member', {
      p_tournament_id: tournamentId,
      p_nickname: nickname.trim(),
      p_team_name: teamName?.trim() || null
    });
    if (error) throw error;
    return data as { success: boolean; tournamentId: string; profileId: string; nickname: string; teamName?: string; full: boolean };
  },

  // 5. Save match score via RPC
  async saveMatchScore(
    matchId: string,
    sa: number,
    sb: number,
    s2a?: number,
    s2b?: number,
    penaltyWinner?: 'a' | 'b' | null
  ) {
    // If matchId is not a valid UUID (e.g. offline or local fallback like 'l0-0' or 'b0-0'), keep local
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matchId);
    if (!isUuid) {
      return null;
    }

    const { data, error } = await supabase.rpc('apply_match_score', {
      p_match_id: matchId,
      p_score_a: sa,
      p_score_b: sb,
      p_score_a_leg2: s2a ?? null,
      p_score_b_leg2: s2b ?? null,
      p_penalty_winner: penaltyWinner || null,
      p_client_id: crypto.randomUUID(),
      p_client_seq: Date.now()
    });

    if (error) throw error;
    return data;
  },

  // 6. Start playoff via RPC
  async startPlayoff(tournamentId: string) {
    const { data, error } = await supabase.rpc('start_playoff', {
      p_tournament_id: tournamentId
    });
    if (error) throw error;
    return data;
  },

  // 7. Close tournament via RPC
  async closeTournament(tournamentId: string) {
    const { data, error } = await supabase.rpc('close_tournament', {
      p_tournament_id: tournamentId
    });
    if (error) throw error;
    return data;
  },

  // 8. Rename tournament via RPC
  async renameTournament(tournamentId: string, newName: string) {
    const { data, error } = await supabase.rpc('rename_tournament', {
      p_tournament_id: tournamentId,
      p_name: newName
    });
    if (error) throw error;
    return data;
  },

  // 9. Member actions via RPC
  async toggleHelper(tournamentId: string, profileId: string) {
    const { data, error } = await supabase.rpc('toggle_helper_role', {
      p_tournament_id: tournamentId,
      p_profile_id: profileId
    });
    if (error) throw error;
    return data;
  },

  async togglePaid(tournamentId: string, profileId: string) {
    const { data, error } = await supabase.rpc('toggle_member_paid', {
      p_tournament_id: tournamentId,
      p_profile_id: profileId
    });
    if (error) throw error;
    return data;
  },

  async removeMember(tournamentId: string, profileId: string) {
    const { data, error } = await supabase.rpc('remove_member', {
      p_tournament_id: tournamentId,
      p_profile_id: profileId
    });
    if (error) throw error;
    return data;
  },

  async leaveTournament(tournamentId: string) {
    const { data, error } = await supabase.rpc('leave_tournament', {
      p_tournament_id: tournamentId
    });
    if (error) throw error;
    return data;
  },

  // 10. Simulate remaining members in database via RPC
  async simulateRemainingMembers(tournamentId: string) {
    const { data, error } = await supabase.rpc('simulate_remaining_members', {
      p_tournament_id: tournamentId
    });
    if (error) throw error;
    return data;
  },

  // 11. Update represented team for member via RPC
  async updateMemberTeam(tournamentId: string, teamName: string) {
    const { data, error } = await supabase.rpc('update_member_team', {
      p_tournament_id: tournamentId,
      p_team_name: teamName.trim()
    });
    if (error) throw error;
    return data;
  }
};
