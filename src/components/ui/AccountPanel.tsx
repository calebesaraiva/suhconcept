import { useEffect, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Loader2, LogOut, Mail, Package, ShieldCheck, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  api,
  clearSession,
  getStoredToken,
  storeSession,
  type ApiOrder,
  type ApiUser,
  type SocialProviderStatus,
} from '../../lib/api';
import { useStore } from '../../store/useStore';

interface Props {
  compact?: boolean;
  onAuthSuccess?: () => void;
  redirectTo?: string;
}

type Mode = 'login' | 'register';

const fieldStyle: CSSProperties = {
  width: '100%',
  background: '#0d0d0f',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 12,
  padding: '13px 14px',
  color: '#fff',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const socialButtonStyle: CSSProperties = {
  width: '100%',
  padding: '13px 14px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.09)',
  background: '#0d0d0f',
  color: '#fff',
  fontWeight: 700,
  fontSize: 13,
  fontFamily: 'inherit',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  cursor: 'pointer',
};

function getOrderStatusLabel(status: string) {
  const map: Record<string, string> = {
    aguardando_pagamento: 'Aguardando pagamento',
    pago: 'Pago',
    em_preparo: 'Em preparo',
    enviado: 'Enviado',
    saiu_para_entrega: 'Saiu para entrega',
    entregue: 'Entregue',
    cancelado: 'Cancelado',
    pendente: 'Pendente',
  };
  return map[status] || status;
}

export default function AccountPanel({ compact = false, onAuthSuccess, redirectTo }: Props) {
  const { showToast } = useStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(() => !!getStoredToken());
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [providers, setProviders] = useState<SocialProviderStatus[]>([]);

  useEffect(() => {
    let active = true;
    const token = getStoredToken();
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const socialToken = hashParams.get('authToken');
    const socialRedirect = hashParams.get('authRedirect') || redirectTo;
    const socialError = hashParams.get('authError');

    api.auth.providers()
      .then((data) => {
        if (active) setProviders(data);
      })
      .catch(() => {
        if (active) setProviders([]);
      });

    if (socialError) {
      showToast(socialError, 'error');
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }

    const finishSessionCheck = (sessionToken: string | null) => {
      if (!sessionToken) {
        setCheckingSession(false);
        return;
      }

      api.auth.me()
        .then((user) => {
          if (!active) return;
          storeSession(sessionToken, user);
          setCurrentUser(user);
          setEmail(user.email);
          if (socialToken) {
            showToast('Login com Google realizado com sucesso!');
            onAuthSuccess?.();
            if (socialRedirect) {
              navigate(socialRedirect);
              return;
            }
          }
        })
        .catch(() => {
          clearSession();
          if (active && socialToken) {
            showToast('Nao foi possivel concluir o login com Google.', 'error');
          }
        })
        .finally(() => {
          if (active) {
            setCheckingSession(false);
            if (socialToken || socialError) {
              window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
            }
          }
        });
    };

    if (socialToken) {
      localStorage.setItem('suh_token', socialToken);
      finishSessionCheck(socialToken);
      return () => {
        active = false;
      };
    }

    finishSessionCheck(token);

    return () => {
      active = false;
    };
  }, [navigate, onAuthSuccess, redirectTo, showToast]);

  useEffect(() => {
    if (!currentUser) {
      setOrders([]);
      return;
    }

    let active = true;
    setOrdersLoading(true);

    api.orders.mine()
      .then((data) => {
        if (active) setOrders(data);
      })
      .catch(() => {
        if (active) setOrders([]);
      })
      .finally(() => {
        if (active) setOrdersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentUser]);

  const resetForm = () => {
    setName('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError('');
  };

  const handleAuthenticated = (token: string, user: ApiUser, message: string) => {
    storeSession(token, user);
    setCurrentUser(user);
    setEmail(user.email);
    resetForm();
    showToast(message);
    onAuthSuccess?.();

    if (redirectTo) {
      navigate(redirectTo);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedEmail || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }

    if (mode === 'register') {
      if (!trimmedName) {
        setError('Preencha seu nome.');
        return;
      }

      if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        return;
      }

      if (password !== confirmPassword) {
        setError('As senhas não coincidem.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { token, user } = await api.auth.login(trimmedEmail, password);
        handleAuthenticated(token, user, 'Login realizado com sucesso!');
        return;
      }

      const { token, user } = await api.auth.register(trimmedName, trimmedEmail, password);
      handleAuthenticated(token, user, 'Conta criada com sucesso!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível continuar.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    setOrders([]);
    resetForm();
    setMode('login');
    showToast('Sessão encerrada.');
  };

  const handleSocialClick = (provider: 'google' | 'apple') => {
    const providerInfo = providers.find((item) => item.provider === provider);
    if (!providerInfo?.enabled) {
      showToast(
        provider === 'google'
          ? 'Login com Google preparado, mas ainda falta a chave oficial para ativar.'
          : 'Login com iCloud preparado, mas ainda falta a chave oficial da Apple para ativar.',
        'error',
      );
      return;
    }

    if (provider === 'google') {
      const redirect = redirectTo || `${window.location.pathname}${window.location.search}`;
      window.location.href = `/api/auth/google/start?redirect=${encodeURIComponent(redirect)}`;
      return;
    }

    showToast('Login com iCloud ainda nao foi ativado.', 'error');
  };

  const containerStyle: CSSProperties = compact
    ? { padding: 0 }
    : { maxWidth: 560, margin: '0 auto', padding: '32px 16px 100px' };

  const cardPadding = compact ? '24px 22px' : '28px 24px';

  return (
    <div style={containerStyle}>
      {!compact && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#a855f7', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>
            Minha
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>Conta</h1>
        </div>
      )}

      <div style={{ background: '#111', borderRadius: 18, border: '1px solid rgba(255,255,255,0.07)', padding: cardPadding, marginBottom: 16, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <User size={24} style={{ color: '#a855f7' }} />
        </div>

        {checkingSession ? (
          <div style={{ display: 'grid', placeItems: 'center', gap: 12, padding: '18px 0 10px' }}>
            <Loader2 size={22} style={{ color: '#a855f7', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 13, color: '#8b8b8b' }}>Verificando sua conta...</p>
          </div>
        ) : currentUser ? (
          <>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
              Olá, {currentUser.name.split(' ')[0]}!
            </p>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 18 }}>
              Você está conectado com {currentUser.email}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', borderRadius: 12, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.16)', marginBottom: 18, textAlign: 'left' }}>
              <ShieldCheck size={16} style={{ color: '#22C55E', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#ccefd7', lineHeight: 1.5 }}>
                Compra protegida: seus pedidos ficam vinculados à sua conta para acompanhar pagamento, preparo e entrega.
              </span>
            </div>
            <button
              onClick={handleLogout}
              style={{ width: '100%', padding: '13px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.02)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <LogOut size={15} />
              Sair da conta
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
              {mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}
            </p>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 24 }}>
              {mode === 'login'
                ? 'Faça login para comprar, acompanhar seus pedidos e pagar mais rápido.'
                : 'Cadastre-se para comprar com praticidade e acompanhar tudo depois.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              <button type="button" onClick={() => handleSocialClick('google')} style={socialButtonStyle}>
                <Mail size={16} />
                Entrar com Google
              </button>
              <p style={{ fontSize: 11, color: '#7d7d84', lineHeight: 1.5, textAlign: 'left' }}>
                Entre com Google para comprar, acompanhar pedidos e finalizar tudo com mais rapidez.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 18, padding: 4, background: '#0d0d0d', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)' }}>
              <button
                type="button"
                onClick={() => switchMode('login')}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: mode === 'login' ? 'linear-gradient(135deg,#a855f7,#FF2DA0)' : 'transparent',
                  color: mode === 'login' ? '#fff' : '#9a9a9a',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: mode === 'register' ? 'linear-gradient(135deg,#a855f7,#FF2DA0)' : 'transparent',
                  color: mode === 'register' ? '#fff' : '#9a9a9a',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Criar conta
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
              {mode === 'register' && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8d8d8d', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Nome
                  </label>
                  <input
                    value={name}
                    onChange={event => setName(event.target.value)}
                    placeholder="Seu nome completo"
                    style={fieldStyle}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8d8d8d', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="voce@email.com"
                  style={fieldStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8d8d8d', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  style={fieldStyle}
                />
              </div>

              {mode === 'register' && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8d8d8d', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Confirmar senha
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={event => setConfirmPassword(event.target.value)}
                    placeholder="Repita a senha"
                    style={fieldStyle}
                  />
                </div>
              )}

              {error && (
                <div style={{ padding: '11px 12px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#f87171', fontSize: 12, fontWeight: 600 }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: '13px', marginTop: 4, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#a855f7,#FF2DA0)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.75 : 1 }}
              >
                {loading && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
                {mode === 'login' ? 'ENTRAR E COMPRAR' : 'CRIAR CONTA'}
              </button>
            </form>
          </>
        )}
      </div>

      {currentUser && (
        <div style={{ background: '#111', borderRadius: 18, border: '1px solid rgba(255,255,255,0.07)', padding: cardPadding }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#a855f7', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>
                Meus
              </p>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>Pedidos</h2>
            </div>
            <Package size={18} style={{ color: '#a855f7' }} />
          </div>

          {ordersLoading ? (
            <div style={{ display: 'grid', placeItems: 'center', gap: 10, padding: '16px 0 6px' }}>
              <Loader2 size={18} style={{ color: '#a855f7', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: 12, color: '#8b8b8b' }}>Carregando seus pedidos...</p>
            </div>
          ) : orders.length === 0 ? (
            <div style={{ padding: '14px 16px', borderRadius: 14, background: '#0d0d0f', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: 13, color: '#d4d4d8', fontWeight: 700, marginBottom: 4 }}>Você ainda não tem pedidos.</p>
              <p style={{ fontSize: 12, color: '#7d7d84', lineHeight: 1.6 }}>Assim que comprar, seus pagamentos e entregas vão aparecer aqui automaticamente.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {orders.slice(0, compact ? 3 : 8).map((order) => (
                <div key={order.id} style={{ padding: '14px 16px', borderRadius: 14, background: '#0d0d0f', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                    <strong style={{ fontSize: 13, color: '#fff' }}>#{order.id.slice(-8).toUpperCase()}</strong>
                    <span style={{ fontSize: 11, color: '#a855f7', fontWeight: 800 }}>{getOrderStatusLabel(order.status)}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#d1d5db', marginBottom: 5 }}>
                    {order.items.map((item) => `${item.productName} x${item.quantity}`).join(' · ')}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11.5, color: '#7d7d84', flexWrap: 'wrap' }}>
                    <span>{order.paymentMethod}</span>
                    <span>R$ {order.total.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
