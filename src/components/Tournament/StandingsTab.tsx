import React from 'react';
import { Tournament, StringsDict } from '../../types/tournament';
import { standings } from '../../utils/tournamentEngine';
import { UserPlus } from 'lucide-react';

interface StandingsTabProps {
  tournament: Tournament;
  userNick: string;
  onStartPlayoff: () => void;
  canManage: boolean;
  L: StringsDict;
  onOpenAddPlayer?: () => void;
}

export const StandingsTab: React.FC<StandingsTabProps> = ({
  tournament,
  userNick,
  onStartPlayoff,
  canManage,
  L,
  onOpenAddPlayer
}) => {
  const isLiga = tournament.type === 'liga';
  const rows = standings(tournament.members, tournament.matches);

  // Playoff CTA calculation
  const ligaPlayoff =
    isLiga &&
    tournament.finals !== 'none' &&
    tournament.matches.length > 0 &&
    !(tournament.rounds || []).length;

  const missingMatches = ligaPlayoff
    ? tournament.matches.filter((m) => m.a && m.b && !m.played).length
    : 0;

  const playoffReady = ligaPlayoff && missingMatches === 0;

  const cutoff = tournament.finals === 'top2' ? 2 : tournament.finals === 'top4' ? 4 : 1;

  let finalNote = '';
  if (isLiga) {
    finalNote =
      (tournament.finals === 'top4'
        ? L.finalTop4
        : tournament.finals === 'top2'
        ? L.finalTop2
        : L.finalNone) +
      (tournament.finals === 'top4' && Number(tournament.semiLegs) === 2
        ? ` ${L.semisLabel}: ${L.fl2.toLowerCase()}.`
        : '') +
      (tournament.finals !== 'none' && Number(tournament.finalLegs) === 2
        ? ` ${L.grandFinalLabel}: ${L.fl2.toLowerCase()}.`
        : '');
  }

  const isWaiting = tournament.members.length < tournament.teams && !tournament.closed;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Offline Mode Add Player Bar */}
      {tournament.mode === 'offline' && isWaiting && canManage && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
            borderLeft: '4px solid var(--color-accent)',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div>
            <div style={{ font: '800 15px var(--font-heading)' }}>
              Participantes inscritos: {tournament.members.length} / {tournament.teams}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)', marginTop: '2px' }}>
              Agrega a los jugadores que jugarán en esta consola para iniciar el torneo.
            </div>
          </div>
          {onOpenAddPlayer && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ gap: '8px', minHeight: '38px', paddingInline: '16px' }}
              onClick={onOpenAddPlayer}
            >
              <UserPlus size={16} />
              <span>Agregar jugador</span>
            </button>
          )}
        </div>
      )}

      {/* Play-off Activation Call To Action Banner */}
      {ligaPlayoff && (
        <div
          style={{
            padding: '16px 20px',
            background: playoffReady ? 'var(--color-accent)' : 'var(--color-surface)',
            color: playoffReady ? 'var(--color-bg)' : 'var(--color-text)',
            borderLeft: `4px solid ${playoffReady ? 'var(--color-accent-800)' : 'var(--color-divider)'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ font: '800 18px var(--font-heading)' }}>
            {playoffReady ? L.playoffReadyHead : L.playoffPendHead}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: playoffReady ? 'var(--color-accent-100)' : 'var(--color-neutral-700)',
              lineHeight: 1.45
            }}
          >
            {playoffReady
              ? `${L.playoffReadySub} ${
                  tournament.finals === 'top2' ? L.f2 : L.f4
                }${
                  tournament.finals === 'top4' && Number(tournament.semiLegs) === 2
                    ? ' · ' + L.semisWord + ' ' + L.fl2.toLowerCase()
                    : ''
                }${
                  Number(tournament.finalLegs) === 2
                    ? ' · ' + L.grandFinalLabel.toLowerCase() + ' ' + L.fl2.toLowerCase()
                    : ''
                }`
              : `${missingMatches} ${L.playoffMissing}. ${L.playoffPendSub}`}
          </div>
          {playoffReady && canManage && (
            <button
              className="btn btn-secondary"
              style={{
                alignSelf: 'flex-start',
                marginTop: '6px',
                minHeight: '40px',
                paddingInline: '16px',
                background: '#fff',
                color: 'var(--color-accent)',
                borderColor: 'transparent'
              }}
              onClick={onStartPlayoff}
            >
              {L.startPlayoff} →
            </button>
          )}
        </div>
      )}

      {/* Standings Table Card */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-divider)',
          overflow: 'hidden'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr
              style={{
                borderBottom: '2px solid var(--color-divider)',
                background: 'var(--color-bg)',
                fontFamily: 'var(--font-heading)',
                fontSize: '11px',
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                color: 'var(--color-neutral-600)'
              }}
            >
              <th style={{ padding: '12px 14px', width: '36px', textAlign: 'center' }}>#</th>
              <th style={{ padding: '12px 14px' }}>{L.player}</th>
              <th style={{ padding: '12px 10px', textAlign: 'center', width: '36px' }}>{L.pj}</th>
              <th style={{ padding: '12px 10px', textAlign: 'center', width: '36px' }}>{L.gf}</th>
              <th style={{ padding: '12px 10px', textAlign: 'center', width: '36px' }}>{L.gc}</th>
              <th style={{ padding: '12px 10px', textAlign: 'center', width: '40px' }}>{L.dg}</th>
              <th
                style={{
                  padding: '12px 14px',
                  textAlign: 'center',
                  width: '44px',
                  fontWeight: 800,
                  color: 'var(--color-text)'
                }}
              >
                {L.pts}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isMe = r.nick === userNick;
              const isQualified = r.pos <= cutoff;

              return (
                <tr
                  key={r.nick}
                  style={{
                    borderBottom: '1px solid var(--color-divider)',
                    background: isMe ? 'var(--color-accent-100)' : 'transparent',
                    fontWeight: isMe ? 700 : 400
                  }}
                >
                  <td
                    style={{
                      padding: '12px 14px',
                      textAlign: 'center',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 800,
                      color: isQualified ? 'var(--color-accent)' : 'var(--color-neutral-600)'
                    }}
                  >
                    {r.pos}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{r.nick}</span>
                        {isMe && (
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 800,
                              letterSpacing: '.1em',
                              textTransform: 'uppercase',
                              background: 'var(--color-accent)',
                              color: '#fff',
                              padding: '2px 5px'
                            }}
                          >
                            {L.you}
                          </span>
                        )}
                      </div>
                      {tournament.members.find((mb) => mb.nick === r.nick)?.teamName && (
                        <span style={{ fontSize: '10px', color: 'var(--color-neutral-600)', fontWeight: 500, marginTop: '1px' }}>
                          {tournament.members.find((mb) => mb.nick === r.nick)?.teamName}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--color-neutral-700)' }}>
                    {r.pj}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--color-neutral-700)' }}>
                    {r.gf}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--color-neutral-700)' }}>
                    {r.gc}
                  </td>
                  <td
                    style={{
                      padding: '12px 10px',
                      textAlign: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px'
                    }}
                  >
                    {r.dg}
                  </td>
                  <td
                    style={{
                      padding: '12px 14px',
                      textAlign: 'center',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 800,
                      fontSize: '16px'
                    }}
                  >
                    {r.pts}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Format Rule Footnote */}
      {finalNote && (
        <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)', lineHeight: 1.45 }}>
          {finalNote}
        </div>
      )}
    </div>
  );
};
