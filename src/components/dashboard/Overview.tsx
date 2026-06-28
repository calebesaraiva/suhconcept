import { motion } from 'framer-motion';
import {
  TrendingUp, ShoppingBag, Users, DollarSign,
  ArrowUpRight, Clock, Package, Zap,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useDashboardOverview } from '../../lib/useApi';

const CAT_COLORS = ['#d946ef', '#9333ea', '#FFB800', '#a855f7', '#22c55e', '#3b82f6', '#f97316'];

const statusStyle: Record<string, { label: string; color: string; bg: string }> = {
  pendente:              { label: 'Pendente',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  aguardando_pagamento:  { label: 'Aguard. Pag', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  pago:                  { label: 'Pago',        color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
  em_preparo:            { label: 'Em preparo',  color: '#a855f7', bg: 'rgba(168,85,247,0.12)'  },
  saiu_para_entrega:     { label: 'Saiu p/ entrega', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  enviado:               { label: 'Enviado',     color: '#d946ef', bg: 'rgba(217,70,239,0.12)'  },
  entregue:              { label: 'Entregue',    color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  },
  cancelado:             { label: 'Cancelado',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
};

interface ChartTooltipPayload {
  color: string;
  name: string;
  value: number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
}

const ChartTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <p style={{ fontSize: 11, color: '#666', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, fontSize: 13, fontWeight: 700 }}>
          {p.name === 'vendas' ? 'Receita' : 'Meta'}: R$ {p.value.toLocaleString('pt-BR')}
        </p>
      ))}
    </div>
  );
};

