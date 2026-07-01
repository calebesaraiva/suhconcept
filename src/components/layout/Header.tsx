import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Heart, ShoppingBag, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { getProductPricing, useStorePricingSettings } from '../../lib/storePricing';
import { useProducts } from '../../lib/useApi';
import { getStoredUser, SESSION_EVENT, type ApiUser } from '../../lib/api';

interface Props { onMenuOpen: () => void; onCartOpen: () => void; onAccountOpen: () => void; }

export default function Header({ onMenuOpen, onCartOpen, onAccountOpen }: Props) {
  const { cart, wishlist } = useStore();
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(() => getStoredUser());
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const cartCount = cart.reduce((a, i) => a + i.quantity, 0);
  const pricingSettings = useStorePricingSettings();
  const { data: searchProductsData } = useProducts({ limit: '100' });
  const searchProducts = useMemo(() => searchProductsData?.products ?? [], [searchProductsData]);
  const accountLabel = currentUser ? `Olá, ${currentUser.name.split(' ')[0]}` : 'Entrar';

  useEffect(() => {
    const syncUser = () => setCurrentUser(getStoredUser());
    window.addEventListener(SESSION_EVENT, syncUser as EventListener);
    window.addEventListener('storage', syncUser);
    return () => {
      window.removeEventListener(SESSION_EVENT, syncUser as EventListener);
      window.removeEventListener('storage', syncUser);
    };
  }, []);

  const suggestions = useMemo(() => {
    if (search.length <= 1) return [];
    const q = search.toLowerCase();
    return searchProducts.filter((p) =>
      p.name.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [search, searchProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/busca?q=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  return (
    <header style={{ background: 'linear-gradient(180deg, #0b0b0b 0%, #0d0d0d 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '0 20px',
        height: 74, display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center', gap: 16,
      }} className="hdr-shell">

        {/* ── ESQUERDA: hamburger mobile + busca desktop ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="hdr-left">
          {/* Hamburger mobile */}
          <button onClick={onMenuOpen} className="hdr-menu-btn" style={{ flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <line x1="2" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="2" y1="11" x2="20" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="2" y1="16" x2="20" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Search desktop */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 340 }} className="hdr-search-desktop">
            <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }} />
            <form onSubmit={handleSearch}>
              <input
                ref={inputRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 200)}
                placeholder="Buscar produtos, coleções..."
                style={{
                  width: '100%',
                  background: focused ? 'rgba(255,255,255,0.06)' : '#111',
                  border: `1px solid ${focused ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 8,
                  padding: '10px 36px 10px 40px',
                  color: '#fff', fontSize: 13,
                  fontFamily: 'inherit', outline: 'none',
                  transition: 'all 0.2s',
                  boxShadow: focused ? '0 0 0 3px rgba(168,85,247,0.12)' : 'none',
                }}
              />
            </form>
            {search && (
              <button type="button" onClick={() => { setSearch(''); }}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#555', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            )}

            {/* Suggestions */}
            <AnimatePresence>
              {focused && suggestions.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                    background: '#161616', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, overflow: 'hidden', zIndex: 50,
                    boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
                  }}>
                  {suggestions.map(p => (
                    <Link key={p.id} to={`/produto/${p.slug}`}
                      onClick={() => { setSearch(''); }}
                      className="no-underline"
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background .15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <img src={p.image} alt={p.name} style={{ width: 34, height: 42, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                        <p style={{ fontSize: 11, color: '#22C55E', fontWeight: 600, marginTop: 2 }}>R$ {getProductPricing(p, pricingSettings).pixPrice.toFixed(2).replace('.', ',')} <span style={{ color: '#555', fontWeight: 400 }}>no PIX</span></p>
                      </div>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── CENTRO: Logo ── */}
        <Link to="/" className="no-underline hdr-logo-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <img
            src="/suh-logo-transparent.png"
            alt="SUH CONCEPT"
            style={{ height: 54, width: 'auto', objectFit: 'contain', display: 'block' }}
            className="hdr-logo-img"
          />
        </Link>

        {/* ── DIREITA: ações ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }} className="hdr-right">

          {/* Entrar */}
          <button onClick={onAccountOpen} className="hdr-entrar hdr-desktop-only">
            <User size={14} />
            <span>{accountLabel}</span>
          </button>

          {/* Favoritos */}
          <Link to="/favoritos" className="hdr-icon hdr-desktop-only no-underline" style={{ position: 'relative' }}>
            <Heart size={19} />
            {wishlist.length > 0 && (
              <span style={{ position: 'absolute', top: 4, right: 4, minWidth: 14, height: 14, borderRadius: 7, background: '#a855f7', color: '#fff', fontSize: 8.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px' }}>
                {wishlist.length}
              </span>
            )}
          </Link>

          {/* Sacola */}
          <button onClick={onCartOpen} className="hdr-sacola" style={{ marginLeft: 6 }}>
            <ShoppingBag size={16} />
            <span className="hdr-sacola-label hdr-desktop-only">Sacola</span>
            {cartCount > 0 && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="hdr-sacola-badge"
                style={{ minWidth: 18, height: 18, borderRadius: 9, background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                {cartCount}
              </motion.span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="hdr-mobile-search-bar hdr-mobile-only" style={{ padding: '12px 16px 14px' }}>
        <form onSubmit={handleSearch} style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar produtos..."
            style={{ width: '100%', background: 'linear-gradient(180deg, #121212 0%, #0f0f0f 100%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '13px 40px 13px 42px', color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 12px 24px rgba(0,0,0,0.2)' }} />
          {search && (
            <button type="button" onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          )}
        </form>
      </div>
    </header>
  );
}
