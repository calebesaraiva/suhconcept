import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, Menu, Trophy, X, Lock, Loader2, Eye, EyeOff, ShoppingBag, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';
import type { ApiUser, DashboardAlert } from '../../lib/api';
import Sidebar from './Sidebar';
import Overview from './Overview';
import Orders from './Orders';
import Customers from './Customers';
import Finance from './Finance';
import Products from './Products';
import Payments from './Payments';
import Coupons from './Coupons';
import Settings from './Settings';
import ShippingSimulator from './ShippingSimulator';
import Toast from '../ui/Toast';
import { useStore } from '../../store/useStore';

const sectionMap: Record<string, React.ReactNode> = {
  overview:  <Overview />,
  orders:    <Orders />,
  products:  <Products />,
  shipping:  <ShippingSimulator />,
  customers: <Customers />,
  finance:   <Finance />,
  payments:  <Payments />,
  marketing: (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 760 }}>
      <div style={{ background: '#111117', borderRadius: 18, border: '1px solid rgba(255,255,255,0.06)', padding: 26 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Marketing</p>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Módulo temporariamente desligado</h1>
        <p style={{ fontSize: 14, color: '#999', lineHeight: 1.7 }}>
          Esta área pode voltar depois com campanhas, automações e comunicações. Por enquanto ela está fora da operação principal da loja para manter o painel 100% confiável em produção.
        </p>
      </div>
    </div>
  ),
  coupons:   <Coupons />,
  settings:  <Settings />,
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function LoginGate({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { token, user } = await api.auth.login(email, password);
      if (!['admin', 'staff'].includes(user.role)) {
        setError('Acesso permitido apenas para usuários do painel');
        return;
      }
      localStorage.setItem('suh_token', token);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', background: '#0d0d0f', border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 12, padding: '13px 16px', color: '#fff', fontSize: 14,
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#060608', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Montserrat', 'Inter', sans-serif", padding: 24 }}>
      {/* background glow */}
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 300, background: 'radial-gradient(ellipse, rgba(168,85,247,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: 420, background: '#111117', borderRadius: 24, border: '1px solid rgba(255,255,255,0.07)', padding: '40px 36px', position: 'relative', overflow: 'hidden' }}>

        {/* top accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#a855f7,#FF2DA0)' }} />

        {/* logo / title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#a855f7,#FF2DA0)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(168,85,247,0.35)' }}>
            <Lock size={22} style={{ color: '#fff' }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 6 }}>Dashboard SUH CONCEPT</h1>
          <p style={{ fontSize: 13, color: '#999' }}>Entre com suas credenciais do painel</p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 7 }}>E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Digite seu e-mail" required style={inp}
              onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 7 }}>Senha</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ ...inp, paddingRight: 44 }}
                onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')} />
              <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#999', cursor: 'pointer', display: 'flex' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ marginTop: 8, padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#a855f7,#FF2DA0)', color: '#fff', fontWeight: 900, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '0.04em', boxShadow: '0 6px 20px rgba(168,85,247,0.3)', opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s' }}>
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Lock size={16} />}
            {loading ? 'ENTRANDO...' : 'ENTRAR NO PAINEL'}
          </button>
        </form>

      </motion.div>
    </div>
  );
}

export default function DashboardShell() {
  const { dashboardSection, setDashboardSection } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [search, setSearch] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [seenCount, setSeenCount] = useState(0);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [urgentCount, setUrgentCount] = useState(0);
  const [authed, setAuthed] = useState(!!localStorage.getItem('suh_token'));
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const prevUrgent = useRef(0);
  const audioCtx = useRef<AudioContext | null>(null);

  // Validate token on mount
  useEffect(() => {
    const token = localStorage.getItem('suh_token');
    if (!token) return;
    api.auth.me()
      .then(user => {
        if (!['admin', 'staff'].includes(user.role)) {
          localStorage.removeItem('suh_token');
          setAuthed(false);
          setCurrentUser(null);
        } else {
          setCurrentUser(user);
        }
      })
      .catch(() => {
        localStorage.removeItem('suh_token');
        setAuthed(false);
        setCurrentUser(null);
      });
  }, [authed]);

  // Poll alerts every 30s
  useEffect(() => {
    if (!authed) return;
    const fetchAlerts = async () => {
      try {
        const data = await api.dashboard.alerts();
        setAlerts(data.alerts);
        setUrgentCount(data.urgentCount);
        // Beep if new urgent alerts arrived
        if (data.urgentCount > prevUrgent.current) {
          try {
            if (!audioCtx.current) audioCtx.current = new AudioContext();
            const ctx = audioCtx.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.4);
          } catch {
            // Sem audio disponivel no ambiente atual.
          }
        }
        prevUrgent.current = data.urgentCount;
      } catch {
        // Falha temporaria de polling nao deve derrubar o painel.
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [authed]);

  const unread = urgentCount - seenCount > 0 ? urgentCount - seenCount : (alerts.length > 0 && seenCount === 0 ? alerts.filter(a => a.urgent).length : 0);

  if (!authed) return <LoginGate onLogin={() => setAuthed(true)} />;

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: '#060608',
      fontFamily: "'Montserrat', 'Inter', sans-serif",
    }}>

      {/* ── Sidebar desktop ── */}
      <div className="dash-sidebar-desktop">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} role={currentUser?.role || 'admin'} />
      </div>

      {/* ── Sidebar mobile overlay ── */}
      <AnimatePresence>
        {mobileSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileSidebar(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 60, backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.28 }}
              style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 61 }}>
              <Sidebar collapsed={false} onToggle={() => setMobileSidebar(false)} role={currentUser?.role || 'admin'} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* ── Topbar ── */}
        <header style={{
          flexShrink: 0,
          height: 68,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          background: '#0a0a0c',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          gap: 16,
        }}>

          {/* Left: hamburger + search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
            {/* Hamburger mobile */}
            <button
              className="dash-mobile-only"
              onClick={() => setMobileSidebar(true)}
              style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#888', flexShrink: 0 }}>
              <Menu size={18} />
            </button>

            {/* Search */}
            <div style={{ position: 'relative', maxWidth: 320, flex: 1 }} className="dash-search">
              <Search size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#999', pointerEvents: 'none' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar no painel..."
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 10, padding: '9px 36px 9px 38px',
                  color: '#ccc', fontSize: 13, fontFamily: 'inherit', outline: 'none',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(168,85,247,0.4)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; e.target.style.background = 'rgba(255,255,255,0.04)'; }}
              />
              {search && (
                <button onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Right: badges + user */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

            {/* Copa badge */}
            <div className="dash-copa-badge" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.15)' }}>
              <Trophy size={12} style={{ color: '#fbbf24' }} />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#fbbf24' }}>Copa 2026</span>
            </div>

            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setNotifOpen(o => !o); if (!notifOpen) setSeenCount(urgentCount); }}
                style={{ position: 'relative', width: 38, height: 38, borderRadius: 10, border: `1px solid ${notifOpen ? 'rgba(168,85,247,0.4)' : urgentCount > 0 ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.07)'}`, background: notifOpen ? 'rgba(168,85,247,0.08)' : 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: notifOpen ? '#a855f7' : '#666', transition: 'all 0.2s' }}>
                <Bell size={16} style={{ animation: unread > 0 ? 'bellRing 1s ease-in-out infinite' : 'none' }} />
                {unread > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, background: '#ef4444', border: '2px solid #0a0a0c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff', padding: '0 3px' }}>
                    {unread}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <>
                    <div onClick={() => setNotifOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ duration: 0.18 }}
                      style={{ position: 'absolute', top: 46, right: 0, width: 'min(350px, calc(100vw - 32px))', background: '#111117', borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', zIndex: 50, overflow: 'hidden' }}>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Bell size={14} style={{ color: '#a855f7' }} />
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Alertas</span>
                          {alerts.length > 0 && <span style={{ fontSize: 9, fontWeight: 900, background: urgentCount > 0 ? '#ef4444' : '#a855f7', color: '#fff', padding: '2px 7px', borderRadius: 20 }}>{alerts.length}</span>}
                        </div>
                        <span style={{ fontSize: 10, color: '#666' }}>atualiza a cada 30s</span>
                      </div>

                      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                        {alerts.length === 0 ? (
                          <div style={{ padding: '32px 18px', textAlign: 'center' }}>
                            <Bell size={24} style={{ color: '#2a2a2a', margin: '0 auto 8px', display: 'block' }} />
                            <p style={{ fontSize: 12, color: '#555' }}>Nenhum alerta no momento</p>
                          </div>
                        ) : alerts.map((n, i) => (
                          <motion.div key={n.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                            onClick={() => {
                              if (n.type === 'order') {
                                setDashboardSection('orders');
                              }
                              setNotifOpen(false);
                            }}
                            style={{ display: 'flex', gap: 12, padding: '13px 18px', borderBottom: i < alerts.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: n.urgent ? `${n.color}08` : 'transparent', cursor: n.type === 'order' ? 'pointer' : 'default' }}>
                            <div style={{ width: 36, height: 36, borderRadius: 11, background: `${n.color}15`, border: `1px solid ${n.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {n.type === 'order' ? <ShoppingBag size={14} style={{ color: n.color }} /> : <AlertTriangle size={14} style={{ color: n.color }} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: n.urgent ? '#fff' : '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 6 }}>{n.title}</p>
                                {n.urgent && <div style={{ width: 6, height: 6, borderRadius: '50%', background: n.color, flexShrink: 0, boxShadow: `0 0 5px ${n.color}` }} />}
                              </div>
                              <p style={{ fontSize: 11, color: '#777' }}>{n.desc}</p>
                              {n.type === 'order' && (
                                <>
                                  {n.customerPhone && <p style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 4 }}>Telefone: {n.customerPhone}</p>}
                                  {n.itemsSummary && <p style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 4 }}>Itens: {n.itemsSummary}</p>}
                                  {n.addressSummary && <p style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 4 }}>Entrega: {n.addressSummary}</p>}
                                </>
                              )}
                              {n.time && <p style={{ fontSize: 10, color: '#555', marginTop: 3 }}>{timeAgo(n.time)}</p>}
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                        <button onClick={() => setNotifOpen(false)} style={{ fontSize: 11, fontWeight: 700, color: '#a855f7', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                          Fechar
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.07)' }} />

            {/* User */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', position: 'relative' }}
              onClick={() => { if (confirm('Sair do painel?')) { localStorage.removeItem('suh_token'); setCurrentUser(null); setAuthed(false); } }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                {(currentUser?.name?.[0] ?? 'A').toUpperCase()}
              </div>
              <div className="dash-user-info">
                <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{currentUser?.name ?? 'Admin'}</p>
                <p style={{ fontSize: 10, color: '#555', lineHeight: 1.2 }}>{currentUser?.email ?? 'Administrador'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 'clamp(16px, 3vw, 32px) clamp(14px, 2.5vw, 28px)' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={dashboardSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}>
              {sectionMap[dashboardSection] || <Overview />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <Toast />
    </div>
  );
}
