export type TournamentType = 'liga' | 'copa' | 'grupos';
export type FinalsType = 'top4' | 'top2' | 'none';
export type MemberRole = 'admin' | 'ayudante' | 'jugador';

export interface Member {
  nick: string;
  role: MemberRole;
  paid: boolean;
  profileId?: string;
  teamName?: string;
}

export interface Match {
  id: string;
  jornada?: number;
  a: string;
  b: string;
  sa: number | null;
  sb: number | null;
  s2a?: number | null;
  s2b?: number | null;
  legs?: number;
  played: boolean;
  bye?: string | null;
  penaltyWinner?: 'a' | 'b' | null;
  sideAProfileId?: string;
  sideBProfileId?: string;
}

export interface Round {
  name: string;
  matches: Match[];
}

export interface TournamentGroup {
  name: string;
  letter: string;
  nicks: string[];
  matches: Match[];
}

export interface Tournament {
  id: string;
  name: string;
  game: string;
  date: string;
  type: TournamentType;
  teams: number;
  finals?: FinalsType;
  legs?: number;
  semiLegs?: number;
  finalLegs?: number;
  groupLegs?: number;
  feeOn: boolean;
  fee?: string;
  closed: boolean;
  mode?: 'online' | 'offline';
  champ?: string;
  members: Member[];
  matches: Match[];
  rounds?: Round[];
  groups?: TournamentGroup[];
}

export interface StandingRow {
  pos: number;
  nick: string;
  pj: number;
  gf: number;
  gc: number;
  dg: string;
  pts: number;
}

export type Language = 'es' | 'en';

export type ScreenType =
  | 'auth'
  | 'signup'
  | 'nickname'
  | 'dash'
  | 'create'
  | 'created'
  | 'join'
  | 'tour'
  | 'history'
  | 'profile'
  | 'admin-all';

export interface AdminTournamentSummary {
  id: string;
  name: string;
  game: string;
  type: TournamentType;
  teams: number;
  closed: boolean;
  mode: 'online' | 'offline';
  created_at: string;
  start_date?: string;
  member_count: number;
  total_matches: number;
  played_matches: number;
  champion_name?: string;
}

export type TournamentTab = 'tabla' | 'partidos' | 'bracket' | 'gente';

export interface FormState {
  step: number;
  name: string;
  game: string;
  date: string;
  feeOn: boolean;
  fee: string;
  teams: number;
  type: TournamentType | '';
  finals: FinalsType;
  legs: number;
  semiLegs: number;
  finalLegs: number;
  groupLegs?: number;
  teamName?: string;
  mode?: 'online' | 'offline';
}

export type { StringsDict } from '../data/strings';
