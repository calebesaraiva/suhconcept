import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, Package, Truck, CheckCircle2, XCircle, Clock, RefreshCw, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useDashboardOrders } from '../../lib/useApi';
import { api } from '../../lib/api';
import type { ApiOrder } from '../../lib/api';
import { useStore } from '../../store/useStore';

const statusConfig: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  pendente:             { label: 'Pendente',    icon: Clock,        color: '#f59e0b' },
  aguardando_pagamento: { label: 'Aguard. Pag', icon: Clock,        color: '#f59e0b' },
  pago:                 { label: 'Pago',        icon: CheckCircle2, color: '#22c55e' },
  enviado:              { label: 'Enviado',     icon: Truck,        color: '#a855f7' },
  entregue:             { label: 'Entregue',    icon: Package,      color: '#3b82f6' },
  cancelado:            { label: 'Cancelado',   icon: XCircle,      color: '#ef4444' },
};

const STATUS_FLOW = ['pendente', 'pago', 'enviado', 'entregue'];

const card: React.CSSProperties = {
  background: '#111117',
  borderRadius: 18,
  border: '1px solid rgba(255,255,255,0.06)',
};

function getAddressMeta(order: ApiOrder) {
  const address = order.address && typeof order.address === 'object'
    ? order.address as Record<string, unknown>
    : {};
  const shippingAmount = typeof address.shippingAmount === 'number' ? address.shippingAmount : 0;
  return {
    address,
    shippingAmount,
    addressLines: [
      address.rua,
      address.num ? `Nº ${address.num}` : '',
      address.comp ? `Compl. ${address.comp}` : '',
      address.bairro,
      address.cidade && address.estado ? `${address.cidade}/${address.estado}` : address.cidade || address.estado,
      address.cep ? `CEP ${address.cep}` : '',
    ].filter(Boolean).map(String),
  };
}

