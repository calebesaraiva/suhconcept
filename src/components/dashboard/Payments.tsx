import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, QrCode, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import { api } from '../../lib/api';
import { useDashboardFinance } from '../../lib/useApi';

type SettingsMap = Record<string, string>;

const card: React.CSSProperties = {
  background: '#111117',
  borderRadius: 18,
  border: '1px solid rgba(255,255,255,0.06)',
  padding: '22px 24px',
  position: 'relative',
  overflow: 'hidden',
};

const methodLabel: Record<string, string> = {
  cartao: 'Cartão',
  credito: 'Cartão',
  'cartão': 'Cartão',
  pix: 'PIX',
  debito: 'Débito',
  'débito': 'Débito',
  boleto: 'Boleto',
};

function maskPixKey(value: string) {
  if (!value) return 'Não configurada';
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

export default function Payments() {
  const [settings, setSettings] = useState<SettingsMap | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const { data: finance, loading: financeLoading, refetch } = useDashboardFinance('mensal');

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const response = await api.dashboard.getSettings();
      setSettings(response);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const pixEnabled = settings?.pixEnabled !== 'false';
  const cardEnabled = settings?.cardEnabled !== 'false';
  const pixDiscount = Number(settings?.pixDiscount || 0);
  const maxInstallments = Number(settings?.maxInstallments || 1);
  const interestFreeInstallments = Number(settings?.interestFreeInstallments || 1);
  const pixKey = settings?.pixKey || '';
  const pagbankEnabled = settings?.pagbankEnabled !== 'false';
  const pagbankEnvironment = settings?.pagbankEnvironment === 'sandbox' ? 'Sandbox' : 'Produção';
  const paymentMethods = finance?.paymentMethods ?? [];
  const totals = finance?.totals ?? { receita: 0, pedidos: 0, ticketMedio: 0, clientes: 0 };

  const enabledMethods = useMemo(() => {
    const methods = [];
    if (pixEnabled) methods.push({ label: 'PIX', icon: QrCode, color: '#22c55e', desc: `${pixDiscount}% de desconto configurado` });
    if (cardEnabled) methods.push({ label: 'Cartão', icon: CreditCard, color: '#FF2DA0', desc: `${interestFreeInstallments}x sem juros e até ${maxInstallments}x no checkout` });
    return methods;
  }, [pixEnabled, pixDiscount, cardEnabled, maxInstallments, interestFreeInstallments]);

  const loading = settingsLoading || financeLoading;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 5 }}>Dashboard</p>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 3 }}>Pagamentos</h1>
          <p style={{ fontSize: 13, color: '#999' }}>Configurações ativas da loja e uso real nos pedidos</p>
        </div>
        <button
          onClick={() => { void loadSettings(); void refetch(); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#ccc', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Atualizar
        </button>
      </div>

      <div className="dash-stats-grid" style={{ gap: 14 }}>
        {[
          { label: 'Receita Real', value: `R$ ${totals.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: '#22c55e', icon: Wallet },
          { label: 'Pedidos Pagos', value: String(totals.pedidos), color: '#a855f7', icon: CreditCard },
          { label: 'PIX', value: pixEnabled ? 'Ativo' : 'Desligado', color: '#22c55e', icon: QrCode },
          { label: 'Cartão', value: cardEnabled ? `Até ${maxInstallments}x` : 'Desligado', color: '#FF2DA0', icon: ShieldCheck },
        ].map(({ label, value, color, icon: Icon }, index) => (
          <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07 }} style={card}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
            <div style={{ width: 38, height: 38, borderRadius: 11, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Icon size={17} style={{ color }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{loading ? '...' : value}</div>
            <div style={{ fontSize: 11, color: '#999', fontWeight: 600 }}>{label}</div>
          </motion.div>
        ))}
      </div>

      <div className="dash-two-col" style={{ gap: 16 }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={card}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 16 }}>Meios habilitados na loja</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {enabledMethods.length === 0 ? (
              <div style={{ padding: '18px 16px', borderRadius: 12, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)', color: '#999', fontSize: 13 }}>
                Nenhum meio de pagamento está habilitado nas configurações.
              </div>
            ) : enabledMethods.map(({ label, icon: Icon, color, desc }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px', borderRadius: 12, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 3 }}>{label}</p>
                  <p style={{ fontSize: 12, color: '#999' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} style={card}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 16 }}>Configuração operacional</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '16px', borderRadius: 12, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Chave PIX</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: pixKey ? '#fff' : '#999' }}>{maskPixKey(pixKey)}</p>
            </div>
            <div style={{ padding: '16px', borderRadius: 12, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Desconto PIX</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#22c55e' }}>{pixDiscount}%</p>
            </div>
            <div style={{ padding: '16px', borderRadius: 12, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Parcelamento sem juros</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{interestFreeInstallments}x sem juros · até {maxInstallments}x</p>
            </div>
            <div style={{ padding: '16px', borderRadius: 12, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Gateway</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: pagbankEnabled ? '#fff' : '#999' }}>{pagbankEnabled ? `PagBank ativo · ${pagbankEnvironment}` : 'Desligado'}</p>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }} style={card}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 16 }}>Uso real nos pedidos</h3>
        {paymentMethods.length === 0 ? (
          <div style={{ padding: '18px 16px', borderRadius: 12, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)', color: '#999', fontSize: 13 }}>
            Ainda não há pedidos suficientes para distribuição de pagamentos neste período.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {paymentMethods.map((method) => (
              <div key={`${method.method}-${method.pct}`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#ccc' }}>{methodLabel[method.method.toLowerCase()] ?? method.method}</span>
                  <span style={{ fontSize: 12, color: '#999' }}>
                    {method.count} pedido(s) · R$ {method.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  <div style={{ width: `${method.pct}%`, height: '100%', background: method.color, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
