import React from 'react';
import { ScreenType, StringsDict } from '../../types/tournament';
import { Plus, ArrowRight } from 'lucide-react';

interface TopNavProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  onOpenCreate: () => void;
  onOpenJoin: () => void;
  nick: string;
  email?: string;
  L: StringsDict;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentScreen,
  onNavigate,
  onOpenCreate,
  onOpenJoin,
  nick,
  email,
  L
}) => {
  const initial = (nick || 'J')[0].toUpperCase();
  const isSuperAdmin = email?.trim().toLowerCase() === 'test@broscup.com';

  const navItems: { key: ScreenType; label: string }[] = [
    { key: 'dash', label: L.navT },
    { key: 'history', label: L.navH },
    { key: 'profile', label: L.navP }
  ];

  if (isSuperAdmin) {
    navItems.push({ key: 'admin-all', label: '🛡️ Panel Admin' });
  }

  return (
    <header
      style={{
        flex: 'none',
        borderBottom: '2px solid var(--color-divider)',
        background: 'var(--color-bg)',
        zIndex: 50
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
          padding: '0 clamp(20px, 3vw, 56px)',
          height: '72px',
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(16px, 2.5vw, 40px)'
        }}
      >
        {/* Brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            flex: 'none'
          }}
          onClick={() => onNavigate('dash')}
        >
          <img
            src="/logo.jpg"
            alt={L.brand}
            style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }}
          />
          <div
            style={{
              font: '800 15px/1 var(--font-heading)',
              letterSpacing: '.22em',
              textTransform: 'uppercase'
            }}
          >
            {L.brand}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: 'clamp(14px, 2vw, 28px)',
            height: '100%',
            minWidth: 0
          }}
        >
          {navItems.map((n) => {
            const isActive =
              currentScreen === n.key ||
              (n.key === 'dash' && (currentScreen === 'tour' || currentScreen === 'created'));
            return (
              <div
                key={n.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  borderBottom: `3px solid ${isActive ? 'var(--color-accent)' : 'transparent'}`,
                  marginBottom: '-2px',
                  font: '800 12px var(--font-heading)',
                  letterSpacing: '.12em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-neutral-600)',
                  transition: 'color 0.15s ease'
                }}
                onClick={() => onNavigate(n.key)}
              >
                {n.label}
              </div>
            );
          })}
        </nav>

        <div style={{ flex: 1, minWidth: '8px' }} />

        {/* Right CTA Actions & Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 'none' }}>
          <button
            className="btn btn-secondary"
            style={{ minHeight: '40px', paddingInline: '14px', gap: '8px', whiteSpace: 'nowrap' }}
            onClick={onOpenJoin}
          >
            {L.join}
            <ArrowRight size={15} />
          </button>
          <button
            className="btn btn-primary"
            style={{ minHeight: '40px', paddingInline: '14px', gap: '8px', whiteSpace: 'nowrap' }}
            onClick={onOpenCreate}
          >
            {L.create}
            <Plus size={16} />
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              paddingLeft: 'clamp(10px, 1.5vw, 16px)',
              borderLeft: '2px solid var(--color-divider)',
              cursor: 'pointer',
              flex: 'none'
            }}
            onClick={() => onNavigate('profile')}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                background: 'var(--color-accent)',
                color: 'var(--color-bg)',
                display: 'grid',
                placeItems: 'center',
                font: '800 15px var(--font-heading)'
              }}
            >
              {initial}
            </div>
            <div
              style={{
                font: '800 13px var(--font-heading)',
                maxWidth: '120px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {nick}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