export default function Overview() {
  const { data: overview, loading, error } = useDashboardOverview();
  const currentDateLabel = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const fmt = (v: number) => v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${v.toFixed(0)}`;

  // Real growth: compare last two months from salesData
  const salesData    = overview?.salesData ?? [];
  const cur          = salesData[salesData.length - 1];
  const prev         = salesData[salesData.length - 2];
  const revenueGrowth = cur && prev && prev.vendas > 0
    ? (((cur.vendas - prev.vendas) / prev.vendas) * 100).toFixed(1)
    : null;
  const ordersGrowth = cur && prev && prev.pedidos > 0
    ? (((cur.pedidos - prev.pedidos) / prev.pedidos) * 100).toFixed(1)
    : null;

  const stats = [
    { label: 'Receita Total',   value: loading ? '...' : overview ? fmt(overview.stats.totalRevenue) : '—', change: revenueGrowth, icon: DollarSign,  color: '#f97316', bg: 'rgba(249,115,22,0.1)'  },
    { label: 'Pedidos',         value: loading ? '...' : overview ? `${overview.stats.totalOrders}`    : '—', change: ordersGrowth,  icon: ShoppingBag, color: '#d946ef', bg: 'rgba(217,70,239,0.1)'  },
    { label: 'Clientes',        value: loading ? '...' : overview ? `${overview.stats.totalCustomers}` : '—', change: null,          icon: Users,       color: '#FF2DA0', bg: 'rgba(255,45,160,0.1)'  },
    { label: 'Produtos Ativos', value: loading ? '...' : overview ? `${overview.stats.totalProducts}`  : '—', change: null,          icon: TrendingUp,  color: '#22c55e', bg: 'rgba(34,197,94,0.1)'  },
  ];
  const recentOrders     = overview?.recentOrders?.slice(0, 5) ?? [];
  const topProducts      = overview?.topProducts ?? [];
  const categoryBreakdown = (overview?.categoryBreakdown ?? []).map((c, i) => ({
    ...c,
    color: CAT_COLORS[i % CAT_COLORS.length],
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* API error banner */}
      {error && (
        <div style={{ padding: '12px 18px', borderRadius: 12, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span>Backend desconectado — inicie o servidor com <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 6px', borderRadius: 5 }}>start-dev.bat</code> e atualize a página.</span>
        </div>
      )}

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>Painel de Controle</p>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 4 }}>Visão Geral</h1>
          <p style={{ fontSize: 13, color: '#555' }}>Bem-vindo(a) de volta! Aqui está seu resumo de hoje.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Clock size={13} style={{ color: '#d946ef' }} />
          <span style={{ fontSize: 12, color: '#666', fontWeight: 500, textTransform: 'capitalize' }}>{currentDateLabel}</span>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="dash-stats-grid">
        {stats.map(({ label, value, change, icon: Icon, color, bg }, i) => {
          const chgNum = change !== null ? parseFloat(change as string) : null;
          const up = chgNum !== null && chgNum >= 0;
          return (
            <motion.div key={label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              style={{ background: '#111117', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: '22px 20px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `${color}18`, filter: 'blur(20px)', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} style={{ color }} />
                </div>
                {chgNum !== null ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 8px', borderRadius: 20, background: up ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${up ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                    {up ? <ArrowUpRight size={11} style={{ color: '#22c55e' }} /> : <ArrowUpRight size={11} style={{ color: '#ef4444', transform: 'rotate(90deg)' }} />}
                    <span style={{ fontSize: 11, fontWeight: 700, color: up ? '#22c55e' : '#ef4444' }}>{up ? '+' : ''}{chgNum.toFixed(1)}%</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 10, color: '#555', fontWeight: 600 }}>vs mês ant.</div>
                )}
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>{label}</div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
            </motion.div>
          );
        })}
      </div>

      {/* ── Charts Row ── */}
      <div className="dash-charts-grid">

        {/* Area chart */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          style={{ background: '#111117', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 3 }}>Receita vs Meta</h3>
              <p style={{ fontSize: 11, color: '#999' }}>Últimos 6 meses</p>
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              {[{ color: '#d946ef', label: 'Receita' }, { color: '#374151', label: 'Meta', dashed: true }].map(({ color, label, dashed }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke={color} strokeWidth="2" strokeDasharray={dashed ? '4 3' : undefined} /></svg>
                  <span style={{ fontSize: 11, color: '#555', fontWeight: 500 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={salesData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gVendas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d946ef" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#d946ef" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: '#444', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#444', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="meta" stroke="#374151" fill="transparent" strokeDasharray="5 4" strokeWidth={1.5} />
              <Area type="monotone" dataKey="vendas" stroke="#d946ef" fill="url(#gVendas)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#d946ef', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pie chart */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          style={{ background: '#111117', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 3 }}>Por Categoria</h3>
            <p style={{ fontSize: 11, color: '#999' }}>Distribuição de vendas</p>
          </div>

          {/* Donut centered */}
          {categoryBreakdown.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 13, minHeight: 120 }}>
              {loading ? 'Carregando...' : 'Sem vendas registradas'}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={46} outerRadius={72}
                      dataKey="value" strokeWidth={0} paddingAngle={2}>
                      {categoryBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value) => `${value ?? 0}%`}
                      contentStyle={{ background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {categoryBreakdown.map(item => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, color: '#888' }}>{item.name}</span>
                    <div style={{ width: 80, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${item.value}%`, background: item.color, borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', width: 30, textAlign: 'right' }}>{item.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="dash-bottom-grid">

        {/* Recent Orders */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          style={{ background: '#111117', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 2 }}>Pedidos Recentes</h3>
              <p style={{ fontSize: 11, color: '#999' }}>Últimas transações</p>
            </div>
            <button style={{ fontSize: 11, fontWeight: 700, color: '#d946ef', background: 'rgba(217,70,239,0.08)', border: '1px solid rgba(217,70,239,0.2)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Ver todos
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recentOrders.map((order, i) => {
              const s = statusStyle[order.status];
              return (
                <motion.div key={order.id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + i * 0.06 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  {/* Avatar initial */}
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: `${s.color}18`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Package size={14} style={{ color: s.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#ccc', fontFamily: 'monospace' }}>#{order.id.slice(-6).toUpperCase()}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: s.color, background: s.bg, padding: '2px 7px', borderRadius: 20, letterSpacing: '0.06em' }}>
                        {s.label.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.customerName}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>R$ {order.total.toFixed(2).replace('.', ',')}</p>
                    <p style={{ fontSize: 10, color: '#999', marginTop: 1 }}>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Top Products */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
          style={{ background: '#111117', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 2 }}>Top Produtos</h3>
              <p style={{ fontSize: 11, color: '#999' }}>Mais vendidos este mês</p>
            </div>
            <button style={{ fontSize: 11, fontWeight: 700, color: '#d946ef', background: 'rgba(217,70,239,0.08)', border: '1px solid rgba(217,70,239,0.2)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Ver todos
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {topProducts.map((p, i) => {
              const rankColors = ['#f97316', '#d946ef', '#FF2DA0', '#9333ea', '#a855f7'];
              const c = rankColors[i] ?? '#555';
              return (
                <motion.div key={p.name}
                  initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.65 + i * 0.06 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  {/* Rank */}
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: `${c}18`, border: `1px solid ${c}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: c }}>#{i + 1}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{p.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Zap size={10} style={{ color: '#FFB800' }} />
                      <span style={{ fontSize: 10, color: '#555' }}>{p.sales} vendas</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>R$ {(p.revenue / 1000).toFixed(1)}k</p>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', marginTop: 1 }}>↑ top</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
