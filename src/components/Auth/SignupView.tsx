import React, { useState } from 'react';
import { StringsDict, Language } from '../../types/tournament';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Check, X, Sparkles, Mail, RefreshCw } from 'lucide-react';
import { APP_VERSION } from '../../config/version';
import { authService } from '../../services/authService';

interface SignupViewProps {
  onSignupSuccess: (email: string, userId?: string) => void;
  onGoAuth: () => void;
  lang: Language;
  onSetLang: (lang: Language) => void;
  L: StringsDict;
  isTablet: boolean;
}

export const SignupView: React.FC<SignupViewProps> = ({
  onSignupSuccess,
  onGoAuth,
  lang,
  onSetLang,
  L,
  isTablet
}) => {
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [suEmail, setSuEmail] = useState('');
  const [suPass, setSuPass] = useState('');
  const [suPass2, setSuPass2] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [suErr, setSuErr] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Password validation criteria
  const hasMinLength = suPass.length >= 8;
  const hasNumber = /\d/.test(suPass);
  const hasLetter = /[a-zA-Z]/.test(suPass);
  const isMatch = suPass === suPass2 && suPass2.length > 0;
  const isPasswordValid = hasMinLength && hasNumber && hasLetter && isMatch;

  // Generate strong, user-friendly password
  const handleGeneratePassword = () => {
    const words = ['Gol', 'Fifa', 'Copa', 'Campeon', 'Torneo', 'Playoff', 'Jugador'];
    const w1 = words[Math.floor(Math.random() * words.length)];
    const w2 = words[Math.floor(Math.random() * words.length)];
    const num = Math.floor(100 + Math.random() * 900);
    const generated = `${w1}-${num}-${w2}!`;

    setSuPass(generated);
    setSuPass2(generated);
    setShowPass(true);
    setShowPass2(true);
    setInfoMsg(lang === 'en' ? 'Generated secure password applied!' : '¡Contraseña segura generada y aplicada!');
    setTimeout(() => setInfoMsg(null), 3000);
  };

  // Submit signup form
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = suEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setSuErr(L.suErrMail);
      return;
    }
    if (!hasMinLength) {
      setSuErr(lang === 'en' ? 'Password must be at least 8 characters.' : 'La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!hasNumber) {
      setSuErr(lang === 'en' ? 'Password must include at least one number (0–9).' : 'La contraseña debe incluir al menos un número (0–9).');
      return;
    }
    if (!hasLetter) {
      setSuErr(lang === 'en' ? 'Password must include at least one letter.' : 'La contraseña debe incluir al menos una letra.');
      return;
    }
    if (suPass !== suPass2) {
      setSuErr(L.suErrMatch);
      return;
    }

    setSuErr(null);
    setLoading(true);
    try {
      const data = await authService.signUp(em, suPass);
      // Check if session was granted directly (e.g. autoconfirm enabled) or needs verification
      if (data?.session && data?.user) {
        onSignupSuccess(em, data.user.id);
      } else {
        // Move to verification step
        setStep('verify');
        setInfoMsg(lang === 'en' ? 'Verification code sent to your email.' : 'Código de verificación enviado a tu correo.');
      }
    } catch (err: unknown) {
      console.error('Supabase signup error:', err);
      const msg = (err as Error)?.message || '';
      if (msg.toLowerCase().includes('already registered')) {
        setSuErr(
          lang === 'en'
            ? 'This email is already registered. Try signing in instead.'
            : 'Este correo ya está registrado. Prueba a iniciar sesión.'
        );
      } else {
        setSuErr(
          msg ||
            (lang === 'en'
              ? 'Could not create account. Please try again.'
              : 'Error al crear la cuenta. Inténtalo de nuevo.')
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Submit OTP Verification code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpCode.trim();
    if (!code || code.length < 6) {
      setSuErr(lang === 'en' ? 'Please enter the 6-digit verification code.' : 'Por favor ingresa el código de 6 dígitos.');
      return;
    }

    setSuErr(null);
    setLoading(true);
    try {
      const data = await authService.verifyOtp(suEmail, code);
      if (data?.user) {
        onSignupSuccess(suEmail, data.user.id);
      } else {
        onSignupSuccess(suEmail);
      }
    } catch (err: unknown) {
      console.error('Verify OTP error:', err);
      const msg = (err as Error)?.message || '';
      if (msg.toLowerCase().includes('token has expired') || msg.toLowerCase().includes('expired')) {
        setSuErr(lang === 'en' ? 'The code has expired. Please request a new one.' : 'El código ha expirado. Por favor solicita uno nuevo.');
      } else if (msg.toLowerCase().includes('invalid token') || msg.toLowerCase().includes('invalid')) {
        setSuErr(lang === 'en' ? 'Invalid code. Please check your email and try again.' : 'Código incorrecto. Revisa tu correo e inténtalo de nuevo.');
      } else {
        setSuErr(msg || (lang === 'en' ? 'Verification failed. Try again.' : 'Error al verificar. Inténtalo de nuevo.'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP code
  const handleResend = async () => {
    setResending(true);
    setSuErr(null);
    try {
      await authService.resendVerification(suEmail);
      setInfoMsg(lang === 'en' ? 'New code sent to your email!' : '¡Nuevo código enviado a tu correo!');
      setTimeout(() => setInfoMsg(null), 3500);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || '';
      setSuErr(msg || (lang === 'en' ? 'Could not resend code.' : 'No se pudo reenviar el código.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'auto' }}>
      {/* Floating Language Switcher */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 40,
          display: 'flex',
          border: '1px solid var(--color-divider)',
          background: 'var(--color-bg)'
        }}
      >
        <button
          className="btn btn-secondary"
          style={{
            padding: '4px 10px',
            fontSize: '11px',
            border: 'none',
            background: lang === 'es' ? 'var(--color-accent)' : 'transparent',
            color: lang === 'es' ? '#fff' : 'var(--color-neutral-700)',
            fontWeight: 700
          }}
          onClick={() => onSetLang('es')}
        >
          ES
        </button>
        <button
          className="btn btn-secondary"
          style={{
            padding: '4px 10px',
            fontSize: '11px',
            border: 'none',
            background: lang === 'en' ? 'var(--color-accent)' : 'transparent',
            color: lang === 'en' ? '#fff' : 'var(--color-neutral-700)',
            fontWeight: 700
          }}
          onClick={() => onSetLang('en')}
        >
          EN
        </button>
      </div>

      {/* Desktop Left Brand Column */}
      {isTablet && (
        <div
          style={{
            flex: '0 0 45%',
            background: 'var(--color-bg)',
            borderRight: '2px solid var(--color-divider)',
            padding: '48px clamp(24px, 4vw, 56px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <img
              src="/logo.jpg"
              alt="BrosCup"
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '18px',
                objectFit: 'cover',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                marginBottom: '16px'
              }}
            />
            <div
              style={{
                font: '800 44px/0.92 var(--font-heading)',
                letterSpacing: '-.03em',
                textTransform: 'uppercase'
              }}
            >
              BROSCUP
            </div>
            <div
              style={{
                font: '700 13px var(--font-heading)',
                letterSpacing: '.2em',
                textTransform: 'uppercase',
                color: 'var(--color-cta)',
                marginTop: '6px'
              }}
            >
              {lang === 'en' ? 'Tournament Manager' : 'Gestor de Torneos'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', margin: '40px 0' }}>
            <div style={{ borderLeft: '3px solid var(--color-accent)', paddingLeft: '16px' }}>
              <div style={{ font: '800 18px var(--font-heading)', textTransform: 'uppercase' }}>
                {lang === 'en' ? 'Secure Authentication' : 'Cuentas Seguras'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)', marginTop: '4px', lineHeight: 1.5 }}>
                {lang === 'en'
                  ? 'Real-time multi-device synchronization with verified email addresses.'
                  : 'Sincronización multiusuario en tiempo real con verificación de correo electrónico.'}
              </div>
            </div>

            <div style={{ borderLeft: '3px solid var(--color-divider)', paddingLeft: '16px' }}>
              <div style={{ font: '800 18px var(--font-heading)', textTransform: 'uppercase' }}>
                {lang === 'en' ? 'Instant Play' : 'Juega con amigos'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)', marginTop: '4px', lineHeight: 1.5 }}>
                {lang === 'en'
                  ? 'Join via room code and track live standings from any phone, iPad or PC.'
                  : 'Únete con un código de sala y sigue tablas y eliminatorias desde cualquier dispositivo.'}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--color-neutral-600)', letterSpacing: '.06em' }}>
            MINI TORNEOS · FIFA & FC · MULTIPLAYER
          </div>
        </div>
      )}

      {/* Main Right Column */}
      <div
        style={{
          flex: isTablet ? '1' : '1',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: isTablet ? '48px clamp(24px, 5vw, 64px)' : '32px 20px',
          maxWidth: isTablet ? '540px' : '100%',
          margin: isTablet ? 'auto' : '0'
        }}
      >
        {/* STEP 1: REGISTRATION FORM */}
        {step === 'form' && (
          <>
            <button
              className="btn btn-secondary"
              style={{
                alignSelf: 'flex-start',
                gap: '8px',
                borderColor: 'var(--color-divider)',
                marginBottom: '20px'
              }}
              onClick={onGoAuth}
            >
              <ArrowLeft size={16} />
              <span>{L.enter}</span>
            </button>

            <div
              style={{
                font: '800 40px/0.96 var(--font-heading)',
                letterSpacing: '-.03em'
              }}
            >
              {L.suTitle1}
              <br />
              <span style={{ color: 'var(--color-accent)' }}>{L.suTitle2}</span>
            </div>
            <div style={{ height: '2px', background: 'var(--color-divider)', margin: '18px 0 18px' }} />
            <div
              style={{
                fontSize: '13px',
                lineHeight: 1.5,
                color: 'var(--color-neutral-700)',
                marginBottom: '22px'
              }}
            >
              {L.suHelp}
            </div>

            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="field">
                <label>{L.email}</label>
                <input
                  className="input"
                  type="email"
                  placeholder="tu@correo.com"
                  value={suEmail}
                  onChange={(e) => setSuEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password Field with Show/Hide and Generator */}
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ margin: 0 }}>{L.password}</label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-accent)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 4px'
                    }}
                  >
                    <Sparkles size={13} />
                    <span>{lang === 'en' ? 'Suggest secure password' : 'Sugerir contraseña segura'}</span>
                  </button>
                </div>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    className="input"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={suPass}
                    onChange={(e) => setSuPass(e.target.value)}
                    style={{ paddingRight: '40px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-neutral-600)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Repeat Password Field */}
              <div className="field">
                <label>{L.suRepeat}</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    className="input"
                    type={showPass2 ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={suPass2}
                    onChange={(e) => setSuPass2(e.target.value)}
                    style={{ paddingRight: '40px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass2(!showPass2)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-neutral-600)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    {showPass2 ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Live Password Rules Checklist */}
              {suPass.length > 0 && (
                <div
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-divider)',
                    padding: '10px 14px',
                    fontSize: '11px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasMinLength ? '#15803d' : 'var(--color-neutral-600)' }}>
                    {hasMinLength ? <Check size={14} color="#15803d" /> : <X size={14} />}
                    <span>{lang === 'en' ? 'At least 8 characters' : 'Mínimo 8 caracteres'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasNumber ? '#15803d' : 'var(--color-neutral-600)' }}>
                    {hasNumber ? <Check size={14} color="#15803d" /> : <X size={14} />}
                    <span>{lang === 'en' ? 'At least one number (0–9)' : 'Al menos un número (0–9)'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasLetter ? '#15803d' : 'var(--color-neutral-600)' }}>
                    {hasLetter ? <Check size={14} color="#15803d" /> : <X size={14} />}
                    <span>{lang === 'en' ? 'At least one letter' : 'Al menos una letra'}</span>
                  </div>
                  {suPass2.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isMatch ? '#15803d' : 'var(--color-accent)' }}>
                      {isMatch ? <Check size={14} color="#15803d" /> : <X size={14} />}
                      <span>{isMatch ? (lang === 'en' ? 'Passwords match' : 'Las contraseñas coinciden') : (lang === 'en' ? 'Passwords do not match' : 'Las contraseñas no coinciden')}</span>
                    </div>
                  )}
                </div>
              )}

              {infoMsg && (
                <div
                  style={{
                    background: 'var(--color-accent-100)',
                    borderLeft: '4px solid var(--color-accent)',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: 'var(--color-accent-800)'
                  }}
                >
                  {infoMsg}
                </div>
              )}

              {suErr && (
                <div
                  style={{
                    background: 'var(--color-accent-100)',
                    borderLeft: '4px solid var(--color-accent)',
                    padding: '10px 12px',
                    fontSize: '12px',
                    lineHeight: 1.45,
                    color: 'var(--color-accent-700)',
                    margin: '8px 0'
                  }}
                >
                  {suErr}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={loading || (suPass.length > 0 && !isPasswordValid)}
                style={{
                  minHeight: '48px',
                  paddingInline: '16px',
                  justifyContent: 'space-between',
                  marginTop: '10px'
                }}
              >
                <span>{loading ? (lang === 'en' ? 'Creating account...' : 'Creando cuenta...') : L.suCta}</span>
                <ArrowRight size={18} />
              </button>
            </form>

            <div style={{ flex: 1, minHeight: '24px' }} />

            <div style={{ fontSize: '12px', color: 'var(--color-neutral-600)' }}>
              {L.suHave}{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onGoAuth();
                }}
              >
                {L.enter}
              </a>
            </div>

            <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--color-neutral-500)', fontFamily: 'monospace' }}>
              Versión {APP_VERSION}
            </div>
          </>
        )}

        {/* STEP 2: EMAIL OTP VERIFICATION */}
        {step === 'verify' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <button
              className="btn btn-secondary"
              style={{
                alignSelf: 'flex-start',
                gap: '8px',
                borderColor: 'var(--color-divider)',
                marginBottom: '20px'
              }}
              onClick={() => {
                setStep('form');
                setSuErr(null);
              }}
            >
              <ArrowLeft size={16} />
              <span>{lang === 'en' ? 'Change email' : 'Cambiar correo'}</span>
            </button>

            <div
              style={{
                width: '48px',
                height: '48px',
                background: 'var(--color-accent-100)',
                color: 'var(--color-accent)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: '16px',
                border: '1px solid var(--color-accent)'
              }}
            >
              <Mail size={24} />
            </div>

            <div
              style={{
                font: '800 36px/1 var(--font-heading)',
                letterSpacing: '-.02em',
                marginBottom: '8px'
              }}
            >
              {lang === 'en' ? 'Verify your email' : 'Verifica tu correo'}
            </div>
            <div style={{ height: '2px', background: 'var(--color-divider)', margin: '12px 0 16px' }} />

            <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--color-neutral-700)', marginBottom: '16px' }}>
              {lang === 'en' ? 'We sent a 6-digit verification code to:' : 'Hemos enviado un código de 6 dígitos a:'}
              <br />
              <strong style={{ color: 'var(--color-text)', fontSize: '14px' }}>{suEmail}</strong>
            </div>

            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="field">
                <label>{lang === 'en' ? '6-digit verification code' : 'Código de verificación'}</label>
                <input
                  className="input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  style={{
                    minHeight: '56px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '28px',
                    textAlign: 'center',
                    letterSpacing: '0.25em',
                    fontWeight: 800
                  }}
                  required
                />
              </div>

              {infoMsg && (
                <div
                  style={{
                    background: 'var(--color-surface)',
                    borderLeft: '4px solid #15803d',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: '#15803d'
                  }}
                >
                  {infoMsg}
                </div>
              )}

              {suErr && (
                <div
                  style={{
                    background: 'var(--color-accent-100)',
                    borderLeft: '4px solid var(--color-accent)',
                    padding: '10px 12px',
                    fontSize: '12px',
                    lineHeight: 1.45,
                    color: 'var(--color-accent-700)'
                  }}
                >
                  {suErr}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={loading || otpCode.length < 6}
                style={{
                  minHeight: '48px',
                  paddingInline: '16px',
                  justifyContent: 'space-between',
                  marginTop: '8px'
                }}
              >
                <span>{loading ? (lang === 'en' ? 'Verifying code...' : 'Verificando código...') : (lang === 'en' ? 'Verify Code' : 'Verificar código')}</span>
                <ArrowRight size={18} />
              </button>

              {/* Resend button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-neutral-600)' }}>
                  {lang === 'en' ? "Didn't receive the code?" : '¿No recibiste el código?'}
                </span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-accent)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
                  <span>{resending ? (lang === 'en' ? 'Sending...' : 'Enviando...') : (lang === 'en' ? 'Resend code' : 'Reenviar código')}</span>
                </button>
              </div>

              {/* Local dev hint banner */}
              <div
                style={{
                  marginTop: '20px',
                  background: 'var(--color-surface)',
                  border: '1px dashed var(--color-divider)',
                  padding: '12px',
                  fontSize: '11px',
                  color: 'var(--color-neutral-700)',
                  lineHeight: 1.5
                }}
              >
                💡 <strong>{lang === 'en' ? 'Local Development:' : 'Modo Desarrollo:'}</strong>{' '}
                {lang === 'en'
                  ? 'All verification emails and codes are delivered directly to your local Docker mailbox at'
                  : 'Todos los correos y códigos de verificación llegan a tu buzón Docker local en'}{' '}
                <a
                  href="http://localhost:54324"
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontWeight: 700, textDecoration: 'underline' }}
                >
                  http://localhost:54324
                </a>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
