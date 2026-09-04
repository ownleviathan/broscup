import React, { useState } from 'react';
import { Match, StringsDict } from '../../types/tournament';
import { X } from 'lucide-react';

interface ScoreModalProps {
  match: Match;
  onSave: (scores: {
    sa: number;
    sb: number;
    s2a?: number;
    s2b?: number;
    penaltyWinner?: 'a' | 'b' | null;
  }) => void;
  onClose: () => void;
  L: StringsDict;
  isKnockout?: boolean;
}

export const ScoreModal: React.FC<ScoreModalProps> = ({
  match,
  onSave,
  onClose,
  L,
  isKnockout = false
}) => {
  const twoLegs = Number(match.legs) === 2;

  const [sa, setSa] = useState<string>(match.sa != null ? String(match.sa) : '');
  const [sb, setSb] = useState<string>(match.sb != null ? String(match.sb) : '');
  const [s2a, setS2a] = useState<string>(match.s2a != null ? String(match.s2a) : '');
  const [s2b, setS2b] = useState<string>(match.s2b != null ? String(match.s2b) : '');
  const [penaltyWinner, setPenaltyWinner] = useState<'a' | 'b' | null>(match.penaltyWinner || null);
  const [error, setError] = useState<string | null>(null);

  const g1a = parseInt(sa, 10);
  const g1b = parseInt(sb, 10);
  const g2a = parseInt(s2a, 10);
  const g2b = parseInt(s2b, 10);

  const hasLeg1 = !isNaN(g1a) && !isNaN(g1b);
  const hasLeg2 = twoLegs && s2a.trim() !== '' && s2b.trim() !== '' && !isNaN(g2a) && !isNaN(g2b);

  const aggA = (g1a || 0) + (twoLegs && hasLeg2 ? g2a || 0 : 0);
  const aggB = (g1b || 0) + (twoLegs && hasLeg2 ? g2b || 0 : 0);

  const isTied = isKnockout && (
    (!twoLegs && hasLeg1 && g1a === g1b) ||
    (twoLegs && hasLeg1 && hasLeg2 && aggA === aggB)
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (isNaN(g1a) || isNaN(g1b) || g1a < 0 || g1b < 0) {
      setError(L.tNeedGoals);
      return;
    }

    if (twoLegs) {
      const has2a = s2a.trim() !== '';
      const has2b = s2b.trim() !== '';

      if ((has2a && !has2b) || (!has2a && has2b)) {
        setError('Completa ambos goles del partido de Vuelta, o déjalos vacíos si se juega otro día.');
        return;
      }

      if (has2a && has2b) {
        if (isNaN(g2a) || isNaN(g2b) || g2a < 0 || g2b < 0) {
          setError(L.tNeedGoals);
          return;
        }

        if (isTied && !penaltyWinner) {
          setError('La eliminatoria está empatada en el global. Selecciona qué equipo ganó en penales.');
          return;
        }

        onSave({ sa: g1a, sb: g1b, s2a: g2a, s2b: g2b, penaltyWinner: isTied ? penaltyWinner : null });
      } else {
        // Only Leg 1 played, Leg 2 pending for another day
        onSave({ sa: g1a, sb: g1b, s2a: undefined, s2b: undefined, penaltyWinner: null });
      }
    } else {
      if (isTied && !penaltyWinner) {
        setError('El partido está empatado. Selecciona qué equipo ganó en la tanda de penales.');
        return;
      }
      onSave({ sa: g1a, sb: g1b, penaltyWinner: isTied ? penaltyWinner : null });
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Sheet Header */}
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
            <div style={{ font: '800 20px var(--font-heading)' }}>{L.scoreTitle}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-neutral-600)', marginTop: '2px' }}>
              {twoLegs
                ? 'Puedes guardar solo el partido de Ida hoy y registrar la Vuelta cuando se juegue.'
                : L.scoreSub}
            </div>
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

        {/* Form Body */}
        <form onSubmit={handleSave} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* First Leg */}
          <div>
            {twoLegs && (
              <div
                style={{
                  font: '800 11px var(--font-heading)',
                  letterSpacing: '.14em',
                  textTransform: 'uppercase',
                  color: 'var(--color-accent)',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>{L.legIda}</span>
                {hasLeg1 && (
                  <span
                    style={{
                      fontSize: '9px',
                      background: 'var(--color-accent-100)',
                      color: 'var(--color-accent-800)',
                      padding: '2px 6px',
                      fontWeight: 700
                    }}
                  >
                    Guardado
                  </span>
                )}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '14px', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>{match.a}</div>
                <input
                  type="number"
                  min="0"
                  className="input"
                  style={{
                    minHeight: '52px',
                    textAlign: 'center',
                    fontFamily: 'var(--font-heading)',
                    fontSize: '28px',
                    fontWeight: 800
                  }}
                  value={sa}
                  onChange={(e) => setSa(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ font: '800 20px var(--font-heading)', color: 'var(--color-neutral-500)', marginTop: '20px' }}>
                —
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>{match.b}</div>
                <input
                  type="number"
                  min="0"
                  className="input"
                  style={{
                    minHeight: '52px',
                    textAlign: 'center',
                    fontFamily: 'var(--font-heading)',
                    fontSize: '28px',
                    fontWeight: 800
                  }}
                  value={sb}
                  onChange={(e) => setSb(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Second Leg (Vuelta - optional if played another day) */}
          {twoLegs && (
            <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}
              >
                <div
                  style={{
                    font: '800 11px var(--font-heading)',
                    letterSpacing: '.14em',
                    textTransform: 'uppercase',
                    color: 'var(--color-accent)'
                  }}
                >
                  {L.legVuelta}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-neutral-600)', fontStyle: 'italic' }}>
                  {hasLeg2 ? 'Completado' : 'Opcional (si se juega otro día)'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '14px', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>{match.a}</div>
                  <input
                    type="number"
                    min="0"
                    placeholder="—"
                    className="input"
                    style={{
                      minHeight: '52px',
                      textAlign: 'center',
                      fontFamily: 'var(--font-heading)',
                      fontSize: '28px',
                      fontWeight: 800
                    }}
                    value={s2a}
                    onChange={(e) => setS2a(e.target.value)}
                  />
                </div>

                <div style={{ font: '800 20px var(--font-heading)', color: 'var(--color-neutral-500)', marginTop: '20px' }}>
                  —
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>{match.b}</div>
                  <input
                    type="number"
                    min="0"
                    placeholder="—"
                    className="input"
                    style={{
                      minHeight: '52px',
                      textAlign: 'center',
                      fontFamily: 'var(--font-heading)',
                      fontSize: '28px',
                      fontWeight: 800
                    }}
                    value={s2b}
                    onChange={(e) => setS2b(e.target.value)}
                  />
                </div>
              </div>

              {/* Status Indicator */}
              <div
                style={{
                  marginTop: '12px',
                  background: 'var(--color-bg)',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px'
                }}
              >
                {hasLeg2 ? (
                  <>
                    <span style={{ color: 'var(--color-neutral-700)', fontWeight: 600 }}>{L.aggWord}:</span>
                    <span style={{ font: '800 16px var(--font-heading)', color: 'var(--color-accent)' }}>
                      {aggA} — {aggB}
                    </span>
                  </>
                ) : hasLeg1 ? (
                  <>
                    <span style={{ color: 'var(--color-neutral-700)', fontWeight: 600 }}>Parcial (Ida):</span>
                    <span style={{ font: '800 15px var(--font-heading)', color: 'var(--color-neutral-800)' }}>
                      {sa} — {sb} · <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--color-neutral-600)' }}>Vuelta pendiente</span>
                    </span>
                  </>
                ) : (
                  <span style={{ color: 'var(--color-neutral-600)', fontStyle: 'italic' }}>
                    Ingresa los goles del primer partido.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Penalty Shootout Selector if tied in playoff */}
          {isTied && (
            <div
              style={{
                border: '2px dashed var(--color-accent)',
                background: 'var(--color-accent-100)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginTop: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🥅</span>
                <div>
                  <div
                    style={{
                      font: '800 12px var(--font-heading)',
                      color: 'var(--color-accent-800)',
                      textTransform: 'uppercase',
                      letterSpacing: '.05em'
                    }}
                  >
                    Definición por Penales
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-neutral-700)' }}>
                    Empate en eliminatoria. Selecciona qué equipo ganó en penales:
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPenaltyWinner('a')}
                  style={{
                    padding: '10px 8px',
                    fontFamily: 'var(--font-heading)',
                    fontSize: '13px',
                    fontWeight: 800,
                    border: penaltyWinner === 'a' ? '2px solid var(--color-accent)' : '1px solid var(--color-divider)',
                    background: penaltyWinner === 'a' ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: penaltyWinner === 'a' ? '#fff' : 'var(--color-text)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                    {match.a}
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 700 }}>
                    {penaltyWinner === 'a' ? '✓ Ganador Penales' : 'Ganador'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPenaltyWinner('b')}
                  style={{
                    padding: '10px 8px',
                    fontFamily: 'var(--font-heading)',
                    fontSize: '13px',
                    fontWeight: 800,
                    border: penaltyWinner === 'b' ? '2px solid var(--color-accent)' : '1px solid var(--color-divider)',
                    background: penaltyWinner === 'b' ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: penaltyWinner === 'b' ? '#fff' : 'var(--color-text)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                    {match.b}
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 700 }}>
                    {penaltyWinner === 'b' ? '✓ Ganador Penales' : 'Ganador'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                background: 'var(--color-accent-100)',
                borderLeft: '4px solid var(--color-accent)',
                padding: '8px 12px',
                fontSize: '12px',
                color: 'var(--color-accent-800)'
              }}
            >
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ minHeight: '44px' }}
              onClick={onClose}
            >
              {L.cancel}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ minHeight: '44px' }}
            >
              {hasLeg2 || !twoLegs ? L.saveScore : 'Guardar Partido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
