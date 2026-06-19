import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStorePricingSettings } from '../../lib/storePricing';

const cols = [
  {
    title: 'Institucional',
    links: [
      { label: 'Sobre nós', description: 'Conheca nossa historia', to: '/sobre' },
      { label: 'Contato', description: 'Fale com nossa equipe', to: '/contato' },
    ],
  },
  {
    title: 'Ajuda',
    links: [
      { label: 'Central de ajuda', description: 'Duvidas frequentes', to: '/ajuda' },
      { label: 'Trocas e devoluções', description: 'Veja como solicitar', to: '/trocas-e-devolucoes' },
      { label: 'Formas de envio', description: 'Entrega e retirada', to: '/formas-de-envio' },
    ],
  },
  {
    title: 'Políticas',
    links: [
      { label: 'Privacidade', description: 'Como protegemos seus dados', to: '/privacidade' },
      { label: 'Termos de uso', description: 'Regras da plataforma', to: '/termos-de-uso' },
      { label: 'Política de trocas', description: 'Condicoes da loja', to: '/politica-de-trocas' },
    ],
  },
];

const socials = [
  {
    label: 'Instagram',
    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
    hover: '#E1306C',
  },
  {
    label: 'YouTube',
    path: 'M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z',
    hover: '#FF0000',
  },
  {
    label: 'TikTok',
    path: 'M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.77 1.52V6.77a4.85 4.85 0 01-1-.08z',
    hover: '#fff',
  },
];

