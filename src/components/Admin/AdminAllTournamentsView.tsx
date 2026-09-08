import React, { useState, useEffect, useCallback } from 'react';
import { AdminTournamentSummary, AdminPlayerSummary, AdminPlayerTournament, StringsDict } from '../../types/tournament';
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
  Users2,
  Ban,
  CheckCircle2,
  UserMinus,
  Mail,
  Calendar
} from 'lucide-react';

interface AdminAllTournamentsViewProps {
  onSelectTournament: (tournamentId: string) => void;
  onBack: () => void;
  isTablet: boolean;
  L?: StringsDict;
  onShowToast?: (msg: string) => void;
}

export const AdminAllTournamentsView: React.FC<AdminAllTournamentsViewProps> = ({
  onSelectTournament,
  onBack,
  isTablet,
  onShowToast
}) => {
  const [activeSection, setActiveSection] = useState<'tournaments' | 'players'>('tournaments');

  // Tournaments state
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [query, setQuery] = useState('');
  const [tournaments, setTournaments] = useState<AdminTournamentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Players state
  const [players, setPlayers] = useState<AdminPlayerSummary[]>([]);
  const [playersQuery, setPlayersQuery] = useState('');
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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

  const loadPlayers = useCallback(async () => {
    setPlayersLoading(true);
    setPlayersError(null);
    try {
      const data = await tournamentService.fetchAllPlayersAdmin();
      setPlayers(data);
    } catch (err: any) {
      console.error('Error loading admin players:', err);
      setPlayersError(err?.message || 'Error al cargar jugadores');
    } finally {
      setPlayersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  useEffect(() => {
    if (activeSection === 'players') {
      loadPlayers();
    }
  }, [activeSection, loadPlayers]);

  const handleToggleBlock = async (player: AdminPlayerSummary) => {
    const willBlock = !player.is_blocked;
    const confirmMsg = willBlock
      ? `¿Bloquear el acceso al jugador "${player.nickname}"? No podrá acceder a la plataforma.`
      : `¿Desbloquear el acceso al jugador "${player.nickname}"?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(player.id);
    try {
      await tournamentService.adminToggleBlockPlayer(player.id, willBlock);
      setPlayers((prev) =>
        prev.map((p) => (p.id === player.id ? { ...p, is_blocked: willBlock } : p))
      );
      if (onShowToast) {
        onShowToast(
          willBlock
            ? `Jugador ${player.nickname} bloqueado.`
            : `Jugador ${player.nickname} desbloqueado.`
        );
      }
    } catch (err: any) {
      console.error('Error toggling player block:', err);
      alert(err?.message || 'No se pudo cambiar el estado del jugador');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveFromTournament = async (
    player: AdminPlayerSummary,
    tour: AdminPlayerTournament
  ) => {
    const confirmMsg = `¿Estás seguro de retirar a "${player.nickname}" de la liga/torneo "${tour.tournament_name}"?`;
    if (!window.confirm(confirmMsg)) return;

    const actionKey = `${player.id}-${tour.tournament_id}`;
    setActionLoadingId(actionKey);
    try {
      await tournamentService.adminRemovePlayerFromTournament(tour.tournament_id, player.id);
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id !== player.id) return p;
          return {
            ...p,
            tournaments: p.tournaments.filter((t) => t.tournament_id !== tour.tournament_id)
          };
        })
      );
      if (onShowToast) {
        onShowToast(`"${player.nickname}" retirado de "${tour.tournament_name}".`);
      }
    } catch (err: any) {
      console.error('Error removing player from tournament:', err);
      alert(err?.message || 'No se pudo retirar al jugador del torneo');
    } finally {
      setActionLoadingId(null);
    }
  };

  const q = query.trim().toLowerCase();
  const filteredTournaments = q
    ? tournaments.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.game.toLowerCase().includes(q) ||
          (t.creator_name && t.creator_name.toLowerCase().includes(q)) ||
          (t.champion_name && t.champion_name.toLowerCase().includes(q))
      )
    : tournaments;

  const pq = playersQuery.trim().toLowerCase();
  const filteredPlayers = pq
    ? players.filter(
        (p) =>
          p.nickname.toLowerCase().includes(pq) ||
          (p.email && p.email.toLowerCase().includes(pq)) ||
          p.tournaments.some((t) => t.tournament_name.toLowerCase().includes(pq))
      )
    : players;

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
              marginBottom: '20px',
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
                  Panel de Administración
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-neutral-600)', marginTop: '4px' }}>
                  Gestión integral de torneos y jugadores de la plataforma
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                onClick={activeSection === 'tournaments' ? loadTournaments : loadPlayers}
                disabled={activeSection === 'tournaments' ? loading : playersLoading}
                style={{ gap: '6px' }}
              >
                <RefreshCw
                  size={14}
                  className={
                    (activeSection === 'tournaments' && loading) ||
                    (activeSection === 'players' && playersLoading)
                      ? 'animate-spin'
                      : ''
                  }
                />
                <span>Actualizar</span>
              </button>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              borderBottom: '1px solid var(--color-divider)',
              paddingBottom: '16px',
              marginBottom: '20px',
              flexWrap: 'wrap'
            }}
          >
            <button
              className={`btn ${activeSection === 'tournaments' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSection('tournaments')}
              style={{
                gap: '8px',
                fontWeight: 800,
                fontSize: '13px',
                paddingInline: '18px',
                minHeight: '40px'
              }}
            >
              <Trophy size={16} />
              <span>Todos los Torneos ({tournaments.length})</span>
            </button>

            <button
              className={`btn ${activeSection === 'players' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSection('players')}
              style={{
                gap: '8px',
                fontWeight: 800,
                fontSize: '13px',
                paddingInline: '18px',
                minHeight: '40px'
              }}
            >
              <Users2 size={16} />
              <span>Players Registrados ({players.length})</span>
            </button>
          </div>

          {/* SECTION 1: TOURNAMENTS */}
          {activeSection === 'tournaments' && (
            <>
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
                    placeholder="Buscar por nombre, código, creador..."
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
              {!loading && !error && filteredTournaments.length === 0 && (
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

              {!loading && !error && filteredTournaments.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isTablet ? 'repeat(auto-fill, minmax(360px, 1fr))' : '1fr',
                    gap: '16px'
                  }}
                >
                  {filteredTournaments.map((t) => (
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

                        <div style={{ fontSize: '12px', color: 'var(--color-neutral-600)', marginBottom: '4px' }}>
                          🎮 {t.game} · {t.start_date || (t.created_at ? t.created_at.split('T')[0] : '')}
                        </div>

                        {/* Creator Info */}
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--color-neutral-600)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>👤 Creado por:</span>
                          <span
                            style={{
                              fontWeight: 700,
                              color: 'var(--color-text)',
                              background: 'var(--color-bg)',
                              padding: '1px 6px',
                              borderRadius: '3px',
                              border: '1px solid var(--color-divider)'
                            }}
                          >
                            {t.creator_name || 'Desconocido'}
                          </span>
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
            </>
          )}

          {/* SECTION 2: REGISTERED PLAYERS */}
          {activeSection === 'players' && (
            <>
              {/* Search Bar for Players */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid var(--color-divider)',
                  background: 'var(--color-surface)',
                  padding: '6px 12px',
                  width: '100%',
                  boxSizing: 'border-box',
                  marginBottom: '20px'
                }}
              >
                <Search size={16} style={{ color: 'var(--color-neutral-500)', marginRight: '8px' }} />
                <input
                  type="text"
                  placeholder="Buscar por nickname, email o nombre de torneo..."
                  value={playersQuery}
                  onChange={(e) => setPlayersQuery(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '13px',
                    color: 'var(--color-text)'
                  }}
                />
                {playersQuery && (
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '2px', border: 'none' }}
                    onClick={() => setPlayersQuery('')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Loading or Error */}
              {playersLoading && (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-neutral-600)' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                  <div>Cargando lista de jugadores registrados...</div>
                </div>
              )}

              {playersError && !playersLoading && (
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
                  <strong>Error:</strong> {playersError}
                </div>
              )}

              {/* Empty state */}
              {!playersLoading && !playersError && filteredPlayers.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '64px 20px',
                    border: '2px dashed var(--color-divider)',
                    color: 'var(--color-neutral-600)'
                  }}
                >
                  <Users2 size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <div style={{ font: '800 16px var(--font-heading)', marginBottom: '6px' }}>
                    No se encontraron jugadores
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    {playersQuery ? 'Prueba ajustando el término de búsqueda.' : 'No hay jugadores registrados aún.'}
                  </div>
                </div>
              )}

              {/* Players List */}
              {!playersLoading && !playersError && filteredPlayers.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredPlayers.map((player) => {
                    const isBlocking = actionLoadingId === player.id;
                    const initial = (player.nickname || 'U').charAt(0).toUpperCase();

                    return (
                      <div
                        key={player.id}
                        style={{
                          background: 'var(--color-surface)',
                          border: player.is_blocked
                            ? '1px solid rgba(239, 68, 68, 0.4)'
                            : '1px solid var(--color-divider)',
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px'
                        }}
                      >
                        {/* Player Header Row */}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: isTablet ? 'row' : 'column',
                            justifyContent: 'space-between',
                            alignItems: isTablet ? 'center' : 'flex-start',
                            gap: '14px',
                            borderBottom: '1px solid var(--color-divider)',
                            paddingBottom: '14px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '42px',
                                height: '42px',
                                background: player.is_blocked
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : 'var(--color-accent-100)',
                                color: player.is_blocked ? '#ef4444' : 'var(--color-accent)',
                                fontWeight: 900,
                                fontSize: '16px',
                                display: 'grid',
                                placeItems: 'center',
                                borderRadius: '6px'
                              }}
                            >
                              {initial}
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ font: '800 17px var(--font-heading)', color: 'var(--color-text)' }}>
                                  {player.nickname}
                                </span>

                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    padding: '2px 7px',
                                    borderRadius: '4px',
                                    background: player.is_blocked
                                      ? 'rgba(239, 68, 68, 0.15)'
                                      : 'rgba(34, 197, 94, 0.15)',
                                    color: player.is_blocked ? '#ef4444' : '#16a34a',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  {player.is_blocked ? (
                                    <>
                                      <Ban size={10} />
                                      <span>Bloqueado</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 size={10} />
                                      <span>Activo</span>
                                    </>
                                  )}
                                </span>
                              </div>

                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  fontSize: '12px',
                                  color: 'var(--color-neutral-600)',
                                  marginTop: '3px',
                                  flexWrap: 'wrap'
                                }}
                              >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <Mail size={12} />
                                  <span>{player.email || 'Sin correo (presencial)'}</span>
                                </span>

                                {player.created_at && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Calendar size={12} />
                                    <span>Registrado: {player.created_at.split('T')[0]}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action: Toggle Block */}
                          <div>
                            <button
                              className="btn btn-secondary"
                              style={{
                                borderColor: player.is_blocked ? '#16a34a' : '#ef4444',
                                color: player.is_blocked ? '#16a34a' : '#ef4444',
                                fontSize: '11px',
                                fontWeight: 800,
                                gap: '6px',
                                paddingInline: '14px',
                                minHeight: '34px'
                              }}
                              disabled={isBlocking}
                              onClick={() => handleToggleBlock(player)}
                            >
                              {player.is_blocked ? (
                                <>
                                  <CheckCircle2 size={13} />
                                  <span>{isBlocking ? 'Desbloqueando...' : 'Desbloquear Acceso'}</span>
                                </>
                              ) : (
                                <>
                                  <Ban size={13} />
                                  <span>{isBlocking ? 'Bloqueando...' : 'Bloquear Acceso'}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Player Tournaments Section */}
                        <div>
                          <div
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '.1em',
                              color: 'var(--color-neutral-600)',
                              marginBottom: '10px'
                            }}
                          >
                            Ligas y Torneos en los que juega ({player.tournaments.length}):
                          </div>

                          {player.tournaments.length === 0 ? (
                            <div
                              style={{
                                fontSize: '12px',
                                color: 'var(--color-neutral-500)',
                                background: 'var(--color-bg)',
                                padding: '12px 14px',
                                border: '1px dashed var(--color-divider)',
                                borderRadius: '4px'
                              }}
                            >
                              Actualmente no está inscrito en ningún torneo o liga.
                            </div>
                          ) : (
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: isTablet
                                  ? 'repeat(auto-fill, minmax(320px, 1fr))'
                                  : '1fr',
                                gap: '10px'
                              }}
                            >
                              {player.tournaments.map((tour) => {
                                const actionKey = `${player.id}-${tour.tournament_id}`;
                                const isRemoving = actionLoadingId === actionKey;

                                return (
                                  <div
                                    key={tour.tournament_id}
                                    style={{
                                      background: 'var(--color-bg)',
                                      border: '1px solid var(--color-divider)',
                                      padding: '12px 14px',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      justifyContent: 'space-between',
                                      gap: '10px'
                                    }}
                                  >
                                    <div>
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          marginBottom: '6px'
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontFamily: 'monospace',
                                            fontWeight: 800,
                                            fontSize: '11px',
                                            color: 'var(--color-accent)'
                                          }}
                                        >
                                          {tour.tournament_id}
                                        </span>
                                        <span
                                          style={{
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            padding: '1px 5px',
                                            borderRadius: '3px',
                                            background: tour.closed
                                              ? 'var(--color-divider)'
                                              : 'rgba(34, 197, 94, 0.15)',
                                            color: tour.closed ? 'var(--color-neutral-600)' : '#16a34a'
                                          }}
                                        >
                                          {tour.closed ? 'Archivado' : 'En Juego'}
                                        </span>
                                      </div>

                                      <div
                                        style={{
                                          fontWeight: 800,
                                          fontSize: '13px',
                                          color: 'var(--color-text)',
                                          marginBottom: '4px'
                                        }}
                                      >
                                        {tour.tournament_name}
                                      </div>

                                      <div
                                        style={{
                                          fontSize: '11px',
                                          color: 'var(--color-neutral-600)',
                                          display: 'flex',
                                          gap: '8px',
                                          flexWrap: 'wrap'
                                        }}
                                      >
                                        <span>Rol: <strong>{tour.role}</strong></span>
                                        {tour.team_name && <span>· Equipo: <strong>{tour.team_name}</strong></span>}
                                        <span>· Tipo: <strong>{tour.type}</strong></span>
                                      </div>
                                    </div>

                                    {/* Action: Remove from tournament */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px dashed var(--color-divider)', paddingTop: '8px' }}>
                                      <button
                                        className="btn btn-secondary"
                                        style={{
                                          padding: '4px 10px',
                                          fontSize: '11px',
                                          gap: '6px',
                                          color: '#ef4444',
                                          borderColor: 'rgba(239, 68, 68, 0.3)'
                                        }}
                                        disabled={isRemoving}
                                        onClick={() => handleRemoveFromTournament(player, tour)}
                                      >
                                        <UserMinus size={12} />
                                        <span>{isRemoving ? 'Retirando...' : 'Retirar de Liga'}</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
