import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, Loader2, XCircle } from 'lucide-react';
import { api, type ApiOrder } from '../lib/api';

type PaymentState = {
  order: ApiOrder | null;
  status: string;
  error: string;
  loading: boolean;
};

const statusMeta: Record<string, { title: string; color: string; icon: typeof Clock3; desc: string }> = {
  pago: {
    title: 'Pagamento aprovado',
    color: '#22c55e',
    icon: CheckCircle2,
    desc: 'Seu pagamento foi confirmado e a loja já pode seguir com a separação do pedido.',
  },
  aguardando_pagamento: {
    title: 'Pagamento em processamento',
    color: '#f59e0b',
    icon: Clock3,
    desc: 'Estamos aguardando a confirmação do PagBank. Isso pode levar alguns minutos.',
  },
  cancelado: {
    title: 'Pagamento não concluído',
    color: '#ef4444',
    icon: XCircle,
    desc: 'O pagamento foi cancelado ou recusado. Você pode tentar novamente.',
  },
};

export default function PaymentReturnPage() {
  const [params] = useSearchParams();
  const orderId = params.get('order') || '';
  const [state, setState] = useState<PaymentState>({
    order: null,
    status: 'aguardando_pagamento',
    error: '',
    loading: true,
  });

  useEffect(() => {
    if (!orderId) {
      setState({ order: null, status: 'cancelado', error: 'Pedido não informado no retorno do pagamento.', loading: false });
      return;
    }

    let active = true;
    api.orders.paymentStatus(orderId)
      .then((result) => {
        if (!active) return;
        setState({
          order: result.order,
          status: result.order.status || 'aguardando_pagamento',
          error: '',
          loading: false,
        });
      })
      .catch((error) => {
        if (!active) return;
        setState({
          order: null,
          status: 'cancelado',
          error: error instanceof Error ? error.message : 'Erro ao consultar pagamento.',
          loading: false,
        });
      });

    return () => {
      active = false;
    };
  }, [orderId]);

  if (state.loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', gap: 10 }}>
        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
        Confirmando pagamento...
      </div>
    );
  }

  const meta = statusMeta[state.status] || statusMeta.aguardando_pagamento;
  const Icon = meta.icon;

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px' }}>
      <div style={{ width: '100%', maxWidth: 520, background: '#111', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', padding: 28, textAlign: 'center' }}>
        <div style={{ width: 74, height: 74, margin: '0 auto 18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${meta.color}18`, border: `2px solid ${meta.color}` }}>
          <Icon size={30} style={{ color: meta.color }} />
        </div>
        <p style={{ fontSize: 10, color: '#a855f7', fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>SUH CONCEPT</p>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 8 }}>{meta.title}</h1>
        <p style={{ fontSize: 14, color: '#888', lineHeight: 1.7, marginBottom: 20 }}>{state.error || meta.desc}</p>
        {state.order && (
          <div style={{ padding: '14px 16px', borderRadius: 14, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 20, textAlign: 'left' }}>
            <p style={{ fontSize: 11, color: '#a855f7', fontWeight: 800, marginBottom: 8 }}>PEDIDO #{state.order.id.slice(-8).toUpperCase()}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, color: '#bbb' }}>
              <span>Total</span>
              <strong style={{ color: '#fff' }}>R$ {state.order.total.toFixed(2).replace('.', ',')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, color: '#bbb', marginTop: 8 }}>
              <span>Pagamento</span>
              <strong style={{ color: '#fff' }}>{state.order.paymentMethod}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, color: '#bbb', marginTop: 8 }}>
              <span>Status</span>
              <strong style={{ color: meta.color }}>{meta.title}</strong>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="btn-gradient no-underline" style={{ padding: '13px 24px', borderRadius: 12, fontSize: 12, letterSpacing: '0.08em' }}>
            VOLTAR À LOJA
          </Link>
          {orderId && (
            <Link to="/conta" className="no-underline" style={{ padding: '13px 24px', borderRadius: 12, fontSize: 12, letterSpacing: '0.08em', border: '1px solid rgba(255,255,255,0.08)', color: '#aaa' }}>
              MINHA CONTA
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
