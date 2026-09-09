import React, { useState, useEffect } from 'react';
import { Tournament, StringsDict } from '../../types/tournament';
import { typeLabel } from '../../utils/tournamentEngine';
import { tournamentService } from '../../services/tournamentService';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface JoinTournamentViewProps {
  tournaments: Tournament[];
  userNick: string;
  userId?: string | null;
  onJoin: (tournamentId: string, teamName?: string) => void;
  onCancel: () => void;
  L: StringsDict;
  isTablet: boolean;
  initialCode?: string;
}

interface FoundTournament {
  id: string;
  name: string;
  game: string;
  type: string;
  teams: number;
  memberCount: number;
  isAlreadyMember: boolean;
  isFull: boolean;
}

export const JoinTournamentView: React.FC<JoinTournamentViewProps> = ({
  tournaments,
  userNick,
  userId,
  onJoin,
  onCancel,
  L,
  isTablet,
  initialCode
}) => {
  const [joinCode, setJoinCode] = useState(initialCode || '');
  const [joinName, setJoinName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [fullModal, setFullModal] = useState(false);
  const [remoteFound, setRemoteFound] = useState<FoundTournament | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (initialCode) {
      setJoinCode(initialCode);
    }
  }, [initialCode]);

  const query = (joinCode || joinName).trim();

  // Check local tournaments first
  const localMatch = query
    ? tournaments.find(
        (t) =>
          !t.closed &&
          (t.id.toLowerCase() === query.toLowerCase() ||
            t.name.toLowerCase().includes(query.toLowerCase()))
      )
    : null;

  useEffect(() => {
    if (!query) {
      setRemoteFound(null);
      return;
    }

    if (localMatch) {
      setRemoteFound({
        id: localMatch.id,
        name: localMatch.name,
        game: localMatch.game,
        type: localMatch.type,
        teams: Number(localMatch.teams),
        memberCount: localMatch.members.length,
        isAlreadyMember: localMatch.members.some(
          (p) =>
            (userId && p.profileId && p.profileId === userId) ||
            (userNick && p.nick && p.nick.toLowerCase() === userNick.toLowerCase())
        ),
        isFull: localMatch.members.length >= Number(localMatch.teams)
      });
      return;
    }

    // Try searching via Supabase RPC
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await tournamentService.searchOpenTournament(query);
        if (!cancelled) {
          if (res) {
            setRemoteFound({
              id: res.id,
              name: res.name,
              game: res.game,
              type: res.type,
              teams: res.teams,
              memberCount: Number(res.member_count),
              isAlreadyMember: false,
              isFull: Number(res.member_count) >= res.teams
            });
          } else {
            setRemoteFound(null);
          }
        }
      } catch (err) {
        console.warn('Search error:', err);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, localMatch, userNick]);

  const showNotFoundError = !!query && !searching && !remoteFound;

  const handleJoinClick = () => {
    if (!remoteFound) return;
    if (remoteFound.isFull && !remoteFound.isAlreadyMember) {
      setFullModal(true);
      return;
    }
    onJoin(remoteFound.id, teamName.trim() || undefined);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          borderBottom: '2px solid var(--color-divider)',
          padding: isTablet ? '26px clamp(24px, 4vw, 56px) 18px' : '16px 20px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          background: 'var(--color-bg)'
        }}
      >
        <button
          className="btn btn-icon btn-secondary"
          style={{ borderColor: 'var(--color-divider)' }}
          onClick={onCancel}
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ font: '800 24px var(--font-heading)' }}>{L.joinTitle}</div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            width: '100%',
            maxWidth: isTablet ? '520px' : '420px',
            padding: isTablet ? '32px' : '24px 20px',
            margin: isTablet ? '40px 24px' : '0',
            background: isTablet ? 'var(--color-surface)' : 'transparent',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            border: isTablet ? '1px solid var(--color-divider)' : 'none'
          }}
        >
          <div style={{ fontSize: '13px', color: 'var(--color-neutral-700)', marginBottom: '20px' }}>
            {L.joinHelp}
          </div>

          <div className="field">
            <label>{L.tourId}</label>
            <input
              className="input"
              style={{
                minHeight: '56px',
                fontFamily: 'var(--font-mono)',
                fontSize: '22px',
                letterSpacing: '.08em',
                textTransform: 'uppercase'
              }}
              placeholder="ABC-1234"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              autoFocus
            />
          </div>

          <div
            style={{
              textAlign: 'center',
              fontSize: '11px',
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: 'var(--color-neutral-600)',
              margin: '16px 0',
              fontWeight: 700
            }}
          >
            {L.or}
          </div>

          <div className="field">
            <label>{L.tourName}</label>
            <input
              className="input"
              placeholder="Liga FC 26"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
            />
          </div>

          {showNotFoundError && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                background: 'var(--color-accent-100)',
                borderLeft: '3px solid var(--color-accent)',
                fontSize: '12px',
                color: 'var(--color-accent-800)'
              }}
            >
              {L.notFound}
            </div>
          )}

          {remoteFound && (
            <div
              style={{
                marginTop: '20px',
                background: 'var(--color-bg)',
                padding: '16px',
                borderLeft: '3px solid var(--color-accent)',
                border: '1px solid var(--color-divider)',
                borderLeftWidth: '3px'
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  letterSpacing: '.14em',
                  textTransform: 'uppercase',
                  color: 'var(--color-accent)',
                  fontWeight: 700
                }}
              >
                {L.found}
              </div>
              <div style={{ font: '800 20px var(--font-heading)', margin: '4px 0 2px' }}>
                {remoteFound.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)' }}>
                {remoteFound.game} · {typeLabel(remoteFound.type, L)} · {remoteFound.memberCount}/
                {remoteFound.teams}
              </div>

              {remoteFound.isFull && !remoteFound.isAlreadyMember && (
                <div
                  style={{
                    marginTop: '10px',
                    display: 'inline-block',
                    background: 'var(--color-accent)',
                    color: '#fff',
                    fontSize: '10px',
                    letterSpacing: '.14em',
                    textTransform: 'uppercase',
                    padding: '4px 8px',
                    fontWeight: 700
                  }}
                >
                  {L.fullTag}
                </div>
              )}

              {!remoteFound.isAlreadyMember && !remoteFound.isFull && (
                <div className="field" style={{ marginTop: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>
                    Equipo con el que juegas <span style={{ color: 'var(--color-neutral-600)', fontWeight: 400 }}>(opcional)</span>
                  </label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Ej. Real Madrid, Arsenal, Francia..."
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <div style={{ flex: 1, minHeight: '24px' }} />

          <button
            className="btn btn-primary btn-block"
            style={{
              minHeight: '48px',
              paddingInline: '16px',
              justifyContent: 'space-between'
            }}
            disabled={!remoteFound}
            onClick={handleJoinClick}
          >
            <span>{remoteFound?.isAlreadyMember ? L.goTour : L.joinMe}</span>
            <ArrowRight size={18} />
          </button>

          <div style={{ fontSize: '11px', color: 'var(--color-neutral-600)', marginTop: '12px' }}>
            {L.tryWith} <strong>RKT-8842</strong>.
          </div>
        </div>
      </div>

      {/* Full Tournament Modal Dialog */}
      {fullModal && (
        <div className="modal-backdrop" onClick={() => setFullModal(false)}>
          <div
            className="bottom-sheet"
            style={{ padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: '10px',
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                color: 'var(--color-accent)',
                fontWeight: 700
              }}
            >
              {L.fullTitle}
            </div>
            <div
              style={{
                font: '800 24px var(--font-heading)',
                margin: '6px 0 12px'
              }}
            >
              {L.fullTag}
            </div>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--color-neutral-700)',
                lineHeight: 1.5,
                marginBottom: '24px'
              }}
            >
              {L.fullBody}
            </div>
            <button
              className="btn btn-primary btn-block"
              style={{ minHeight: '44px' }}
              onClick={() => setFullModal(false)}
            >
              {L.fullOk}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