export default function Footer() {
  const settings = useStorePricingSettings();
  const highlights = [
    { title: 'Entrega para todo o Brasil', subtitle: 'Atendimento com suporte no WhatsApp' },
    { title: 'Frete grátis promocional', subtitle: `Acima de R$ ${settings.freeShipThreshold.toFixed(2).replace('.', ',')} em pedidos elegíveis` },
    { title: 'Compra segura', subtitle: `Pix com desconto e cartão em até ${settings.maxInstallments}x` },
  ];

  return (
    <footer style={{ background: '#080808', borderTop: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Rainbow accent */}
      <div style={{ height: 3, background: 'linear-gradient(90deg,#a855f7,#FF2DA0,#FFB800,#22C55E)' }} />

      {/* CTA banner */}
      <div style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.07),rgba(255,45,160,0.05))', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '24px 20px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
              Frete grátis acima de <span style={{ color: '#FFB800' }}>R$ {settings.freeShipThreshold.toFixed(2).replace('.', ',')}</span>
            </p>
            <p style={{ fontSize: 12, color: '#666' }}>{settings.pixDiscount}% OFF no PIX · 3x sem juros e até {settings.maxInstallments}x no cartão</p>
          </div>
          <Link to="/categoria/todos" className="no-underline" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, background: 'linear-gradient(135deg,#a855f7,#FF2DA0)', color: '#fff', fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap' }}>
            EXPLORAR →
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 20px 28px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 24,
            marginBottom: 28,
          }}
        >
          {highlights.map((item) => (
            <div
              key={item.title}
              style={{
                padding: '18px 18px 16px',
                borderRadius: 18,
                background: 'linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 18px 32px rgba(0,0,0,0.2)',
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 800, color: '#f5f5f5', marginBottom: 6 }}>{item.title}</p>
              <p style={{ fontSize: 11.5, color: '#787878', lineHeight: 1.6 }}>{item.subtitle}</p>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 24,
            marginBottom: 32,
            alignItems: 'stretch',
          }}
        >
          <div
            style={{
              gridColumn: 'span 1',
              padding: '24px 22px',
              borderRadius: 24,
              background: 'linear-gradient(135deg,rgba(37,18,44,0.95),rgba(15,15,18,0.98))',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 24px 50px rgba(0,0,0,0.28)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right,rgba(168,85,247,0.18),transparent 42%)' }} />
            <div style={{ position: 'relative' }}>
              <img src="/suh-logo-transparent.png" alt="SUH CONCEPT" style={{ height: 44, width: 'auto', objectFit: 'contain', marginBottom: 14 }} />
              <p style={{ fontSize: 13, color: '#cfcfcf', lineHeight: 1.8, marginBottom: 18, maxWidth: 280 }}>
                Vista-se bem e notarão quem você é.
                <br />
                <span style={{ color: '#8f8f93' }}>Moda, acessórios e perfumaria com identidade forte em Imperatriz - MA.</span>
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                <span style={{ padding: '8px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 11, color: '#f0f0f0' }}>
                  Suporte humanizado
                </span>
                <span style={{ padding: '8px 12px', borderRadius: 999, background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.16)', fontSize: 11, color: '#FFCF52' }}>
                  Frete promo
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {socials.map(s => (
                  <a key={s.label} href="#"
                    style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', color: '#777', background: 'rgba(255,255,255,0.03)', transition: 'all 0.2s' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = s.hover; el.style.color = s.hover; el.style.background = `${s.hover}18`; el.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.1)'; el.style.color = '#777'; el.style.background = 'rgba(255,255,255,0.03)'; el.style.transform = 'translateY(0)'; }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d={s.path} /></svg>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {cols.map(col => (
            <div
              key={col.title}
              style={{
                padding: '22px 20px',
                borderRadius: 22,
                background: 'linear-gradient(180deg,rgba(255,255,255,0.028),rgba(255,255,255,0.012))',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <h4 style={{ fontSize: 10, fontWeight: 900, color: '#a855f7', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 16 }}>
                {col.title}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {col.links.map(link => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="no-underline"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 14,
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: 18,
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: 'linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))',
                        color: '#f2f2f2',
                        transition: 'transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateX(4px)';
                        e.currentTarget.style.borderColor = 'rgba(168,85,247,0.34)';
                        e.currentTarget.style.background = 'linear-gradient(135deg,rgba(168,85,247,0.14),rgba(255,255,255,0.03))';
                        e.currentTarget.style.boxShadow = '0 14px 30px rgba(0,0,0,0.22)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateX(0)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                        e.currentTarget.style.background = 'linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <span style={{ display: 'grid', gap: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{link.label}</span>
                        <span style={{ fontSize: 12, color: '#8f8f93', lineHeight: 1.4 }}>{link.description}</span>
                      </span>
                      <ChevronRight size={18} style={{ flexShrink: 0, color: '#c084fc' }} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{ paddingTop: 22, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>

          {/* Payment icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ width: 46, height: 30, borderRadius: 5, background: '#1A1F71', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
              <svg viewBox="0 0 46 30" width="42" height="28"><text x="50%" y="62%" textAnchor="middle" fontFamily="Arial" fontWeight="900" fontSize="13" fill="#fff" letterSpacing="1">VISA</text></svg>
            </div>
            <div style={{ width: 46, height: 30, borderRadius: 5, background: '#252525', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
              <svg viewBox="0 0 46 30" width="42" height="28">
                <circle cx="17" cy="15" r="9" fill="#EB001B" opacity="0.9" />
                <circle cx="29" cy="15" r="9" fill="#F79E1B" opacity="0.9" />
                <ellipse cx="23" cy="15" rx="3.5" ry="8.5" fill="#FF5F00" opacity="0.85" />
              </svg>
            </div>
            <div style={{ width: 46, height: 30, borderRadius: 5, background: '#FFB800', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 46 30" width="42" height="28"><text x="50%" y="64%" textAnchor="middle" fontFamily="Arial" fontWeight="900" fontSize="13" fill="#000">ELO</text></svg>
            </div>
            <div style={{ width: 46, height: 30, borderRadius: 5, background: '#007CC3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 46 30" width="42" height="28"><text x="50%" y="62%" textAnchor="middle" fontFamily="Arial" fontWeight="700" fontSize="9" fill="#fff" letterSpacing="0.3">AMEX</text></svg>
            </div>
            <div style={{ width: 46, height: 30, borderRadius: 5, background: '#32BCAD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 32 32" width="18" height="18" fill="#fff">
                <path d="M16 2.5l4.33 7.5H11.67L16 2.5zM9.5 9.5l-7-4 4 7-4 7 7-4v-6zm13 0v6l7 4-4-7 4-7-7 4zM16 29.5l-4.33-7.5h8.66L16 29.5zM16 14a2 2 0 100 4 2 2 0 000-4z"/>
              </svg>
            </div>
          </div>

          <p style={{ fontSize: 11, color: '#444', textAlign: 'center' }}>
            © 2026 SUH CONCEPT. Todos os direitos reservados.
          </p>
          <p style={{ fontSize: 10.5, color: '#555', textAlign: 'center', letterSpacing: '0.04em' }}>
            Desenvolvido por <span style={{ color: '#a855f7', fontWeight: 700 }}>NEXUS TECNOLOGIA LTDA</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
