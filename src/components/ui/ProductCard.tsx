import { useState } from 'react';
import { Heart, Star, Eye, Coins } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Product } from '../../data/products';
import { useStore } from '../../store/useStore';
import QuickViewModal from './QuickViewModal';
import { getProductPricing, useStorePricingSettings } from '../../lib/storePricing';

interface Props { product: Product; }

export default function ProductCard({ product }: Props) {
  const { toggleWishlist, wishlist } = useStore();
  const [hovered, setHovered] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const isWished = wishlist.includes(product.id);
  const stars = Math.round(product.rating);
  const isPerfumaria = product.categorySlug === 'perfumaria';
  const settings = useStorePricingSettings();
  const pricing = getProductPricing(product, settings);

  const openModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setModalOpen(true);
  };

  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: 'pointer', borderRadius: 14, overflow: 'hidden', background: '#111', border: '1px solid rgba(255,255,255,0.06)', transition: 'box-shadow 0.25s, transform 0.25s', transform: hovered ? 'translateY(-3px)' : 'translateY(0)', boxShadow: hovered ? '0 16px 48px rgba(0,0,0,0.5)' : 'none' }}
        onClick={openModal}>

        {/* Image */}
        <div style={{ position: 'relative', aspectRatio: '3/4', overflow: 'hidden', background: '#0d0d0d' }}>
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: isPerfumaria ? 'contain' : 'cover',
              background: isPerfumaria ? 'radial-gradient(circle at top, rgba(168,85,247,0.14), transparent 58%), #111' : 'transparent',
              padding: isPerfumaria ? 14 : 0,
              transition: 'transform 0.5s',
              transform: hovered ? 'scale(1.06)' : 'scale(1)',
            }}
          />

          {/* Dark overlay on hover */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', opacity: hovered ? 1 : 0, transition: 'opacity 0.3s' }} />

          {/* Badges */}
          <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {product.discount && (
              <span style={{ background: '#EF4444', color: '#fff', fontSize: 9.5, fontWeight: 900, padding: '3px 9px', borderRadius: 99, letterSpacing: '0.06em' }}>
                {product.discount}% OFF
              </span>
            )}
            {product.isNew && !product.discount && (
              <span style={{ background: '#FF2DA0', color: '#fff', fontSize: 9.5, fontWeight: 900, padding: '3px 9px', borderRadius: 99, letterSpacing: '0.06em' }}>
                NOVO
              </span>
            )}
          </div>

          {/* Wishlist btn */}
          <motion.button
            whileTap={{ scale: 0.82 }}
            onClick={e => { e.stopPropagation(); toggleWishlist(product.id); }}
            style={{
              position: 'absolute', top: 10, right: 10,
              width: 34, height: 34, borderRadius: '50%',
              background: isWished ? 'rgba(255,45,160,0.2)' : 'rgba(0,0,0,0.65)',
              border: `1px solid ${isWished ? 'rgba(255,45,160,0.5)' : 'rgba(255,255,255,0.12)'}`,
              backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              transition: 'all 0.2s',
            }}>
            <Heart size={14} fill={isWished ? '#FF2DA0' : 'none'} color={isWished ? '#FF2DA0' : '#fff'} />
          </motion.button>

          {/* Hover CTA */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            transform: hovered ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.28s cubic-bezier(0.22,1,0.36,1)',
          }}>
            <div style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Eye size={15} style={{ color: '#a855f7' }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: '0.1em' }}>VER RÁPIDO</span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: '14px 14px 16px' }}>
          <p style={{ fontSize: 10, color: '#666', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 5 }}>
            {product.category}
          </p>
          <h3 style={{ fontSize: 13.5, fontWeight: 700, color: '#e0e0e0', lineHeight: 1.35, marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {product.name}
          </h3>

          {/* Stars */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={10} fill={s <= stars ? '#a855f7' : 'none'} color={s <= stars ? '#a855f7' : '#333'} />
            ))}
            <span style={{ fontSize: 10.5, color: '#444', marginLeft: 2 }}>({product.reviews})</span>
          </div>

          {/* Price block */}
          <div>
            {product.originalPrice && (
              <p style={{ fontSize: 11, color: '#444', textDecoration: 'line-through', marginBottom: 1 }}>
                R$ {product.originalPrice.toFixed(2).replace('.', ',')}
              </p>
            )}
            <p style={{ fontSize: 17, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 3 }}>
              R$ {product.price.toFixed(2).replace('.', ',')}
            </p>
            <p style={{ fontSize: 11, color: '#22C55E', fontWeight: 600 }}>
              R$ {pricing.pixPrice.toFixed(2).replace('.', ',')} <span style={{ color: '#444', fontWeight: 400 }}>no PIX</span>
            </p>
            <p style={{ fontSize: 10.5, color: '#666', marginTop: 2 }}>
              {pricing.installmentCount}x R$ {pricing.installmentValue.toFixed(2).replace('.', ',')}
            </p>
            {pricing.comboPrice ? (
              <p style={{ fontSize: 10.5, color: '#FFB800', marginTop: 4, fontWeight: 700 }}>
                2 por R$ {pricing.comboPrice.toFixed(2).replace('.', ',')}
              </p>
            ) : null}
          </div>

          {/* Cashback */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, padding: '5px 8px', borderRadius: 6, background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.12)' }}>
            <Coins size={10} style={{ color: '#a855f7', flexShrink: 0 }} />
            <span style={{ fontSize: 10.5, color: '#a855f7', fontWeight: 700 }}>
              5% cashback · R$ {(product.price * 0.05).toFixed(2).replace('.', ',')}
            </span>
          </div>

          {/* Colors */}
          {!isPerfumaria && product.colors.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
              {product.colors.slice(0, 5).map(c => (
                <div key={c.name} title={c.name}
                  style={{ width: 14, height: 14, borderRadius: '50%', background: c.hex, border: '1.5px solid rgba(255,255,255,0.15)', flexShrink: 0 }}
                />
              ))}
              {product.colors.length > 5 && (
                <span style={{ fontSize: 10, color: '#444' }}>+{product.colors.length - 5}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <QuickViewModal product={product} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
