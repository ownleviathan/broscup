import React from 'react';
import { Tournament, StringsDict } from '../../types/tournament';
import { standings } from '../../utils/tournamentEngine';

interface GroupsTabProps {
  tournament: Tournament;
  userNick: string;
  L: StringsDict;
}

export const GroupsTab: React.FC<GroupsTabProps> = ({ tournament, userNick, L }) => {
  const groups = tournament.groups || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ fontSize: '13px', color: 'var(--color-neutral-700)' }}>
        {L.splitSub}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {groups.map((g) => {
          const rows = standings(
            g.nicks.map((n) => ({ nick: n })),
            g.matches
          );

          return (
            <div
              key={g.letter}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  padding: '12px 14px',
                  background: 'var(--color-bg)',
                  borderBottom: '2px solid var(--color-divider)',
                  font: '800 15px var(--font-heading)',
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  color: 'var(--color-accent)'
                }}
              >
                {g.name}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--color-divider)',
                      fontFamily: 'var(--font-heading)',
                      fontSize: '11px',
                      letterSpacing: '.1em',
                      textTransform: 'uppercase',
                      color: 'var(--color-neutral-600)'
                    }}
                  >
                    <th style={{ padding: '8px 10px', width: '28px', textAlign: 'center' }}>#</th>
                    <th style={{ padding: '8px 10px' }}>{L.player}</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center' }}>{L.pj}</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center' }}>{L.dg}</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800 }}>{L.pts}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const isMe = r.nick === userNick;
                    const isQualified = r.pos <= 2;
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
                            padding: '10px',
                            textAlign: 'center',
                            fontFamily: 'var(--font-heading)',
                            fontWeight: 800,
                            color: isQualified ? 'var(--color-accent)' : 'var(--color-neutral-600)'
                          }}
                        >
                          {r.pos}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{r.nick}</span>
                            {isMe && (
                              <span
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 800,
                                  background: 'var(--color-accent)',
                                  color: '#fff',
                                  padding: '1px 4px'
                                }}
                              >
                                {L.you}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '10px 6px', textAlign: 'center', color: 'var(--color-neutral-700)' }}>
                          {r.pj}
                        </td>
                        <td
                          style={{
                            padding: '10px 6px',
                            textAlign: 'center',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '12px'
                          }}
                        >
                          {r.dg}
                        </td>
                        <td
                          style={{
                            padding: '10px',
                            textAlign: 'center',
                            fontFamily: 'var(--font-heading)',
                            fontWeight: 800,
                            fontSize: '15px'
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
          );
        })}
      </div>
    </div>
  );
};
