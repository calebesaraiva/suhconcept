import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ChevronRight, CreditCard, QrCode, Lock,
  CheckCircle, ChevronLeft, Zap, Coins,
  Tag, Loader2, Store, MapPin, Clock,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api, type ShippingQuoteResponse } from '../lib/api';
import { getProductPricing, resolveStorePricingSettings } from '../lib/storePricing';

const STEPS = ['Dados', 'Pagamento', 'Revisão'];
type PayMethod = 'cartao' | 'pix';
type DeliveryMethod = 'delivery' | 'pickup';

const inp: React.CSSProperties = {
  width: '100%', background: '#0d0d0d',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 10, padding: '13px 14px',
  color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none',
  transition: 'border-color 0.2s',
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: '#555',
  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6,
};
const focusIn = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
  (e.target.style.borderColor = 'rgba(168,85,247,0.5)');
const focusOut = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
  (e.target.style.borderColor = 'rgba(255,255,255,0.09)');

export default function CheckoutPage() {
  const { cart, clearCart, showToast } = useStore();
  const [step, setStep] = useState(0);
  const [payMethod, setPayMethod] = useState<PayMethod>('cartao');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('delivery');
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponFreeShipping, setCouponFreeShipping] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [shippingMessage, setShippingMessage] = useState('Calcule o frete para ver o valor final da entrega.');
  const [shippingQuote, setShippingQuote] = useState<ShippingQuoteResponse | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState('');
  const [cepLookupLoading, setCepLookupLoading] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});

  const deliveryEnabled = settings.deliveryEnabled !== 'false';
  const pickupEnabled = settings.pickupEnabled !== 'false';
  const freeShipPromo = settings.freeShipPromo === 'true';
  const pricingSettings = resolveStorePricingSettings(settings);
  const freeShipThreshold = pricingSettings.freeShipThreshold;
  const whatsapp = settings.whatsapp?.trim();
  const storeAddress = settings.storeAddress || 'SUH CONCEPT - Imperatriz, MA';
  const storeHours = settings.storeHours || 'Seg-Sab: 9h-19h · Dom: 10h-14h';
  const maxInstallments = pricingSettings.maxInstallments;
  const interestFreeInstallments = pricingSettings.interestFreeInstallments;
  const pixEnabled = settings.pixEnabled !== 'false';
  const cardEnabled = settings.cardEnabled !== 'false';
  const resolvedPayMethod: PayMethod =
    !cardEnabled && pixEnabled ? 'pix' :
    !pixEnabled && cardEnabled ? 'cartao' :
    payMethod;
  const cardSubtotal = cart.reduce((a, i) => a + getProductPricing(i.product, pricingSettings, i.quantity, 'card').baseTotalPrice, 0);
  const pixSubtotal = cart.reduce((a, i) => a + getProductPricing(i.product, pricingSettings, i.quantity, 'pix').baseTotalPrice, 0);
  const cardComboDiscount = cart.reduce((a, i) => a + getProductPricing(i.product, pricingSettings, i.quantity, 'card').comboSavings, 0);
  const pixComboDiscount = cart.reduce((a, i) => a + getProductPricing(i.product, pricingSettings, i.quantity, 'pix').comboSavings, 0);
  const subtotal = +(cardSubtotal - cardComboDiscount).toFixed(2);
  const pixTotal = +(pixSubtotal - pixComboDiscount).toFixed(2);
  const pixDiscount = +(cardSubtotal - pixSubtotal).toFixed(2);
  const comboDiscount = resolvedPayMethod === 'pix' ? pixComboDiscount : cardComboDiscount;
  const [form, setForm] = useState({
    nome: '', cpf: '', email: '', tel: '',
    cep: '', rua: '', num: '', comp: '', bairro: '', cidade: '', estado: '',
    card_num: '', card_name: '', card_exp: '', card_cvv: '', parcelas: '1',
  });
  const itemCount = cart.reduce((a, i) => a + i.quantity, 0);
  const freeShippingApplied =
    deliveryMethod === 'delivery' &&
    (freeShipPromo || subtotal >= freeShipThreshold || couponFreeShipping);
  const cepDigits = form.cep.replace(/\D/g, '');
  const shippingAmount = deliveryMethod === 'delivery' && !freeShippingApplied ? shippingQuote?.selected.price ?? 0 : 0;
  const baseTotal = resolvedPayMethod === 'pix' ? pixTotal - couponDiscount : subtotal - couponDiscount;
  const total = +(baseTotal + shippingAmount).toFixed(2);
  const cashback = Math.max(0, total) * 0.05;

  useEffect(() => {
    api.settings.get()
      .then((data) => {
        setSettings(data);
        const allowDelivery = data.deliveryEnabled !== 'false';
        const allowPickup = data.pickupEnabled !== 'false';
        if (!allowDelivery && allowPickup) setDeliveryMethod('pickup');
        if (!allowPickup && allowDelivery) setDeliveryMethod('delivery');
      })
      .catch(() => {
        // Mantem os defaults caso o backend de configuracoes nao responda.
      });
  }, []);

  useEffect(() => {
    if (deliveryMethod !== 'delivery') {
      setShippingQuote(null);
      setShippingError('');
      setShippingLoading(false);
      return;
    }
    if (cepDigits.length !== 8) {
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
        cepDestino: cepDigits,
        subtotal,
        itemCount,
        serviceCode: shippingQuote?.selected.serviceCode,
        freeShipping: freeShipPromo || subtotal >= freeShipThreshold || couponFreeShipping,
        cidade: form.cidade,
        estado: form.estado,
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
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cepDigits, deliveryMethod, subtotal, itemCount, freeShipPromo, freeShipThreshold, couponFreeShipping, form.cidade, form.estado]);

  useEffect(() => {
    if (deliveryMethod !== 'delivery' || cepDigits.length !== 8) return;

    let cancelled = false;
    setCepLookupLoading(true);
    const timer = window.setTimeout(() => {
      api.shipping.lookupCep(cepDigits)
        .then((address) => {
          if (cancelled) return;
          setForm((current) => ({
            ...current,
            cep: current.cep || address.cep,
            rua: current.rua || address.logradouro,
            bairro: current.bairro || address.bairro,
            cidade: address.cidade,
            estado: address.estado,
          }));
        })
        .catch((error) => {
          if (cancelled) return;
          setShippingQuote(null);
          setShippingError(error instanceof Error ? error.message : 'CEP inválido. Verifique e tente novamente.');
        })
        .finally(() => {
          if (!cancelled) setCepLookupLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cepDigits, deliveryMethod]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);
  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const applyCoupon = async () => {
    const code = coupon.trim();
    if (!code) return;
    try {
      const orderBaseTotal = resolvedPayMethod === 'pix' ? pixTotal : subtotal;
      const result = await api.coupons.validate(code, orderBaseTotal);
      setCouponDiscount(result.discount);
      setCouponApplied(true);
      setCouponFreeShipping(result.freeShipping);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Cupom inválido', 'error');
    }
  };

  const resetCoupon = () => {
    setCouponApplied(false);
    setCouponDiscount(0);
    setCouponFreeShipping(false);
    setCoupon('');
  };

  const validateStep = () => {
    if (step === 0) {
      if (!form.nome.trim() || !form.email.trim() || !form.tel.trim()) {
        showToast('Preencha nome, e-mail e telefone.', 'error');
        return false;
      }
      if (deliveryMethod === 'delivery') {
        const required = [form.cep, form.rua, form.num, form.bairro, form.cidade, form.estado];
        if (required.some((value) => !value.trim())) {
          showToast('Preencha todos os dados de entrega.', 'error');
          return false;
        }
        if (cepDigits.length === 8 && shippingLoading) {
          showToast('Aguarde o cálculo do frete.', 'error');
          return false;
        }
        if (!freeShippingApplied && !shippingQuote) {
          showToast(shippingError || 'Calcule o frete pelo CEP antes de continuar.', 'error');
          return false;
        }
      }
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    if (step < 2) setStep((s) => s + 1);
    else void handleFinish();
  };

  const prev = () => step > 0 && setStep((s) => s - 1);

  const handleFinish = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    try {
      const items = cart.map((i) => {
        const pricing = getProductPricing(i.product, pricingSettings);
        return {
          productId: i.product.id,
          productName: i.product.name,
          quantity: i.quantity,
          price: resolvedPayMethod === 'pix' ? pricing.pixPrice : i.product.price,
          pixPrice: pricing.pixPrice,
          size: i.size,
          color: i.color,
        };
      });

      const { order, shipping, payment } = await api.orders.create({
        customerName: form.nome,
        customerEmail: form.email,
        customerPhone: form.tel,
        customerCpf: form.cpf,
        items,
        paymentMethod: resolvedPayMethod === 'cartao' ? `Cartão ${form.parcelas}x` : 'PIX',
        installments: resolvedPayMethod === 'cartao' ? Number(form.parcelas) : 1,
        deliveryMethod,
        address: deliveryMethod === 'delivery' ? {
          cep: form.cep,
          rua: form.rua,
          num: form.num,
          comp: form.comp,
          bairro: form.bairro,
          cidade: form.cidade,
          estado: form.estado,
        } : undefined,
        shippingQuote: deliveryMethod === 'delivery' && shippingQuote ? {
          serviceCode: shippingQuote.selected.serviceCode,
          serviceName: shippingQuote.selected.serviceName,
          price: shippingQuote.selected.price,
          deadlineDays: shippingQuote.selected.deadlineDays,
          deadlineText: shippingQuote.selected.deadlineText,
        } : undefined,
        couponCode: couponApplied ? coupon.toUpperCase() : undefined,
        discount: couponDiscount,
      });

      if (payment?.provider === 'pagbank' && payment.checkoutUrl) {
        clearCart();
        window.location.href = payment.checkoutUrl;
        return;
      }

      setOrderId(order.id);
      setShippingMessage(payment?.reason || shipping.message);
      clearCart();
      setDone(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao finalizar pedido. Tente novamente.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', minHeight: '60vh' }}>
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 420 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '2px solid #22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <CheckCircle size={32} style={{ color: '#22C55E' }} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Pedido confirmado!</h2>
        {orderId && <p style={{ fontSize: 11, color: '#a855f7', letterSpacing: '0.1em', marginBottom: 8, fontWeight: 700 }}>#{orderId.slice(-8).toUpperCase()}</p>}
        <p style={{ color: '#555', marginBottom: 20, lineHeight: 1.6 }}>
          {deliveryMethod === 'delivery' ? shippingMessage : 'Seu pedido ficou registrado com retirada na loja.'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 10, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', marginBottom: 28 }}>
          <Coins size={15} style={{ color: '#a855f7' }} />
          <p style={{ fontSize: 13, color: '#a855f7', fontWeight: 700 }}>R$ {cashback.toFixed(2).replace('.', ',')} de cashback na sua carteira!</p>
        </div>
        <Link to="/" className="btn-gradient no-underline" style={{ padding: '13px 32px', borderRadius: 10, fontSize: 13, letterSpacing: '0.06em' }}>
          CONTINUAR COMPRANDO
        </Link>
      </motion.div>
    </div>
  );

  if (cart.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', minHeight: '50vh', textAlign: 'center' }}>
      <p style={{ fontSize: 48, marginBottom: 16, opacity: 0.1 }}>🛍️</p>
      <p style={{ fontWeight: 600, color: '#555', marginBottom: 20 }}>Sua sacola está vazia</p>
      <Link to="/" className="btn-gradient no-underline" style={{ padding: '12px 28px', borderRadius: 10, fontSize: 13 }}>Voltar para a loja</Link>
    </div>
  );

  const deliverySummary = deliveryMethod === 'pickup'
    ? 'Retirada · Grátis'
    : freeShippingApplied
      ? 'Frete grátis'
      : shippingQuote
        ? `${shippingQuote.selected.serviceName} · R$ ${shippingAmount.toFixed(2).replace('.', ',')}`
        : shippingLoading
          ? 'Calculando...'
          : 'A calcular';

  const Stepper = () => (
    <div style={{ padding: '16px 0 28px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {STEPS.map((s, i) => {
          const doneStep = i < step;
          const active = i === step;
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <motion.button
                  onClick={() => doneStep && setStep(i)}
                  whileHover={doneStep ? { scale: 1.1 } : {}}
                  transition={{ duration: 0.2 }}
                  style={{
                    width: 40, height: 40, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none', cursor: doneStep ? 'pointer' : 'default', padding: 0,
                    flexShrink: 0,
                    background: active ? 'linear-gradient(135deg,#a855f7,#FF2DA0)' : doneStep ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.04)',
                    boxShadow: active ? '0 0 0 5px rgba(168,85,247,0.18), 0 6px 20px rgba(168,85,247,0.35)' : doneStep ? '0 0 0 3px rgba(168,85,247,0.15)' : 'none',
                    outline: active ? '1.5px solid rgba(255,255,255,0.08)' : 'none',
                    transition: 'all 0.3s',
                  }}
                >
                  {doneStep ? <CheckCircle size={18} style={{ color: '#a855f7' }} /> : <span style={{ fontSize: 13, fontWeight: 900, color: active ? '#fff' : '#333', fontFamily: 'inherit', lineHeight: 1 }}>{i + 1}</span>}
                </motion.button>
                <span style={{ fontSize: 9, fontWeight: active ? 900 : 600, letterSpacing: '0.12em', whiteSpace: 'nowrap', textTransform: 'uppercase', color: active ? '#fff' : doneStep ? '#a855f7' : '#2a2a2a' }}>
                  {s}
                </span>
              </div>

              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, margin: '0 6px', marginBottom: 24, position: 'relative', background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div animate={{ width: doneStep ? '100%' : '0%' }} transition={{ duration: 0.4, ease: 'easeInOut' }} style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,#a855f7,#FF2DA0)', borderRadius: 99 }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const StepForm = () => (
    <AnimatePresence mode="wait">
      <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
        {step === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="checkout-grid">
            <div style={{ gridColumn: 'span 2' }} className="checkout-full">
              <label style={lbl}>Nome completo</label>
              <input style={inp} value={form.nome} onChange={set('nome')} placeholder="João Silva" onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <label style={lbl}>CPF</label>
              <input style={inp} value={form.cpf} onChange={set('cpf')} placeholder="000.000.000-00" maxLength={14} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <label style={lbl}>Telefone</label>
              <input style={inp} value={form.tel} onChange={set('tel')} placeholder="(99) 99999-9999" onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div style={{ gridColumn: 'span 2' }} className="checkout-full">
              <label style={lbl}>E-mail</label>
              <input type="email" style={inp} value={form.email} onChange={set('email')} placeholder="seu@email.com" onFocus={focusIn} onBlur={focusOut} />
            </div>

            <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: pickupEnabled && deliveryEnabled ? '1fr 1fr' : '1fr', gap: 12 }} className="checkout-full">
              {deliveryEnabled && (
                <button onClick={() => setDeliveryMethod('delivery')} style={{ padding: '16px 18px', borderRadius: 14, border: `1.5px solid ${deliveryMethod === 'delivery' ? '#32718d' : 'rgba(12,46,42,0.13)'}`, background: deliveryMethod === 'delivery' ? 'rgba(50,113,141,0.1)' : '#fffdf7', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', boxShadow: deliveryMethod === 'delivery' ? '0 12px 26px rgba(50,113,141,0.12)' : 'none' }}>
                  <p style={{ fontSize: 14, fontWeight: 900, color: '#0b2f2b', marginBottom: 4 }}>Entrega</p>
                  <p style={{ fontSize: 11, color: deliveryMethod === 'delivery' ? '#32718d' : '#596760', fontWeight: deliveryMethod === 'delivery' ? 800 : 500 }}>
                    {freeShippingApplied ? 'Frete grátis para este pedido' : shippingQuote ? `${shippingQuote.selected.serviceName} · R$ ${shippingAmount.toFixed(2).replace('.', ',')}` : 'Informe o CEP para entrega'}
                  </p>
                </button>
              )}
              {pickupEnabled && (
                <button onClick={() => setDeliveryMethod('pickup')} style={{ padding: '16px 18px', borderRadius: 12, border: `1.5px solid ${deliveryMethod === 'pickup' ? '#22C55E' : 'rgba(255,255,255,0.07)'}`, background: deliveryMethod === 'pickup' ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Retirar na loja</p>
                  <p style={{ fontSize: 11, color: deliveryMethod === 'pickup' ? '#22C55E' : '#555' }}>Sem custo de frete</p>
                </button>
              )}
            </div>

            {deliveryMethod === 'delivery' ? (
              <>
                <div>
                  <label style={lbl}>CEP</label>
                  <input style={inp} value={form.cep} onChange={set('cep')} placeholder="65900-000" onFocus={focusIn} onBlur={focusOut} />
                </div>
                <div>
                  <label style={lbl}>Estado</label>
                  <input style={inp} value={form.estado} onChange={set('estado')} placeholder="MA" onFocus={focusIn} onBlur={focusOut} />
                </div>
                <div style={{ gridColumn: 'span 2' }} className="checkout-full">
                  <label style={lbl}>Rua / Avenida</label>
                  <input style={inp} value={form.rua} onChange={set('rua')} placeholder="Rua Exemplo" onFocus={focusIn} onBlur={focusOut} />
                </div>
                <div>
                  <label style={lbl}>Número</label>
                  <input style={inp} value={form.num} onChange={set('num')} placeholder="123" onFocus={focusIn} onBlur={focusOut} />
                </div>
                <div>
                  <label style={lbl}>Complemento</label>
                  <input style={inp} value={form.comp} onChange={set('comp')} placeholder="Apto, bloco, referência" onFocus={focusIn} onBlur={focusOut} />
                </div>
                <div>
                  <label style={lbl}>Bairro</label>
                  <input style={inp} value={form.bairro} onChange={set('bairro')} placeholder="Centro" onFocus={focusIn} onBlur={focusOut} />
                </div>
                <div>
                  <label style={lbl}>Cidade</label>
                  <input style={inp} value={form.cidade} onChange={set('cidade')} placeholder="Imperatriz" onFocus={focusIn} onBlur={focusOut} />
                </div>
                <div style={{ gridColumn: 'span 2' }} className="checkout-full">
                  <div style={{ padding: '14px 16px', borderRadius: 14, background: shippingError ? 'rgba(184,132,44,0.1)' : 'rgba(50,113,141,0.08)', border: `1px solid ${shippingError ? 'rgba(184,132,44,0.22)' : 'rgba(50,113,141,0.16)'}`, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    {shippingLoading || cepLookupLoading ? <Loader2 size={16} style={{ color: '#32718d', flexShrink: 0, marginTop: 1, animation: 'spin 1s linear infinite' }} /> : <MapPin size={16} style={{ color: shippingError ? '#9b6d22' : '#32718d', flexShrink: 0, marginTop: 1 }} />}
                    <div>
                      <p style={{ fontSize: 12, color: '#0b2f2b', fontWeight: 900, marginBottom: 3 }}>
                        {freeShippingApplied ? 'Frete grátis aplicado' : shippingQuote ? `${shippingQuote.selected.serviceName} calculado` : shippingLoading || cepLookupLoading ? 'Calculando frete' : 'Cálculo obrigatório de frete'}
                      </p>
                      <p style={{ fontSize: 12, color: shippingError ? '#6d5425' : '#32718d', lineHeight: 1.6 }}>
                        {freeShippingApplied
                          ? 'Este pedido atingiu uma regra de frete grátis. O valor da entrega fica zerado no pagamento.'
                          : shippingQuote
                            ? `Valor: R$ ${shippingAmount.toFixed(2).replace('.', ',')}${shippingQuote.selected.deadlineText ? ` · Prazo estimado: ${shippingQuote.selected.deadlineText}` : ''}. Esse frete já entra no total.`
                            : shippingError
                              ? `${shippingError}${whatsapp ? ` Se precisar, finalize com retirada ou fale conosco no WhatsApp ${whatsapp}.` : ''}`
                              : 'Digite o CEP. Se for Imperatriz/MA, aplicamos automaticamente Entrega local - Imperatriz: R$ 10,00. Para outras cidades, calculamos pelo Melhor Envio antes do pagamento.'}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ gridColumn: 'span 2' }} className="checkout-full">
                <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <Store size={16} style={{ color: '#22C55E', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 800, color: '#fff', marginBottom: 3 }}>Retirada gratuita</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <MapPin size={10} style={{ color: '#22C55E' }} />
                      <span style={{ fontSize: 11, color: '#888' }}>{storeAddress}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <Clock size={10} style={{ color: '#22C55E' }} />
                      <span style={{ fontSize: 11, color: '#888' }}>{storeHours}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: `${cardEnabled ? '1fr' : ''}${cardEnabled && pixEnabled ? ' 1fr' : ''}${pixEnabled ? '' : ''}`.trim() || '1fr', gap: 12 }}>
              {cardEnabled && (
                <button onClick={() => setPayMethod('cartao')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', border: `1.5px solid ${resolvedPayMethod === 'cartao' ? '#a855f7' : 'rgba(255,255,255,0.07)'}`, background: resolvedPayMethod === 'cartao' ? 'rgba(168,85,247,0.08)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s', textAlign: 'left' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: resolvedPayMethod === 'cartao' ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CreditCard size={20} style={{ color: resolvedPayMethod === 'cartao' ? '#a855f7' : '#444' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: resolvedPayMethod === 'cartao' ? '#fff' : '#666', marginBottom: 2 }}>Cartão</p>
                    <p style={{ fontSize: 11, color: resolvedPayMethod === 'cartao' ? '#a855f7' : '#333' }}>Parcele em até {maxInstallments}x</p>
                  </div>
                </button>
              )}
              {pixEnabled && (
                <button onClick={() => setPayMethod('pix')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', border: `1.5px solid ${resolvedPayMethod === 'pix' ? '#22C55E' : 'rgba(255,255,255,0.07)'}`, background: resolvedPayMethod === 'pix' ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s', textAlign: 'left' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: resolvedPayMethod === 'pix' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <QrCode size={20} style={{ color: resolvedPayMethod === 'pix' ? '#22C55E' : '#444' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: resolvedPayMethod === 'pix' ? '#fff' : '#666', marginBottom: 2 }}>PIX</p>
                    <p style={{ fontSize: 11, color: resolvedPayMethod === 'pix' ? '#22C55E' : '#333' }}>Desconto na hora</p>
                  </div>
                </button>
              )}
            </div>

            {resolvedPayMethod === 'cartao' && cardEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={lbl}>Parcelamento</label>
                  <select style={{ ...inp, cursor: 'pointer', appearance: 'none' as const }} value={form.parcelas} onChange={set('parcelas')} onFocus={focusIn} onBlur={focusOut}>
                    {Array.from({ length: maxInstallments }, (_, idx) => idx + 1).map((n) => (
                      <option key={n} value={n} style={{ background: '#111' }}>
                        {n}x {n === 1 ? '(à vista)' : n <= interestFreeInstallments ? '(sem juros)' : '(juros no checkout)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.18)' }}>
                  <p style={{ fontSize: 12, color: '#d7b8ff', lineHeight: 1.7 }}>
                    Os dados do cartão serão preenchidos com segurança no checkout oficial do PagBank. Na sua loja o cliente escolhe apenas a quantidade de parcelas.
                  </p>
                </div>
              </div>
            )}

            {resolvedPayMethod === 'pix' && pixEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '8px 0' }}>
                <div style={{ width: 110, height: 110, borderRadius: 12, background: '#fff', padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <QrCode size={82} style={{ color: '#000' }} />
                </div>
                <div style={{ textAlign: 'center', padding: '12px 24px', borderRadius: 10, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 4 }}>
                    <Zap size={14} style={{ color: '#22C55E' }} />
                    <p style={{ fontWeight: 900, fontSize: 22, color: '#22C55E' }}>R$ {pixTotal.toFixed(2).replace('.', ',')}</p>
                  </div>
                  <p style={{ fontSize: 12, color: '#22C55E', fontWeight: 600 }}>Economia de R$ {pixDiscount.toFixed(2).replace('.', ',')}</p>
                </div>
                <p style={{ fontSize: 11, color: '#999', textAlign: 'center' }}>O QR Code real será exibido no checkout seguro do PagBank.</p>
              </div>
            )}

            <div style={{ padding: '14px 16px', borderRadius: 12, background: deliveryMethod === 'pickup' ? 'rgba(34,197,94,0.05)' : 'rgba(59,130,246,0.05)', border: `1px solid ${deliveryMethod === 'pickup' ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)'}`, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {deliveryMethod === 'pickup' ? <Store size={16} style={{ color: '#22C55E', flexShrink: 0, marginTop: 2 }} /> : <MapPin size={16} style={{ color: '#60a5fa', flexShrink: 0, marginTop: 2 }} />}
              <div>
                <p style={{ fontSize: 12, fontWeight: 900, color: '#0b2f2b', marginBottom: 3 }}>
                  {deliveryMethod === 'pickup' ? 'Retirada na loja · Gratuita' : freeShippingApplied ? 'Entrega com frete grátis' : shippingQuote ? `Entrega · ${shippingQuote.selected.serviceName}` : 'Entrega com frete pelo CEP'}
                </p>
                {deliveryMethod === 'pickup' ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <MapPin size={10} style={{ color: '#22C55E' }} />
                      <span style={{ fontSize: 11, color: '#888' }}>{storeAddress}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <Clock size={10} style={{ color: '#22C55E' }} />
                      <span style={{ fontSize: 11, color: '#888' }}>{storeHours}</span>
                    </div>
                  </>
                ) : (
                  <span style={{ fontSize: 11, color: '#596760' }}>
                    {freeShippingApplied ? 'Sua entrega entrou em promoção de frete grátis.' : shippingQuote ? `R$ ${shippingAmount.toFixed(2).replace('.', ',')}${shippingQuote.selected.deadlineText ? ` · ${shippingQuote.selected.deadlineText}` : ''}. Valor incluído no total.` : 'Informe um CEP válido para calcular automaticamente.'}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cart.map((item) => (
              <div key={`${item.product.id}-${item.size}`} style={{ display: 'flex', gap: 12, padding: '12px', borderRadius: 12, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.05)' }}>
                <img src={item.product.image} alt={item.product.name} style={{ width: 52, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: '#fff', fontSize: 13, marginBottom: 3 }}>{item.product.name}</p>
                  <p style={{ fontSize: 11, color: '#444', marginBottom: 4 }}>
                    {item.color ? `${item.color} · ` : ''}{item.size} · Qtd: {item.quantity}
                  </p>
                  <p style={{ fontWeight: 900, color: '#fff', fontSize: 14 }}>
                    R$ {getProductPricing(item.product, pricingSettings, item.quantity, resolvedPayMethod === 'pix' ? 'pix' : 'card').totalPrice.toFixed(2).replace('.', ',')}
                  </p>
                  {getProductPricing(item.product, pricingSettings, item.quantity, resolvedPayMethod === 'pix' ? 'pix' : 'card').comboApplied && (
                    <p style={{ fontSize: 10.5, color: '#FFB800', marginTop: 3 }}>Combo aplicado nesta peça</p>
                  )}
                </div>
              </div>
            ))}
            <div style={{ padding: '14px 16px', borderRadius: 12, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.05)', marginTop: 4 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#555' }}>Entrega</span>
                  <span style={{ color: freeShippingApplied || deliveryMethod === 'pickup' ? '#22C55E' : '#60a5fa', fontWeight: 700 }}>{deliverySummary}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#555' }}>Pagamento</span>
                  <span style={{ color: '#ccc' }}>{resolvedPayMethod === 'cartao' ? `Cartão ${form.parcelas}x${Number(form.parcelas) > interestFreeInstallments ? ' com juros' : ''}` : 'PIX'}</span>
                </div>
                {deliveryMethod === 'delivery' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 12 }}>
                    <span style={{ color: '#555' }}>Entrega em</span>
                    <span style={{ color: '#ccc', textAlign: 'right' }}>
                      {`${form.rua}, ${form.num}${form.comp ? ` · ${form.comp}` : ''} - ${form.bairro} · ${form.cidade}/${form.estado}`}
                    </span>
                  </div>
                )}
                {!freeShippingApplied && deliveryMethod === 'delivery' && !shippingQuote && (
                  <p style={{ fontSize: 11, color: '#596760', lineHeight: 1.5 }}>
                    Informe um CEP válido para calcular o frete automaticamente antes do pagamento.
                  </p>
                )}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>Total</span>
                  <span style={{ fontWeight: 900, color: '#fff', fontSize: 18 }}>R$ {total.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );

  const Summary = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {cart.map((item) => (
          <div key={`${item.product.id}-${item.size}`} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <img src={item.product.image} alt={item.product.name} style={{ width: 44, height: 52, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product.name}</p>
              <p style={{ fontSize: 10.5, color: '#444', marginTop: 2 }}>{item.size} · ×{item.quantity}</p>
            </div>
            <p style={{ fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
              R$ {getProductPricing(item.product, pricingSettings, item.quantity, resolvedPayMethod === 'pix' ? 'pix' : 'card').totalPrice.toFixed(2).replace('.', ',')}
            </p>
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

      {!couponApplied ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Tag size={12} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }} />
            <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Cupom de desconto" style={{ ...inp, paddingLeft: 30, fontSize: 12 }} onFocus={focusIn} onBlur={focusOut} onKeyDown={(e) => e.key === 'Enter' && applyCoupon()} />
          </div>
          <button onClick={applyCoupon} style={{ padding: '0 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#aaa', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            USAR
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <CheckCircle size={13} style={{ color: '#22C55E' }} />
          <span style={{ fontSize: 12, color: '#22C55E', fontWeight: 700, flex: 1 }}>{coupon.toUpperCase()} aplicado!</span>
          <button onClick={resetCoupon} style={{ fontSize: 13, color: '#444', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#555' }}>
          <span>Subtotal</span><span>R$ {(resolvedPayMethod === 'pix' ? pixSubtotal : cardSubtotal).toFixed(2).replace('.', ',')}</span>
        </div>
        {resolvedPayMethod === 'pix' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#22C55E' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={10} />PIX</span>
            <span>−R$ {pixDiscount.toFixed(2).replace('.', ',')}</span>
          </div>
        )}
        {comboDiscount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#FFB800' }}>
            <span>Combo promocional</span>
            <span>−R$ {comboDiscount.toFixed(2).replace('.', ',')}</span>
          </div>
        )}
        {couponApplied && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#22C55E' }}>
            <span>{couponFreeShipping && couponDiscount === 0 ? 'Cupom de frete' : 'Cupom'}</span>
            <span>{couponDiscount > 0 ? `−R$ ${couponDiscount.toFixed(2).replace('.', ',')}` : 'Aplicado'}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#555' }}>
          <span>Entrega</span>
          <span style={{ color: freeShippingApplied || deliveryMethod === 'pickup' ? '#22C55E' : '#60a5fa', fontWeight: 700 }}>{deliverySummary}</span>
        </div>
        {shippingQuote && deliveryMethod === 'delivery' && !freeShippingApplied && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#596760' }}>
            <span>{shippingQuote.selected.serviceName}</span>
            <span>{shippingQuote.selected.deadlineText || 'Prazo estimado'}</span>
          </div>
        )}
        {deliveryMethod === 'delivery' && !freeShippingApplied && !shippingQuote && (
          <p style={{ fontSize: 11, color: '#596760', lineHeight: 1.5 }}>
            Digite o CEP para calcular o frete automaticamente antes de pagar.
          </p>
        )}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>Total</span>
          <span style={{ fontWeight: 900, fontSize: 20, color: '#fff' }}>R$ {total.toFixed(2).replace('.', ',')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.15)' }}>
          <Coins size={13} style={{ color: '#a855f7', flexShrink: 0 }} />
          <span style={{ fontSize: 11.5, color: '#a855f7', fontWeight: 700 }}>+R$ {cashback.toFixed(2).replace('.', ',')} cashback (5%)</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.1)' }}>
        <Lock size={12} style={{ color: '#22C55E', flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: '#22C55E' }}>Compra 100% segura e protegida</span>
      </div>
    </div>
  );

  return (
    <div className="checkout-page" style={{ paddingTop: 24, paddingLeft: 16, paddingRight: 16, maxWidth: 1040, margin: '0 auto', width: '100%' }}>
      {Stepper()}

      <div className="checkout-layout">
        <div style={{ background: '#111', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: '24px' }}>
          <p style={{ fontSize: 10, fontWeight: 900, color: '#a855f7', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 20 }}>
            {STEPS[step]}
          </p>
          {StepForm()}

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            {step > 0 && (
              <button onClick={prev} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '13px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.09)', background: 'transparent', color: '#777', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em', transition: 'all 0.2s' }}>
                <ChevronLeft size={14} /> VOLTAR
              </button>
            )}
            <button onClick={next} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#a855f7,#FF2DA0)', color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'inherit' }}>
              {submitting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> PROCESSANDO...</> : step === 2 ? <><Lock size={14} /> {resolvedPayMethod === 'cartao' || resolvedPayMethod === 'pix' ? 'IR PARA PAGAMENTO' : 'CONFIRMAR PEDIDO'}</> : <>CONTINUAR <ChevronRight size={14} /></>}
            </button>
          </div>
        </div>

        <div>
          <button onClick={() => setSummaryOpen((v) => !v)} className="checkout-summary-toggle" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: '#111', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>Resumo do pedido</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 900, color: '#fff', fontSize: 15 }}>R$ {total.toFixed(2).replace('.', ',')}</span>
              <ChevronRight size={14} style={{ color: '#555', transform: summaryOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
            </div>
          </button>
          <div className={`checkout-summary-card${summaryOpen ? ' open' : ''}`} style={{ background: '#111', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: '20px' }}>
            {Summary()}
          </div>
        </div>
      </div>

      <p style={{ fontSize: 10.5, color: '#555', textAlign: 'center', marginTop: 28, letterSpacing: '0.04em' }}>
        Desenvolvido por <span style={{ color: '#a855f7', fontWeight: 700 }}>NEXUS TECNOLOGIA LTDA</span>
      </p>
    </div>
  );
}
