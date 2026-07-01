import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Edit2, Star, Package, AlertTriangle, CheckCircle, RefreshCw, X, Plus, TrendingUp, Eye, EyeOff } from 'lucide-react';
import { useDashboardProducts } from '../../lib/useApi';
import { api } from '../../lib/api';
import type { ApiProduct } from '../../lib/api';
import { useStore } from '../../store/useStore';
import { canViewCostData } from '../../lib/dashboardRoles';

const card: React.CSSProperties = {
  background: '#111117',
  borderRadius: 18,
  border: '1px solid rgba(255,255,255,0.06)',
};

const inp: React.CSSProperties = {
  width: '100%', background: '#0d0d0d',
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
  padding: '11px 14px', color: '#fff', fontSize: 14,
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700, color: '#999',
  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6,
};

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function marginColor(pct: number) {
  if (pct >= 40) return '#22c55e';
  if (pct >= 20) return '#f59e0b';
  return '#ef4444';
}

function getProductStatus(product: ApiProduct) {
  if (!product.active) {
    return {
      label: 'DESATIVADO',
      color: '#ef4444',
      background: 'rgba(239,68,68,0.1)',
    };
  }

  if (product.stock <= 0) {
    return {
      label: 'ESGOTADO',
      color: '#f59e0b',
      background: 'rgba(245,158,11,0.12)',
    };
  }

  return {
    label: 'ATIVO',
    color: '#22c55e',
    background: 'rgba(34,197,94,0.1)',
  };
}

/* ── Empty form state ── */
const emptyForm = {
  name: '', sku: '', category: '', price: '', costPrice: '',
  stock: '', image: '', description: '', sizes: '', colors: '', tags: '', collection: '',
  isNew: false, isBestSeller: false, active: true,
};

const presetCategories = ['Masculino', 'Feminino', 'Infantil', 'Perfumaria', 'Copa 2026', 'Plus Size'];
const defaultColorPalette = ['#111111', '#f5f5f5', '#2563eb', '#ec4899', '#c9a227', '#dbeafe', '#22c55e', '#7c3aed'];
const isPerfumariaCategory = (value: string) =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('perfumaria');

type EditForm = {
  name: string;
  sku: string;
  category: string;
  collection: string;
  price: string;
  costPrice: string;
  stock: string;
  image: string;
  images: string;
  description: string;
  sizes: string;
  colors: string;
  tags: string;
  isNew: boolean;
  isBestSeller: boolean;
  active: boolean;
};

