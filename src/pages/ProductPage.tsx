import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  ShoppingBag,
  Truck,
  RefreshCw,
  Shield,
  Star,
  ChevronRight,
  Plus,
  Minus,
  ChevronDown,
  Store,
  Lock,
  Sparkles,
  BadgePercent,
  Clock3,
  Check,
} from 'lucide-react';
import { useProduct, useProducts } from '../lib/useApi';
import { useStore } from '../store/useStore';
import type { Product } from '../store/useStore';
import ProductCard from '../components/ui/ProductCard';
import { getProductPricing, useStorePricingSettings } from '../lib/storePricing';

const brl = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

export default function ProductPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { data: product, loading } = useProduct(slug);
  const { data: relatedData } = useProducts({ limit: '8' });
  const related = (relatedData?.products ?? []).filter((p) => p.slug !== slug).slice(0, 4);
  const { addToCart, toggleWishlist, wishlist, showToast } = useStore();
  const pricingSettings = useStorePricingSettings();

  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [qty, setQty] = useState(1);
  const [mainImg, setMainImg] = useState(0);
  const [accordion, setAccordion] = useState<string | null>('desc');

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', minHeight: '50vh' }}>
        <p style={{ color: '#444', fontSize: 14 }}>Carregando produto...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-5xl mb-4 opacity-20">😕</p>
        <p className="font-semibold text-gray-400 mb-2">Produto não encontrado</p>
        <button onClick={() => navigate('/')} className="btn-primary mt-4">Voltar para a loja</button>
      </div>
    );
  }

  const isWished = wishlist.includes(product.id);
  const isPerfumaria = product.categorySlug === 'perfumaria';
  const requiresColor = !isPerfumaria && product.colors.length > 0;
  const effectiveSelectedSize = selectedSize || (product.sizes.length === 1 ? product.sizes[0] : '');
  const effectiveSelectedColor = requiresColor
    ? selectedColor || (product.colors.length === 1 ? product.colors[0].name : '')
    : '';
  const reviewCount = product.reviewCount ?? product.reviews;
  const gallery = product.images?.length ? product.images : [product.image];
  const savings = product.originalPrice ? product.originalPrice - product.price : 0;
  const pricing = getProductPricing(product, pricingSettings);
  const comboPreview = getProductPricing(product, pricingSettings, Math.max(2, qty), 'card');
  const trustItems = [
    { icon: Shield, label: 'Compra segura', note: 'Pagamento protegido' },
    { icon: RefreshCw, label: 'Troca fácil', note: 'Em até 7 dias' },
    { icon: Truck, label: 'Entrega nacional', note: 'Frete combinado no WhatsApp' },
  ];
  const perks = [
    `Pix por ${brl(pricing.pixPrice)}`,
    `Parcele em até ${pricing.installmentCount}x`,
    product.stock > 0 ? `${product.stock} em estoque` : 'Últimas unidades',
  ];

  const acc = [
    {
      id: 'desc',
      title: 'Descrição',
      body: product.description || 'Peça exclusiva da coleção SUH CONCEPT. Confeccionada com materiais de alta qualidade para garantir conforto, presença e estilo no uso diário.',
    },
    {
      id: 'comp',
      title: isPerfumaria ? 'Detalhes do Produto' : 'Composição e Cuidados',
      body: isPerfumaria
        ? `Fragrância da categoria ${product.category.toLowerCase()} com apresentação ${effectiveSelectedSize || product.sizes[0] || 'padrão'}. Ideal para quem busca presença, acabamento premium e excelente percepção de valor.`
        : '100% algodão penteado. Lavar à mão ou máquina em ciclo delicado. Não usar secadora. Não torcer.',
    },
    {
      id: 'troca',
      title: 'Entrega, Trocas e Devoluções',
      body: `Frete grátis acima de ${brl(pricing.freeShipThreshold)} em pedidos elegíveis. Demais valores de entrega são informados manualmente no WhatsApp. Trocas e devoluções em até 7 dias após o recebimento, com produto sem uso e com etiqueta.`,
    },
  ];

  const handleAdd = () => {
    if (!effectiveSelectedSize || (requiresColor && !effectiveSelectedColor)) {
      showToast(requiresColor ? 'Selecione o tamanho e a cor' : 'Selecione o tamanho', 'error');
      return;
    }
    for (let i = 0; i < qty; i++) addToCart(product as Product, effectiveSelectedSize, effectiveSelectedColor);
  };

  return (
    <>
      <div className="product-page-shell" style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 16px 110px' }}>
        <nav className="breadcrumb product-breadcrumb mb-6">
          <Link to="/" className="no-underline">Início</Link>
          <ChevronRight size={12} />
          <Link to={`/categoria/${product.categorySlug}`} className="no-underline capitalize">{product.category}</Link>
          <ChevronRight size={12} />
          <span className="truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div
          className="product-hero-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 28,
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              className="product-gallery-card"
              style={{
                position: 'relative',
                borderRadius: 28,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.07)',
                background: isPerfumaria
                  ? 'radial-gradient(circle at top, rgba(168,85,247,0.2), transparent 38%), linear-gradient(180deg,#151218,#090909 76%)'
                  : 'linear-gradient(180deg,#141414,#0c0c0c 78%)',
                boxShadow: '0 30px 70px rgba(0,0,0,0.38)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.04), transparent 22%, transparent 78%, rgba(255,255,255,0.03))',
                  pointerEvents: 'none',
                }}
              />

              <div className="product-floating-badges" style={{ position: 'absolute', top: 16, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', gap: 10, zIndex: 2, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {product.isNew && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 999, background: 'rgba(255,45,160,0.16)', border: '1px solid rgba(255,45,160,0.28)', color: '#ffd5eb', fontSize: 11, fontWeight: 800 }}>
                      <Sparkles size={13} /> Novidade
                    </span>
                  )}
                  {product.isBestSeller && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 999, background: 'rgba(255,184,0,0.14)', border: '1px solid rgba(255,184,0,0.24)', color: '#ffe39d', fontSize: 11, fontWeight: 800 }}>
                      <BadgePercent size={13} /> Em alta
                    </span>
                  )}
                </div>
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className="product-wishlist-btn"
                  style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(10,10,10,0.55)', backdropFilter: 'blur(10px)', color: '#fff', cursor: 'pointer' }}
                >
                  <Heart size={18} fill={isWished ? '#FF2DA0' : 'none'} color={isWished ? '#FF2DA0' : '#fff'} />
                </button>
              </div>

              <motion.div
                key={mainImg}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
                className="product-main-image"
                style={{ aspectRatio: '1 / 1', padding: isPerfumaria ? 38 : 0 }}
              >
                <img
                  src={gallery[mainImg] ?? product.image}
                  alt={product.name}
                  className="w-full h-full"
                  style={{
                    objectFit: isPerfumaria ? 'contain' : 'cover',
                    filter: isPerfumaria ? 'drop-shadow(0 26px 34px rgba(0,0,0,0.42))' : 'none',
                  }}
                />
              </motion.div>

              <div className="product-perks-grid" style={{ position: 'absolute', left: 16, right: 16, bottom: 16, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                {perks.map((item) => (
                  <div
                    key={item}
                    className="product-perk-pill"
                    style={{
                      minWidth: 0,
                      padding: '10px 12px',
                      borderRadius: 14,
                      background: 'rgba(8,8,8,0.68)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#e7e7e7',
                      fontSize: 11,
                      fontWeight: 700,
                      textAlign: 'center',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="product-thumbnails product-thumbnails-row" style={{ gap: 10 }}>
              {gallery.map((img: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setMainImg(i)}
                  className="product-thumb-btn"
                  style={{
                    width: 78,
                    height: 78,
                    borderRadius: 16,
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: `1.5px solid ${i === mainImg ? '#FFB800' : 'rgba(255,255,255,0.08)'}`,
                    background: i === mainImg ? 'rgba(255,184,0,0.07)' : '#111',
                    padding: 6,
                    cursor: 'pointer',
                    boxShadow: i === mainImg ? '0 10px 24px rgba(255,184,0,0.12)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: isPerfumaria ? 'contain' : 'cover', borderRadius: 12 }} />
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div
              className="product-info-card"
              style={{
                padding: '26px 24px',
                borderRadius: 28,
                background: 'linear-gradient(180deg,rgba(255,255,255,0.038),rgba(255,255,255,0.016))',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.24)',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                <span style={{ padding: '8px 12px', borderRadius: 999, background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)', color: '#ddc0ff', fontSize: 11, fontWeight: 800 }}>
                  {product.category}
                </span>
                <span style={{ padding: '8px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#c8c8c8', fontSize: 11, fontWeight: 700 }}>
                  SKU {product.sku}
                </span>
                <span style={{ padding: '8px 12px', borderRadius: 999, background: product.stock > 3 ? 'rgba(34,197,94,0.12)' : 'rgba(255,184,0,0.12)', border: `1px solid ${product.stock > 3 ? 'rgba(34,197,94,0.22)' : 'rgba(255,184,0,0.22)'}`, color: product.stock > 3 ? '#9df1b6' : '#ffd880', fontSize: 11, fontWeight: 800 }}>
                  {product.stock > 3 ? 'Disponível agora' : 'Últimas unidades'}
                </span>
              </div>

              <h1 className="product-title text-2xl md:text-4xl font-black text-white mb-3 leading-tight">{product.name}</h1>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                <div className="stars" style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={15} fill={s <= Math.round(product.rating) ? '#FFB800' : 'none'} color={s <= Math.round(product.rating) ? '#FFB800' : '#444'} />
                  ))}
                </div>
                <span style={{ fontSize: 13, color: '#c1c1c1', fontWeight: 700 }}>{product.rating.toFixed(1)} de 5</span>
                <span style={{ fontSize: 12, color: '#737373' }}>{reviewCount} avaliações</span>
              </div>

              <p style={{ fontSize: 14, color: '#9a9a9a', lineHeight: 1.75, marginBottom: 22, maxWidth: 620 }}>
                {product.description || 'Seleção exclusiva da SUH CONCEPT com acabamento premium, ótima presença visual e proposta pensada para quem quer comprar bem e vestir personalidade.'}
              </p>

              <div
                style={{
                  padding: 20,
                  borderRadius: 22,
                  background: 'linear-gradient(135deg,rgba(20,20,20,0.96),rgba(13,13,13,0.98))',
                  border: '1px solid rgba(255,255,255,0.08)',
                  marginBottom: 18,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                  <div>
                    {product.originalPrice && (
                      <p style={{ fontSize: 14, color: '#666', textDecoration: 'line-through', marginBottom: 4 }}>{brl(product.originalPrice)}</p>
                    )}
                    <p style={{ fontSize: 38, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{brl(product.price)}</p>
                  </div>
                  {product.discount ? (
                    <div style={{ padding: '10px 14px', borderRadius: 16, background: 'rgba(255,45,160,0.12)', border: '1px solid rgba(255,45,160,0.18)' }}>
                      <p style={{ fontSize: 11, fontWeight: 900, color: '#ff9fd1', letterSpacing: '0.08em' }}>{product.discount}% OFF</p>
                      {savings > 0 && <p style={{ fontSize: 11, color: '#d9cad3', marginTop: 2 }}>Economia de {brl(savings)}</p>}
                    </div>
                  ) : null}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 }}>
                  <div style={{ padding: '12px 14px', borderRadius: 16, background: 'rgba(34,197,94,0.09)', border: '1px solid rgba(34,197,94,0.18)' }}>
                    <p style={{ fontSize: 10.5, fontWeight: 900, color: '#9df1b6', letterSpacing: '0.08em', marginBottom: 4 }}>PAGANDO NO PIX</p>
                    <p style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 2 }}>{brl(pricing.pixPrice)}</p>
                    <p style={{ fontSize: 11.5, color: '#6fce8b' }}>{pricing.pixDiscountPercent}% de desconto imediato</p>
                  </div>
                  <div style={{ padding: '12px 14px', borderRadius: 16, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.18)' }}>
                    <p style={{ fontSize: 10.5, fontWeight: 900, color: '#d7b4ff', letterSpacing: '0.08em', marginBottom: 4 }}>PARCELAMENTO</p>
                    <p style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 2 }}>{pricing.installmentCount}x de {brl(pricing.installmentValue)}</p>
                    <p style={{ fontSize: 11.5, color: '#b891ef' }}>sem juros no cartão</p>
                  </div>
                </div>

                {pricing.comboApplied || pricing.comboPrice ? (
                  <div style={{ padding: '13px 14px', borderRadius: 16, background: 'rgba(255,184,0,0.10)', border: '1px solid rgba(255,184,0,0.22)', marginBottom: 12 }}>
                    <p style={{ fontSize: 10.5, fontWeight: 900, color: '#ffe39d', letterSpacing: '0.08em', marginBottom: 4 }}>COMBO ESPECIAL</p>
                    <p style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 2 }}>
                      2 por {brl(pricing.comboPrice ?? comboPreview.comboPrice ?? 0)}
                    </p>
                    <p style={{ fontSize: 11.5, color: '#ffd880' }}>
                      Ao levar duas unidades, o carrinho aplica o valor automaticamente.
                    </p>
                  </div>
                ) : null}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {[
                    `Frete grátis acima de ${brl(pricing.freeShipThreshold)}`,
                    `Troca fácil em até 7 dias`,
                    `Envio ou retirada combinados`,
                  ].map((item) => (
                    <span key={item} style={{ padding: '8px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 11, color: '#d3d3d3', fontWeight: 700 }}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 18 }}>
                <div style={{ padding: '14px 15px', borderRadius: 18, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: 10.5, color: '#7b7b7b', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 4 }}>IDEAL PARA</p>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{isPerfumaria ? 'Presentear ou marcar presença' : 'Uso diário e looks de destaque'}</p>
                </div>
                <div style={{ padding: '14px 15px', borderRadius: 18, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: 10.5, color: '#7b7b7b', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 4 }}>DISPONIBILIDADE</p>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{product.stock > 0 ? `${product.stock} unidade${product.stock > 1 ? 's' : ''}` : 'Sob consulta'}</p>
                </div>
                <div style={{ padding: '14px 15px', borderRadius: 18, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: 10.5, color: '#7b7b7b', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 4 }}>ATENDIMENTO</p>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>Confirmação manual no WhatsApp</p>
                </div>
              </div>

              {requiresColor && (
                <div className="mb-5">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
                    Cor: <span className="text-white">{effectiveSelectedColor || 'Selecione'}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map((c) => {
                      const active = effectiveSelectedColor === c.name;
                      return (
                        <button
                          key={c.name}
                          onClick={() => setSelectedColor(c.name)}
                          title={c.name}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '9px 14px 9px 9px',
                            borderRadius: 14,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            border: `1.5px solid ${active ? '#FFB800' : 'rgba(255,255,255,0.12)'}`,
                            background: active ? 'rgba(255,184,0,0.09)' : 'rgba(255,255,255,0.02)',
                            transition: 'all 0.18s',
                          }}
                        >
                          <span style={{ width: 18, height: 18, borderRadius: '50%', background: c.hex, border: '1px solid rgba(255,255,255,0.3)', flexShrink: 0, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)' }} />
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: active ? '#FFB800' : '#bbb' }}>{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mb-5">
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
                  {isPerfumaria ? 'Volume' : 'Tamanho'}: <span className="text-white">{effectiveSelectedSize || 'Selecione'}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className="size-btn"
                      style={effectiveSelectedSize === s ? { borderColor: '#FFB800', color: '#FFB800', background: 'rgba(255,184,0,0.08)', borderRadius: 14, minWidth: 62, height: 42 } : { borderRadius: 14, minWidth: 62, height: 42 }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="product-add-desktop" style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)', background: '#111', overflow: 'hidden' }}>
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ width: 48, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Minus size={15} />
                  </button>
                  <span style={{ width: 42, textAlign: 'center', fontWeight: 800, color: '#fff', fontSize: 16 }}>{qty}</span>
                  <button onClick={() => setQty((q) => q + 1)} style={{ width: 48, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Plus size={15} />
                  </button>
                </div>

                <button
                  onClick={handleAdd}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '0 22px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg,#a855f7,#FF2DA0)', color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: '0.08em', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 18px 32px rgba(168,85,247,0.28)' }}
                >
                  <ShoppingBag size={17} /> ADICIONAR À SACOLA
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                {trustItems.map(({ icon: Icon, label, note }) => (
                  <div key={label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '14px 14px 13px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(168,85,247,0.12)', color: '#d8b4fe', flexShrink: 0 }}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p style={{ fontSize: 12.5, fontWeight: 800, color: '#fff', marginBottom: 3 }}>{label}</p>
                      <p style={{ fontSize: 11.5, color: '#7c7c7c', lineHeight: 1.45 }}>{note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div style={{ padding: '18px 16px', borderRadius: 22, background: 'linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Truck size={16} color="#22C55E" />
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>Entrega nacional</span>
                </div>
                <p style={{ fontSize: 11.5, color: '#7f7f7f', lineHeight: 1.55 }}>
                  Frete grátis acima de <strong style={{ color: '#fff' }}>{brl(pricing.freeShipThreshold)}</strong>. Abaixo disso, o valor é informado manualmente pelo WhatsApp.
                </p>
              </div>
              <div style={{ padding: '18px 16px', borderRadius: 22, background: 'linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Store size={16} color="#FFB800" />
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>Retirada sem custo</span>
                </div>
                <p style={{ fontSize: 11.5, color: '#7f7f7f', lineHeight: 1.55 }}>
                  Retire grátis em <strong style={{ color: '#fff' }}>Imperatriz - MA</strong> e agilize seu recebimento.
                </p>
              </div>
              <div style={{ padding: '18px 16px', borderRadius: 22, background: 'linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Clock3 size={16} color="#a855f7" />
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>Confirmação rápida</span>
                </div>
                <p style={{ fontSize: 11.5, color: '#7f7f7f', lineHeight: 1.55 }}>
                  Pedido recebido com atendimento humanizado para validar entrega e pagamento.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 34, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {[
            { icon: Check, title: 'Seleção premium', text: 'Produtos escolhidos com foco em presença, estilo e boa percepção de valor.' },
            { icon: Lock, title: 'Pagamento protegido', text: 'Checkout seguro com opção de Pix e parcelamento sem juros.' },
            { icon: RefreshCw, title: 'Troca sem complicação', text: 'Atendimento próximo e processo simples em até 7 dias.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} style={{ padding: '18px 18px 16px', borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Icon size={16} color="#FFB800" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{title}</p>
              <p style={{ fontSize: 12, color: '#7f7f7f', lineHeight: 1.6 }}>{text}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 42 }}>
          <div className="section-header" style={{ marginBottom: 18 }}>
            <div>
              <p className="section-label">DETALHES</p>
              <h2 className="section-title">TUDO O QUE VOCÊ PRECISA SABER</h2>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {acc.map((item) => (
              <div key={item.id} style={{ borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.012))', overflow: 'hidden' }}>
                <button
                  onClick={() => setAccordion(accordion === item.id ? null : item.id)}
                  className="w-full flex items-center justify-between text-left"
                  style={{ padding: '18px 18px 17px' }}
                >
                  <span className="font-bold text-sm text-white">{item.title}</span>
                  <ChevronDown size={17} className="text-gray-600 transition-transform" style={{ transform: accordion === item.id ? 'rotate(180deg)' : 'none' }} />
                </button>
                <AnimatePresence>
                  {accordion === item.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="text-sm text-gray-500 leading-relaxed" style={{ padding: '0 18px 18px' }}>{item.body}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {related.length > 0 && (
          <div style={{ marginTop: 52 }}>
            <div className="section-header">
              <div>
                <p className="section-label">VOCÊ PODE GOSTAR</p>
                <h2 className="section-title">ESCOLHAS QUE COMBINAM COM ESTE ESTILO</h2>
              </div>
            </div>
            <div className="product-grid">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>

      <div className="product-sticky-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: '#111', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: '#0d0d0d', overflow: 'hidden', flexShrink: 0 }}>
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ width: 38, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}><Minus size={13} /></button>
            <span style={{ width: 28, textAlign: 'center', fontWeight: 800, color: '#fff', fontSize: 14 }}>{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} style={{ width: 38, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}><Plus size={13} /></button>
          </div>
          <button onClick={handleAdd} style={{ flex: 1, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#a855f7,#FF2DA0)', color: '#fff', fontWeight: 900, fontSize: 12.5, letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'inherit' }}>
            <ShoppingBag size={15} /> ADICIONAR
          </button>
          <button onClick={() => toggleWishlist(product.id)} style={{ width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: '#0d0d0d', cursor: 'pointer', flexShrink: 0 }}>
            <Heart size={17} fill={isWished ? '#FF2DA0' : 'none'} color={isWished ? '#FF2DA0' : '#fff'} />
          </button>
        </div>
      </div>
    </>
  );
}
