import React from 'react';
import { X, Copy, Share2, MessageCircle } from 'lucide-react';
import { Tournament } from '../../types/tournament';

interface InvitePlayersModalProps {
  tournament: Tournament;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const InvitePlayersModal: React.FC<InvitePlayersModalProps> = ({
  tournament,
  onClose,
  onShowToast
}) => {
  const inviteUrl = `${window.location.origin}${window.location.pathname}?join=${tournament.id}`;
  const whatsappMsg = `¡Únete a mi torneo "${tournament.name}" (${tournament.game}) en BrosCup! Entra y regístrate aquí: ${inviteUrl}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMsg)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    onShowToast('¡Enlace de invitación para jugadores copiado!');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="bottom-sheet"
        style={{ maxWidth: '480px' }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                background: 'var(--color-accent-100)',
                color: 'var(--color-accent)',
                display: 'grid',
                placeItems: 'center',
                borderRadius: '6px'
              }}
            >
              <Share2 size={20} />
            </div>
            <div>
              <div style={{ font: '800 17px var(--font-heading)', letterSpacing: '-.01em' }}>
                Invitar Jugadores
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-neutral-600)' }}>
                {tournament.name} · Código: <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{tournament.id}</span>
              </div>
            </div>
          </div>

          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '13px', color: 'var(--color-neutral-700)', lineHeight: 1.5 }}>
            Comparte este enlace con tus amigos para que se inscriban en tu torneo. Al abrirlo, se les solicitará unirse directamente con su cuenta o registrarse si aún no tienen una.
          </div>

          {/* Link Box */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-divider)',
              padding: '12px 14px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontFamily: 'monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'var(--color-text)',
                flex: 1
              }}
            >
              {inviteUrl}
            </div>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '11px', gap: '6px', flexShrink: 0 }}
              onClick={handleCopy}
            >
              <Copy size={13} />
              <span>Copiar</span>
            </button>
          </div>

          {/* Share Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{
                minHeight: '44px',
                background: '#25D366',
                borderColor: '#22bf5b',
                color: '#fff',
                justifyContent: 'center',
                gap: '8px',
                textDecoration: 'none',
                fontWeight: 800,
                fontSize: '13px'
              }}
            >
              <MessageCircle size={18} />
              <span>Compartir por WhatsApp</span>
            </a>

            <button
              className="btn btn-secondary"
              style={{ minHeight: '42px', justifyContent: 'center', gap: '8px', fontWeight: 700 }}
              onClick={handleCopy}
            >
              <Copy size={16} />
              <span>Copiar Enlace de Invitación</span>
            </button>
          </div>

          {/* Notice info */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px dashed var(--color-divider)',
              padding: '10px 14px',
              borderRadius: '4px',
              fontSize: '11px',
              color: 'var(--color-neutral-600)',
              lineHeight: 1.4
            }}
          >
            💡 <strong>Nota:</strong> Los jugadores también pueden unirse ingresando manualmente el código <strong>{tournament.id}</strong> en la sección "Unirme a un torneo".
          </div>
        </div>
      </div>
    </div>
  );
};