export default function Orders() {
  const { showToast } = useStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [selected, setSelected] = useState<ApiOrder | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const { data, loading, refetch } = useDashboardOrders(
    filterStatus !== 'todos' ? { status: filterStatus, search } : search ? { search } : undefined
  );
  const orders = data?.orders ?? [];

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      await api.dashboard.updateOrderStatus(orderId, newStatus);
      refetch();
      if (selected?.id === orderId) setSelected(prev => prev ? { ...prev, status: newStatus } : null);
      showToast('Status do pedido atualizado!');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao atualizar status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const statusCounts = STATUS_FLOW.reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length;
    return acc;
  }, {} as Record<string, number>);
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 5 }}>Dashboard</p>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 3 }}>Pedidos</h1>
          <p style={{ fontSize: 13, color: '#999' }}>{data?.total ?? 0} pedidos no total</p>
        </div>
        <button onClick={refetch} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#ccc', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(168,85,247,0.4)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Atualizar
        </button>
      </div>

      {/* KPI cards */}
      <div className="dash-stats-5" style={{ gap: 12 }}>
        {[
          { label: 'Total',    value: data?.total ?? 0,    color: '#a855f7', icon: Eye          },
          { label: 'Pendente', value: statusCounts.pendente ?? 0, color: '#f59e0b', icon: Clock },
          { label: 'Pago',     value: statusCounts.pago ?? 0,     color: '#22c55e', icon: CheckCircle2 },
          { label: 'Enviado',  value: statusCounts.enviado ?? 0,  color: '#a855f7', icon: Truck },
          { label: 'Receita',  value: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, color: '#FF2DA0', icon: Package },
        ].map(({ label, value, color, icon: Icon }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            style={{ ...card, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 3 }}>{value}</div>
            <div style={{ fontSize: 11, color: '#999', fontWeight: 600, letterSpacing: '0.04em' }}>{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por ID, cliente ou e-mail..."
            style={{ width: '100%', background: '#111117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 14px 12px 40px', color: '#fff', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.35)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.07)')} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['todos', 'pendente', 'pago', 'enviado', 'entregue', 'cancelado'].map(s => {
            const active = filterStatus === s;
            const col = s !== 'todos' ? (statusConfig[s]?.color ?? '#a855f7') : '#a855f7';
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                style={{ padding: '7px 16px', borderRadius: 20, border: `1px solid ${active ? col : 'rgba(255,255,255,0.07)'}`, background: active ? `${col}18` : 'transparent', color: active ? col : '#555', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
                {s === 'todos' ? 'Todos' : (statusConfig[s]?.label ?? s)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        style={{ ...card, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#666', fontSize: 13 }}>Carregando pedidos...</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <Package size={32} style={{ color: '#222', margin: '0 auto 12px' }} />
            <p style={{ color: '#666', fontSize: 13 }}>Nenhum pedido encontrado</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Pedido', 'Cliente', 'Itens', 'Total', 'Pagamento', 'Status', 'Data', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '14px 18px', fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order, i) => {
                  const s = statusConfig[order.status] ?? statusConfig['pendente'];
                  return (
                    <motion.tr key={order.id}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#a855f7', fontFamily: 'monospace', letterSpacing: '0.04em' }}>#{order.id.slice(-8).toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <p style={{ fontSize: 13, color: '#ccc', fontWeight: 600, marginBottom: 2 }}>{order.customerName}</p>
                        <p style={{ fontSize: 11, color: '#666' }}>{order.customerEmail}</p>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: 13, color: '#555' }}>{order.items.length} {order.items.length === 1 ? 'item' : 'itens'}</td>
                      <td style={{ padding: '14px 18px', fontSize: 14, fontWeight: 900, color: '#fff' }}>R$ {order.total.toFixed(2).replace('.', ',')}</td>
                      <td style={{ padding: '14px 18px', fontSize: 12, color: '#999', textTransform: 'capitalize' }}>{order.paymentMethod}</td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ fontSize: 9, fontWeight: 900, color: s.color, background: `${s.color}15`, padding: '4px 10px', borderRadius: 20, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{s.label.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: 11, color: '#666', whiteSpace: 'nowrap' }}>
                        {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <button onClick={() => setSelected(order)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: '#999', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#a855f7'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(168,85,247,0.3)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#444'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}>
                          <Eye size={13} />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#111117', borderRadius: 22, border: '1px solid rgba(255,255,255,0.08)', padding: 28, maxWidth: 520, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div>
                    <p style={{ fontSize: 10, color: '#a855f7', fontWeight: 700, letterSpacing: '0.12em', marginBottom: 5 }}>PEDIDO #{selected.id.slice(-8).toUpperCase()}</p>
                    <h3 style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 3 }}>{selected.customerName}</h3>
                    <p style={{ fontSize: 12, color: '#999' }}>{selected.customerEmail}</p>
                    {selected.customerPhone && <p style={{ fontSize: 12, color: '#777', marginTop: 4 }}>Telefone: {selected.customerPhone}</p>}
                    {selected.customerCpf && <p style={{ fontSize: 12, color: '#777', marginTop: 2 }}>CPF: {selected.customerCpf}</p>}
                  </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 9, fontWeight: 900, color: (statusConfig[selected.status] ?? statusConfig['pendente']).color, background: `${(statusConfig[selected.status] ?? statusConfig['pendente']).color}15`, padding: '5px 11px', borderRadius: 20, letterSpacing: '0.08em' }}>
                    {(statusConfig[selected.status] ?? statusConfig['pendente']).label.toUpperCase()}
                  </span>
                  <button onClick={() => setSelected(null)} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                <div style={{ background: '#0d0d0d', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ fontSize: 10, color: '#666', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Pagamento</p>
                  <p style={{ fontSize: 14, color: '#fff', fontWeight: 800, marginBottom: 6 }}>{selected.paymentMethod}</p>
                  <p style={{ fontSize: 11, color: '#777' }}>Criado em {new Date(selected.createdAt).toLocaleString('pt-BR')}</p>
                </div>
                <div style={{ background: '#0d0d0d', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ fontSize: 10, color: '#666', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Entrega</p>
                  <p style={{ fontSize: 14, color: '#fff', fontWeight: 800, marginBottom: 6 }}>{selected.deliveryMethod === 'pickup' ? 'Retirada na loja' : 'Entrega a domicílio'}</p>
                  <p style={{ fontSize: 11, color: '#777' }}>
                    {selected.deliveryMethod === 'pickup'
                      ? 'Sem endereço de entrega'
                      : getAddressMeta(selected).addressLines.join(' · ') || 'Endereço não informado'}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div style={{ background: '#0d0d0d', borderRadius: 14, padding: '4px 0', marginBottom: 16 }}>
                {selected.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: i < selected.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#ccc', marginBottom: 3 }}>{item.productName}</p>
                      <p style={{ fontSize: 11, color: '#666' }}>Tam: {item.size}{item.color ? ` · ${item.color}` : ''} · Qtd: {item.quantity}</p>
                      <p style={{ fontSize: 10.5, color: '#555', marginTop: 4 }}>Unitário: R$ {item.price.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: '#0d0d0d', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#777', marginBottom: 8 }}>
                  <span>Subtotal</span>
                  <span>R$ {selected.subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#777', marginBottom: 8 }}>
                  <span>Desconto</span>
                  <span>{selected.discount > 0 ? `-R$ ${selected.discount.toFixed(2).replace('.', ',')}` : 'R$ 0,00'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#777', marginBottom: 8 }}>
                  <span>Entrega</span>
                  <span>
                    {selected.deliveryMethod === 'pickup'
                      ? 'Grátis'
                      : getAddressMeta(selected).shippingAmount > 0
                        ? `R$ ${getAddressMeta(selected).shippingAmount.toFixed(2).replace('.', ',')}`
                        : 'Grátis'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#777', marginBottom: 12 }}>
                  <span>Cashback</span>
                  <span>R$ {selected.cashback.toFixed(2).replace('.', ',')}</span>
                </div>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 12 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, color: '#fff', fontSize: 15 }}>Total pago</span>
                  <span style={{ fontWeight: 900, color: '#a855f7', fontSize: 20 }}>R$ {selected.total.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              {selected.notes && (
                <div style={{ background: 'rgba(168,85,247,0.06)', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(168,85,247,0.15)', marginBottom: 18 }}>
                  <p style={{ fontSize: 10, color: '#a855f7', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Observações do pedido</p>
                  <p style={{ fontSize: 12, color: '#d1d5db', lineHeight: 1.6 }}>{selected.notes}</p>
                </div>
              )}

              {/* Status update */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#666', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Atualizar Status</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {STATUS_FLOW.map(s => {
                    const active = selected.status === s;
                    const col = statusConfig[s]?.color ?? '#a855f7';
                    return (
                      <button key={s} disabled={active || updatingStatus}
                        onClick={() => handleUpdateStatus(selected.id, s)}
                        style={{ padding: '8px 14px', borderRadius: 9, border: `1px solid ${active ? col : 'rgba(255,255,255,0.06)'}`, background: active ? `${col}18` : 'transparent', color: active ? col : '#555', fontSize: 11, fontWeight: 700, cursor: active ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
                        {statusConfig[s]?.label}
                      </button>
                    );
                  })}
                  <button disabled={updatingStatus} onClick={() => handleUpdateStatus(selected.id, 'cancelado')}
                    style={{ padding: '8px 14px', borderRadius: 9, border: `1px solid ${selected.status === 'cancelado' ? '#ef4444' : 'rgba(239,68,68,0.2)'}`, background: selected.status === 'cancelado' ? 'rgba(239,68,68,0.1)' : 'transparent', color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancelar pedido
                  </button>
                </div>
              </div>

              <button onClick={() => setSelected(null)}
                style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: '#555', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
