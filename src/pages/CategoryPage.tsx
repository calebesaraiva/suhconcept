import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { useProducts } from '../lib/useApi';
import type { ApiProduct } from '../lib/api';
import ProductCard from '../components/ui/ProductCard';

const TITLE: Record<string, string> = {
  'todos':     'Todos os Produtos',
  'masculino': 'Masculino',
  'feminino':  'Feminino',
  'infantil':  'Infantil',
  'perfumaria':'Perfumaria',
  'copa-2026': 'Copa 2026',
  'outlet':    'Outlet',
};

type Sort = 'relevancia' | 'menor' | 'maior' | 'avaliacao';
const PRICE_MIN = 50;
const PRICE_MAX = 2000;

function matchSlug(p: ApiProduct, slug: string) {
  if (slug === 'todos') return true;
  if (slug === 'copa-2026') return p.collection === 'Copa 2026' || p.tags.includes('copa');
  if (slug === 'outlet') return p.discount !== undefined && p.discount > 0;
  return p.categorySlug === slug || p.tags.includes(slug);
}

function FilterPanel({
  availableSizes, availableColors, sizes, colors, priceMax, activeCount,
  onSize, onColor, onPrice, onClear, onClose,
}: {
  availableSizes: string[]; availableColors: string[];
  sizes: string[]; colors: string[]; priceMax: number; activeCount: number;
  onSize(s:string):void; onColor(c:string):void; onPrice(v:number):void;
  onClear():void; onClose?():void;
}) {
  return (
    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Filtros</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {activeCount > 0 && (
            <button onClick={onClear} style={{ fontSize: 11, color: '#FF2DA0', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
              Limpar tudo
            </button>
          )}
          {onClose && (
            <button onClick={onClose} style={{ color: '#666', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Active tags */}
        {activeCount > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {sizes.map(size => (
              <button key={`size-${size}`} onClick={() => onSize(size)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 8px', borderRadius: 99, background: 'rgba(255,45,160,0.1)', border: '1px solid rgba(255,45,160,0.3)', color: '#FF2DA0', cursor: 'pointer' }}>
                {size} <X size={8} />
              </button>
            ))}
            {colors.map(color => (
              <button key={`color-${color}`} onClick={() => onColor(color)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 8px', borderRadius: 99, background: 'rgba(255,45,160,0.1)', border: '1px solid rgba(255,45,160,0.3)', color: '#FF2DA0', cursor: 'pointer' }}>
                {color} <X size={8} />
              </button>
            ))}
          </div>
        )}

        {/* Tamanho */}
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 800, color: '#a855f7', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>Tamanho</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {availableSizes.map(s => (
              <button key={s} onClick={() => onSize(s)}
                style={{
                  minWidth: 42, height: 36, padding: '0 8px', borderRadius: 4, cursor: 'pointer',
                  border: `1px solid ${sizes.includes(s) ? '#a855f7' : 'rgba(255,255,255,0.12)'}`,
                  background: sizes.includes(s) ? 'rgba(255,184,0,0.1)' : 'transparent',
                  color: sizes.includes(s) ? '#a855f7' : '#888',
                  fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit',
                  transition: 'all 0.18s',
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Cor */}
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 800, color: '#a855f7', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>Cor</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {availableColors.map(c => (
              <button key={c} onClick={() => onColor(c)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, background: colors.includes(c) ? 'rgba(255,184,0,0.06)' : 'transparent', border: `1px solid ${colors.includes(c) ? 'rgba(255,184,0,0.3)' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.18s' }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: colors.includes(c) ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.2)', background: colors.includes(c) ? '#a855f7' : 'transparent' }}>
                  {colors.includes(c) && <X size={8} color="#000" />}
                </div>
                <span style={{ fontSize: 12, color: colors.includes(c) ? '#fff' : '#777' }}>{c}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preço */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 10.5, fontWeight: 800, color: '#a855f7', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Preço máx.</p>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>R$ {priceMax}</span>
          </div>
          <input type="range" min={PRICE_MIN} max={PRICE_MAX} step={10} value={priceMax}
            onChange={e => onPrice(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#a855f7' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#444', marginTop: 4 }}>
            <span>R$ {PRICE_MIN}</span><span>R$ {PRICE_MAX}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CategoryPage() {
  const { slug = 'todos' } = useParams();
  const title = TITLE[slug] ?? slug;

  const { data: productsData, loading: productsLoading } = useProducts({ limit: '500' });
  const allProducts = useMemo(() => productsData?.products ?? [], [productsData]);
  const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 768;

  const [sort, setSort] = useState<Sort>('relevancia');
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [priceMax, setPriceMax] = useState(PRICE_MAX);
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop);
  const [mobileFilter, setMobileFilter] = useState(false);
  const [visibleState, setVisibleState] = useState({ slug, count: 12 });
  const visible = visibleState.slug === slug ? visibleState.count : 12;

  const toggleSize = (s: string) => setSizes(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const toggleColor = (c: string) => setColors(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);
  const clearFilters = () => { setSizes([]); setColors([]); setPriceMax(PRICE_MAX); };
  const activeCount = sizes.length + colors.length + (priceMax < PRICE_MAX ? 1 : 0);

  const filtered = useMemo(() => {
    let list = allProducts.filter(p => matchSlug(p, slug));
    if (sizes.length) list = list.filter(p => p.sizes.some(s => sizes.includes(s)));
    if (colors.length) list = list.filter(p => p.colors.some(c => colors.includes(c.name)));
    list = list.filter(p => p.price <= priceMax);
    if (sort === 'menor') return [...list].sort((a, b) => a.price - b.price);
    if (sort === 'maior') return [...list].sort((a, b) => b.price - a.price);
    if (sort === 'avaliacao') return [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [allProducts, slug, sort, sizes, colors, priceMax]);

  const baseProducts = useMemo(() => allProducts.filter(p => matchSlug(p, slug)), [allProducts, slug]);

  const availableSizes = useMemo(() => (
    Array.from(new Set(baseProducts.flatMap(product => product.sizes))).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))
  ), [baseProducts]);

  const availableColors = useMemo(() => (
    Array.from(new Set(baseProducts.flatMap(product => product.colors.map(color => color.name)))).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  ), [baseProducts]);

  const filterProps = {
    availableSizes,
    availableColors,
    sizes,
    colors,
    priceMax,
    activeCount,
    onSize: toggleSize,
    onColor: toggleColor,
    onPrice: setPriceMax,
    onClear: clearFilters,
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px' }}>
      {/* Breadcrumb */}
      <nav className="breadcrumb" style={{ marginBottom: 20 }}>
        <Link to="/" className="no-underline">Início</Link>
        <ChevronRight size={12} />
        <span>{title}</span>
      </nav>

      {/* Título + toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="font-cinzel font-black text-white" style={{ fontSize: 'clamp(1.3rem,3vw,1.8rem)', letterSpacing: '0.06em' }}>
            {title.toUpperCase()}
          </h1>
          <p style={{ fontSize: 11.5, color: '#555', marginTop: 2 }}>
            {productsLoading ? 'Carregando...' : `${filtered.length} produto${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Ordenação */}
          <div style={{ position: 'relative' }}>
            <select value={sort} onChange={e => setSort(e.target.value as Sort)}
              className="cat-toolbar-sort"
              style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '9px 28px 9px 10px', color: '#ccc', fontSize: 13, fontFamily: 'inherit', outline: 'none', cursor: 'pointer', appearance: 'none' }}>
              <option value="relevancia">Mais Relevantes</option>
              <option value="menor">Menor Preço</option>
              <option value="maior">Maior Preço</option>
              <option value="avaliacao">Melhor Avaliados</option>
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#555', pointerEvents: 'none' }} />
          </div>

          {/* Botão filtros — mobile abre drawer, desktop toggle sidebar */}
          <button
            onClick={() => { if (isDesktop()) setSidebarOpen(o => !o); else setMobileFilter(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 14px', borderRadius: 6, cursor: 'pointer',
              background: sidebarOpen ? 'rgba(255,184,0,0.08)' : '#1a1a1a',
              border: `1px solid ${sidebarOpen ? '#a855f7' : 'rgba(255,255,255,0.1)'}`,
              color: sidebarOpen ? '#a855f7' : '#aaa',
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
            }}>
            <SlidersHorizontal size={14} />
            Filtros
            {activeCount > 0 && (
              <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: '#FF2DA0', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Layout principal */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Sidebar desktop */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }} animate={{ width: 220, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="cat-sidebar-desktop"
              style={{ flexShrink: 0, overflow: 'hidden' }}>
              <div style={{ width: 220 }} className="sticky top-24">
                <FilterPanel {...filterProps} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid produtos */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 16px', textAlign: 'center', background: '#111', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: 48, opacity: 0.15, marginBottom: 12 }}>🔍</p>
              <p style={{ fontWeight: 700, color: '#888', marginBottom: 4 }}>Nenhum produto encontrado</p>
              <p style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>Tente ajustar os filtros</p>
              <button onClick={clearFilters} className="btn-outline" style={{ fontSize: 12, padding: '8px 20px' }}>Limpar Filtros</button>
            </div>
          ) : (
            <>
              <div className="product-grid">
                {filtered.slice(0, visible).map((product, i) => (
                  <motion.div key={product.id}
                    initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (i % 4) * 0.06 }}>
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </div>
              {visible < filtered.length && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
                  <button onClick={() => setVisibleState({ slug, count: visible + 8 })} className="btn-outline">
                    CARREGAR MAIS ({filtered.length - visible} restantes)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      <AnimatePresence>
        {mobileFilter && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileFilter(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 61, background: '#0b0b0b', borderRadius: '16px 16px 0 0', overflow: 'hidden', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ overflowY: 'auto', flex: 1, padding: 16 }}>
                <FilterPanel {...filterProps} onClose={() => setMobileFilter(false)} />
              </div>
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button onClick={() => setMobileFilter(false)} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  VER {filtered.length} PRODUTOS
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
