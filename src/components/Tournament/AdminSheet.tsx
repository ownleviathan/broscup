import React, { useState } from 'react';
import { Tournament, Member, StringsDict } from '../../types/tournament';
import { X, Copy, Edit2, Archive, UserCheck, UserX, Trash2, LogOut } from 'lucide-react';

export type SheetMode = 'admin' | 'member' | 'leave' | 'rename';

interface AdminSheetProps {
  mode: SheetMode;
  tournament: Tournament;
  targetMember: Member | null;
  onClose: () => void;
  onRename: (newName: string) => void;
  onCopyId: () => void;
  onCloseTournament: () => void;
  onToggleHelper: (nick: string) => void;
  onTogglePaid: (nick: string) => void;
  onRemoveMember: (nick: string) => void;
  onConfirmLeave: () => void;
  L: StringsDict;
}

export const AdminSheet: React.FC<AdminSheetProps> = ({
  mode,
  tournament,
  targetMember,
  onClose,
  onRename,
  onCopyId,
  onCloseTournament,
  onToggleHelper,
  onTogglePaid,
  onRemoveMember,
  onConfirmLeave,
  L
}) => {
  const [renameText, setRenameText] = useState(tournament.name);

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = renameText.trim();
    if (clean) {
      onRename(clean);
    }
  };

  const title =
    mode === 'rename'
      ? L.renameTitle
      : mode === 'member'
      ? targetMember?.nick || ''
      : mode === 'leave'
      ? L.leaveTitle
      : L.adminTitle;

  const sub =
    mode === 'member'
      ? L.adminActions
      : mode === 'leave'
      ? L.leaveSub
      : mode === 'admin'
      ? tournament.name
      : '';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            padding: '18px 20px 14px',
            borderBottom: '1px solid var(--color-divider)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-bg)'
          }}
        >
          <div>
            <div style={{ font: '800 20px var(--font-heading)' }}>{title}</div>
            {sub && <div style={{ fontSize: '11px', color: 'var(--color-neutral-600)', marginTop: '2px' }}>{sub}</div>}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            style={{ width: '32px', height: '32px', borderColor: 'var(--color-divider)' }}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* RENAME MODE */}
          {mode === 'rename' && (
            <form onSubmit={handleRenameSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                className="input"
                value={renameText}
                onChange={(e) => setRenameText(e.target.value)}
                autoFocus
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" style={{ minHeight: '44px' }} onClick={onClose}>
                  {L.cancel}
                </button>
                <button type="submit" className="btn btn-primary" style={{ minHeight: '44px' }}>
                  {L.save}
                </button>
              </div>
            </form>
          )}

          {/* ADMIN ACTIONS MODE */}
          {mode === 'admin' && (
            <>
              <button
                className="btn btn-secondary btn-block"
                style={{ minHeight: '46px', justifyContent: 'flex-start', gap: '10px' }}
                onClick={() => onRename(tournament.name)}
              >
                <Edit2 size={16} />
                <span>{L.aRename}</span>
              </button>

              <button
                className="btn btn-secondary btn-block"
                style={{ minHeight: '46px', justifyContent: 'flex-start', gap: '10px' }}
                onClick={onCopyId}
              >
                <Copy size={16} />
                <span>{L.aCopy}</span>
              </button>

              <button
                className="btn btn-secondary btn-block"
                style={{
                  minHeight: '46px',
                  justifyContent: 'flex-start',
                  gap: '10px',
                  color: 'var(--color-accent-700)',
                  borderColor: 'var(--color-divider)'
                }}
                onClick={onCloseTournament}
              >
                <Archive size={16} />
                <span>{L.aClose}</span>
              </button>
            </>
          )}

          {/* MEMBER MANAGEMENT MODE */}
          {mode === 'member' && targetMember && (
            <>
              <button
                className="btn btn-secondary btn-block"
                style={{ minHeight: '46px', justifyContent: 'flex-start', gap: '10px' }}
                onClick={() => onToggleHelper(targetMember.nick)}
              >
                {targetMember.role === 'ayudante' ? <UserX size={16} /> : <UserCheck size={16} />}
                <span>{targetMember.role === 'ayudante' ? L.aHelperOff : L.aHelperOn}</span>
              </button>

              {tournament.feeOn && (
                <button
                  className="btn btn-secondary btn-block"
                  style={{ minHeight: '46px', justifyContent: 'flex-start', gap: '10px' }}
                  onClick={() => onTogglePaid(targetMember.nick)}
                >
                  <span>{targetMember.paid ? L.aPaidOff : L.aPaidOn}</span>
                </button>
              )}

              <button
                className="btn btn-secondary btn-block"
                style={{
                  minHeight: '46px',
                  justifyContent: 'flex-start',
                  gap: '10px',
                  color: 'var(--color-accent-700)'
                }}
                onClick={() => onRemoveMember(targetMember.nick)}
              >
                <Trash2 size={16} />
                <span>{L.aRemove}</span>
              </button>
            </>
          )}

          {/* LEAVE CONFIRMATION MODE */}
          {mode === 'leave' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-neutral-700)', lineHeight: 1.45 }}>
                {L.leaveSub}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" style={{ minHeight: '44px' }} onClick={onClose}>
                  {L.cancel}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ minHeight: '44px', background: 'var(--color-accent-700)' }}
                  onClick={onConfirmLeave}
                >
                  <LogOut size={16} />
                  <span>{L.aLeaveYes}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
