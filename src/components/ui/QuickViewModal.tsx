import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Heart, Star, Minus, Plus, ChevronRight, Zap, Coins } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../../data/products';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import { getProductPricing, useStorePricingSettings } from '../../lib/storePricing';

interface Props {
  product: Product;
  onClose: () => void;
}

export default function QuickViewModal({ product, onClose }: Props) {
  const { addToCart, toggleWishlist, wishlist } = useStore();
  const navigate = useNavigate();
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] ?? '');
  const [selectedColor, setSelectedColor] = useState(product.colors[0]?.name ?? '');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const isWished = wishlist.includes(product.id);
  const isPerfumaria = product.categorySlug === 'perfumaria';
  const requiresColor = !isPerfumaria && product.colors.length > 0;
  const settings = useStorePricingSettings();
  const pricing = getProductPricing(product, settings);

  const handleAddToCart = () => {
    for (let i = 0; i < qty; i++) {
      addToCart(product, selectedSize, selectedColor);
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const handleBuyNow = () => {
    for (let i = 0; i < qty; i++) {
      addToCart(product, selectedSize, selectedColor);
    }
    onClose();
    navigate('/checkout');
  };

  const stars = Math.round(product.rating);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="qv-modal"
          style={{
            background: '#111', borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.08)',
            width: '100%', maxWidth: 860,
            maxHeight: '90vh', overflow: 'hidden',
            display: 'flex',
            boxShadow: '0 40px 120px rgba(0,0,0,0.9)',
          }}>

          {/* Image side */}
          <div className="qv-img-side" style={{ flexShrink: 0, position: 'relative', background: '#0d0d0d' }}>
            <img
              src={product.image}
              alt={product.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: isPerfumaria ? 'contain' : 'cover',
                objectPosition: isPerfumaria ? 'center center' : 'center top',
                display: 'block',
                padding: isPerfumaria ? 22 : 0,
                background: isPerfumaria ? 'radial-gradient(circle at top, rgba(168,85,247,0.14), transparent 58%), #111' : 'transparent',
              }}
            />
            {/* Badges */}
            <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {product.discount && (
                <span style={{ background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 900, padding: '4px 10px', borderRadius: 99, letterSpacing: '0.08em' }}>
                  {product.discount}% OFF
                </span>
              )}
              {product.isNew && !product.discount && (
                <span style={{ background: '#FF2DA0', color: '#fff', fontSize: 10, fontWeight: 900, padding: '4px 10px', borderRadius: 99, letterSpacing: '0.08em' }}>
                  NOVO
                </span>
              )}
            </div>
            {/* Wishlist */}
            <button
              onClick={() => toggleWishlist(product.id)}
              style={{
                position: 'absolute', top: 14, right: 14,
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                backdropFilter: 'blur(8px)',
              }}>
              <Heart size={16} fill={isWished ? '#FF2DA0' : 'none'} color={isWished ? '#FF2DA0' : '#fff'} />
            </button>
          </div>

          {/* Info side */}
          <div style={{ flex: 1, padding: '28px 28px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 10.5, color: '#555', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
                  {product.category}
                </p>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 8 }}>
                  {product.name}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={12} fill={s <= stars ? '#a855f7' : 'none'} color={s <= stars ? '#a855f7' : '#333'} />
                  ))}
                  <span style={{ fontSize: 11, color: '#555' }}>({product.reviews} avaliações)</span>
                </div>
              </div>
              <button onClick={onClose}
                style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#888', flexShrink: 0 }}>
                <X size={16} />
              </button>
            </div>

            {/* Price */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
              {product.originalPrice && (
                <p style={{ fontSize: 11.5, color: '#555', textDecoration: 'line-through', marginBottom: 2 }}>
                  R$ {product.originalPrice.toFixed(2).replace('.', ',')}
                </p>
              )}
              <p style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: 6 }}>
                R$ {product.price.toFixed(2).replace('.', ',')}
              </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={12} style={{ color: '#22C55E' }} />
                <p style={{ fontSize: 13, color: '#22C55E', fontWeight: 700 }}>
                  R$ {pricing.pixPrice.toFixed(2).replace('.', ',')} no PIX
                  <span style={{ color: '#555', fontWeight: 400 }}> ({pricing.pixDiscountPercent}% off)</span>
                </p>
              </div>
              <p style={{ fontSize: 11.5, color: '#444', marginTop: 3 }}>
                ou {pricing.installmentCount}x de R$ {pricing.installmentValue.toFixed(2).replace('.', ',')} sem juros
              </p>
              {pricing.comboPrice ? (
                <p style={{ fontSize: 11.5, color: '#FFB800', marginTop: 6, fontWeight: 700 }}>
                  Combo: 2 unidades por R$ {pricing.comboPrice.toFixed(2).replace('.', ',')}
                </p>
              ) : null}
            </div>

            {/* Cashback badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, background: 'rgba(255,184,0,0.07)', border: '1px solid rgba(255,184,0,0.18)', marginBottom: 16 }}>
              <Coins size={14} style={{ color: '#a855f7', flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: '#a855f7', fontWeight: 700 }}>
                Ganhe R$ {(product.price * 0.05).toFixed(2).replace('.', ',')} de cashback nessa compra
              </p>
            </div>

            {requiresColor && (
              <div style={{ marginBottom: 18 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Cor: <span style={{ color: '#fff' }}>{selectedColor}</span>
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {product.colors.map(c => (
                    <button
                      key={c.name}
                      title={c.name}
                      onClick={() => setSelectedColor(c.name)}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
                        background: c.hex,
                        border: selectedColor === c.name ? '2px solid #fff' : '2px solid rgba(255,255,255,0.15)',
                        boxShadow: selectedColor === c.name ? `0 0 0 2px ${c.hex}` : 'none',
                        transition: 'all 0.15s',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Size */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
                {isPerfumaria ? 'Volume' : 'Tamanho'}: <span style={{ color: '#fff' }}>{selectedSize}</span>
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {product.sizes.map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    style={{
                      minWidth: 44, height: 40, padding: '0 10px', borderRadius: 6, cursor: 'pointer',
                      fontWeight: 700, fontSize: 12.5, fontFamily: 'inherit',
                      background: selectedSize === s ? '#fff' : 'rgba(255,255,255,0.04)',
                      color: selectedSize === s ? '#000' : '#888',
                      border: `1.5px solid ${selectedSize === s ? '#fff' : 'rgba(255,255,255,0.1)'}`,
                      transition: 'all 0.15s',
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Qty */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Qtd:
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden' }}>
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: 'none', color: '#888', cursor: 'pointer' }}>
                  <Minus size={13} />
                </button>
                <span style={{ width: 40, textAlign: 'center', fontWeight: 700, color: '#fff', fontSize: 15 }}>{qty}</span>
                <button
                  onClick={() => setQty(q => q + 1)}
                  style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: 'none', color: '#888', cursor: 'pointer' }}>
                  <Plus size={13} />
                </button>
              </div>
            </div>

            {/* CTA buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleBuyNow}
                style={{
                  width: '100%', padding: '14px', borderRadius: 10, cursor: 'pointer',
                  background: 'linear-gradient(135deg, #a855f7, #FF2DA0)',
                  color: '#fff', fontWeight: 900, fontSize: 14, letterSpacing: '0.08em',
                  border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: 'inherit',
                }}>
                COMPRAR AGORA <ChevronRight size={16} />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleAddToCart}
                style={{
                  width: '100%', padding: '13px', borderRadius: 10, cursor: 'pointer',
                  background: added ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)',
                  color: added ? '#22C55E' : '#fff',
                  fontWeight: 800, fontSize: 13.5, letterSpacing: '0.08em',
                  border: `1.5px solid ${added ? '#22C55E' : 'rgba(255,255,255,0.12)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.25s', fontFamily: 'inherit',
                }}>
                <ShoppingBag size={16} />
                {added ? 'ADICIONADO À SACOLA ✓' : 'ADICIONAR À SACOLA'}
              </motion.button>

              <Link to={`/produto/${product.slug}`} onClick={onClose}
                className="no-underline"
                style={{ textAlign: 'center', fontSize: 12, color: '#444', marginTop: 4, transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
                onMouseLeave={e => (e.currentTarget.style.color = '#444')}>
                Ver página completa do produto →
              </Link>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
