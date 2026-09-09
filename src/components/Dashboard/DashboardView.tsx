import React from 'react';
import { Tournament, StringsDict } from '../../types/tournament';
import { phaseOf, typeLabel } from '../../utils/tournamentEngine';
import { Plus, ArrowRight, BarChart3, Trophy, Layers } from 'lucide-react';

interface DashboardViewProps {
  tournaments: Tournament[];
  nick: string;
  userId?: string | null;
  onOpenTournament: (id: string) => void;
  onGoCreate: () => void;
  onGoJoin: () => void;
  L: StringsDict;
  isTablet: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tournaments,
  nick,
  userId,
  onOpenTournament,
  onGoCreate,
  onGoJoin,
  L,
  isTablet
}) => {
  const initial = (nick || 'J')[0].toUpperCase();

  const isMyMember = (p: { nick?: string; profileId?: string }) => {
    if (userId && p.profileId && p.profileId === userId) return true;
    if (nick && p.nick && p.nick.toLowerCase() === nick.toLowerCase()) return true;
    return false;
  };

  const myTournaments = tournaments.filter((t) => t.members.some(isMyMember));
  const activeTournaments = myTournaments.filter((t) => !t.closed);
  const closedTournaments = myTournaments.filter((t) => t.closed);

  const getMyRole = (t: Tournament) => {
    const m = t.members.find(isMyMember);
    if (!m) return '';
    return m.role === 'admin' ? L.admin : m.role === 'ayudante' ? L.helper : '';
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Mobile Top Welcome Header */}
      {!isTablet && (
        <div
          style={{
            padding: '20px 20px 14px',
            borderBottom: '2px solid var(--color-divider)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            background: 'var(--color-bg)'
          }}
        >
          <div>
            <div
              style={{
                fontSize: '10px',
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                color: 'var(--color-neutral-600)'
              }}
            >
              {L.hello}
            </div>
            <div
              style={{
                font: '800 30px/1 var(--font-heading)',
                letterSpacing: '-.03em',
                marginTop: '4px'
              }}
            >
              {nick}
            </div>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              display: 'grid',
              placeItems: 'center',
              font: '800 18px var(--font-heading)'
            }}
          >
            {initial}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div
          style={{
            maxWidth: isTablet ? '1280px' : '100%',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
            padding: isTablet ? '34px clamp(24px, 4vw, 56px) 48px' : '18px 20px 24px'
          }}
        >
          {/* Desktop/Tablet Header with stats */}
          {isTablet && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: '40px',
                flexWrap: 'wrap',
                paddingBottom: '26px',
                borderBottom: '2px solid var(--color-divider)',
                marginBottom: '30px'
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '10px',
                    letterSpacing: '.18em',
                    textTransform: 'uppercase',
                    color: 'var(--color-accent)',
                    fontWeight: 700
                  }}
                >
                  {L.hello} {nick}
                </div>
                <div
                  style={{
                    font: '800 clamp(34px, 3.4vw, 48px)/1 var(--font-heading)',
                    letterSpacing: '-.03em',
                    marginTop: '12px'
                  }}
                >
                  {L.activeTitle}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '44px' }}>
                <div>
                  <div style={{ font: '800 38px/1 var(--font-heading)' }}>
                    {activeTournaments.length}
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      letterSpacing: '.14em',
                      textTransform: 'uppercase',
                      color: 'var(--color-neutral-600)',
                      marginTop: '7px'
                    }}
                  >
                    {L.statActive}
                  </div>
                </div>
                <div>
                  <div style={{ font: '800 38px/1 var(--font-heading)' }}>
                    {closedTournaments.length}
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      letterSpacing: '.14em',
                      textTransform: 'uppercase',
                      color: 'var(--color-neutral-600)',
                      marginTop: '7px'
                    }}
                  >
                    {L.statClosed}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Title */}
          {!isTablet && (
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}
            >
              <div
                style={{
                  font: '800 12px var(--font-heading)',
                  letterSpacing: '.14em',
                  textTransform: 'uppercase'
                }}
              >
                {L.activeTitle}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-neutral-600)' }}>
                {activeTournaments.length}
              </div>
            </div>
          )}

          {/* Tournaments Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: '14px',
              alignItems: 'start'
            }}
          >
            {activeTournaments.map((t) => {
              const ph = phaseOf(t, L);
              const roleLbl = getMyRole(t);
              const statusLine =
                t.members.length < t.teams
                  ? L.waitingStatus
                  : t.feeOn
                  ? `${t.members.filter((p) => p.paid).length}/${t.members.length} ${L.paidOf}`
                  : L.playingStatus;

              return (
                <div
                  key={t.id}
                  style={{
                    background: 'var(--color-surface)',
                    borderLeft: '3px solid var(--color-accent)',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'transform 0.1s ease, box-shadow 0.1s ease'
                  }}
                  onClick={() => onOpenTournament(t.id)}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '10px',
                        letterSpacing: '.14em',
                        textTransform: 'uppercase',
                        color: 'var(--color-accent)',
                        fontWeight: 700
                      }}
                    >
                      {t.type === 'copa' ? <Trophy size={13} /> : t.type === 'grupos' ? <Layers size={13} /> : <BarChart3 size={13} />}
                      <span>{typeLabel(t.type, L)} {t.mode === 'offline' ? '· Presencial' : ''}</span>
                    </div>
                    {roleLbl && (
                      <div
                        style={{
                          fontSize: '10px',
                          letterSpacing: '.1em',
                          color: 'var(--color-neutral-600)',
                          fontWeight: 700
                        }}
                      >
                        {roleLbl}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      font: '800 20px/1.15 var(--font-heading)',
                      letterSpacing: '-.02em',
                      margin: '6px 0 2px'
                    }}
                  >
                    {t.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)' }}>{t.game}</div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                    <div
                      style={{
                        background: ph.bg,
                        color: ph.fg,
                        font: '800 10px var(--font-heading)',
                        letterSpacing: '.12em',
                        textTransform: 'uppercase',
                        padding: '4px 9px'
                      }}
                    >
                      {ph.label}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--color-neutral-700)',
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {ph.detail}
                    </div>
                  </div>

                  <div style={{ height: '1px', background: 'var(--color-divider)', margin: '12px 0' }} />

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '11px',
                      color: 'var(--color-neutral-700)'
                    }}
                  >
                    <div>
                      {t.members.length}/{t.teams} {L.enrolled}
                    </div>
                    <div>{statusLine}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {activeTournaments.length === 0 && (
            <div style={{ border: '1px dashed var(--color-divider)', padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ font: '800 18px var(--font-heading)' }}>{L.emptyTitle}</div>
              <div style={{ fontSize: '13px', color: 'var(--color-neutral-700)', marginTop: '4px' }}>
                {L.emptySub}
              </div>
            </div>
          )}

          {/* Mobile Quick Action Buttons */}
          {!isTablet && (
            <>
              <div style={{ height: '2px', background: 'var(--color-divider)', margin: '22px 0 16px' }} />
              <div style={{ display: 'grid', gap: '10px' }}>
                <button
                  className="btn btn-primary"
                  style={{
                    minHeight: '52px',
                    justifyContent: 'space-between',
                    paddingInline: '16px',
                    fontSize: '15px'
                  }}
                  onClick={onGoCreate}
                >
                  <span>{L.create}</span>
                  <Plus size={20} />
                </button>
                <button
                  className="btn btn-secondary"
                  style={{
                    minHeight: '52px',
                    justifyContent: 'space-between',
                    paddingInline: '16px',
                    fontSize: '15px'
                  }}
                  onClick={onGoJoin}
                >
                  <span>{L.join}</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
