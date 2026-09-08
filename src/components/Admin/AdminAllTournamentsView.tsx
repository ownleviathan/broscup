import React, { useState, useEffect, useCallback } from 'react';
import { AdminTournamentSummary, StringsDict } from '../../types/tournament';
import { tournamentService } from '../../services/tournamentService';
import {
  ShieldAlert,
  Search,
  X,
  RefreshCw,
  Trophy,
  BarChart3,
  Layers,
  ArrowRight,
  ArrowLeft,
  Wifi,
  Users2
} from 'lucide-react';

interface AdminAllTournamentsViewProps {
  onSelectTournament: (tournamentId: string) => void;
  onBack: () => void;
  isTablet: boolean;
  L?: StringsDict;
}

export const AdminAllTournamentsView: React.FC<AdminAllTournamentsViewProps> = ({
  onSelectTournament,
  onBack,
  isTablet
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [query, setQuery] = useState('');
  const [tournaments, setTournaments] = useState<AdminTournamentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTournaments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tournamentService.fetchAllTournamentsAdmin(filter);
      setTournaments(data);
    } catch (err: any) {
      console.error('Error loading admin tournaments:', err);
      setError(err?.message || 'Error al cargar torneos');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? tournaments.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.game.toLowerCase().includes(q) ||
          (t.champion_name && t.champion_name.toLowerCase().includes(q))
      )
    : tournaments;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'liga':
        return <BarChart3 size={13} />;
      case 'copa':
        return <Trophy size={13} />;
      case 'grupos':
        return <Layers size={13} />;
      default:
        return <Trophy size={13} />;
    }
  };

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
          {/* Superadmin Header */}
          <div
            style={{
              paddingBottom: '20px',
              borderBottom: '2px solid var(--color-divider)',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: isTablet ? 'row' : 'column',
              justifyContent: 'space-between',
              alignItems: isTablet ? 'center' : 'flex-start',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                className="btn btn-icon btn-secondary"
                style={{ borderColor: 'var(--color-divider)' }}
                onClick={onBack}
                title="Volver"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span
                  style={{
                    background: 'var(--color-accent)',
                    color: 'var(--color-bg)',
                    fontSize: '10px',
                    fontWeight: 900,
                    letterSpacing: '.12em',
                    padding: '2px 8px',
                    textTransform: 'uppercase'
                  }}
                >
                  Super Admin
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-neutral-500)', fontFamily: 'monospace' }}>
                  test@broscup.com
                </span>
              </div>
              <div
                style={{
                  font: '800 28px/1 var(--font-heading)',
                  letterSpacing: '-.02em',
                  textTransform: 'uppercase'
                }}
              >
                Todos los Torneos
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-neutral-600)', marginTop: '4px' }}>
                Vista global del sistema · Monitoreo y acceso a cualquier torneo activo o archivado
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                onClick={loadTournaments}
                disabled={loading}
                style={{ gap: '6px' }}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>Actualizar</span>
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div
            style={{
              display: 'flex',
              flexDirection: isTablet ? 'row' : 'column',
              gap: '12px',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}
          >
            {/* Status Filter Tabs */}
            <div style={{ display: 'flex', border: '1px solid var(--color-divider)', background: 'var(--color-bg)' }}>
              <button
                className="btn"
                style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 800,
                  borderRadius: 0,
                  border: 'none',
                  background: filter === 'all' ? 'var(--color-accent)' : 'transparent',
                  color: filter === 'all' ? 'var(--color-bg)' : 'var(--color-text)'
                }}
                onClick={() => setFilter('all')}
              >
                Todos ({tournaments.length})
              </button>
              <button
                className="btn"
                style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 800,
                  borderRadius: 0,
                  border: 'none',
                  background: filter === 'active' ? 'var(--color-accent)' : 'transparent',
                  color: filter === 'active' ? 'var(--color-bg)' : 'var(--color-text)'
                }}
                onClick={() => setFilter('active')}
              >
                🟢 En Juego
              </button>
              <button
                className="btn"
                style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 800,
                  borderRadius: 0,
                  border: 'none',
                  background: filter === 'archived' ? 'var(--color-accent)' : 'transparent',
                  color: filter === 'archived' ? 'var(--color-bg)' : 'var(--color-text)'
                }}
                onClick={() => setFilter('archived')}
              >
                📁 Archivados
              </button>
            </div>

            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid var(--color-divider)',
                background: 'var(--color-surface)',
                padding: '4px 10px',
                width: isTablet ? '320px' : '100%',
                boxSizing: 'border-box'
              }}
            >
              <Search size={16} style={{ color: 'var(--color-neutral-500)', marginRight: '8px' }} />
              <input
                type="text"
                placeholder="Buscar por nombre, código, juego..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '13px',
                  color: 'var(--color-text)'
                }}
              />
              {query && (
                <button
                  className="btn btn-ghost"
                  style={{ padding: '2px', border: 'none' }}
                  onClick={() => setQuery('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Loading or Error */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-neutral-600)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              <div>Cargando torneos del sistema...</div>
            </div>
          )}

          {error && !loading && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                padding: '16px',
                color: '#ef4444',
                fontSize: '13px',
                marginBottom: '20px'
              }}
            >
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Tournaments Grid */}
          {!loading && !error && filtered.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '64px 20px',
                border: '2px dashed var(--color-divider)',
                color: 'var(--color-neutral-600)'
              }}
            >
              <ShieldAlert size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <div style={{ font: '800 16px var(--font-heading)', marginBottom: '6px' }}>
                No se encontraron torneos
              </div>
              <div style={{ fontSize: '12px' }}>
                {query ? 'Prueba ajustando el término de búsqueda.' : 'No hay torneos con el filtro seleccionado.'}
              </div>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isTablet ? 'repeat(auto-fill, minmax(360px, 1fr))' : '1fr',
                gap: '16px'
              }}
            >
              {filtered.map((t) => (
                <div
                  key={t.id}
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-divider)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                    position: 'relative'
                  }}
                >
                  {/* Top line with badges */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        marginBottom: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '12px',
                            background: 'var(--color-bg)',
                            border: '1px solid var(--color-divider)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            color: 'var(--color-accent)'
                          }}
                        >
                          {t.id}
                        </span>

                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '3px 7px',
                            borderRadius: '4px',
                            background: t.closed ? 'var(--color-divider)' : 'rgba(34, 197, 94, 0.15)',
                            color: t.closed ? 'var(--color-neutral-600)' : '#16a34a',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {t.closed ? '📁 Archivado' : '🟢 En Juego'}
                        </span>

                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '3px 7px',
                            borderRadius: '4px',
                            background: t.mode === 'offline' ? 'rgba(234, 88, 12, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: t.mode === 'offline' ? '#ea580c' : '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {t.mode === 'offline' ? <Users2 size={10} /> : <Wifi size={10} />}
                          {t.mode === 'offline' ? 'Presencial' : 'Online'}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          textTransform: 'uppercase',
                          fontWeight: 800,
                          color: 'var(--color-neutral-600)'
                        }}
                      >
                        {getTypeIcon(t.type)}
                        <span>{t.type}</span>
                      </div>
                    </div>

                    {/* Tournament Name */}
                    <div
                      style={{
                        font: '800 18px var(--font-heading)',
                        letterSpacing: '-.01em',
                        marginBottom: '4px',
                        color: 'var(--color-text)'
                      }}
                    >
                      {t.name}
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--color-neutral-600)' }}>
                      🎮 {t.game} · {t.start_date || (t.created_at ? t.created_at.split('T')[0] : '')}
                    </div>
                  </div>

                  {/* Stats breakdown */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px',
                      background: 'var(--color-bg)',
                      padding: '10px 12px',
                      border: '1px solid var(--color-divider)',
                      fontSize: '12px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--color-neutral-500)', textTransform: 'uppercase' }}>
                        Jugadores
                      </div>
                      <div style={{ fontWeight: 800 }}>
                        {t.member_count} / {t.teams}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--color-neutral-500)', textTransform: 'uppercase' }}>
                        Partidos Jugados
                      </div>
                      <div style={{ fontWeight: 800 }}>
                        {t.played_matches} / {t.total_matches}
                      </div>
                    </div>

                    {t.champion_name && (
                      <div style={{ gridColumn: 'span 2', marginTop: '4px', borderTop: '1px dashed var(--color-divider)', paddingTop: '6px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: 800 }}>
                          🏆 Campeón: {t.champion_name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button
                      className="btn btn-primary"
                      style={{
                        minHeight: '38px',
                        paddingInline: '16px',
                        gap: '6px',
                        fontSize: '12px',
                        width: '100%',
                        justifyContent: 'center'
                      }}
                      onClick={() => onSelectTournament(t.id)}
                    >
                      <span>Abrir Torneo</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
