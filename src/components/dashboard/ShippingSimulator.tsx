import { useEffect, useMemo, useState } from 'react';
import { Loader2, MapPin, Package, Truck } from 'lucide-react';
import { api, type ApiProduct, type ShippingQuoteResponse } from '../../lib/api';

const cardStyle: React.CSSProperties = {
  background: '#111117',
  borderRadius: 18,
  border: '1px solid rgba(255,255,255,0.06)',
  padding: 22,
};

export default function ShippingSimulator() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [cep, setCep] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState<ShippingQuoteResponse | null>(null);
  const [subtotal, setSubtotal] = useState(0);

  useEffect(() => {
    api.dashboard.products()
      .then((items) => setProducts(items.filter((item) => item.active)))
      .catch(() => {
        setProducts([]);
      });
  }, []);

  const selectedItems = useMemo(
    () => products
      .filter((product) => (selected[product.id] || 0) > 0)
      .map((product) => ({
        productId: product.id,
        name: product.name,
        quantity: selected[product.id],
        unitPrice: product.price,
      })),
    [products, selected],
  );

  const simulate = async () => {
    if (!selectedItems.length) {
      setError('Selecione pelo menos um produto para simular o frete.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await api.dashboard.simulateShipping({
        cepDestino: cep,
        items: selectedItems.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      });
      setQuote(result.quote);
      setSubtotal(result.subtotal);
    } catch (simulationError) {
      setQuote(null);
      setSubtotal(0);
      setError(simulationError instanceof Error ? simulationError.message : 'Erro ao simular frete.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={cardStyle}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Simular Frete</p>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 10 }}>Resposta rápida para atendimento</h1>
        <p style={{ color: '#999', fontSize: 14, lineHeight: 1.7, maxWidth: 760 }}>
          Se o CEP for de Imperatriz/MA, o painel retorna automaticamente <strong style={{ color: '#fff' }}>Entrega local - Imperatriz: R$ 10,00</strong>.
          Para fora de Imperatriz, a simulação usa o cálculo automático configurado no backend.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.35fr) minmax(320px,0.9fr)', gap: 18 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <Package size={18} style={{ color: '#d8a84a' }} />
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Produtos</h2>
          </div>

          <div style={{ display: 'grid', gap: 10, maxHeight: 520, overflowY: 'auto', paddingRight: 4 }}>
            {products.map((product) => {
              const quantity = selected[product.id] || 0;
              return (
                <div key={product.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{product.name}</p>
                    <p style={{ color: '#888', fontSize: 12 }}>R$ {product.price.toFixed(2).replace('.', ',')} · Estoque {product.stock}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => setSelected((current) => ({ ...current, [product.id]: Math.max(0, quantity - 1) }))}
                      style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: '#0d0d10', color: '#fff', cursor: 'pointer' }}
                    >
                      -
                    </button>
                    <div style={{ minWidth: 28, textAlign: 'center', color: '#fff', fontWeight: 800 }}>{quantity}</div>
                    <button
                      onClick={() => setSelected((current) => ({ ...current, [product.id]: quantity + 1 }))}
                      style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: '#0d0d10', color: '#fff', cursor: 'pointer' }}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ ...cardStyle, alignSelf: 'start', position: 'sticky', top: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <Truck size={18} style={{ color: '#60a5fa' }} />
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Resultado</h2>
          </div>

          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>CEP do cliente</label>
          <input
            value={cep}
            onChange={(event) => setCep(event.target.value)}
            placeholder="65900-000"
            style={{ width: '100%', background: '#0d0d10', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '13px 16px', color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 14 }}
          />

          <button
            onClick={simulate}
            disabled={loading}
            style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#d8a84a,#b8842c)', color: '#fff', fontSize: 14, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Truck size={16} />}
            {loading ? 'SIMULANDO...' : 'SIMULAR FRETE'}
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ color: '#777', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Itens selecionados</p>
              {selectedItems.length ? (
                selectedItems.map((item) => (
                  <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: '#fff', fontSize: 13, marginBottom: 6 }}>
                    <span>{item.name} ×{item.quantity}</span>
                    <span>R$ {(item.unitPrice * item.quantity).toFixed(2).replace('.', ',')}</span>
                  </div>
                ))
              ) : (
                <p style={{ color: '#777', fontSize: 13 }}>Nenhum produto selecionado.</p>
              )}
            </div>

            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ color: '#777', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Frete</p>
              {quote ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <MapPin size={14} style={{ color: quote.provider === 'local' ? '#22C55E' : '#60a5fa' }} />
                    <span style={{ color: '#fff', fontWeight: 800 }}>{quote.selected.serviceName}</span>
                  </div>
                  <p style={{ color: quote.provider === 'local' ? '#22C55E' : '#60a5fa', fontSize: 16, fontWeight: 900 }}>
                    R$ {quote.selected.price.toFixed(2).replace('.', ',')}
                  </p>
                  <p style={{ color: '#888', fontSize: 12, marginTop: 6 }}>
                    Destino: {quote.destinationCity}/{quote.destinationState}{quote.selected.deadlineText ? ` · ${quote.selected.deadlineText}` : ''}
                  </p>
                </>
              ) : (
                <p style={{ color: error ? '#f59e0b' : '#777', fontSize: 13 }}>
                  {error || 'Informe um CEP e simule para ver o valor do frete.'}
                </p>
              )}
            </div>

            <div style={{ padding: '16px', borderRadius: 14, background: 'rgba(216,168,74,0.08)', border: '1px solid rgba(216,168,74,0.16)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d9d9d9', fontSize: 13, marginBottom: 8 }}>
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d9d9d9', fontSize: 13, marginBottom: 10 }}>
                <span>Frete</span>
                <span>{quote ? `R$ ${quote.selected.price.toFixed(2).replace('.', ',')}` : '--'}</span>
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: 18, fontWeight: 900 }}>
                <span>Total estimado</span>
                <span>R$ {(subtotal + (quote?.selected.price || 0)).toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
