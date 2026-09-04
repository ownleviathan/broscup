import React from 'react';
import { Tournament, Match, StringsDict } from '../../types/tournament';
import { agg, winnerOf } from '../../utils/tournamentEngine';
import { Trophy } from 'lucide-react';

interface BracketTabProps {
  tournament: Tournament;
  userNick: string;
  onOpenScore: (match: Match) => void;
  canManage: boolean;
  L: StringsDict;
  isTablet: boolean;
}

export const BracketTab: React.FC<BracketTabProps> = ({
  tournament,
  onOpenScore,
  canManage,
  L,
  isTablet
}) => {
  const rounds = tournament.rounds || [];
  if (!rounds.length) return null;

  const finalRound = rounds[rounds.length - 1];
  const finalMatch = finalRound?.matches[0];
  const isChampionDecided = !!finalMatch && finalMatch.played;
  const championNick = isChampionDecided ? winnerOf(finalMatch) : '';

  const isPlaceholder = (name: string) => {
    return (
      /^([12]º )/.test(String(name)) ||
      String(name).startsWith(L.winner) ||
      String(name).startsWith('Ganador') ||
      String(name).startsWith('Winner')
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Champion Banner */}
      {isChampionDecided && (
        <div
          style={{
            background: 'var(--color-accent)',
            color: '#fff',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            borderLeft: '6px solid var(--color-accent-800)'
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              background: 'rgba(255,255,255,0.15)',
              display: 'grid',
              placeItems: 'center',
              flex: 'none'
            }}
          >
            <Trophy size={32} color="#fff" />
          </div>
          <div>
            <div
              style={{
                fontSize: '11px',
                letterSpacing: '.18em',
                textTransform: 'uppercase',
                opacity: 0.85,
                fontWeight: 700
              }}
            >
              {L.champion}
            </div>
            <div style={{ font: '800 32px/1.1 var(--font-heading)', marginTop: '2px' }}>
              {championNick}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Scroll Hint */}
      {!isTablet && rounds.length > 1 && (
        <div style={{ fontSize: '11px', color: 'var(--color-neutral-600)', fontStyle: 'italic' }}>
          {L.scrollHint}
        </div>
      )}

      {/* Bracket Rounds Tree */}
      <div
        style={{
          display: 'flex',
          gap: '20px',
          overflowX: 'auto',
          paddingBottom: '16px'
        }}
      >
        {rounds.map((rd, rIdx) => {
          return (
            <div
              key={rIdx}
              style={{
                flex: '0 0 260px',
                minWidth: '240px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {/* Round Header */}
              <div
                style={{
                  font: '800 13px var(--font-heading)',
                  letterSpacing: '.14em',
                  textTransform: 'uppercase',
                  color: 'var(--color-accent)',
                  paddingBottom: '6px',
                  borderBottom: '2px solid var(--color-divider)'
                }}
              >
                {rd.name}
              </div>

              {/* Matches list */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-around',
                  flex: 1,
                  gap: '14px'
                }}
              >
                {rd.matches.map((m) => {
                  const done = m.played;
                  const hasLeg1 = m.sa != null && m.sb != null;
                  const totals = agg(m);
                  const two = Number(m.legs) === 2;
                  const aw = done && (totals.a > totals.b || (totals.a === totals.b && m.penaltyWinner === 'a'));
                  const bw = done && (totals.b > totals.a || (totals.a === totals.b && m.penaltyWinner === 'b'));
                  const clickable = canManage && !isPlaceholder(m.a) && !isPlaceholder(m.b);
                  const getTeam = (nick: string) => tournament.members.find((mb) => mb.nick === nick)?.teamName;

                  return (
                    <div
                      key={m.id}
                      style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-divider)',
                        borderLeft: `4px solid ${
                          done
                            ? 'var(--color-accent)'
                            : hasLeg1
                            ? 'var(--color-gold, #e0a92a)'
                            : 'var(--color-neutral-300)'
                        }`,
                        padding: '12px',
                        cursor: clickable ? 'pointer' : 'default',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => clickable && onOpenScore(m)}
                    >
                      {/* Team A */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '4px 0',
                          fontWeight: aw ? 800 : 400,
                          color: aw ? 'var(--color-accent)' : 'var(--color-text)',
                          fontSize: '13px'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, paddingRight: '8px' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.a}
                            {done && m.penaltyWinner === 'a' && (
                              <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-accent)', marginLeft: '4px' }}>
                                (PEN)
                              </span>
                            )}
                          </span>
                          {getTeam(m.a) && (
                            <span style={{ fontSize: '10px', color: 'var(--color-neutral-600)', fontWeight: 500 }}>
                              {getTeam(m.a)}
                            </span>
                          )}
                        </div>
                        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '15px' }}>
                          {done ? totals.a : hasLeg1 ? `${m.sa}` : '–'}
                        </span>
                      </div>

                      <div style={{ height: '1px', background: 'var(--color-divider)', margin: '4px 0' }} />

                      {/* Team B */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '4px 0',
                          fontWeight: bw ? 800 : 400,
                          color: bw ? 'var(--color-accent)' : 'var(--color-text)',
                          fontSize: '13px'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, paddingRight: '8px' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.b}
                            {done && m.penaltyWinner === 'b' && (
                              <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-accent)', marginLeft: '4px' }}>
                                (PEN)
                              </span>
                            )}
                          </span>
                          {getTeam(m.b) && (
                            <span style={{ fontSize: '10px', color: 'var(--color-neutral-600)', fontWeight: 500 }}>
                              {getTeam(m.b)}
                            </span>
                          )}
                        </div>
                        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '15px' }}>
                          {done ? totals.b : hasLeg1 ? `${m.sb}` : '–'}
                        </span>
                      </div>

                      {/* Single Leg Penalties Note */}
                      {!two && done && m.penaltyWinner && (
                        <div
                          style={{
                            marginTop: '6px',
                            paddingTop: '6px',
                            borderTop: '1px dashed var(--color-divider)',
                            fontSize: '10px',
                            color: 'var(--color-accent)',
                            fontWeight: 600
                          }}
                        >
                          Penales: ganó {m.penaltyWinner === 'a' ? m.a : m.b}
                        </div>
                      )}

                      {/* Two Legs Detail Footnote */}
                      {two && (
                        <div
                          style={{
                            marginTop: '6px',
                            paddingTop: '6px',
                            borderTop: '1px dashed var(--color-divider)',
                            fontSize: '10px',
                            color: hasLeg1 && !done ? 'var(--color-accent)' : 'var(--color-neutral-600)'
                          }}
                        >
                          {done
                            ? `${L.legIda} ${m.sa}–${m.sb} · ${L.legVuelta} ${m.s2b}–${m.s2a} (${L.aggWord} ${totals.a}–${totals.b})${
                                m.penaltyWinner ? ` · Penales: ${m.penaltyWinner === 'a' ? m.a : m.b}` : ''
                              }`
                            : hasLeg1
                            ? `${L.legIda}: ${m.sa}–${m.sb} · ${L.legVuelta}: pendiente`
                            : L.fl2}
                        </div>
                      )}
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
