import React, { useState } from 'react';
import { Tournament, Match, StringsDict } from '../../types/tournament';
import { agg } from '../../utils/tournamentEngine';

interface FixturesTabProps {
  tournament: Tournament;
  userNick: string;
  onOpenScore: (match: Match) => void;
  canManage: boolean;
  L: StringsDict;
}

export const FixturesTab: React.FC<FixturesTabProps> = ({
  tournament,
  userNick,
  onOpenScore,
  canManage,
  L
}) => {
  const [filterNick, setFilterNick] = useState<string>('');

  // Group matches by Jornada or Group
  const buckets = tournament.groups
    ? tournament.groups.map((g) => ({ name: g.name, list: g.matches }))
    : (() => {
        const by: Record<number, Match[]> = {};
        tournament.matches.forEach((m) => {
          const j = m.jornada || 1;
          if (!by[j]) by[j] = [];
          by[j].push(m);
        });
        return Object.keys(by).map((j) => ({
          name: `${L.jornada} ${j}`,
          list: by[Number(j)]
        }));
      })();

  const matchesOfUser = filterNick
    ? tournament.matches.filter((m) => m.a && m.b && (m.a === filterNick || m.b === filterNick))
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>
            {L.filterBy}:
          </label>
          <select
            className="input"
            style={{ width: 'auto', minHeight: '38px', padding: '4px 10px', fontSize: '13px' }}
            value={filterNick}
            onChange={(e) => setFilterNick(e.target.value)}
          >
            <option value="">{L.allPlayers}</option>
            {tournament.members.map((m) => (
              <option key={m.nick} value={m.nick}>
                {m.nick}
                {m.nick === userNick ? ` · ${L.you}` : ''}
              </option>
            ))}
          </select>
        </div>

        {filterNick && (
          <button
            className="btn btn-ghost"
            style={{ fontSize: '12px', padding: '4px 8px' }}
            onClick={() => setFilterNick('')}
          >
            {L.clearFilter}
          </button>
        )}
      </div>

      {filterNick && (
        <div
          style={{
            fontSize: '12px',
            color: 'var(--color-neutral-700)',
            background: 'var(--color-surface)',
            padding: '10px 14px',
            borderLeft: '3px solid var(--color-accent)'
          }}
        >
          {L.filterOf} <strong>{filterNick}</strong> · {matchesOfUser.length} {L.matchesWord} ·{' '}
          {matchesOfUser.filter((m) => m.played).length} {L.played} ·{' '}
          {matchesOfUser.filter((m) => !m.played).length} {L.pendingM}
        </div>
      )}

      {canManage && (
        <div style={{ fontSize: '11px', color: 'var(--color-neutral-600)' }}>
          {L.matchHelp}
        </div>
      )}

      {/* Matchday Groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {buckets.map((b) => {
          const byeM = b.list.find((m) => m.bye);
          const filteredMatches = b.list.filter((m) => {
            if (!filterNick) return m.a && m.b;
            return (m.a === filterNick || m.b === filterNick) && m.a && m.b;
          });

          const showBye = !!byeM && (!filterNick || byeM.bye === filterNick);

          if (!filteredMatches.length && !showBye) return null;

          return (
            <div key={b.name} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  font: '800 13px var(--font-heading)',
                  letterSpacing: '.14em',
                  textTransform: 'uppercase',
                  color: 'var(--color-accent)',
                  paddingBottom: '4px',
                  borderBottom: '1px solid var(--color-divider)'
                }}
              >
                {b.name}
              </div>

              {showBye && byeM && (
                <div
                  style={{
                    padding: '8px 12px',
                    background: 'var(--color-surface)',
                    fontSize: '11px',
                    color: 'var(--color-neutral-600)',
                    fontStyle: 'italic'
                  }}
                >
                  <strong>{byeM.bye}</strong> {L.rest}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filteredMatches.map((m) => {
                  const isMeA = m.a === userNick;
                  const isMeB = m.b === userNick;
                  const twoLegs = Number(m.legs) === 2;
                  const totals = agg(m);
                  const hasLeg1 = m.sa != null && m.sb != null;
                  const getTeam = (nick: string) => tournament.members.find((mb) => mb.nick === nick)?.teamName;

                  const scoreText = m.played
                    ? twoLegs
                      ? `${totals.a} – ${totals.b}`
                      : `${m.sa} – ${m.sb}`
                    : twoLegs && hasLeg1
                    ? `${m.sa} – ${m.sb} (Ida)`
                    : 'vs';

                  const isParticipant = (Boolean(userNick) && (isMeA || isMeB));
                  const canScore = canManage || isParticipant;

                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-divider)',
                        cursor: canScore ? 'pointer' : 'default',
                        transition: 'background 0.15s ease'
                      }}
                      onClick={() => canScore && onOpenScore(m)}
                      title={canScore ? 'Haz clic para cargar/editar marcador' : undefined}
                    >
                      {/* Player A */}
                      <div
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          overflow: 'hidden',
                          paddingRight: '6px'
                        }}
                      >
                        <span
                          style={{
                            fontWeight: isMeA ? 800 : 600,
                            color: isMeA ? 'var(--color-accent)' : 'var(--color-text)',
                            fontSize: '13px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%'
                          }}
                        >
                          {m.a}
                        </span>
                        {getTeam(m.a) && (
                          <span
                            style={{
                              fontSize: '10px',
                              color: 'var(--color-neutral-600)',
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '100%'
                            }}
                          >
                            {getTeam(m.a)}
                          </span>
                        )}
                      </div>

                      {/* Score Chip */}
                      <div
                        style={{
                          margin: '0 8px',
                          minWidth: '70px',
                          textAlign: 'center',
                          padding: '5px 10px',
                          background: m.played ? 'var(--color-accent)' : 'var(--color-bg)',
                          color: m.played ? 'var(--color-bg)' : 'var(--color-neutral-600)',
                          fontFamily: 'var(--font-heading)',
                          fontWeight: 800,
                          fontSize: '14px',
                          letterSpacing: '0.04em',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center'
                        }}
                      >
                        <span>{scoreText}</span>
                        {m.played && m.penaltyWinner && (
                          <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.05em', opacity: 0.9 }}>
                            (PEN)
                          </span>
                        )}
                      </div>

                      {/* Player B */}
                      <div
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          overflow: 'hidden',
                          paddingLeft: '6px'
                        }}
                      >
                        <span
                          style={{
                            fontWeight: isMeB ? 800 : 600,
                            color: isMeB ? 'var(--color-accent)' : 'var(--color-text)',
                            fontSize: '13px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%'
                          }}
                        >
                          {m.b}
                        </span>
                        {getTeam(m.b) && (
                          <span
                            style={{
                              fontSize: '10px',
                              color: 'var(--color-neutral-600)',
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '100%'
                            }}
                          >
                            {getTeam(m.b)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
