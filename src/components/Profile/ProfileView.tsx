import React, { useState } from 'react';
import { StringsDict, Language } from '../../types/tournament';
import { ChevronRight, X } from 'lucide-react';

interface ProfileViewProps {
  userNick: string;
  email: string;
  lang: Language;
  onUpdateNick: (newNick: string) => void;
  onToggleLang: () => void;
  onLogout: () => void;
  onResetDemo: () => void;
  onShowToast: (msg: string) => void;
  L: StringsDict;
  isTablet: boolean;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  userNick,
  email,
  lang,
  onUpdateNick,
  onToggleLang,
  onLogout,
  onResetDemo,
  onShowToast,
  L,
  isTablet
}) => {
  const [editingNick, setEditingNick] = useState(false);
  const [draftNick, setDraftNick] = useState(userNick);

  const initial = (userNick || 'J')[0].toUpperCase();

  const handleSaveNick = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = draftNick.trim();
    if (clean) {
      onUpdateNick(clean);
      setEditingNick(false);
    }
  };

  const isTestUser = email?.trim().toLowerCase() === 'test@broscup.com';

  const rows = [
    {
      label: L.rowNick,
      value: userNick,
      action: () => {
        setDraftNick(userNick);
        setEditingNick(true);
      }
    },
    {
      label: L.rowLang,
      value: lang === 'en' ? 'English' : 'Español',
      action: onToggleLang
    },
    {
      label: L.rowNotif,
      value: L.rowNotifV,
      action: () => onShowToast(L.tNotif)
    },

    {
      label: L.rowLogout,
      value: '',
      color: 'var(--color-accent-700)',
      action: onLogout
    },
    ...(isTestUser
      ? [
          {
            label: L.rowReset,
            value: L.rowResetV,
            color: 'var(--color-cta)',
            action: onResetDemo
          }
        ]
      : [])
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div
          style={{
            maxWidth: isTablet ? '640px' : '100%',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
            padding: isTablet ? '40px 24px 60px' : '20px'
          }}
        >
          {/* Profile Header Card */}
          <div
            style={{
              padding: '24px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-divider)',
              borderLeft: '4px solid var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              gap: '18px',
              marginBottom: '24px'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                background: 'var(--color-accent)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                font: '800 24px var(--font-heading)',
                flex: 'none'
              }}
            >
              {initial}
            </div>
            <div>
              <div style={{ font: '800 24px var(--font-heading)' }}>{userNick}</div>
              <div style={{ fontSize: '13px', color: 'var(--color-neutral-600)', marginTop: '2px' }}>
                {email || 'cuenta@gmail.com'}
              </div>
            </div>
          </div>

          {/* Options Rows */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-divider)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {rows.map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 18px',
                  borderBottom: i < rows.length - 1 ? '1px solid var(--color-divider)' : 'none',
                  cursor: 'pointer'
                }}
                onClick={r.action}
              >
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: r.color || 'var(--color-text)'
                  }}
                >
                  {r.label}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {r.value && (
                    <span style={{ fontSize: '13px', color: 'var(--color-neutral-600)' }}>
                      {r.value}
                    </span>
                  )}
                  <ChevronRight size={16} color="var(--color-neutral-500)" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Nickname Modal Sheet */}
      {editingNick && (
        <div className="modal-backdrop" onClick={() => setEditingNick(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
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
                <div style={{ font: '800 20px var(--font-heading)' }}>{L.nickTitleSheet}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-neutral-600)', marginTop: '2px' }}>
                  {L.nickSubSheet}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                style={{ width: '32px', height: '32px', borderColor: 'var(--color-divider)' }}
                onClick={() => setEditingNick(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={handleSaveNick}
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <input
                className="input"
                style={{ minHeight: '48px', fontSize: '16px' }}
                value={draftNick}
                onChange={(e) => setDraftNick(e.target.value)}
                autoFocus
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ minHeight: '44px' }}
                  onClick={() => setEditingNick(false)}
                >
                  {L.cancel}
                </button>
                <button type="submit" className="btn btn-primary" style={{ minHeight: '44px' }}>
                  {L.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
