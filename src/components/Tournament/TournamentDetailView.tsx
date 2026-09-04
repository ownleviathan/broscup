import React, { useState } from 'react';
import {
  Tournament,
  TournamentTab,
  Match,
  Member,
  StringsDict
} from '../../types/tournament';
import {
  typeLabel,
  standings,
  rrMatches,
  bracket,
  propagate,
  winnerOf
} from '../../utils/tournamentEngine';
import { tournamentService } from '../../services/tournamentService';
import { StandingsTab } from './StandingsTab';
import { FixturesTab } from './FixturesTab';
import { BracketTab } from './BracketTab';
import { GroupsTab } from './GroupsTab';
import { PeopleTab } from './PeopleTab';
import { ScoreModal } from './ScoreModal';
import { AdminSheet, SheetMode } from './AdminSheet';
import { AddPlayerModal } from './AddPlayerModal';
import { ArrowLeft, Settings, Users, UserPlus, Trophy, BarChart3, Layers } from 'lucide-react';

interface TournamentDetailViewProps {
  tournament: Tournament;
  userNick: string;
  onUpdateTournament: (updated: Tournament) => void;
  onBack: () => void;
  onShowToast: (msg: string) => void;
  L: StringsDict;
  isTablet: boolean;
}

export const TournamentDetailView: React.FC<TournamentDetailViewProps> = ({
  tournament,
  userNick,
  onUpdateTournament,
  onBack,
  onShowToast,
  L,
  isTablet
}) => {
  const [activeTab, setActiveTab] = useState<TournamentTab>('tabla');
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [sheetMode, setSheetMode] = useState<SheetMode | null>(null);
  const [targetMember, setTargetMember] = useState<Member | null>(null);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);

  const myMember = tournament.members.find((p) => p.nick === userNick);
  const myRole = myMember?.role || 'jugador';
  const isAdmin = myRole === 'admin';
  const canManage = isAdmin || myRole === 'ayudante';

  const isWaiting = tournament.members.length < tournament.teams && !tournament.closed;

  // Tabs based on tournament type
  const tabDefs: { key: TournamentTab; label: string }[] = [];
  if (tournament.type === 'liga') {
    tabDefs.push({ key: 'tabla', label: L.tabTable });
    tabDefs.push({ key: 'partidos', label: L.tabMatches });
    if ((tournament.rounds || []).length > 0) {
      tabDefs.push({ key: 'bracket', label: L.tabBracket });
    }
    tabDefs.push({ key: 'gente', label: L.tabPeople });
  } else if (tournament.type === 'copa') {
    tabDefs.push({ key: 'bracket', label: L.tabBracket });
    tabDefs.push({ key: 'gente', label: L.tabPeople });
  } else {
    // Grupos
    tabDefs.push({ key: 'tabla', label: L.tabGroups });
    tabDefs.push({ key: 'partidos', label: L.tabMatches });
    tabDefs.push({ key: 'bracket', label: L.tabBracket });
    tabDefs.push({ key: 'gente', label: L.tabPeople });
  }

  // Simulation handler (fills remaining player slots and builds calendar)
  const handleSimulate = async () => {
    try {
      await tournamentService.simulateRemainingMembers(tournament.id);
      onShowToast(L.tFull);
      const freshTours = await tournamentService.fetchUserTournaments();
      const fresh = freshTours.find((t) => t.id === tournament.id);
      if (fresh) {
        onUpdateTournament(fresh);
        return;
      }
    } catch (err) {
      console.warn('DB simulate failed, using local fallback:', err);
    }

    const pool = [
      'sara.gg', 'mrpato', 'jandro', 'kiki_22', 'tono', 'valen',
      'rmz', 'lolo', 'bruno', 'ceci', 'fer', 'moni', 'zeta__',
      'gigi', 'pau.rl', 'tincho', 'marukk'
    ];

    const updated = { ...tournament };
    const needed = updated.teams - updated.members.length;
    const available = pool.filter((n) => !updated.members.some((m) => m.nick === n));
    const extraMembers: Member[] = available.slice(0, needed).map((n) => ({
      nick: n,
      role: 'jugador',
      paid: !updated.feeOn
    }));

    updated.members = [...updated.members, ...extraMembers];
    const allNicks = updated.members.map((m) => m.nick);

    if (updated.type === 'copa') {
      updated.rounds = bracket(allNicks, L, { legs: updated.legs, semiLegs: updated.semiLegs, finalLegs: updated.finalLegs });
      updated.matches = [];
    } else if (updated.type === 'liga') {
      updated.matches = rrMatches(allNicks, updated.legs || 1);
      updated.rounds = [];
    } else {
      // Grupos
      const numGroups = allNicks.length % 4 === 0 ? allNicks.length / 4 : 2;
      const perGroup = Math.ceil(allNicks.length / numGroups);
      updated.groups = [];

      for (let i = 0; i < allNicks.length; i += perGroup) {
        const letter = String.fromCharCode(65 + updated.groups.length);
        const gNicks = allNicks.slice(i, i + perGroup);
        updated.groups.push({
          name: `${L.group} ${letter}`,
          letter,
          nicks: gNicks,
          matches: rrMatches(gNicks, updated.groupLegs || 1).map((m) => ({ ...m, id: letter + m.id }))
        });
      }
      updated.matches = updated.groups.flatMap((g) => g.matches);
      const letters = updated.groups.map((g) => g.letter);
      const seeds: string[] = [];
      letters.forEach((l, idx) => {
        seeds.push(`1º ${l}`, `2º ${letters[(idx + 1) % letters.length]}`);
      });
      updated.rounds = bracket(seeds, L, { legs: updated.legs, semiLegs: updated.semiLegs, finalLegs: updated.finalLegs });
    }

    onUpdateTournament(updated);
    onShowToast(L.tFull);
  };

  // Add offline member
  const handleAddOfflineMember = async (nickname: string, teamName?: string) => {
    try {
      const res = await tournamentService.addOfflineMember(tournament.id, nickname, teamName);
      const freshTours = await tournamentService.fetchUserTournaments();
      const fresh = freshTours.find((t) => t.id === tournament.id);
      if (fresh) {
        onUpdateTournament(fresh);
      }
      onShowToast(res.full ? '¡Torneo completo! Fixture generado.' : `Jugador "${nickname}" agregado.`);
    } catch (err: any) {
      console.warn('DB addOfflineMember failed, using local fallback:', err);
      // Local fallback for offline mode
      const newMember: Member = {
        nick: nickname,
        role: 'jugador',
        paid: true,
        teamName: teamName || undefined
      };
      const updated: Tournament = {
        ...tournament,
        members: [...tournament.members, newMember]
      };
      if (updated.members.length === updated.teams) {
        const allNicks = updated.members.map((m) => m.nick);
        if (updated.type === 'copa') {
          updated.rounds = bracket(allNicks, L, { legs: updated.legs, semiLegs: updated.semiLegs, finalLegs: updated.finalLegs });
          updated.matches = [];
        } else if (updated.type === 'liga') {
          updated.matches = rrMatches(allNicks, updated.legs || 1);
          updated.rounds = [];
        } else {
          const numGroups = allNicks.length % 4 === 0 ? allNicks.length / 4 : 2;
          const perGroup = Math.ceil(allNicks.length / numGroups);
          updated.groups = [];
          for (let i = 0; i < allNicks.length; i += perGroup) {
            const letter = String.fromCharCode(65 + updated.groups.length);
            const gNicks = allNicks.slice(i, i + perGroup);
            updated.groups.push({
              name: `${L.group} ${letter}`,
              letter,
              nicks: gNicks,
              matches: rrMatches(gNicks, updated.groupLegs || 1).map((m) => ({ ...m, id: letter + m.id }))
            });
          }
          updated.matches = updated.groups.flatMap((g) => g.matches);
          const letters = updated.groups.map((g) => g.letter);
          const seeds: string[] = [];
          letters.forEach((l, idx) => {
            seeds.push(`1º ${l}`, `2º ${letters[(idx + 1) % letters.length]}`);
          });
          updated.rounds = bracket(seeds, L, { legs: updated.legs, semiLegs: updated.semiLegs, finalLegs: updated.finalLegs });
        }
        onUpdateTournament(updated);
        onShowToast('¡Torneo completo! Fixture generado.');
      } else {
        onUpdateTournament(updated);
        onShowToast(`Jugador "${nickname}" agregado.`);
      }
    }
  };

  // Start play-off for finished league
  const handleStartPlayoff = async () => {
    try {
      await tournamentService.startPlayoff(tournament.id);
      const freshTours = await tournamentService.fetchUserTournaments();
      const fresh = freshTours.find((t) => t.id === tournament.id);
      if (fresh) {
        onUpdateTournament(fresh);
        setActiveTab('bracket');
        onShowToast(L.tPlayoff);
        return;
      }
    } catch (err) {
      console.warn('DB startPlayoff call failed, using local fallback:', err);
    }

    const st = standings(tournament.members, tournament.matches);
    const n = tournament.finals === 'top2' ? 2 : Math.min(4, st.length);
    const seeds = n === 2 ? [st[0].nick, st[1].nick] : [st[0].nick, st[3].nick, st[1].nick, st[2].nick];

    const built = bracket(seeds, L);
    const configuredRounds = built.map((r, i) => {
      const isFinal = i === built.length - 1;
      const two = isFinal ? Number(tournament.finalLegs) === 2 : Number(tournament.semiLegs) === 2;
      return {
        ...r,
        name: two ? `${r.name} · ${L.fl2}` : r.name,
        matches: r.matches.map((m) => ({ ...m, legs: two ? 2 : 1 }))
      };
    });

    const updated: Tournament = {
      ...tournament,
      rounds: configuredRounds
    };

    onUpdateTournament(updated);
    setActiveTab('bracket');
    onShowToast(L.tPlayoff);
  };

  // Save score handler
  const handleSaveScore = (scores: {
    sa: number;
    sb: number;
    s2a?: number;
    s2b?: number;
    penaltyWinner?: 'a' | 'b' | null;
  }) => {
    if (!editingMatch) return;

    const isTwoLegs = Number(editingMatch.legs) === 2;
    const isLeg2Done = scores.s2a != null && scores.s2b != null;
    const isFullyPlayed = isTwoLegs ? isLeg2Done : true;

    const updated = { ...tournament };
    const applyScore = (m: Match) => ({
      ...m,
      sa: scores.sa,
      sb: scores.sb,
      s2a: scores.s2a ?? null,
      s2b: scores.s2b ?? null,
      penaltyWinner: scores.penaltyWinner ?? null,
      played: isFullyPlayed
    });

    // 1. Update in matches
    updated.matches = updated.matches.map((m) => (m.id === editingMatch.id ? applyScore(m) : m));

    // 2. Update in groups if exists
    if (updated.groups && updated.groups.length) {
      updated.groups = updated.groups.map((g) => ({
        ...g,
        matches: g.matches.map((m) => (m.id === editingMatch.id ? applyScore(m) : m))
      }));

      // Check if group stage finished to update seeds in knockout
      const qual: Record<string, string> = {};
      updated.groups.forEach((g) => {
        if (g.matches.filter((m) => m.a && m.b).every((m) => m.played)) {
          const st = standings(
            g.nicks.map((n) => ({ nick: n })),
            g.matches
          );
          if (st[0]) qual[`1º ${g.letter}`] = st[0].nick;
          if (st[1]) qual[`2º ${g.letter}`] = st[1].nick;
        }
      });

      if (updated.rounds) {
        updated.rounds = updated.rounds.map((r) => ({
          ...r,
          matches: r.matches.map((m) => ({
            ...m,
            a: qual[m.a] || m.a,
            b: qual[m.b] || m.b
          }))
        }));
      }
    }

    // 3. Update in rounds if exists
    if (updated.rounds && updated.rounds.length) {
      updated.rounds = updated.rounds.map((r) => ({
        ...r,
        matches: r.matches.map((m) => (m.id === editingMatch.id ? applyScore(m) : m))
      }));
      propagate(updated.rounds, L);
    }

    onUpdateTournament(updated);
    setEditingMatch(null);
    onShowToast(isFullyPlayed ? L.tScoreSaved : 'Partido de Ida guardado.');

    // Also persist to Supabase if connected
    tournamentService
      .saveMatchScore(
        editingMatch.id,
        scores.sa,
        scores.sb,
        scores.s2a,
        scores.s2b,
        scores.penaltyWinner
      )
      .catch((err) => {
        console.warn('Could not save score in DB, kept local:', err);
      });
  };

  // Toggle paid status
  const handleTogglePaid = (nick: string) => {
    const updated: Tournament = {
      ...tournament,
      members: tournament.members.map((m) => (m.nick === nick ? { ...m, paid: !m.paid } : m))
    };
    onUpdateTournament(updated);

    const targetMember = tournament.members.find((m) => m.nick === nick);
    if (targetMember?.profileId) {
      tournamentService.togglePaid(tournament.id, targetMember.profileId).catch((err) => {
        console.warn('Could not toggle paid in DB:', err);
      });
    }
  };

  // Toggle helper role
  const handleToggleHelper = (nick: string) => {
    const updated: Tournament = {
      ...tournament,
      members: tournament.members.map((m) =>
        m.nick === nick ? { ...m, role: m.role === 'ayudante' ? 'jugador' : 'ayudante' } : m
      )
    };
    onUpdateTournament(updated);
    setSheetMode(null);
    onShowToast(L.tRoleSaved);

    const targetMember = tournament.members.find((m) => m.nick === nick);
    if (targetMember?.profileId) {
      tournamentService.toggleHelper(tournament.id, targetMember.profileId).catch((err) => {
        console.warn('Could not toggle helper in DB:', err);
      });
    }
  };

  // Remove member
  const handleRemoveMember = (nick: string) => {
    const updated: Tournament = {
      ...tournament,
      members: tournament.members.filter((m) => m.nick !== nick)
    };
    onUpdateTournament(updated);
    setSheetMode(null);
    onShowToast(`${nick} ${L.tRemoved}`);

    const targetMember = tournament.members.find((m) => m.nick === nick);
    if (targetMember?.profileId) {
      tournamentService.removeMember(tournament.id, targetMember.profileId).catch((err) => {
        console.warn('Could not remove member in DB:', err);
      });
    }
  };

  // Rename tournament
  const handleRename = (newName: string) => {
    const updated: Tournament = {
      ...tournament,
      name: newName
    };
    onUpdateTournament(updated);
    setSheetMode(null);
    onShowToast(L.tRenamed);

    tournamentService.renameTournament(tournament.id, newName).catch((err) => {
      console.warn('Could not rename tournament in DB, kept local:', err);
    });
  };

  // Copy tournament ID
  const handleCopyId = () => {
    navigator.clipboard.writeText(tournament.id);
    setSheetMode(null);
    onShowToast(L.tCopied);
  };

  // Close tournament
  const handleCloseTournament = () => {
    const lastRound = tournament.rounds && tournament.rounds.length ? tournament.rounds[tournament.rounds.length - 1] : null;
    const lastMatch = lastRound?.matches[0];
    const champ =
      lastMatch && lastMatch.played
        ? winnerOf(lastMatch)
        : (standings(tournament.members, tournament.matches)[0] || { nick: '—' }).nick;

    const updated: Tournament = {
      ...tournament,
      closed: true,
      champ
    };
    onUpdateTournament(updated);
    setSheetMode(null);
    onShowToast(`${L.tClosed} ${champ}`);
    onBack();

    tournamentService.closeTournament(tournament.id).catch((err) => {
      console.warn('Could not close tournament in DB, kept local:', err);
    });
  };

  // Confirm leave
  const handleConfirmLeave = () => {
    const updated: Tournament = {
      ...tournament,
      members: tournament.members.filter((m) => m.nick !== userNick)
    };
    onUpdateTournament(updated);
    setSheetMode(null);
    onShowToast(L.tLeft);
    onBack();

    tournamentService.leaveTournament(tournament.id).catch((err) => {
      console.warn('Could not leave tournament in DB:', err);
    });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Header */}
      <div
        style={{
          borderBottom: '2px solid var(--color-divider)',
          padding: isTablet ? '26px clamp(24px, 4vw, 56px) 0' : '16px 20px 0',
          background: 'var(--color-bg)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <button
              className="btn btn-icon btn-secondary"
              style={{ borderColor: 'var(--color-divider)' }}
              onClick={onBack}
            >
              <ArrowLeft size={18} />
            </button>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  font: `800 ${isTablet ? '32px' : '20px'} var(--font-heading)`,
                  letterSpacing: '-.02em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {tournament.name}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: 'var(--color-neutral-700)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: '2px'
                }}
              >
                {tournament.type === 'copa' ? <Trophy size={14} color="var(--color-accent)" /> : tournament.type === 'grupos' ? <Layers size={14} color="var(--color-accent)" /> : <BarChart3 size={14} color="var(--color-accent)" />}
                <span>
                  {tournament.game} · {typeLabel(tournament.type, L)}
                  {tournament.type === 'liga' && Number(tournament.legs) === 2 ? ` ${L.legs2.toLowerCase()}` : ''} ·{' '}
                  {tournament.id} {tournament.mode === 'offline' ? '· Presencial' : ''}
                </span>
              </div>
            </div>
          </div>

          {isAdmin && (
            <button
              className="btn btn-secondary btn-icon"
              style={{ borderColor: 'var(--color-divider)' }}
              onClick={() => setSheetMode('admin')}
            >
              <Settings size={18} />
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '20px', marginTop: '16px' }}>
          {tabDefs.map((t) => {
            const isActive = activeTab === t.key;
            return (
              <div
                key={t.key}
                style={{
                  cursor: 'pointer',
                  paddingBottom: '10px',
                  borderBottom: `3px solid ${isActive ? 'var(--color-accent)' : 'transparent'}`,
                  font: '800 13px var(--font-heading)',
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-neutral-600)',
                  transition: 'color 0.15s ease'
                }}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div
          style={{
            maxWidth: isTablet ? '1280px' : '100%',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
            padding: isTablet ? '32px clamp(24px, 4vw, 56px) 48px' : '18px 20px 24px'
          }}
        >
          {/* Waiting for players registration banner */}
          {isWaiting && (
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                borderLeft: '4px solid var(--color-accent-2)',
                padding: '16px 20px',
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div
                  style={{
                    font: '800 12px var(--font-heading)',
                    letterSpacing: '.14em',
                    textTransform: 'uppercase',
                    color: 'var(--color-accent-2-700)'
                  }}
                >
                  {L.openReg}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-neutral-700)' }}>
                  {tournament.members.length} {L.ofWord} {tournament.teams}
                </div>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-neutral-700)', lineHeight: 1.45 }}>
                {tournament.mode === 'offline'
                  ? 'Torneo presencial: Agrega a los participantes que van a jugar en esta consola.'
                  : L.waitSub}
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                {tournament.mode === 'offline' && canManage && (
                  <button
                    className="btn btn-primary"
                    style={{ alignSelf: 'flex-start', gap: '8px', minHeight: '38px', paddingInline: '16px' }}
                    onClick={() => setShowAddPlayerModal(true)}
                  >
                    <UserPlus size={16} />
                    <span>Agregar jugador</span>
                  </button>
                )}
                <button
                  className="btn btn-secondary"
                  style={{ alignSelf: 'flex-start', gap: '8px', minHeight: '38px', paddingInline: '14px' }}
                  onClick={handleSimulate}
                >
                  <Users size={16} />
                  <span>{L.simulate}</span>
                </button>
              </div>
            </div>
          )}

          {/* Render Active Tab */}
          {activeTab === 'tabla' && tournament.type === 'liga' && (
            <StandingsTab
              tournament={tournament}
              userNick={userNick}
              onStartPlayoff={handleStartPlayoff}
              canManage={canManage}
              L={L}
              onOpenAddPlayer={() => setShowAddPlayerModal(true)}
            />
          )}

          {activeTab === 'tabla' && tournament.type === 'grupos' && (
            <GroupsTab
              tournament={tournament}
              userNick={userNick}
              L={L}
            />
          )}

          {activeTab === 'partidos' && (
            <FixturesTab
              tournament={tournament}
              userNick={userNick}
              onOpenScore={(m) => setEditingMatch(m)}
              canManage={canManage}
              L={L}
            />
          )}

          {activeTab === 'bracket' && (
            <BracketTab
              tournament={tournament}
              userNick={userNick}
              onOpenScore={(m) => setEditingMatch(m)}
              canManage={canManage}
              L={L}
              isTablet={isTablet}
            />
          )}

          {activeTab === 'gente' && (
            <PeopleTab
              tournament={tournament}
              userNick={userNick}
              isAdmin={isAdmin}
              onTogglePaid={handleTogglePaid}
              onOpenManageMember={(m) => {
                setTargetMember(m);
                setSheetMode('member');
              }}
              onAskLeave={() => setSheetMode('leave')}
              L={L}
            />
          )}
        </div>
      </div>

      {/* Score Modal */}
      {editingMatch && (
        <ScoreModal
          match={editingMatch}
          onSave={handleSaveScore}
          onClose={() => setEditingMatch(null)}
          L={L}
          isKnockout={
            tournament.type === 'copa' ||
            (tournament.rounds || []).some((r) => r.matches.some((m) => m.id === editingMatch.id)) ||
            editingMatch.jornada == null
          }
        />
      )}

      {/* Admin Actions Sheet */}
      {sheetMode && (
        <AdminSheet
          mode={sheetMode}
          tournament={tournament}
          targetMember={targetMember}
          onClose={() => {
            setSheetMode(null);
            setTargetMember(null);
          }}
          onRename={handleRename}
          onCopyId={handleCopyId}
          onCloseTournament={handleCloseTournament}
          onToggleHelper={handleToggleHelper}
          onTogglePaid={handleTogglePaid}
          onRemoveMember={handleRemoveMember}
          onConfirmLeave={handleConfirmLeave}
          L={L}
        />
      )}

      {/* Add Offline Player Modal */}
      {showAddPlayerModal && (
        <AddPlayerModal
          onAdd={handleAddOfflineMember}
          onClose={() => setShowAddPlayerModal(false)}
          L={L}
        />
      )}
    </div>
  );
};
