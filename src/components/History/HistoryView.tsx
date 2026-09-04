import React, { useState } from 'react';
import { Tournament, StringsDict } from '../../types/tournament';
import { typeLabel } from '../../utils/tournamentEngine';
import { Trophy, Search, X, BarChart3, Layers } from 'lucide-react';

interface HistoryViewProps {
  tournaments: Tournament[];
  userNick: string;
  onShowToast: (msg: string) => void;
  L: StringsDict;
  isTablet: boolean;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  tournaments,
  userNick,
  onShowToast,
  L,
  isTablet
}) => {
  const [query, setQuery] = useState('');

  const myClosedTournaments = tournaments.filter(
    (t) => t.closed && t.members.some((p) => p.nick === userNick)
  );

  const q = query.trim().toLowerCase();
  const filtered = q
    ? myClosedTournaments.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.game.toLowerCase().includes(q)
      )
    : myClosedTournaments;

  const subtitle = q
    ? `${filtered.length} ${L.resultsWord} · ${myClosedTournaments.length} ${L.closedCount}`
    : L.historySub;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div
          style={{
            maxWidth: isTablet ? '1280px' : '100%',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
            padding: isTablet ? '34px clamp(24px, 4vw, 56px) 48px' : '20px'
          }}
        >
          {/* Header */}
          <div
            style={{
              paddingBottom: '20px',
              borderBottom: '2px solid var(--color-divider)',
              marginBottom: '24px'
            }}
          >
            <div style={{ font: '800 36px/1 var(--font-heading)', letterSpacing: '-.02em' }}>
              {L.historyTitle}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-neutral-600)', marginTop: '6px' }}>
              {subtitle}
            </div>

            {/* Search input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                padding: '0 12px',
                marginTop: '18px',
                maxWidth: '480px'
              }}
            >
              <Search size={16} color="var(--color-neutral-600)" />
              <input
                className="input"
                style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}
                placeholder={L.searchPh}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'grid' }}
                  onClick={() => setQuery('')}
                >
                  <X size={16} color="var(--color-neutral-600)" />
                </button>
              )}
            </div>
          </div>

          {/* List of Closed Tournaments */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
            {filtered.map((t) => (
              <div
                key={t.id}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-divider)',
                  borderLeft: '4px solid var(--color-neutral-800)',
                  padding: '16px',
                  cursor: 'pointer'
                }}
                onClick={() => onShowToast(L.tReadOnly)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '10px',
                      letterSpacing: '.14em',
                      textTransform: 'uppercase',
                      color: 'var(--color-neutral-600)',
                      fontWeight: 700
                    }}
                  >
                    {t.type === 'copa' ? <Trophy size={13} /> : t.type === 'grupos' ? <Layers size={13} /> : <BarChart3 size={13} />}
                    <span>{typeLabel(t.type, L)}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-neutral-600)' }}>{t.date}</span>
                </div>

                <div style={{ font: '800 20px var(--font-heading)', margin: '6px 0 2px' }}>{t.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)' }}>{t.game}</div>

                <div style={{ height: '1px', background: 'var(--color-divider)', margin: '12px 0' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Trophy size={16} color="var(--color-accent)" />
                  <span style={{ fontSize: '12px', color: 'var(--color-neutral-700)' }}>
                    {L.champion}: <strong>{t.champ || '—'}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ border: '1px dashed var(--color-divider)', padding: '36px 20px', textAlign: 'center' }}>
              <div style={{ font: '800 18px var(--font-heading)' }}>{q ? L.noHistMatch : L.noClosed}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
