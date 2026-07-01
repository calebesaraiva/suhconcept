import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Trash2, Plus, Minus, Tag, Truck, Lock, Zap, ArrowRight, Coins, MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { getProductPricing, useStorePricingSettings } from '../../lib/storePricing';
import { api, type ShippingQuoteResponse } from '../../lib/api';

const CASHBACK_RATE = 0.05; // 5%

interface Props { open: boolean; onClose: () => void; }

export default function CartDrawer({ open, onClose }: Props) {
  const { cart, removeFromCart, updateQuantity } = useStore();
  const settings = useStorePricingSettings();
  const subtotalBase  = cart.reduce((a, i) => a + getProductPricing(i.product, settings, i.quantity, 'card').baseTotalPrice, 0);
  const subtotalCombo = cart.reduce((a, i) => a + getProductPricing(i.product, settings, i.quantity, 'card').comboSavings, 0);
  const subtotal  = +(subtotalBase - subtotalCombo).toFixed(2);
  const pixBase   = cart.reduce((a, i) => a + getProductPricing(i.product, settings, i.quantity, 'pix').baseTotalPrice, 0);
  const pixCombo  = cart.reduce((a, i) => a + getProductPricing(i.product, settings, i.quantity, 'pix').comboSavings, 0);
  const pixTotal  = +(pixBase - pixCombo).toFixed(2);
  const count     = cart.reduce((a, i) => a + i.quantity, 0);
  const freeShip  = subtotal >= settings.freeShipThreshold;
  const progress  = Math.min((subtotal / settings.freeShipThreshold) * 100, 100);
  const pixSaving = subtotalBase - pixBase;
  const cashback  = subtotal * CASHBACK_RATE;
  const [cep, setCep] = useState('');
  const [shippingQuote, setShippingQuote] = useState<ShippingQuoteResponse | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState('');

  useEffect(() => {
    const digits = cep.replace(/\D/g, '');
    if (!open || digits.length !== 8 || cart.length === 0) {
      setShippingQuote(null);
      setShippingError('');
      setShippingLoading(false);
      return;
    }

    let cancelled = false;
    setShippingLoading(true);
    setShippingError('');

    const timer = window.setTimeout(() => {
      api.shipping.quote({
        cepDestino: digits,
        subtotal,
        itemCount: count,
      })
        .then((quote) => {
          if (cancelled) return;
          setShippingQuote(quote);
          setShippingError('');
        })
        .catch((error) => {
          if (cancelled) return;
          setShippingQuote(null);
          setShippingError(error instanceof Error ? error.message : 'Não foi possível calcular o frete.');
        })
        .finally(() => {
          if (!cancelled) setShippingLoading(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, cep, subtotal, count, cart.length]);

  const shippingLabel = shippingQuote
    ? `${shippingQuote.selected.serviceName}: R$ ${shippingQuote.selected.price.toFixed(2).replace('.', ',')}`
    : shippingLoading
      ? 'Calculando frete...'
      : shippingError
        ? shippingError
        : freeShip
          ? 'Frete grátis acima do valor mínimo'
          : 'Digite seu CEP para calcular';
  const shippingHint = freeShip
    ? 'Seu pedido já entrou na regra de frete grátis.'
    : shippingQuote
      ? shippingQuote.selected.deadlineText
        ? `${shippingQuote.selected.deadlineText} • valor já somado no checkout`
        : 'Frete calculado com sucesso'
      : shippingError
        ? 'Confira o CEP informado ou tente novamente.'
        : 'Entrega local em Imperatriz por R$ 10,00. Outras cidades calculam automático.';
  const totalWithShipping = subtotal + (freeShip || !shippingQuote ? 0 : shippingQuote.selected.price);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(4px)', zIndex: 50 }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="cart-drawer"
            style={{
              position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 51,
              width: '100%', maxWidth: 440,
              background: '#0f0f0f',
              borderLeft: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', flexDirection: 'column',
              boxShadow: '-24px 0 80px rgba(0,0,0,0.7)',
            }}>

            {/* ── Header ── */}
            <div className="cart-drawer-header" style={{ padding: '20px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0b0b0b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingBag size={17} style={{ color: '#a855f7' }} />
                </div>
                <div>
                  <h2 style={{ fontWeight: 800, fontSize: 15, color: '#fff', lineHeight: 1 }}>Minha Sacola</h2>
                  <p style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{count} {count === 1 ? 'item' : 'itens'}</p>
                </div>
              </div>
              <button onClick={onClose}
                style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#666' }}>
                <X size={16} />
              </button>
            </div>

            {/* ── Shipping progress ── */}
            <div className="cart-drawer-progress" style={{ padding: '12px 22px', background: freeShip ? 'rgba(34,197,94,0.05)' : '#0b0b0b', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {freeShip ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Truck size={14} style={{ color: '#22C55E' }} />
                  <p style={{ fontSize: 12.5, fontWeight: 700, color: '#22C55E' }}>Frete grátis garantido! 🎉</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Truck size={13} style={{ color: '#555' }} />
                    <p style={{ fontSize: 12, color: '#555' }}>
                      Faltam <strong style={{ color: '#fff' }}>R$ {(settings.freeShipThreshold - subtotal).toFixed(2).replace('.', ',')}</strong> para frete grátis
                    </p>
                  </div>
                  <div style={{ height: 4, borderRadius: 99, background: '#1a1a1a', overflow: 'hidden' }}>
                    <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }}
                      style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #a855f7, #FF2DA0)' }} />
                  </div>
                </>
              )}
            </div>

            {/* ── Items ── */}
            <div className="cart-drawer-content" style={{ flex: 1, overflowY: 'auto', padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cart.length === 0 ? (
                /* Empty state */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', gap: 0 }}>
                  <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                    <ShoppingBag size={36} style={{ color: 'rgba(255,255,255,0.1)' }} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Sacola vazia</h3>
                  <p style={{ fontSize: 13, color: '#444', lineHeight: 1.6, marginBottom: 28, maxWidth: 240 }}>
                    Explore nossas coleções e adicione os produtos que você curtir.
                  </p>
                  <button onClick={onClose}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                    EXPLORAR COLEÇÕES <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                cart.map(item => (
                  <motion.div
                    key={`${item.product.id}-${item.size}-${item.color}`}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    className="cart-item-card"
                    style={{ display: 'flex', gap: 14, padding: '14px', borderRadius: 12, background: '#161616', border: '1px solid rgba(255,255,255,0.06)' }}>

                    {/* Image */}
                    <div className="cart-item-image" style={{ width: 80, height: 96, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#0d0d0d' }}>
                      <img src={item.product.image} alt={item.product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>

                    {/* Info */}
                    <div className="cart-item-body" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontSize: 13.5, fontWeight: 700, color: '#e8e8e8', lineHeight: 1.3, marginBottom: 7, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {item.product.name}
                        </p>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                          {item.color && (
                            <span style={{ fontSize: 10.5, color: '#888', background: '#222', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.06)' }}>
                              {item.color}
                            </span>
                          )}
                          <span style={{ fontSize: 10.5, color: '#888', background: '#222', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.06)' }}>
                            {item.size}
                          </span>
                        </div>
                      </div>

                      <div className="cart-item-bottom" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Qty */}
                        <div style={{ display: 'flex', alignItems: 'center', borderRadius: 7, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <button onClick={() => updateQuantity(item.product.id, item.size, item.color, item.quantity - 1)}
                            style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: 'none', cursor: 'pointer', color: '#888' }}>
                            <Minus size={11} />
                          </button>
                          <span style={{ width: 32, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product.id, item.size, item.color, item.quantity + 1)}
                            style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: 'none', cursor: 'pointer', color: '#888' }}>
                            <Plus size={11} />
                          </button>
                        </div>

                        {/* Price + remove */}
                        <div className="cart-item-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className="cart-item-price" style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: 15, fontWeight: 900, color: '#fff' }}>
                              R$ {getProductPricing(item.product, settings, item.quantity, 'card').totalPrice.toFixed(2).replace('.', ',')}
                            </p>
                            {getProductPricing(item.product, settings, item.quantity, 'card').comboApplied ? (
                              <p style={{ fontSize: 10.5, color: '#FFB800' }}>
                                Combo aplicado
                              </p>
                            ) : item.quantity > 1 ? (
                              <p style={{ fontSize: 10.5, color: '#444' }}>
                                R$ {item.product.price.toFixed(2).replace('.', ',')} / un
                              </p>
                            ) : null}
                          </div>
                          <button onClick={() => removeFromCart(item.product.id, item.size, item.color)}
                            style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#555', transition: 'all 0.2s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.4)'; (e.currentTarget as HTMLElement).style.color = '#EF4444'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = '#555'; }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* ── Footer / Summary ── */}
            {cart.length > 0 && (
              <div className="cart-drawer-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: '#0b0b0b', padding: '18px 22px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Coupon */}
                <div className="cart-coupon-row" style={{ display: 'flex', gap: 8 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Tag size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }} />
                    <input
                      placeholder="Cupom de desconto"
                      style={{ width: '100%', background: '#141414', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '10px 12px 10px 34px', color: '#fff', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
                    />
                  </div>
                  <button style={{ padding: '0 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#aaa', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLElement).style.color = '#aaa'; }}>
                    APLICAR
                  </button>
                </div>

                <div className="cart-shipping-card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px', borderRadius: 16, background: 'linear-gradient(180deg, rgba(20,20,20,0.98), rgba(15,15,15,0.98))', border: `1px solid ${shippingError ? 'rgba(255,184,0,0.24)' : shippingQuote || freeShip ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.08)'}`, boxShadow: shippingQuote || freeShip ? '0 18px 38px rgba(34,197,94,0.08)' : '0 18px 38px rgba(0,0,0,0.24)' }}>
                  <div className="cart-shipping-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div className="cart-shipping-title-wrap" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 12, background: shippingQuote || freeShip ? 'rgba(34,197,94,0.12)' : 'rgba(168,85,247,0.12)', border: `1px solid ${shippingQuote || freeShip ? 'rgba(34,197,94,0.24)' : 'rgba(168,85,247,0.24)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {shippingLoading ? (
                          <Loader2 size={16} style={{ color: '#22C55E', animation: 'spin 1s linear infinite' }} />
                        ) : freeShip || shippingQuote ? (
                          <CheckCircle2 size={16} style={{ color: '#22C55E' }} />
                        ) : (
                          <Truck size={16} style={{ color: '#a855f7' }} />
                        )}
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 10.5, color: '#8b8b93', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>
                          Calcular frete
                        </label>
                        <p style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', lineHeight: 1.25 }}>
                          {shippingLoading ? 'Buscando melhor entrega...' : freeShip ? 'Frete grátis liberado' : shippingQuote ? 'Frete calculado' : 'Informe seu CEP'}
                        </p>
                      </div>
                    </div>
                    {(shippingQuote || freeShip) && (
                      <div style={{ padding: '5px 9px', borderRadius: 999, background: freeShip ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${freeShip ? 'rgba(34,197,94,0.24)' : 'rgba(255,255,255,0.08)'}`, fontSize: 10.5, fontWeight: 800, color: freeShip ? '#22C55E' : '#d4d4d8', whiteSpace: 'nowrap' }}>
                        {freeShip ? 'GRÁTIS' : 'OK'}
                      </div>
                    )}
                  </div>

                  <div style={{ position: 'relative' }}>
                    <MapPin size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }} />
                    <input
                      value={cep}
                      onChange={(event) => setCep(event.target.value)}
                      placeholder="Digite seu CEP"
                      inputMode="numeric"
                      maxLength={9}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: `1px solid ${shippingError ? 'rgba(255,184,0,0.26)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 12, padding: '12px 14px 12px 38px', color: '#fff', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', transition: 'all 0.18s' }}
                      onFocus={e => (e.currentTarget.style.borderColor = shippingError ? 'rgba(255,184,0,0.42)' : 'rgba(168,85,247,0.42)')}
                      onBlur={e => (e.currentTarget.style.borderColor = shippingError ? 'rgba(255,184,0,0.26)' : 'rgba(255,255,255,0.1)')}
                    />
                  </div>

                  <div className="cart-shipping-status" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start', padding: '10px 12px', borderRadius: 12, background: shippingError ? 'rgba(255,184,0,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${shippingError ? 'rgba(255,184,0,0.18)' : 'rgba(255,255,255,0.05)'}` }}>
                    <div>
                      <p style={{ fontSize: 11, color: '#8b8b93', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
                        Status do frete
                      </p>
                      <p style={{ fontSize: 11.5, color: shippingError ? '#fbbf24' : '#7b7b84', lineHeight: 1.5 }}>
                        {shippingHint}
                      </p>
                    </div>
                    <div className="cart-shipping-result" style={{ textAlign: 'right', minWidth: 120 }}>
                      <p style={{ fontSize: 10.5, color: '#8b8b93', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
                        Resultado
                      </p>
                      <p style={{ fontSize: 13, fontWeight: 800, color: shippingQuote ? '#22C55E' : shippingError ? '#fbbf24' : '#f4f4f5', lineHeight: 1.35 }}>
                        {shippingLabel}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="cart-summary-card" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px', borderRadius: 10, background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666' }}>
                    <span>Subtotal ({count} {count === 1 ? 'item' : 'itens'})</span>
                    <span style={{ color: '#aaa' }}>R$ {subtotalBase.toFixed(2).replace('.', ',')}</span>
                  </div>
                  {subtotalCombo > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#FFB800' }}>
                      <span>Combo promocional</span>
                      <span>– R$ {subtotalCombo.toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                  {pixSaving > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#22C55E' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Zap size={11} /> Desconto PIX ({settings.pixDiscount}%)
                      </span>
                      <span>– R$ {pixSaving.toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                  {/* Cashback */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#a855f7' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Coins size={11} /> Cashback (5%)
                    </span>
                    <span>+ R$ {cashback.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#555' }}>
                    <span>Frete</span>
                    <span style={{ color: freeShip ? '#22C55E' : '#aaa', fontWeight: freeShip ? 800 : 500 }}>
                      {freeShip ? 'Grátis 🎉' : shippingQuote ? `R$ ${shippingQuote.selected.price.toFixed(2).replace('.', ',')}` : 'Calcular agora'}
                    </span>
                  </div>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 900, fontSize: 14, color: '#fff' }}>Total</span>
                    <span style={{ fontWeight: 900, fontSize: 18, color: '#fff' }}>R$ {totalWithShipping.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                    <span style={{ color: '#444' }}>
                      ou <strong style={{ color: '#22C55E' }}>R$ {pixTotal.toFixed(2).replace('.', ',')}</strong> no PIX
                    </span>
                    <span style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', padding: '1px 7px', borderRadius: 99, fontSize: 10, fontWeight: 800, border: '1px solid rgba(34,197,94,0.2)' }}>
                      {settings.pixDiscount}% OFF
                    </span>
                  </div>
                </div>

                {/* Cashback banner */}
                <div className="cart-cashback-banner" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, background: 'rgba(255,184,0,0.07)', border: '1px solid rgba(255,184,0,0.2)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,184,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Coins size={16} style={{ color: '#a855f7' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 12.5, fontWeight: 800, color: '#a855f7', lineHeight: 1.2 }}>
                      Você vai ganhar R$ {cashback.toFixed(2).replace('.', ',')} de cashback!
                    </p>
                    <p style={{ fontSize: 11, color: '#664d00', marginTop: 2 }}>
                      5% do valor volta pra sua carteira SUH
                    </p>
                  </div>
                </div>

                {/* CTA */}
                <Link to="/checkout" onClick={onClose}
                  className="no-underline"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '15px', borderRadius: 10, background: 'linear-gradient(135deg, #a855f7, #FF2DA0)', color: '#fff', fontWeight: 900, fontSize: 14, letterSpacing: '0.06em', transition: 'opacity 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                  <Lock size={15} /> FINALIZAR COMPRA
                </Link>

                <button onClick={onClose}
                  style={{ background: 'none', border: 'none', color: '#444', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#888')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#444')}>
                  Continuar comprando
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
