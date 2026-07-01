import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  X,
  ChevronRight,
  User,
  Heart,
  Headphones,
  Sparkles,
  Truck,
  RefreshCw,
  ArrowUpRight,
  ShoppingBag,
} from 'lucide-react';
import { useStorePricingSettings } from '../../lib/storePricing';
import { getStoredUser, SESSION_EVENT, type ApiUser } from '../../lib/api';

interface Props { open: boolean; onClose: () => void; onAccountOpen: () => void; }

const mainLinks = [
  { label: 'Masculino', to: '/categoria/masculino', desc: 'Camisas do Brasil e plus size', accent: 'linear-gradient(180deg, #a855f7, #FF2DA0)' },
  { label: 'Feminino', to: '/categoria/feminino', desc: 'Camisa retrô feminina em destaque', accent: 'linear-gradient(180deg, #d946ef, #fb7185)' },
  { label: 'Infantil', to: '/categoria/infantil', desc: 'Conjuntos para 3 a 14 anos', accent: 'linear-gradient(180deg, #8b5cf6, #c084fc)' },
  { label: 'Perfumaria', to: '/categoria/perfumaria', desc: 'Fragrâncias marcantes e sofisticadas', accent: 'linear-gradient(180deg, #06b6d4, #3b82f6)' },
  { label: 'Copa 2026', to: '/categoria/copa-2026', desc: 'Coleção da seleção em destaque', accent: 'linear-gradient(180deg, #FFB800, #FF8A00)', isNew: true, isCopa: true },
  { label: 'Outlet', to: '/categoria/outlet', desc: 'Oportunidades com valor especial', accent: 'linear-gradient(180deg, #9333ea, #ec4899)' },
  { label: 'Sobre nós', to: '/sobre', desc: 'Conheça a essência da SUH CONCEPT', accent: 'linear-gradient(180deg, #7c3aed, #a855f7)' },
];

const accountLinks = [
  { label: 'Entrar / Cadastrar', to: '/conta', icon: User },
  { label: 'Favoritos', to: '/favoritos', icon: Heart },
  { label: 'Atendimento', to: '/sobre', icon: Headphones },
];

export default function MobileDrawer({ open, onClose, onAccountOpen }: Props) {
  const { pathname } = useLocation();
  const settings = useStorePricingSettings();
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(() => getStoredUser());

  useEffect(() => {
    const syncUser = () => setCurrentUser(getStoredUser());
    window.addEventListener(SESSION_EVENT, syncUser as EventListener);
    window.addEventListener('storage', syncUser);
    return () => {
      window.removeEventListener(SESSION_EVENT, syncUser as EventListener);
      window.removeEventListener('storage', syncUser);
    };
  }, []);

  const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    show: (index: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: 0.06 + index * 0.035, duration: 0.24 },
    }),
  };

  const isActive = (to: string) => pathname === to;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="drawer-overlay"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="drawer"
            style={{ background: 'linear-gradient(180deg, #0f0f11 0%, #09090b 100%)' }}
          >
            <div className="drawer-shell">
              <div className="drawer-top">
                <div className="drawer-brand-card">
                  <div className="drawer-brand-row">
                    <div className="drawer-brand-main">
                      <div className="drawer-brand-logo">
                        <img src="/suh-logo-transparent.png" alt="SUH CONCEPT" style={{ height: 24, width: 'auto', objectFit: 'contain' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span className="drawer-brand-title">SUH CONCEPT</span>
                        <span className="drawer-brand-subtitle">Vista-se bem e notarão quem você é</span>
                      </div>
                    </div>

                    <button onClick={onClose} className="drawer-close-btn">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="drawer-badges">
                    <div className="drawer-pill">
                      <Sparkles size={11} style={{ color: '#FFB800' }} />
                      <span>Nova coleção</span>
                    </div>
                    <div className="drawer-pill drawer-pill-green">
                      <Truck size={11} />
                      <span>Frete grátis acima de R$ {settings.freeShipThreshold.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="drawer-content">
                <div className="drawer-section">
                  <div className="drawer-section-head">
                    <span>Categorias</span>
                    <small>Escolha seu estilo</small>
                  </div>

                  <div className="drawer-links">
                    {mainLinks.map((link, index) => (
                      <motion.div key={link.to} variants={itemVariants} initial="hidden" animate="show" custom={index}>
                        <Link
                          to={link.to}
                          onClick={onClose}
                          className={`drawer-link-card no-underline${isActive(link.to) ? ' active' : ''}`}
                        >
                          <div className="drawer-link-left">
                            <div className="drawer-link-accent" style={{ background: link.accent }} />
                            <div style={{ minWidth: 0 }}>
                              <span className={`drawer-link-title${link.isCopa ? ' copa' : ''}`}>{link.label}</span>
                              <span className="drawer-link-desc">{link.desc}</span>
                            </div>
                          </div>

                          <div className="drawer-link-right">
                            {link.isNew && <span className="drawer-chip-hot">NOVO</span>}
                            <ChevronRight size={15} className="drawer-link-arrow" />
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="drawer-section">
                  <div className="drawer-section-head">
                    <span>Minha conta</span>
                    <small>Acesso rápido</small>
                  </div>

                  <div className="drawer-account-card">
                    {accountLinks.map(({ to, label, icon: Icon }, index) => (
                      <motion.div key={to} variants={itemVariants} initial="hidden" animate="show" custom={mainLinks.length + index}>
                        {index === 0 ? (
                          <button
                            onClick={() => { onClose(); onAccountOpen(); }}
                            className="drawer-account-link drawer-account-primary"
                            style={{ width: '100%', fontFamily: 'inherit', cursor: 'pointer' }}
                          >
                            <div className="drawer-account-left">
                              <div className="drawer-account-icon">
                                <Icon size={14} />
                              </div>
                              <span style={{ fontSize: 13.5, fontWeight: 700 }}>
                                {currentUser ? `Minha conta · ${currentUser.name.split(' ')[0]}` : 'Entrar / Cadastrar'}
                              </span>
                            </div>
                            <ArrowUpRight size={14} className="drawer-account-arrow" />
                          </button>
                        ) : (
                          <Link
                            to={to}
                            onClick={onClose}
                            className={`drawer-account-link no-underline${isActive(to) ? ' active' : ''}`}
                          >
                            <div className="drawer-account-left">
                              <div className="drawer-account-icon">
                                <Icon size={14} />
                              </div>
                              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</span>
                            </div>
                            <ArrowUpRight size={14} className="drawer-account-arrow" />
                          </Link>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="drawer-footer">
                <motion.div variants={itemVariants} initial="hidden" animate="show" custom={mainLinks.length + accountLinks.length}>
                  <div className="drawer-footer-card">
                    <div className="drawer-footer-icon green">
                      <Truck size={12} />
                    </div>
                    <div>
                      <p className="drawer-footer-title">Frete grátis</p>
                      <p className="drawer-footer-text">Acima de R$ {settings.freeShipThreshold.toFixed(2).replace('.', ',')}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} initial="hidden" animate="show" custom={mainLinks.length + accountLinks.length + 1}>
                  <div className="drawer-footer-card">
                    <div className="drawer-footer-icon purple">
                      <RefreshCw size={12} />
                    </div>
                    <div>
                      <p className="drawer-footer-title">Troca fácil</p>
                      <p className="drawer-footer-text">Em até 7 dias</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} initial="hidden" animate="show" custom={mainLinks.length + accountLinks.length + 2}>
                  <Link to="/checkout" onClick={onClose} className="drawer-footer-cta no-underline">
                    <ShoppingBag size={14} />
                    <span>Ir para a sacola</span>
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
