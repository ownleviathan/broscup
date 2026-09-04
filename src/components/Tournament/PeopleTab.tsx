import React from 'react';
import { Tournament, Member, StringsDict } from '../../types/tournament';
import { MoreVertical, LogOut } from 'lucide-react';

interface PeopleTabProps {
  tournament: Tournament;
  userNick: string;
  isAdmin: boolean;
  onTogglePaid: (nick: string) => void;
  onOpenManageMember: (member: Member) => void;
  onAskLeave: () => void;
  L: StringsDict;
}

export const PeopleTab: React.FC<PeopleTabProps> = ({
  tournament,
  userNick,
  isAdmin,
  onTogglePaid,
  onOpenManageMember,
  onAskLeave,
  L
}) => {
  const paidCount = tournament.members.filter((p) => p.paid).length;
  const canLeave = !isAdmin && !tournament.feeOn;
  const lockedLeave = !isAdmin && tournament.feeOn;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Fee Status Summary (if active) */}
      {tournament.feeOn && (
        <div
          style={{
            padding: '14px 18px',
            background: 'var(--color-surface)',
            borderLeft: '4px solid var(--color-accent)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px'
          }}
        >
          <div>
            <span style={{ color: 'var(--color-neutral-700)' }}>{L.registration}: </span>
            <strong>{tournament.fee}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-neutral-700)' }}>{L.collected}: </span>
            <strong style={{ color: 'var(--color-accent)' }}>
              {paidCount}/{tournament.members.length}
            </strong>
          </div>
        </div>
      )}

      {/* Members List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tournament.members.map((m) => {
          const isMe = m.nick === userNick;
          const initial = (m.nick || 'J')[0].toUpperCase();

          const roleLabel =
            (m.role === 'admin' ? L.admin : m.role === 'ayudante' ? L.helper : L.playerRole) +
            (isMe ? ` · ${L.you}` : '');

          return (
            <div
              key={m.nick}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-divider)'
              }}
            >
              {/* Member Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    background: isMe ? 'var(--color-accent)' : 'var(--color-neutral-300)',
                    color: isMe ? 'var(--color-bg)' : 'var(--color-neutral-800)',
                    display: 'grid',
                    placeItems: 'center',
                    font: '800 16px var(--font-heading)',
                    flex: 'none'
                  }}
                >
                  {initial}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: isMe ? 800 : 500,
                      color: 'var(--color-text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {m.nick}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-neutral-600)', marginTop: '2px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span>{roleLabel}</span>
                    {m.teamName && (
                      <>
                        <span>·</span>
                        <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{m.teamName}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions & Payment Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 'none' }}>
                {tournament.feeOn && (
                  <button
                    type="button"
                    className="btn"
                    style={{
                      minHeight: '32px',
                      paddingInline: '10px',
                      fontSize: '11px',
                      background: m.paid ? 'var(--color-accent)' : 'transparent',
                      color: m.paid ? 'var(--color-bg)' : 'var(--color-accent-700)',
                      borderColor: m.paid ? 'var(--color-accent)' : 'var(--color-divider)',
                      cursor: isAdmin ? 'pointer' : 'default'
                    }}
                    onClick={() => isAdmin && onTogglePaid(m.nick)}
                  >
                    {m.paid ? L.paid : L.pending}
                  </button>
                )}

                {isAdmin && !isMe && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-icon"
                    style={{ width: '34px', height: '34px', borderColor: 'var(--color-divider)' }}
                    onClick={() => onOpenManageMember(m)}
                  >
                    <MoreVertical size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Leave Tournament Options */}
      {canLeave && (
        <div style={{ marginTop: '16px' }}>
          <button
            className="btn btn-secondary"
            style={{
              borderColor: 'var(--color-divider)',
              color: 'var(--color-accent-700)',
              gap: '8px',
              minHeight: '42px'
            }}
            onClick={onAskLeave}
          >
            <LogOut size={16} />
            <span>{L.leave}</span>
          </button>
        </div>
      )}

      {lockedLeave && (
        <div
          style={{
            marginTop: '12px',
            fontSize: '11px',
            color: 'var(--color-neutral-600)',
            lineHeight: 1.45
          }}
        >
          {L.leaveLocked}
        </div>
      )}
    </div>
  );
};
