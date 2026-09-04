import React from 'react';
import { ScreenType, StringsDict } from '../../types/tournament';
import { Trophy, History, User } from 'lucide-react';

interface BottomNavProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  L: StringsDict;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate, L }) => {
  const items = [
    { key: 'dash' as ScreenType, label: L.navT, icon: Trophy },
    { key: 'history' as ScreenType, label: L.navH, icon: History },
    { key: 'profile' as ScreenType, label: L.navP, icon: User }
  ];

  return (
    <div
      style={{
        flex: 'none',
        height: '60px',
        borderTop: '2px solid var(--color-divider)',
        background: 'var(--color-surface)',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        zIndex: 50
      }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          currentScreen === item.key ||
          (item.key === 'dash' && (currentScreen === 'tour' || currentScreen === 'created'));
        return (
          <button
            key={item.key}
            style={{
              background: 'transparent',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              cursor: 'pointer',
              color: isActive ? 'var(--color-accent)' : 'var(--color-neutral-600)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: '11px',
              letterSpacing: '.1em',
              textTransform: 'uppercase'
            }}
            onClick={() => onNavigate(item.key)}
          >
            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
