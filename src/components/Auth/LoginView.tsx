import React, { useState } from 'react';
import { StringsDict, Language } from '../../types/tournament';
import { ArrowRight } from 'lucide-react';
import { APP_VERSION } from '../../config/version';

import { authService } from '../../services/authService';

interface LoginViewProps {
  onLoginSuccess: (email: string, userId?: string) => void;
  onGoSignup: () => void;
  lang: Language;
  onSetLang: (lang: Language) => void;
  L: StringsDict;
  isTablet: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onGoSignup,
  lang,
  onSetLang,
  L,
  isTablet
}) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [inErr, setInErr] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    if (!em) {
      setInErr(L.inErrEmpty);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setInErr(L.suErrMail);
      return;
    }
    if (!pass) {
      setInErr(L.inErrPass);
      return;
    }
    if (pass.length < 6) {
      setInErr(L.suErrShort);
      return;
    }

    setInErr(null);
    setLoading(true);
    try {
      const data = await authService.signIn(em, pass);
      if (data?.user) {
        onLoginSuccess(em, data.user.id);
      } else {
        onLoginSuccess(em);
      }
    } catch (err: unknown) {
      console.error('Supabase login error:', err);
      const msg = (err as Error)?.message || '';
      if (
        msg.toLowerCase().includes('invalid login credentials') ||
        msg.toLowerCase().includes('invalid_credentials')
      ) {
        setInErr(
          lang === 'en'
            ? 'Invalid email or password. Please verify your credentials or register a new account.'
            : 'Correo o contraseña incorrectos. Verifica tus datos o regístrate.'
        );
      } else {
        setInErr(
          msg ||
            (lang === 'en'
              ? 'Could not sign in. Please try again.'
              : 'No se pudo iniciar sesión. Por favor, intenta de nuevo.')
        );
      }
    } finally {
      setLoading(false);
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
          className="btn"
          style={{
            padding: '6px 12px',
            fontSize: '11px',
            background: lang === 'es' ? 'var(--color-accent)' : 'var(--color-bg)',
            color: lang === 'es' ? 'var(--color-bg)' : 'var(--color-text)',
            border: 'none'
          }}
          onClick={() => onSetLang('es')}
        >
          ES
        </button>
        <button
          className="btn"
          style={{
            padding: '6px 12px',
            fontSize: '11px',
            background: lang === 'en' ? 'var(--color-accent)' : 'var(--color-bg)',
            color: lang === 'en' ? 'var(--color-bg)' : 'var(--color-text)',
            border: 'none'
          }}
          onClick={() => onSetLang('en')}
        >
          EN
        </button>
      </div>

      {/* Hero Brand Column (Tablet/Desktop) */}
      {isTablet && (
        <div
          style={{
            flex: 1,
            minWidth: 0,
            background: 'linear-gradient(150deg, #061539 0%, #0a2d78 50%, #040e26 100%)',
            color: '#fff',
            padding: '56px 48px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div>
            <img
              src="/logo.jpg"
              alt="BrosCup"
              style={{
                width: '130px',
                height: '130px',
                borderRadius: '28px',
                objectFit: 'cover',
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.12)',
                display: 'block'
              }}
            />
          </div>
          <div>
            <div
              style={{
                font: '800 clamp(44px, 5vw, 76px)/0.92 var(--font-heading)',
                letterSpacing: '-.035em'
              }}
            >
              {L.hero1}
              <br />
              {L.hero2}
              <br />
              <span style={{ color: 'var(--color-cta)' }}>{L.hero3}</span>
            </div>
            <div
              style={{
                height: '3px',
                width: '60px',
                background: 'var(--color-cta)',
                margin: '24px 0 20px',
                borderRadius: '2px'
              }}
            />
            <div style={{ fontSize: '16px', lineHeight: 1.5, maxWidth: '420px', color: 'rgba(255, 255, 255, 0.85)' }}>
              {L.tagline}
            </div>
          </div>
          <div style={{ fontSize: '11px', letterSpacing: '.14em', textTransform: 'uppercase', opacity: 0.65 }}>
            {L.webStrip}
          </div>
        </div>
      )}

      {/* Form Column */}
      <div
        style={{
          width: '100%',
          maxWidth: isTablet ? '480px' : '100%',
          flex: isTablet ? 'none' : 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '36px clamp(24px, 4vw, 48px) 24px',
          boxSizing: 'border-box'
        }}
      >
        {/* Mobile Hero */}
        {!isTablet && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <img
                src="/logo.jpg"
                alt="BrosCup"
                style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '22px',
                  objectFit: 'cover',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)'
                }}
              />
            </div>
            <div
              style={{
                font: '800 46px/0.94 var(--font-heading)',
                letterSpacing: '-.03em',
                textAlign: 'center'
              }}
            >
              {L.hero1} {L.hero2}{' '}
              <span style={{ color: 'var(--color-cta)' }}>{L.hero3}</span>
            </div>
            <div
              style={{
                height: '3px',
                width: '44px',
                background: 'var(--color-cta)',
                margin: '16px auto 18px',
                borderRadius: '2px'
              }}
            />
            <div
              style={{
                fontSize: '14px',
                lineHeight: 1.5,
                color: 'var(--color-neutral-700)',
                marginBottom: '26px',
                textAlign: 'center'
              }}
            >
              {L.tagline}
            </div>
          </>
        )}

        {isTablet && (
          <>
            <div
              style={{
                font: '800 30px/1 var(--font-heading)',
                letterSpacing: '-.02em',
                marginBottom: '8px'
              }}
            >
              {L.enter}
            </div>
            <div style={{ height: '2px', background: 'var(--color-divider)', margin: '0 0 22px' }} />
          </>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="field">
            <label>{L.email}</label>
            <input
              className="input"
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label>{L.password}</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>

          {inErr && (
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
              {inErr}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            style={{
              minHeight: '48px',
              paddingInline: '16px',
              justifyContent: 'space-between',
              marginTop: '10px'
            }}
          >
            <span>{loading ? (lang === 'en' ? 'Signing in...' : 'Entrando...') : L.enter}</span>
            <ArrowRight size={18} />
          </button>

          <div style={{ marginTop: '12px', textAlign: 'center' }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{
                fontSize: '11px',
                padding: '6px 12px',
                border: '1px dashed var(--color-divider)',
                borderRadius: '6px',
                color: 'var(--color-neutral-700)',
                background: 'var(--color-surface)'
              }}
              onClick={() => {
                setEmail('test@broscup.com');
                setPass('1q2w3e4r');
              }}
            >
              ⚡ {lang === 'en' ? 'Test Account (test@broscup.com)' : 'Cuenta de pruebas (test@broscup.com)'}
            </button>
          </div>
        </form>

        <div style={{ flex: 1, minHeight: '24px' }} />

        <div style={{ fontSize: '12px', color: 'var(--color-neutral-600)' }}>
          {L.noAccount}{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onGoSignup();
            }}
          >
            {L.signUp}
          </a>
        </div>

        <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--color-neutral-500)', fontFamily: 'monospace' }}>
          Versión {APP_VERSION}
        </div>
      </div>
    </div>
  );
};