export default function Products({ role }: { role: string }) {
  const { showToast } = useStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todos');

  /* edit */
  const [editing, setEditing] = useState<ApiProduct | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving]           = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  /* create */
  const [creating, setCreating] = useState(false);
  const [form, setForm]         = useState(emptyForm);
  const [creating2, setCreating2] = useState(false);

  const { data: productsRaw, loading, refetch } = useDashboardProducts();
  const products = productsRaw ?? [];
  const showCostFields = canViewCostData(role);

  const categories = ['todos', ...Array.from(new Set([...presetCategories, ...products.map(p => p.category)]))];

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'todos' || p.category === filter;
    return matchSearch && matchFilter;
  });

  /* KPI – also compute total margin */
  const totalStockValue = products.reduce((s, p) => s + p.stock * (p.costPrice ?? p.price * 0.58), 0);
  const statsData = [
    { label: 'Total',         value: products.length,                                                color: '#a855f7', icon: Package,       sub: showCostFields ? `${fmtBRL(totalStockValue)} em estoque` : 'controle geral do catálogo' },
    { label: 'Em Estoque',    value: products.filter(p => p.stock > 5).length,                       color: '#22c55e', icon: CheckCircle,   sub: 'acima de 5 unidades' },
    { label: 'Estoque Baixo', value: products.filter(p => p.stock > 0 && p.stock <= 5).length,       color: '#f59e0b', icon: AlertTriangle, sub: 'entre 1 e 5 unidades' },
    { label: 'Sem Estoque',   value: products.filter(p => p.stock === 0).length,                     color: '#ef4444', icon: X,             sub: 'esgotados' },
  ];

  /* open edit modal */
  const openEdit = (p: ApiProduct) => {
    const isPerfumaria = isPerfumariaCategory(p.categorySlug || p.category);
    setEditing(p);
    setEditForm({
      name: p.name,
      sku: p.sku,
      category: p.category,
      collection: p.collection ?? '',
      price: String(p.price),
      costPrice: String(p.costPrice ?? ''),
      stock: String(p.stock),
      image: p.image,
      images: (p.images ?? []).join(', '),
      description: p.description ?? '',
      sizes: (p.sizes ?? []).join(', '),
      colors: isPerfumaria ? '' : (p.colors ?? []).map(color => color.name).join(', '),
      tags: (p.tags ?? []).join(', '),
      isNew: p.isNew,
      isBestSeller: p.isBestSeller,
      active: p.active,
    });
  };

  const saveEdit = async () => {
    if (!editing || !editForm) return;
    setSaving(true);
    try {
      const parsedImages = editForm.images
        .split(',')
        .map(image => image.trim())
        .filter(Boolean);
      const isPerfumaria = isPerfumariaCategory(editForm.category);

      await api.dashboard.updateProduct(editing.id, {
        name: editForm.name,
        sku: editForm.sku,
        category: editForm.category,
        categorySlug: editForm.category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        collection: editForm.collection || undefined,
        stock: parseInt(editForm.stock || '0'),
        price: parseFloat(editForm.price),
        costPrice: editForm.costPrice ? parseFloat(editForm.costPrice) : undefined,
        image: editForm.image,
        images: parsedImages.length ? parsedImages : [editForm.image].filter(Boolean),
        description: editForm.description,
        sizes: editForm.sizes.split(',').map(size => size.trim()).filter(Boolean),
        colors: isPerfumaria ? [] : editForm.colors
          ? editForm.colors.split(',').map((name, index) => ({
              name: name.trim(),
              hex: defaultColorPalette[index % defaultColorPalette.length],
            })).filter(color => color.name)
          : [],
        tags: editForm.tags.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean),
        isNew: editForm.isNew,
        isBestSeller: editForm.isBestSeller,
        active: editForm.active,
      });
      refetch();
      setEditing(null);
      setEditForm(null);
      showToast('Produto atualizado com sucesso!');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao salvar', 'error');
    } finally { setSaving(false); }
  };

  const toggleProductVisibility = async (product: ApiProduct) => {
    setTogglingId(product.id);
    try {
      await api.dashboard.updateProduct(product.id, { active: !product.active });
      if (editing?.id === product.id) {
        setEditing((prev) => (prev ? { ...prev, active: !prev.active } : prev));
        setEditForm((prev) => (prev ? { ...prev, active: !prev.active } : prev));
      }
      refetch();
      showToast(product.active ? 'Produto desativado na loja.' : 'Produto ativado na loja.');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao alterar visibilidade do produto', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  /* create product */
  const saveCreate = async () => {
    if (!form.name || !form.sku || !form.category || !form.price) {
      showToast('Preencha: Nome, SKU, Categoria e Valor de Venda', 'error');
      return;
    }
    setCreating2(true);
    try {
      const isPerfumaria = isPerfumariaCategory(form.category);
      await api.dashboard.createProduct({
        name: form.name,
        sku: form.sku,
        category: form.category,
        categorySlug: form.category.toLowerCase().replace(/\s+/g, '-'),
        price: parseFloat(form.price),
        costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
        stock: parseInt(form.stock || '0'),
        image: form.image || undefined,
        description: form.description || '',
        collection: form.collection || undefined,
        sizes: form.sizes ? form.sizes.split(',').map(s => s.trim()).filter(Boolean) : [],
        tags: form.tags ? form.tags.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [form.category.toLowerCase().replace(/\s+/g, '-')],
        colors: isPerfumaria ? [] : form.colors ? form.colors.split(',').map((name, index) => ({
          name: name.trim(),
          hex: ['#111111', '#f5f5f5', '#2563eb', '#ec4899', '#c9a227', '#dbeafe'][index % 6],
        })).filter(color => color.name) : [{ name: 'Padrão', hex: '#111111' }],
        isNew: form.isNew,
        isBestSeller: form.isBestSeller,
        active: form.active,
      } as Parameters<typeof api.dashboard.createProduct>[0]);
      refetch();
      setCreating(false);
      setForm(emptyForm);
      showToast('Produto criado com sucesso!');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao criar produto', 'error');
    } finally { setCreating2(false); }
  };

  /* profit preview for create modal */
  const previewSale = parseFloat(form.price) || 0;
  const previewCost = parseFloat(form.costPrice) || 0;
  const previewProfit = previewSale - previewCost;
  const previewMargin = previewSale > 0 ? (previewProfit / previewSale) * 100 : 0;
  const previewStock  = parseInt(form.stock || '0') || 0;
  const previewStockValue = previewCost * previewStock;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 5 }}>Dashboard</p>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 3 }}>Produtos</h1>
          <p style={{ fontSize: 13, color: '#999' }}>{products.length} produtos cadastrados</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={refetch} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#ccc', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(168,85,247,0.4)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Atualizar
          </button>
          <button onClick={() => setCreating(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#a855f7,#FF2DA0)', color: '#fff', fontSize: 13, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em' }}>
            <Plus size={15} /> Novo Produto
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="dash-stats-4" style={{ gap: 12 }}>
        {statsData.map(({ label, value, color, icon: Icon, sub }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            style={{ ...card, padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
            <div style={{ width: 38, height: 38, borderRadius: 11, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Icon size={17} style={{ color }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: 11, color: '#999', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 10, color: '#555' }}>{sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto ou SKU..."
            style={{ width: '100%', background: '#111117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 14px 12px 40px', color: '#fff', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.35)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.07)')} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${filter === cat ? '#a855f7' : 'rgba(255,255,255,0.07)'}`, background: filter === cat ? 'rgba(168,85,247,0.1)' : 'transparent', color: filter === cat ? '#a855f7' : '#555', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', textTransform: 'capitalize' }}>
              {cat === 'todos' ? 'Todos' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        style={{ ...card, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#666', fontSize: 13 }}>Carregando produtos...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <Package size={32} style={{ color: '#222', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ color: '#666', fontSize: 13 }}>Nenhum produto encontrado</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Produto', 'SKU', 'Categoria', ...(showCostFields ? ['Custo'] : []), 'Venda', ...(showCostFields ? ['Margem'] : []), 'Estoque', 'Avaliação', 'Status', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '14px 16px', fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const stockColor = p.stock === 0 ? '#ef4444' : p.stock <= 5 ? '#f59e0b' : '#22c55e';
                  const margin = p.costPrice && p.price > 0 ? ((p.price - p.costPrice) / p.price) * 100 : null;
                  const status = getProductStatus(p);
                  return (
                    <motion.tr key={p.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <img src={p.image} alt={p.name} style={{ width: 38, height: 46, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.05)' }} />
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#ccc', marginBottom: 3 }}>{p.name}</p>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {p.isNew && <span style={{ fontSize: 9, fontWeight: 700, color: '#a855f7', background: 'rgba(168,85,247,0.12)', padding: '2px 6px', borderRadius: 10 }}>NOVO</span>}
                              {p.isBestSeller && <span style={{ fontSize: 9, fontWeight: 700, color: '#FFB800', background: 'rgba(255,184,0,0.1)', padding: '2px 6px', borderRadius: 10 }}>TOP</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 11, color: '#666', fontFamily: 'monospace' }}>{p.sku}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#999', textTransform: 'capitalize' }}>{p.category}</td>
                      {showCostFields && (
                        <td style={{ padding: '12px 16px' }}>
                          {p.costPrice ? (
                            <span style={{ fontSize: 12, color: '#555' }}>{fmtBRL(p.costPrice)}</span>
                          ) : (
                            <span style={{ fontSize: 11, color: '#555' }}>—</span>
                          )}
                        </td>
                      )}
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>R$ {p.price.toFixed(2).replace('.', ',')}</p>
                      </td>
                      {showCostFields && (
                        <td style={{ padding: '12px 16px' }}>
                          {margin !== null ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <TrendingUp size={12} style={{ color: marginColor(margin) }} />
                              <span style={{ fontSize: 12, fontWeight: 800, color: marginColor(margin) }}>{margin.toFixed(0)}%</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: '#555' }}>—</span>
                          )}
                        </td>
                      )}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: stockColor, boxShadow: `0 0 5px ${stockColor}` }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: stockColor }}>{p.stock} un</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Star size={12} style={{ color: '#FFB800', fill: '#FFB800' }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#ccc' }}>{p.rating}</span>
                          <span style={{ fontSize: 11, color: '#666' }}>({p.reviewCount})</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 9, fontWeight: 900, color: status.color, background: status.background, padding: '4px 10px', borderRadius: 20, letterSpacing: '0.08em' }}>
                          {status.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button
                            onClick={() => toggleProductVisibility(p)}
                            disabled={togglingId === p.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '7px 12px',
                              borderRadius: 8,
                              border: `1px solid ${p.active ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
                              background: p.active ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                              color: p.active ? '#ef4444' : '#22c55e',
                              cursor: togglingId === p.id ? 'wait' : 'pointer',
                              fontSize: 11,
                              fontWeight: 700,
                              fontFamily: 'inherit',
                              transition: 'all 0.2s',
                              opacity: togglingId === p.id ? 0.7 : 1,
                            }}
                          >
                            {p.active ? <EyeOff size={13} /> : <Eye size={13} />}
                            {togglingId === p.id ? 'SALVANDO...' : p.active ? 'Desativar' : 'Ativar'}
                          </button>
                          <button onClick={() => openEdit(p)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: '#999', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#a855f7'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(168,85,247,0.3)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#444'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}>
                            <Edit2 size={13} /> Editar
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* ── Edit modal ── */}
      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEditing(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#111117', borderRadius: 22, border: '1px solid rgba(255,255,255,0.08)', padding: 28, maxWidth: 760, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
                <div style={{ display: 'flex', gap: 14 }}>
                  <img src={editing.image} alt={editing.name} style={{ width: 54, height: 66, borderRadius: 11, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.07)' }} />
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 900, color: '#fff', marginBottom: 5 }}>{editing.name}</h3>
                    <p style={{ fontSize: 11, color: '#666', fontFamily: 'monospace' }}>SKU: {editing.sku}</p>
                  </div>
                </div>
                <button onClick={() => setEditing(null)} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>Nome do Produto</label>
                    <input value={editForm?.name ?? ''} onChange={e => setEditForm(form => form ? { ...form, name: e.target.value } : form)} style={inp}
                      onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                  </div>
                  <div>
                    <label style={lbl}>SKU</label>
                    <input value={editForm?.sku ?? ''} onChange={e => setEditForm(form => form ? { ...form, sku: e.target.value.toUpperCase() } : form)} style={inp}
                      onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>Categoria</label>
                    <input list="edit-product-categories" value={editForm?.category ?? ''} onChange={e => setEditForm(form => form ? { ...form, category: e.target.value } : form)} style={inp}
                      onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                    <datalist id="edit-product-categories">
                      {presetCategories.map(category => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label style={lbl}>Coleção</label>
                    <input value={editForm?.collection ?? ''} onChange={e => setEditForm(form => form ? { ...form, collection: e.target.value } : form)} placeholder="Ex: Perfumaria Premium" style={inp}
                      onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: showCostFields ? '1fr 1fr' : '1fr', gap: 12 }}>
                  {showCostFields && (
                    <div>
                      <label style={lbl}>Valor de Custo (R$)</label>
                      <input type="number" value={editForm?.costPrice ?? ''} onChange={e => setEditForm(form => form ? { ...form, costPrice: e.target.value } : form)} min="0" step="0.01" placeholder="0,00" style={inp}
                        onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                    </div>
                  )}
                  <div>
                    <label style={lbl}>Valor de Venda (R$)</label>
                    <input type="number" value={editForm?.price ?? ''} onChange={e => setEditForm(form => form ? { ...form, price: e.target.value } : form)} min="0" step="0.01" style={inp}
                      onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                  </div>
                </div>

                <div>
                  <label style={lbl}>Quantidade em Estoque</label>
                  <input type="number" value={editForm?.stock ?? ''} onChange={e => setEditForm(form => form ? { ...form, stock: e.target.value } : form)} min="0" style={inp}
                    onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                </div>

                <div>
                  <label style={lbl}>Imagem Principal (URL)</label>
                  <input value={editForm?.image ?? ''} onChange={e => setEditForm(form => form ? { ...form, image: e.target.value } : form)} placeholder="https://..." style={inp}
                    onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                </div>

                <div>
                  <label style={lbl}>Galeria de Imagens (URLs separadas por vírgula)</label>
                  <textarea value={editForm?.images ?? ''} onChange={e => setEditForm(form => form ? { ...form, images: e.target.value } : form)} rows={2} placeholder="https://img1..., https://img2..." style={{ ...inp, resize: 'vertical' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                </div>

                <div>
                  <label style={lbl}>Descrição</label>
                  <textarea value={editForm?.description ?? ''} onChange={e => setEditForm(form => form ? { ...form, description: e.target.value } : form)} rows={3} placeholder="Descrição do produto..." style={{ ...inp, resize: 'vertical' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: editForm?.category && isPerfumariaCategory(editForm.category) ? '1fr' : '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>{editForm?.category && isPerfumariaCategory(editForm.category) ? 'Volume / ML' : 'Tamanhos / Volumes'}</label>
                    <input value={editForm?.sizes ?? ''} onChange={e => setEditForm(form => form ? { ...form, sizes: e.target.value } : form)} placeholder={editForm?.category && isPerfumariaCategory(editForm.category) ? '100ml ou 200ml' : 'P, M, G ou 100ml, 200ml'} style={inp}
                      onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                  </div>
                  {!(editForm?.category && isPerfumariaCategory(editForm.category)) && (
                    <div>
                      <label style={lbl}>Cores / Variações</label>
                      <input value={editForm?.colors ?? ''} onChange={e => setEditForm(form => form ? { ...form, colors: e.target.value } : form)} placeholder="Preto, Dourado" style={inp}
                        onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                    </div>
                  )}
                </div>

                <div>
                  <label style={lbl}>Tags</label>
                  <input value={editForm?.tags ?? ''} onChange={e => setEditForm(form => form ? { ...form, tags: e.target.value } : form)} placeholder="perfume, perfumaria, floral" style={inp}
                    onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    { key: 'isNew', label: 'Lançamento' },
                    { key: 'isBestSeller', label: 'Mais vendido' },
                    { key: 'active', label: 'Produto ativo' },
                  ].map(item => {
                    const active = Boolean(editForm?.[item.key as keyof EditForm]);
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setEditForm(form => form ? { ...form, [item.key]: !form[item.key as keyof EditForm] } : form)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          padding: '12px 14px',
                          borderRadius: 12,
                          border: `1px solid ${active ? 'rgba(168,85,247,0.45)' : 'rgba(255,255,255,0.08)'}`,
                          background: active ? 'rgba(168,85,247,0.1)' : '#0d0d0d',
                          color: active ? '#fff' : '#999',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: 12,
                          fontWeight: 700,
                        }}>
                        <span>{item.label}</span>
                        <span style={{
                          width: 18,
                          height: 18,
                          borderRadius: 999,
                          border: `1px solid ${active ? '#a855f7' : 'rgba(255,255,255,0.16)'}`,
                          background: active ? 'linear-gradient(135deg,#a855f7,#FF2DA0)' : 'transparent',
                        }} />
                      </button>
                    );
                  })}
                </div>

                {/* Profit preview */}
                {showCostFields && editForm?.costPrice && editForm?.price && parseFloat(editForm.price) > 0 && (() => {
                  const s = parseFloat(editForm.price), c = parseFloat(editForm.costPrice);
                  const lc = s - c;
                  const mg = (lc / s) * 100;
                  const stk = parseInt(editForm.stock || '0') || 0;
                  return (
                    <div style={{ background: 'rgba(168,85,247,0.06)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(168,85,247,0.12)' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Análise de Lucro</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ fontSize: 15, fontWeight: 900, color: marginColor(mg) }}>{mg.toFixed(1)}%</p>
                          <p style={{ fontSize: 10, color: '#999' }}>Margem</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ fontSize: 15, fontWeight: 900, color: '#22c55e' }}>{fmtBRL(lc)}</p>
                          <p style={{ fontSize: 10, color: '#999' }}>Lucro/unid</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ fontSize: 15, fontWeight: 900, color: '#a855f7' }}>{fmtBRL(lc * stk)}</p>
                          <p style={{ fontSize: 10, color: '#999' }}>Lucro total</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={saveEdit} disabled={saving}
                  style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#a855f7,#FF2DA0)', color: '#fff', fontWeight: 900, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1, letterSpacing: '0.04em' }}>
                  {saving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                </button>
                <button onClick={() => setEditing(null)}
                  style={{ padding: '13px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: '#555', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Create modal ── */}
      <AnimatePresence>
        {creating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setCreating(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#111117', borderRadius: 22, border: '1px solid rgba(255,255,255,0.08)', padding: 28, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>

              {/* modal header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 4 }}>Novo Produto</h3>
                  <p style={{ fontSize: 12, color: '#999' }}>Preencha os dados do produto</p>
                </div>
                <button onClick={() => setCreating(false)} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={15} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Nome + SKU */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>Nome do Produto *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Moletom Oversized" style={inp}
                      onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                  </div>
                  <div>
                    <label style={lbl}>SKU *</label>
                    <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value.toUpperCase() }))} placeholder="Ex: MOL-001" style={inp}
                      onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                  </div>
                </div>

                {/* Categoria + Coleção */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>Categoria *</label>
                    <input list="product-categories" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ex: Perfumaria" style={inp}
                      onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                    <datalist id="product-categories">
                      {presetCategories.map(category => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label style={lbl}>Coleção</label>
                    <input value={form.collection} onChange={e => setForm(f => ({ ...f, collection: e.target.value }))} placeholder="Ex: Copa 2026" style={inp}
                      onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                  </div>
                </div>

                {/* Custo + Venda + Estoque */}
                <div style={{ display: 'grid', gridTemplateColumns: showCostFields ? '1fr 1fr 1fr' : '1fr 1fr', gap: 12 }}>
                  {showCostFields && (
                    <div>
                      <label style={lbl}>Valor de Custo (R$)</label>
                      <input type="number" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} placeholder="0,00" min="0" step="0.01" style={inp}
                        onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                    </div>
                  )}
                  <div>
                    <label style={lbl}>Valor de Venda (R$) *</label>
                    <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0,00" min="0" step="0.01" style={inp}
                      onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                  </div>
                  <div>
                    <label style={lbl}>Qtd. em Estoque</label>
                    <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="0" min="0" style={inp}
                      onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                  </div>
                </div>

                {/* Profit calculator — aparece quando custo + venda preenchidos */}
                {showCostFields && previewSale > 0 && previewCost > 0 && (
                  <div style={{ background: 'rgba(168,85,247,0.06)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(168,85,247,0.12)' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Prévia de Lucro</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 14, fontWeight: 900, color: marginColor(previewMargin) }}>{previewMargin.toFixed(1)}%</p>
                        <p style={{ fontSize: 10, color: '#999' }}>Margem</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 14, fontWeight: 900, color: '#22c55e' }}>{fmtBRL(previewProfit)}</p>
                        <p style={{ fontSize: 10, color: '#999' }}>Lucro/unid</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 14, fontWeight: 900, color: '#a855f7' }}>{fmtBRL(previewProfit * previewStock)}</p>
                        <p style={{ fontSize: 10, color: '#999' }}>Lucro total</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 14, fontWeight: 900, color: '#3b82f6' }}>{fmtBRL(previewStockValue)}</p>
                        <p style={{ fontSize: 10, color: '#999' }}>Capital invest.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* URL da imagem */}
                <div>
                  <label style={lbl}>URL da Imagem</label>
                  <input value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} placeholder="https://..." style={inp}
                    onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                </div>

                {/* Tamanhos */}
                <div>
                  <label style={lbl}>{isPerfumariaCategory(form.category) ? 'Volume / ML' : 'Tamanhos (separados por vírgula)'}</label>
                  <input value={form.sizes} onChange={e => setForm(f => ({ ...f, sizes: e.target.value }))} placeholder={isPerfumariaCategory(form.category) ? '100ml ou 200ml' : 'P, M, G, GG ou 30ml, 50ml, 100ml'} style={inp}
                    onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isPerfumariaCategory(form.category) ? '1fr' : '1fr 1fr', gap: 12 }}>
                  {!isPerfumariaCategory(form.category) && (
                    <div>
                      <label style={lbl}>Cores / Variações</label>
                      <input value={form.colors} onChange={e => setForm(f => ({ ...f, colors: e.target.value }))} placeholder="Preto, Dourado ou Cristal, Rosa" style={inp}
                        onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                    </div>
                  )}
                  <div>
                    <label style={lbl}>Tags</label>
                    <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="perfume, perfumaria, floral" style={inp}
                      onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <label style={lbl}>Descrição</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Descrição do produto..." style={{ ...inp, resize: 'vertical' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.3)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { key: 'isNew', label: 'Lançamento' },
                    { key: 'isBestSeller', label: 'Mais vendido' },
                    { key: 'active', label: 'Produto ativo' },
                  ].map(item => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, [item.key]: !f[item.key as keyof typeof f] }))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        padding: '12px 14px',
                        borderRadius: 12,
                        border: `1px solid ${form[item.key as keyof typeof form] ? 'rgba(168,85,247,0.45)' : 'rgba(255,255,255,0.08)'}`,
                        background: form[item.key as keyof typeof form] ? 'rgba(168,85,247,0.1)' : '#0d0d0d',
                        color: form[item.key as keyof typeof form] ? '#fff' : '#999',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: 12,
                        fontWeight: 700,
                      }}>
                      <span>{item.label}</span>
                      <span style={{
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        border: `1px solid ${form[item.key as keyof typeof form] ? '#a855f7' : 'rgba(255,255,255,0.16)'}`,
                        background: form[item.key as keyof typeof form] ? 'linear-gradient(135deg,#a855f7,#FF2DA0)' : 'transparent',
                        boxShadow: form[item.key as keyof typeof form] ? '0 0 18px rgba(168,85,247,0.28)' : 'none',
                      }} />
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                <button onClick={saveCreate} disabled={creating2}
                  style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#a855f7,#FF2DA0)', color: '#fff', fontWeight: 900, fontSize: 13, cursor: creating2 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: creating2 ? 0.7 : 1, letterSpacing: '0.04em' }}>
                  {creating2 ? 'CADASTRANDO...' : 'CADASTRAR PRODUTO'}
                </button>
                <button onClick={() => setCreating(false)}
                  style={{ padding: '13px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: '#555', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
