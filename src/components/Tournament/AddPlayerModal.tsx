import React, { useState } from 'react';
import { X, UserPlus, Shield } from 'lucide-react';
import { StringsDict } from '../../types/tournament';

interface AddPlayerModalProps {
  onAdd: (nickname: string, teamName?: string) => Promise<void>;
  onClose: () => void;
  L: StringsDict;
}

export const AddPlayerModal: React.FC<AddPlayerModalProps> = ({
  onAdd,
  onClose,
  L
}) => {
  const [nickname, setNickname] = useState('');
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNick = nickname.trim();
    if (!cleanNick || cleanNick.length < 2) {
      setError('Introduce un apodo válido (mínimo 2 caracteres).');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onAdd(cleanNick, teamName.trim() || undefined);
      onClose();
    } catch (err: any) {
      console.error('Error adding player:', err);
      const msg = err?.message || '';
      if (msg.includes('member_already_in_tournament') || msg.includes('duplicate key')) {
        setError('Ya existe un jugador con este apodo en el torneo.');
      } else if (msg.includes('tournament_full')) {
        setError('El torneo ya ha alcanzado el límite de participantes.');
      } else {
        setError('No se pudo agregar al jugador. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="bottom-sheet"
        style={{ maxWidth: '440px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 20px 14px',
            borderBottom: '1px solid var(--color-divider)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={20} color="var(--color-accent)" />
            <div>
              <div style={{ font: '800 17px var(--font-heading)' }}>Agregar jugador</div>
              <div style={{ fontSize: '11px', color: 'var(--color-neutral-600)', marginTop: '2px' }}>
                Torneo presencial / offline
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-icon btn-secondary"
            style={{ width: '32px', height: '32px', padding: 0 }}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: '#fee2e2',
                color: '#b91c1c',
                borderRadius: '4px',
                fontSize: '13px',
                borderLeft: '4px solid #ef4444'
              }}
            >
              {error}
            </div>
          )}

          <div className="field">
            <label style={{ font: '700 13px var(--font-heading)', color: 'var(--color-text)' }}>
              Apodo / Nombre del jugador <span style={{ color: 'var(--color-accent)' }}>*</span>
            </label>
            <input
              className="input"
              style={{ minHeight: '44px' }}
              placeholder="Ej. Beto, Carlos, Dani..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="field">
            <label style={{ font: '700 13px var(--font-heading)', color: 'var(--color-text)' }}>
              Equipo que representa <span style={{ color: 'var(--color-neutral-600)', fontWeight: 400 }}>(opcional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                style={{ minHeight: '44px', paddingLeft: '36px' }}
                placeholder="Ej. Real Madrid, Arsenal, Francia..."
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                disabled={loading}
              />
              <Shield
                size={16}
                color="var(--color-neutral-600)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-neutral-600)', marginTop: '4px' }}>
              Se mostrará debajo de su nombre en la tabla y los partidos.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1, minHeight: '44px' }}
              onClick={onClose}
              disabled={loading}
            >
              {L.cancel}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1.5, minHeight: '44px' }}
              disabled={loading || !nickname.trim()}
            >
              {loading ? 'Agregando...' : 'Agregar jugador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
