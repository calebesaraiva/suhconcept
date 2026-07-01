import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, Plus, RefreshCw, ShieldCheck, UserCog, UserRound, X } from 'lucide-react';
import { useDashboardUsers } from '../../lib/useApi';
import { api } from '../../lib/api';
import type { DashboardUser } from '../../lib/api';
import { useStore } from '../../store/useStore';

const card: React.CSSProperties = {
  background: '#111117',
  borderRadius: 18,
  border: '1px solid rgba(255,255,255,0.06)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0d0d0d',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: '12px 14px',
  color: '#fff',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  color: '#999',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 6,
};

const roleLabels: Record<string, string> = {
  master: 'Admin Master',
  manager: 'Gerente',
  seller: 'Vendedor',
};

type UserForm = {
  name: string;
  email: string;
  password: string;
  role: string;
  active: boolean;
};

const emptyForm: UserForm = {
  name: '',
  email: '',
  password: '',
  role: 'seller',
  active: true,
};

function roleColor(role: string) {
  if (role === 'master') return '#FF2DA0';
  if (role === 'manager') return '#a855f7';
  return '#22c55e';
}

export default function AccessManagement() {
  const { showToast } = useStore();
  const { data, loading, refetch } = useDashboardUsers();
  const users = data ?? [];

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<DashboardUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const stats = {
    total: users.length,
    masters: users.filter((user) => user.role === 'master').length,
    managers: users.filter((user) => user.role === 'manager').length,
    sellers: users.filter((user) => user.role === 'seller').length,
    active: users.filter((user) => user.active).length,
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setCreating(true);
  };

  const openEdit = (user: DashboardUser) => {
    setCreating(false);
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      active: user.active,
    });
  };

  const closeModal = () => {
    setCreating(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const saveUser = async () => {
    setSaving(true);
    try {
      if (editing) {
        await api.dashboard.updateUser(editing.id, {
          name: form.name,
          email: form.email,
          role: form.role,
          active: form.active,
          ...(form.password ? { password: form.password } : {}),
        });
        showToast('Acesso atualizado com sucesso!');
      } else {
        await api.dashboard.createUser(form);
        showToast('Novo acesso criado com sucesso!');
      }
      await refetch();
      closeModal();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao salvar acesso', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 5 }}>Admin Master</p>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 3 }}>Gerenciar Acessos</h1>
          <p style={{ fontSize: 13, color: '#999' }}>Controle quem vê o quê dentro do painel da SUH CONCEPT.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={refetch} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#ccc', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Atualizar
          </button>
          <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#a855f7,#FF2DA0)', color: '#fff', fontSize: 13, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em' }}>
            <Plus size={15} /> Novo Acesso
          </button>
        </div>
      </div>

      <div className="dash-stats-5" style={{ gap: 12 }}>
        {[
          { label: 'Total', value: stats.total, icon: KeyRound, color: '#a855f7' },
          { label: 'Masters', value: stats.masters, icon: ShieldCheck, color: '#FF2DA0' },
          { label: 'Gerentes', value: stats.managers, icon: UserCog, color: '#7c3aed' },
          { label: 'Vendedores', value: stats.sellers, icon: UserRound, color: '#22c55e' },
          { label: 'Ativos', value: stats.active, icon: ShieldCheck, color: '#3b82f6' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ ...card, padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
            <div style={{ width: 38, height: 38, borderRadius: 11, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Icon size={17} style={{ color }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: 11, color: '#999', fontWeight: 600, letterSpacing: '0.04em' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ ...card, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#666', fontSize: 13 }}>Carregando acessos...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Usuário', 'Perfil', 'Status', 'Atualizado', ''].map((header) => (
                    <th key={header} style={{ textAlign: 'left', padding: '14px 18px', fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const color = roleColor(user.role);
                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{user.name}</p>
                        <p style={{ fontSize: 11, color: '#777' }}>{user.email}</p>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color, background: `${color}15`, padding: '5px 10px', borderRadius: 20, letterSpacing: '0.08em' }}>
                          {(roleLabels[user.role] ?? user.role).toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: 12, color: user.active ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                        {user.active ? 'ATIVO' : 'DESATIVADO'}
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: 12, color: '#777' }}>
                        {new Date(user.updatedAt).toLocaleString('pt-BR')}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button onClick={() => openEdit(user)} style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(168,85,247,0.25)', background: 'rgba(168,85,247,0.08)', color: '#a855f7', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Editar acesso
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {(creating || editing) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeModal}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
              style={{ background: '#111117', borderRadius: 22, border: '1px solid rgba(255,255,255,0.08)', padding: 28, maxWidth: 520, width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{editing ? 'Editar acesso' : 'Novo acesso'}</h3>
                  <p style={{ fontSize: 12, color: '#999' }}>{editing ? 'Atualize nome, perfil, senha ou status.' : 'Crie um perfil novo para o painel.'}</p>
                </div>
                <button onClick={closeModal} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={15} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Nome</label>
                  <input value={form.name} onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))} style={inputStyle} placeholder="Nome completo" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>E-mail</label>
                  <input value={form.email} onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))} style={inputStyle} placeholder="email@dominio.com" />
                </div>
                <div>
                  <label style={labelStyle}>{editing ? 'Nova senha' : 'Senha'}</label>
                  <input value={form.password} onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))} style={inputStyle} placeholder={editing ? 'Deixe vazio para manter' : 'Mínimo 6 caracteres'} />
                </div>
                <div>
                  <label style={labelStyle}>Perfil</label>
                  <select value={form.role} onChange={(event) => setForm((state) => ({ ...state, role: event.target.value }))} style={inputStyle}>
                    <option value="master">Admin Master</option>
                    <option value="manager">Gerente</option>
                    <option value="seller">Vendedor</option>
                  </select>
                </div>
              </div>

              <button type="button" onClick={() => setForm((state) => ({ ...state, active: !state.active }))} style={{ marginTop: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderRadius: 12, border: `1px solid ${form.active ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, background: form.active ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', color: form.active ? '#22c55e' : '#ef4444', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                <span>Acesso {form.active ? 'ativo' : 'desativado'}</span>
                <span>{form.active ? 'LIBERADO' : 'BLOQUEADO'}</span>
              </button>

              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                <button onClick={saveUser} disabled={saving} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#a855f7,#FF2DA0)', color: '#fff', fontWeight: 900, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1, letterSpacing: '0.04em' }}>
                  {saving ? 'SALVANDO...' : editing ? 'SALVAR ALTERAÇÕES' : 'CRIAR ACESSO'}
                </button>
                <button onClick={closeModal} style={{ padding: '13px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: '#555', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
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
