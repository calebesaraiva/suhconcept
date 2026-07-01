import { MessageCircle } from 'lucide-react';
import { buildWhatsAppLink, useStoreSettings } from '../../lib/storeSettings';

export default function FloatingWhatsApp() {
  const settings = useStoreSettings();
  const href = buildWhatsAppLink(settings.whatsapp, 'Olá! Vim pelo site da SUH CONCEPT e quero atendimento.');

  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar no WhatsApp"
      style={{
        position: 'fixed',
        right: 18,
        bottom: 88,
        width: 58,
        height: 58,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #25D366, #16A34A)',
        color: '#fff',
        boxShadow: '0 18px 34px rgba(22,163,74,0.34)',
        border: '1px solid rgba(255,255,255,0.18)',
        zIndex: 48,
      }}
    >
      <MessageCircle size={25} />
    </a>
  );
}
