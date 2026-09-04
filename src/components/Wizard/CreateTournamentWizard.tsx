import React, { useState } from 'react';
import {
  Tournament,
  TournamentType,
  FinalsType,
  StringsDict,
  FormState
} from '../../types/tournament';
import { teamPresets, typeLabel, bracket } from '../../utils/tournamentEngine';
import { ArrowLeft, ArrowRight, Minus, Plus, Trophy, BarChart3, Layers } from 'lucide-react';

interface CreateTournamentWizardProps {
  userNick: string;
  onCancel: () => void;
  onCreated: (tour: Tournament, form?: FormState) => void;
  L: StringsDict;
  isTablet: boolean;
}

export const CreateTournamentWizard: React.FC<CreateTournamentWizardProps> = ({
  userNick,
  onCancel,
  onCreated,
  L,
  isTablet
}) => {
  const [form, setForm] = useState<FormState>({
    step: 1,
    name: '',
    game: '',
    date: '',
    feeOn: false,
    fee: '',
    teams: 8,
    type: 'liga',
    finals: 'top4',
    legs: 1,
    semiLegs: 1,
    finalLegs: 1,
    groupLegs: 1,
    mode: 'online'
  });

  const gameIdeas = ['FC 26', 'FC 27', 'Mario Kart'];

  const handleTypeSelect = (t: TournamentType) => {
    const presets = teamPresets(t);
    const validTeams = presets.includes(Number(form.teams)) || t === 'liga' ? form.teams : presets[1] || presets[0];
    setForm((prev) => ({ ...prev, type: t, teams: validTeams }));
  };

  const handleNext = () => {
    if (form.step < 3) {
      setForm((prev) => ({ ...prev, step: prev.step + 1 }));
      return;
    }

    // Create tournament
    const prefix = (form.game.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3) || 'TOR')
      .toUpperCase()
      .padEnd(3, 'X');
    const randomNum = Math.floor(1000 + Math.random() * 8999);
    const newId = `${prefix}-${randomNum}`;

    const newTournament: Tournament = {
      id: newId,
      name: form.name.trim(),
      game: form.game.trim(),
      date: form.date,
      type: form.type as TournamentType,
      teams: Number(form.teams),
      finals: form.finals,
      legs: Number(form.legs || 1),
      semiLegs: Number(form.semiLegs || 1),
      finalLegs: Number(form.finalLegs || 1),
      groupLegs: Number(form.groupLegs || 1),
      feeOn: form.feeOn,
      fee: form.fee.trim() || '0 €',
      closed: false,
      mode: form.mode || 'online',
      matches: [],
      rounds: [],
      members: [{ nick: userNick, role: 'admin', paid: true, teamName: form.teamName?.trim() || undefined }]
    };

    onCreated(newTournament, form);
  };

  const handleBack = () => {
    if (form.step === 1) {
      onCancel();
    } else {
      setForm((prev) => ({ ...prev, step: prev.step - 1 }));
    }
  };

  const isNextDisabled =
    (form.step === 1 && (!form.name.trim() || !form.game.trim())) ||
    (form.step === 2 && !form.type);

  const nTeams = Number(form.teams);
  const ng = nTeams % 4 === 0 ? nTeams / 4 : 2;
  const isOdd = form.type === 'liga' && nTeams % 2 === 1;

  const typeDefs: [TournamentType, string, string, string, React.ComponentType<{ size?: number; color?: string }>][] = [
    ['liga', L.typeLiga, L.ligaMeta, L.ligaDesc, BarChart3],
    ['copa', L.typeCopa, L.copaMeta, L.copaDesc, Trophy],
    ['grupos', L.typeGrupos, L.gruposMeta, L.gruposDesc, Layers]
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header with back button and progress indicator */}
      <div
        style={{
          borderBottom: '2px solid var(--color-divider)',
          padding: isTablet ? '26px clamp(24px, 4vw, 56px) 14px' : '16px 20px 14px',
          background: 'var(--color-bg)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            maxWidth: '640px',
            margin: '0 auto',
            width: '100%'
          }}
        >
          <button
            className="btn btn-icon btn-secondary"
            style={{ borderColor: 'var(--color-divider)' }}
            onClick={handleBack}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ font: '800 24px var(--font-heading)', flex: 1 }}>{L.createTitle}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-neutral-600)', fontWeight: 600 }}>
            {L.ofWord === 'de' ? `Paso ${form.step} de 3` : `Step ${form.step} of 3`}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px', margin: '14px auto 0', maxWidth: '640px', width: '100%' }}>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              style={{
                flex: 1,
                height: '3px',
                background: n <= form.step ? 'var(--color-accent)' : 'var(--color-neutral-300)'
              }}
            />
          ))}
        </div>
      </div>

      {/* Wizard Step Body */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            width: '100%',
            maxWidth: '640px',
            padding: isTablet ? '32px 24px 40px' : '20px 20px 32px',
            boxSizing: 'border-box'
          }}
        >
          {/* STEP 1: Basic Information */}
          {form.step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="field">
                <label>{L.fName}</label>
                <input
                  className="input"
                  style={{ minHeight: '44px' }}
                  placeholder="Liga FC 26 de los martes"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  autoFocus
                />
              </div>

              <div className="field">
                <label>{L.fGame}</label>
                <input
                  className="input"
                  style={{ minHeight: '44px' }}
                  placeholder="FC 26"
                  value={form.game}
                  onChange={(e) => setForm({ ...form, game: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {gameIdeas.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className="tag tag-outline"
                    style={{ cursor: 'pointer', background: 'transparent' }}
                    onClick={() => setForm({ ...form, game: g })}
                  >
                    {g}
                  </button>
                ))}
              </div>

              <div className="field">
                <label>{L.fDate}</label>
                <input
                  className="input"
                  type="date"
                  style={{ minHeight: '44px' }}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>

              {/* Modalidad del torneo */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '10px', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', fontWeight: 700 }}>
                  Modalidad del torneo
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr 1fr' : '1fr', gap: '10px' }}>
                  <div
                    onClick={() => setForm({ ...form, mode: 'online' })}
                    style={{
                      padding: '14px',
                      cursor: 'pointer',
                      background: (form.mode || 'online') === 'online' ? 'var(--color-accent)' : 'var(--color-surface)',
                      color: (form.mode || 'online') === 'online' ? 'var(--color-bg)' : 'var(--color-text)',
                      borderLeft: `3px solid ${(form.mode || 'online') === 'online' ? 'var(--color-accent-800)' : 'var(--color-divider)'}`,
                      border: '1px solid var(--color-divider)',
                      borderLeftWidth: '3px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '18px' }}>🌐</span>
                      <span style={{ font: '800 15px var(--font-heading)' }}>En línea (Online)</span>
                    </div>
                    <div style={{ fontSize: '11px', opacity: 0.85, lineHeight: '1.3' }}>
                      Los jugadores se unen desde su móvil o PC con el código del torneo.
                    </div>
                  </div>

                  <div
                    onClick={() => setForm({ ...form, mode: 'offline' })}
                    style={{
                      padding: '14px',
                      cursor: 'pointer',
                      background: form.mode === 'offline' ? 'var(--color-accent)' : 'var(--color-surface)',
                      color: form.mode === 'offline' ? 'var(--color-bg)' : 'var(--color-text)',
                      borderLeft: `3px solid ${form.mode === 'offline' ? 'var(--color-accent-800)' : 'var(--color-divider)'}`,
                      border: '1px solid var(--color-divider)',
                      borderLeftWidth: '3px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '18px' }}>🎮</span>
                      <span style={{ font: '800 15px var(--font-heading)' }}>Presencial (Offline)</span>
                    </div>
                    <div style={{ fontSize: '11px', opacity: 0.85, lineHeight: '1.3' }}>
                      Misma consola o casa. Tú agregas a tus amigos directamente en la app.
                    </div>
                  </div>
                </div>
              </div>

              <div className="field">
                <label>
                  Equipo con el que juegas <span style={{ color: 'var(--color-neutral-600)', fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  className="input"
                  style={{ minHeight: '44px' }}
                  placeholder="Ej. Real Madrid, Arsenal, Manchester City..."
                  value={form.teamName || ''}
                  onChange={(e) => setForm({ ...form, teamName: e.target.value })}
                />
              </div>

              <div style={{ height: '2px', background: 'var(--color-divider)', margin: '8px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div>
                  <div style={{ font: '800 15px var(--font-heading)' }}>{L.feeTitle}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)' }}>{L.feeSub}</div>
                </div>
                <button
                  type="button"
                  className="btn"
                  style={{
                    width: '52px',
                    height: '30px',
                    padding: 0,
                    background: form.feeOn ? 'var(--color-accent)' : 'var(--color-neutral-300)',
                    border: '1px solid var(--color-divider)',
                    justifyContent: form.feeOn ? 'flex-end' : 'flex-start'
                  }}
                  onClick={() => setForm({ ...form, feeOn: !form.feeOn })}
                >
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      background: 'var(--color-bg)',
                      display: 'block',
                      margin: '0 2px'
                    }}
                  />
                </button>
              </div>

              {form.feeOn && (
                <div className="field">
                  <label>{L.feeAmount}</label>
                  <input
                    className="input"
                    style={{ minHeight: '44px' }}
                    placeholder="5 €"
                    value={form.fee}
                    onChange={(e) => setForm({ ...form, fee: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Format and Participants */}
          {form.step === 2 && (
            <div>
              <div
                style={{
                  fontSize: '10px',
                  letterSpacing: '.16em',
                  textTransform: 'uppercase',
                  color: 'var(--color-neutral-600)',
                  marginBottom: '10px',
                  fontWeight: 700
                }}
              >
                {L.tourType}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {typeDefs.map(([key, title, meta, desc, IconComponent]) => {
                  const isSelected = form.type === key;
                  return (
                    <div
                      key={key}
                      style={{
                        padding: '16px',
                        background: isSelected ? 'var(--color-accent)' : 'var(--color-surface)',
                        borderLeft: `3px solid ${isSelected ? 'var(--color-accent-800)' : 'var(--color-divider)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => handleTypeSelect(key)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--color-neutral-300, #f1f5f9)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: isSelected ? '#fff' : 'var(--color-accent)'
                            }}
                          >
                            <IconComponent size={18} />
                          </div>
                          <div
                            style={{
                              font: '800 18px var(--font-heading)',
                              color: isSelected ? 'var(--color-bg)' : 'var(--color-text)'
                            }}
                          >
                            {title}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: isSelected ? 'var(--color-accent-200)' : 'var(--color-neutral-700)'
                          }}
                        >
                          {meta}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          lineHeight: 1.45,
                          color: isSelected ? 'var(--color-accent-100)' : 'var(--color-neutral-700)',
                          marginTop: '8px'
                        }}
                      >
                        {desc}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ fontSize: '11px', color: 'var(--color-neutral-600)', marginTop: '12px' }}>
                {L.typeLock}
              </div>

              <div style={{ height: '2px', background: 'var(--color-divider)', margin: '22px 0 16px' }} />

              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: '10px',
                  marginBottom: '10px'
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    letterSpacing: '.16em',
                    textTransform: 'uppercase',
                    color: 'var(--color-neutral-600)',
                    fontWeight: 700
                  }}
                >
                  {L.numTeams}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-neutral-600)' }}>
                  {form.type === 'copa' ? L.hintCopa : form.type === 'grupos' ? L.hintGrupos : L.hintLiga}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {teamPresets(form.type).map((n) => {
                  const isCur = Number(form.teams) === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      className="btn"
                      style={{
                        minHeight: '48px',
                        justifyContent: 'center',
                        fontSize: '16px',
                        background: isCur ? 'var(--color-accent)' : 'var(--color-surface)',
                        color: isCur ? 'var(--color-bg)' : 'var(--color-text)',
                        border: '1px solid var(--color-divider)'
                      }}
                      onClick={() => setForm({ ...form, teams: n })}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>

              {form.type === 'liga' && (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginTop: '12px',
                      background: 'var(--color-surface)',
                      padding: '10px 12px',
                      border: '1px solid var(--color-divider)'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ font: '800 14px var(--font-heading)' }}>{L.customTitle}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-neutral-700)' }}>{L.customSub}</div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon"
                      style={{ borderColor: 'var(--color-divider)' }}
                      onClick={() => setForm({ ...form, teams: Math.max(3, nTeams - 1) })}
                    >
                      <Minus size={16} />
                    </button>
                    <div style={{ font: '800 24px var(--font-heading)', minWidth: '36px', textAlign: 'center' }}>
                      {form.teams}
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon"
                      style={{ borderColor: 'var(--color-divider)' }}
                      onClick={() => setForm({ ...form, teams: Math.min(20, nTeams + 1) })}
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {isOdd && (
                    <div
                      style={{
                        marginTop: '10px',
                        padding: '11px 12px',
                        background: 'var(--color-accent-100)',
                        borderLeft: '3px solid var(--color-accent)',
                        fontSize: '12px',
                        color: 'var(--color-accent-800)',
                        lineHeight: 1.4
                      }}
                    >
                      {L.oddNote}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* STEP 3: Advanced Options & Summary */}
          {form.step === 3 && (
            <div>
              {form.type === 'liga' && (
                <div style={{ marginBottom: '24px' }}>
                  {/* Legs */}
                  <div
                    style={{
                      fontSize: '10px',
                      letterSpacing: '.16em',
                      textTransform: 'uppercase',
                      color: 'var(--color-neutral-600)',
                      marginBottom: '10px',
                      fontWeight: 700
                    }}
                  >
                    {L.legsTitle}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '22px' }}>
                    {[
                      [1, L.legs1, L.legs1m, L.legs1d],
                      [2, L.legs2, L.legs2m, L.legs2d]
                    ].map(([k, title, meta, desc]) => {
                      const isSel = Number(form.legs) === k;
                      return (
                        <div
                          key={k}
                          style={{
                            padding: '14px',
                            background: isSel ? 'var(--color-accent)' : 'var(--color-surface)',
                            borderLeft: `3px solid ${isSel ? 'var(--color-accent-800)' : 'var(--color-divider)'}`,
                            cursor: 'pointer'
                          }}
                          onClick={() => setForm({ ...form, legs: k as number })}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div
                              style={{
                                font: '800 16px var(--font-heading)',
                                color: isSel ? 'var(--color-bg)' : 'var(--color-text)'
                              }}
                            >
                              {title}
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: isSel ? 'var(--color-accent-200)' : 'var(--color-neutral-700)'
                              }}
                            >
                              {meta}
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: isSel ? 'var(--color-accent-100)' : 'var(--color-neutral-700)',
                              marginTop: '3px'
                            }}
                          >
                            {desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* League Close */}
                  <div
                    style={{
                      fontSize: '10px',
                      letterSpacing: '.16em',
                      textTransform: 'uppercase',
                      color: 'var(--color-neutral-600)',
                      marginBottom: '10px',
                      fontWeight: 700
                    }}
                  >
                    {L.leagueClose}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      ['top4', L.f4, L.f4d],
                      ['top2', L.f2, L.f2d],
                      ['none', L.f0, L.f0d]
                    ].map(([k, title, desc]) => {
                      const isSel = form.finals === k;
                      return (
                        <div
                          key={k}
                          style={{
                            padding: '14px',
                            background: isSel ? 'var(--color-accent)' : 'var(--color-surface)',
                            borderLeft: `3px solid ${isSel ? 'var(--color-accent-800)' : 'var(--color-divider)'}`,
                            cursor: 'pointer'
                          }}
                          onClick={() => setForm({ ...form, finals: k as FinalsType })}
                        >
                          <div
                            style={{
                              font: '800 16px var(--font-heading)',
                              color: isSel ? 'var(--color-bg)' : 'var(--color-text)'
                            }}
                          >
                            {title}
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: isSel ? 'var(--color-accent-100)' : 'var(--color-neutral-700)',
                              marginTop: '3px'
                            }}
                          >
                            {desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Final Ties Leg Selectors */}
                  {form.finals !== 'none' && (
                    <div style={{ marginTop: '16px', borderTop: '2px solid var(--color-divider)', paddingTop: '16px' }}>
                      <div
                        style={{
                          fontSize: '10px',
                          letterSpacing: '.16em',
                          textTransform: 'uppercase',
                          color: 'var(--color-neutral-600)',
                          marginBottom: '12px',
                          fontWeight: 700
                        }}
                      >
                        {L.finalLegsTitle}
                      </div>

                      {form.finals === 'top4' && (
                        <div style={{ marginBottom: '14px' }}>
                          <div style={{ font: '800 14px var(--font-heading)', marginBottom: '2px' }}>
                            {L.semisLabel}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)', marginBottom: '8px' }}>
                            {L.semisSub}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            {[
                              [1, L.fl1],
                              [2, L.fl2]
                            ].map(([k, label]) => {
                              const isCur = Number(form.semiLegs) === k;
                              return (
                                <button
                                  key={k}
                                  type="button"
                                  className="btn"
                                  style={{
                                    minHeight: '44px',
                                    justifyContent: 'flex-start',
                                    paddingInline: '12px',
                                    background: isCur ? 'var(--color-accent)' : 'var(--color-surface)',
                                    color: isCur ? 'var(--color-bg)' : 'var(--color-text)',
                                    border: '1px solid var(--color-divider)'
                                  }}
                                  onClick={() => setForm({ ...form, semiLegs: k as number })}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div>
                        <div style={{ font: '800 14px var(--font-heading)', marginBottom: '2px' }}>
                          {L.grandFinalLabel}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)', marginBottom: '8px' }}>
                          {L.grandFinalSub}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          {[
                            [1, L.fl1],
                            [2, L.fl2]
                          ].map(([k, label]) => {
                            const isCur = Number(form.finalLegs) === k;
                            return (
                              <button
                                key={k}
                                type="button"
                                className="btn"
                                style={{
                                  minHeight: '44px',
                                  justifyContent: 'flex-start',
                                  paddingInline: '12px',
                                  background: isCur ? 'var(--color-accent)' : 'var(--color-surface)',
                                  color: isCur ? 'var(--color-bg)' : 'var(--color-text)',
                                  border: '1px solid var(--color-divider)'
                                }}
                                onClick={() => setForm({ ...form, finalLegs: k as number })}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* COPA: Knockout Legs Configuration */}
              {form.type === 'copa' && (
                <div style={{ marginBottom: '24px' }}>
                  <div
                    style={{
                      fontSize: '10px',
                      letterSpacing: '.16em',
                      textTransform: 'uppercase',
                      color: 'var(--color-neutral-600)',
                      marginBottom: '12px',
                      fontWeight: 700
                    }}
                  >
                    Formato de Eliminatorias (Ida y Vuelta)
                  </div>

                  {/* Rondas previas para 8 o más equipos */}
                  {nTeams >= 8 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ font: '800 14px var(--font-heading)', marginBottom: '2px' }}>
                        {nTeams >= 16 ? 'Octavos y Cuartos de final' : 'Cuartos de final'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)', marginBottom: '8px' }}>
                        Rondas eliminatorias antes de las semifinales
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        {[
                          [1, '1 Partido único'],
                          [2, 'Ida y Vuelta (2 partidos)']
                        ].map(([k, label]) => {
                          const isCur = Number(form.legs || 1) === k;
                          return (
                            <button
                              key={k}
                              type="button"
                              className="btn"
                              style={{
                                minHeight: '44px',
                                justifyContent: 'flex-start',
                                paddingInline: '12px',
                                background: isCur ? 'var(--color-accent)' : 'var(--color-surface)',
                                color: isCur ? 'var(--color-bg)' : 'var(--color-text)',
                                border: '1px solid var(--color-divider)'
                              }}
                              onClick={() => setForm({ ...form, legs: k as number })}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Semifinales */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ font: '800 14px var(--font-heading)', marginBottom: '2px' }}>
                      {L.semisLabel}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)', marginBottom: '8px' }}>
                      {L.semisSub}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      {[
                        [1, '1 Partido único'],
                        [2, 'Ida y Vuelta (2 partidos)']
                      ].map(([k, label]) => {
                        const isCur = Number(form.semiLegs || 1) === k;
                        return (
                          <button
                            key={k}
                            type="button"
                            className="btn"
                            style={{
                              minHeight: '44px',
                              justifyContent: 'flex-start',
                              paddingInline: '12px',
                              background: isCur ? 'var(--color-accent)' : 'var(--color-surface)',
                              color: isCur ? 'var(--color-bg)' : 'var(--color-text)',
                              border: '1px solid var(--color-divider)'
                            }}
                            onClick={() => setForm({ ...form, semiLegs: k as number })}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Gran Final */}
                  <div>
                    <div style={{ font: '800 14px var(--font-heading)', marginBottom: '2px' }}>
                      {L.grandFinalLabel}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)', marginBottom: '8px' }}>
                      {L.grandFinalSub}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      {[
                        [1, '1 Partido único'],
                        [2, 'Ida y Vuelta (2 partidos)']
                      ].map(([k, label]) => {
                        const isCur = Number(form.finalLegs || 1) === k;
                        return (
                          <button
                            key={k}
                            type="button"
                            className="btn"
                            style={{
                              minHeight: '44px',
                              justifyContent: 'flex-start',
                              paddingInline: '12px',
                              background: isCur ? 'var(--color-accent)' : 'var(--color-surface)',
                              color: isCur ? 'var(--color-bg)' : 'var(--color-text)',
                              border: '1px solid var(--color-divider)'
                            }}
                            onClick={() => setForm({ ...form, finalLegs: k as number })}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* GRUPOS: Groups & Knockout Legs Configuration */}
              {form.type === 'grupos' && (
                <div style={{ marginBottom: '24px' }}>
                  {/* Grupos Split info */}
                  <div style={{ marginBottom: '20px' }}>
                    <div
                      style={{
                        fontSize: '10px',
                        letterSpacing: '.16em',
                        textTransform: 'uppercase',
                        color: 'var(--color-neutral-600)',
                        marginBottom: '10px',
                        fontWeight: 700
                      }}
                    >
                      {L.split}
                    </div>
                    <div style={{ background: 'var(--color-surface)', padding: '16px', border: '1px solid var(--color-divider)' }}>
                      <div style={{ font: '800 18px var(--font-heading)' }}>
                        {ng} {L.groupsOf} {Math.round(nTeams / ng)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)', marginTop: '4px' }}>
                        {L.splitSub}
                      </div>
                    </div>
                  </div>

                  {/* Fase de grupos: 1 vuelta o Ida y Vuelta */}
                  <div style={{ marginBottom: '20px' }}>
                    <div
                      style={{
                        fontSize: '10px',
                        letterSpacing: '.16em',
                        textTransform: 'uppercase',
                        color: 'var(--color-neutral-600)',
                        marginBottom: '10px',
                        fontWeight: 700
                      }}
                    >
                      Partidos de Fase de Grupos
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        [1, 'Una vuelta (1 partido por rival)', '3 partidos por equipo', 'Cada jugador se enfrenta 1 sola vez a cada rival.'],
                        [2, 'Ida y Vuelta (2 partidos por rival)', '6 partidos por equipo', 'Doble enfrentamiento: un partido de local y otro de visitante.']
                      ].map(([k, title, meta, desc]) => {
                        const isSel = Number(form.groupLegs || 1) === k;
                        return (
                          <div
                            key={k}
                            style={{
                              padding: '14px',
                              background: isSel ? 'var(--color-accent)' : 'var(--color-surface)',
                              borderLeft: `3px solid ${isSel ? 'var(--color-accent-800)' : 'var(--color-divider)'}`,
                              cursor: 'pointer'
                            }}
                            onClick={() => setForm({ ...form, groupLegs: k as number })}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div
                                style={{
                                  font: '800 16px var(--font-heading)',
                                  color: isSel ? 'var(--color-bg)' : 'var(--color-text)'
                                }}
                              >
                                {title}
                              </div>
                              <div
                                style={{
                                  fontSize: '11px',
                                  color: isSel ? 'var(--color-accent-200)' : 'var(--color-neutral-700)'
                                }}
                              >
                                {meta}
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: '12px',
                                color: isSel ? 'var(--color-accent-100)' : 'var(--color-neutral-700)',
                                marginTop: '3px'
                              }}
                            >
                              {desc}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fase Final / Playoffs */}
                  <div style={{ borderTop: '2px solid var(--color-divider)', paddingTop: '16px' }}>
                    <div
                      style={{
                        fontSize: '10px',
                        letterSpacing: '.16em',
                        textTransform: 'uppercase',
                        color: 'var(--color-neutral-600)',
                        marginBottom: '12px',
                        fontWeight: 700
                      }}
                    >
                      Fase Final / Eliminatorias
                    </div>

                    {/* Si hay 16 equipos (4 grupos -> 8 clasificados a cuartos) */}
                    {nTeams >= 16 && (
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ font: '800 14px var(--font-heading)', marginBottom: '2px' }}>
                          Cuartos de final
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)', marginBottom: '8px' }}>
                          Cruces entre los 1º y 2º de cada grupo
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          {[
                            [1, '1 Partido único'],
                            [2, 'Ida y Vuelta (2 partidos)']
                          ].map(([k, label]) => {
                            const isCur = Number(form.legs || 1) === k;
                            return (
                              <button
                                key={k}
                                type="button"
                                className="btn"
                                style={{
                                  minHeight: '44px',
                                  justifyContent: 'flex-start',
                                  paddingInline: '12px',
                                  background: isCur ? 'var(--color-accent)' : 'var(--color-surface)',
                                  color: isCur ? 'var(--color-bg)' : 'var(--color-text)',
                                  border: '1px solid var(--color-divider)'
                                }}
                                onClick={() => setForm({ ...form, legs: k as number })}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Semifinales */}
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ font: '800 14px var(--font-heading)', marginBottom: '2px' }}>
                        {L.semisLabel}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)', marginBottom: '8px' }}>
                        {L.semisSub}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        {[
                          [1, '1 Partido único'],
                          [2, 'Ida y Vuelta (2 partidos)']
                        ].map(([k, label]) => {
                          const isCur = Number(form.semiLegs || 1) === k;
                          return (
                            <button
                              key={k}
                              type="button"
                              className="btn"
                              style={{
                                minHeight: '44px',
                                justifyContent: 'flex-start',
                                paddingInline: '12px',
                                background: isCur ? 'var(--color-accent)' : 'var(--color-surface)',
                                color: isCur ? 'var(--color-bg)' : 'var(--color-text)',
                                border: '1px solid var(--color-divider)'
                              }}
                              onClick={() => setForm({ ...form, semiLegs: k as number })}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Final */}
                    <div>
                      <div style={{ font: '800 14px var(--font-heading)', marginBottom: '2px' }}>
                        {L.grandFinalLabel}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)', marginBottom: '8px' }}>
                        {L.grandFinalSub}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        {[
                          [1, '1 Partido único'],
                          [2, 'Ida y Vuelta (2 partidos)']
                        ].map(([k, label]) => {
                          const isCur = Number(form.finalLegs || 1) === k;
                          return (
                            <button
                              key={k}
                              type="button"
                              className="btn"
                              style={{
                                minHeight: '44px',
                                justifyContent: 'flex-start',
                                paddingInline: '12px',
                                background: isCur ? 'var(--color-accent)' : 'var(--color-surface)',
                                color: isCur ? 'var(--color-bg)' : 'var(--color-text)',
                                border: '1px solid var(--color-divider)'
                              }}
                              onClick={() => setForm({ ...form, finalLegs: k as number })}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary Table */}
              <div
                style={{
                  fontSize: '10px',
                  letterSpacing: '.16em',
                  textTransform: 'uppercase',
                  color: 'var(--color-neutral-600)',
                  marginBottom: '10px',
                  fontWeight: 700
                }}
              >
                {L.summary}
              </div>

              <div style={{ borderTop: '2px solid var(--color-divider)' }}>
                {[
                  { k: L.sumT, v: form.name || '—' },
                  { k: 'Modalidad', v: form.mode === 'offline' ? '🎮 Presencial (Offline)' : '🌐 En línea (Online)' },
                  { k: L.sumG, v: form.game || '—' },
                  { k: L.sumS, v: form.date || L.noDate },
                  { k: L.sumTeams, v: String(nTeams) },
                  {
                    k: L.sumF,
                    v:
                      typeLabel(form.type, L) +
                      (form.type === 'liga' ? ' · ' + (Number(form.legs) === 2 ? L.legs2 : L.legs1) : '')
                  },
                  ...(form.type === 'liga'
                    ? [
                        {
                          k: L.sumFinals,
                          v:
                            (form.finals === 'top4' ? L.f4 : form.finals === 'top2' ? L.f2 : L.f0) +
                            (form.finals === 'top4' && Number(form.semiLegs) === 2
                              ? ' · ' + L.semisWord + ' ' + L.fl2.toLowerCase()
                              : '') +
                            (form.finals !== 'none' && Number(form.finalLegs) === 2
                              ? ' · ' + L.grandFinalLabel.toLowerCase() + ' ' + L.fl2.toLowerCase()
                              : '')
                        }
                      ]
                    : []),
                  ...(form.type === 'copa'
                    ? [
                        {
                          k: 'Eliminatorias',
                          v: `Final: ${Number(form.finalLegs) === 2 ? 'Ida y Vuelta' : '1 partido'} · Semis: ${Number(form.semiLegs) === 2 ? 'Ida y Vuelta' : '1 partido'}${nTeams >= 8 ? ` · Previas: ${Number(form.legs) === 2 ? 'Ida y Vuelta' : '1 partido'}` : ''}`
                        }
                      ]
                    : []),
                  ...(form.type === 'grupos'
                    ? [
                        {
                          k: 'Fase de Grupos',
                          v: Number(form.groupLegs) === 2 ? 'Ida y Vuelta (2 vueltas)' : '1 sola vuelta'
                        },
                        {
                          k: 'Fase Final',
                          v: `Final: ${Number(form.finalLegs) === 2 ? 'Ida y Vuelta' : '1 partido'} · Semis: ${Number(form.semiLegs) === 2 ? 'Ida y Vuelta' : '1 partido'}${nTeams >= 16 ? ` · Cuartos: ${Number(form.legs) === 2 ? 'Ida y Vuelta' : '1 partido'}` : ''}`
                        }
                      ]
                    : []),
                  { k: L.sumFee, v: form.feeOn ? form.fee || L.toDefine : L.free }
                ].map((row, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '11px 0',
                      borderBottom: '1px solid var(--color-divider)'
                    }}
                  >
                    <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)' }}>{row.k}</div>
                    <div style={{ font: '800 14px var(--font-heading)', textAlign: 'right' }}>{row.v}</div>
                  </div>
                ))}
              </div>

              {/* Format Note */}
              <div
                style={{
                  marginTop: '16px',
                  padding: '13px',
                  background: 'var(--color-accent-100)',
                  borderLeft: '3px solid var(--color-accent)',
                  fontSize: '12px',
                  color: 'var(--color-accent-800)',
                  lineHeight: 1.45
                }}
              >
                {form.type === 'copa'
                  ? `${L.withTeams} ${nTeams} ${L.teamsColon} ${bracket(new Array(nTeams).fill('x'), L)
                      .map((r) => r.name.toLowerCase())
                      .join(', ')}.`
                  : form.type === 'liga'
                  ? `${Number(form.legs) === 2 ? L.legs2 : L.legs1}: ${
                      ((nTeams * (nTeams - 1)) / 2) * Number(form.legs)
                    } ${L.matchesWord}${nTeams % 2 === 1 ? ' ' + L.oddSchedule : ''}.`
                  : `${ng} ${L.passTwo}`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA Button */}
      <div
        style={{
          padding: '14px 20px 18px',
          borderTop: '2px solid var(--color-divider)',
          background: 'var(--color-bg)'
        }}
      >
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <button
            className="btn btn-primary btn-block"
            style={{ minHeight: '48px', margin: 0, paddingInline: '16px', justifyContent: 'space-between' }}
            disabled={isNextDisabled}
            onClick={handleNext}
          >
            <span>{form.step === 3 ? L.createNow : L.continue}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
