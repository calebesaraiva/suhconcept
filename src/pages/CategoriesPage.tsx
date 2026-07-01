import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useProducts } from '../lib/useApi';

const CATS = [
  { slug: 'masculino',  label: 'Masculino',   emoji: '👔', color: '#818CF8', desc: 'Camisas do Brasil e modelos plus size' },
  { slug: 'feminino',   label: 'Feminino',    emoji: '👗', color: '#FF2DA0', desc: 'Camisa feminina retrô em destaque' },
  { slug: 'infantil',   label: 'Infantil',    emoji: '🧒', color: '#FFB800', desc: 'Conjuntos de 3 a 14 anos' },
  { slug: 'perfumaria', label: 'Perfumaria',  emoji: '🌿', color: '#38BDF8', desc: 'Perfumes, body splash e kits' },
  { slug: 'copa-2026',  label: 'Copa 2026',   emoji: '⚽', color: '#22C55E', desc: 'Coleção da seleção em destaque' },
  { slug: 'outlet',     label: 'Outlet',      emoji: '🏷️', color: '#f97316', desc: 'Descontos de até 50%' },
  { slug: 'todos',      label: 'Tudo',        emoji: '✨', color: '#a855f7', desc: 'Ver todos os produtos' },
];

export default function CategoriesPage() {
  const { data } = useProducts({ limit: '500' });
  const products = data?.products ?? [];

  const countFor = (slug: string) => {
    if (slug === 'todos') return products.length;
    if (slug === 'copa-2026') return products.filter((p) => p.collection === 'Copa 2026' || p.tags?.includes('copa')).length;
    if (slug === 'outlet') return products.filter((p) => p.discount && p.discount > 0).length;
    return products.filter((p) => p.categorySlug === slug).length;
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px 100px' }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#a855f7', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>
          Navegue por
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>Categorias</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {CATS.map((cat, i) => {
          const count = countFor(cat.slug);
          return (
            <motion.div key={cat.slug}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}>
              <Link to={`/categoria/${cat.slug}`} className="no-underline" style={{ display: 'block' }}>
                <div style={{
                  background: '#111', borderRadius: 16,
                  border: `1px solid ${cat.color}22`,
                  padding: '20px 18px',
                  position: 'relative', overflow: 'hidden',
                  transition: 'border-color 0.2s',
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${cat.color}, transparent)`, borderRadius: '16px 16px 0 0' }} />

                  <div style={{ fontSize: 32, marginBottom: 12 }}>{cat.emoji}</div>
                  <p style={{ fontSize: 16, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{cat.label}</p>
                  <p style={{ fontSize: 11, color: '#555', marginBottom: 12, lineHeight: 1.5 }}>{cat.desc}</p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: cat.color, fontWeight: 700 }}>
                      {count > 0 ? `${count} produtos` : 'Ver produtos'}
                    </span>
                    <ChevronRight size={14} style={{ color: cat.color }} />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
