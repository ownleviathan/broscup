import React, { useState } from 'react';
import { StringsDict } from '../../types/tournament';
import { ArrowRight } from 'lucide-react';

interface NicknameViewProps {
  initialNick?: string;
  onConfirm: (nick: string) => void;
  L: StringsDict;
}

export const NicknameView: React.FC<NicknameViewProps> = ({ initialNick = '', onConfirm, L }) => {
  const [nick, setNick] = useState(initialNick);
  const ideas = ['martu', 'eljefe', 'pixel_99'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nick.trim();
    if (clean) {
      onConfirm(clean);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px',
        overflow: 'auto'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            font: '800 11px/1 var(--font-heading)',
            letterSpacing: '.2em',
            textTransform: 'uppercase',
            color: 'var(--color-accent)',
            marginBottom: '20px'
          }}
        >
          {L.oneStep}
        </div>
        <div
          style={{
            font: '800 38px/1 var(--font-heading)',
            letterSpacing: '-.03em'
          }}
        >
          {L.nick1}
          <br />
          {L.nick2}
        </div>
        <div style={{ height: '2px', background: 'var(--color-divider)', margin: '20px 0' }} />
        <div
          style={{
            fontSize: '14px',
            color: 'var(--color-neutral-700)',
            marginBottom: '24px',
            lineHeight: 1.5
          }}
        >
          {L.nickHelp}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <input
            className="input"
            style={{
              minHeight: '56px',
              font: '800 22px var(--font-heading)',
              letterSpacing: '-.02em',
              paddingInline: '16px'
            }}
            placeholder="tu_nick"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            autoFocus
          />

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>
            {ideas.map((idea) => (
              <button
                key={idea}
                type="button"
                className="tag tag-outline"
                style={{ cursor: 'pointer', background: 'transparent' }}
                onClick={() => setNick(idea)}
              >
                {idea}
              </button>
            ))}
          </div>

          <div style={{ minHeight: '36px' }} />

          <button
            type="submit"
            className="btn btn-primary btn-block"
            style={{
              minHeight: '48px',
              paddingInline: '16px',
              justifyContent: 'space-between'
            }}
            disabled={!nick.trim()}
          >
            <span>{L.continue}</span>
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};
