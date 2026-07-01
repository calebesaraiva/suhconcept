import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import Header from './Header';
import Navigation from './Navigation';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';
import MobileDrawer from './MobileDrawer';
import CartDrawer from './CartDrawer';
import Toast from '../ui/Toast';
import AccountModal from '../ui/AccountModal';
import FloatingWhatsApp from './FloatingWhatsApp';

export default function StoreLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { pathname } = useLocation();
  const isCheckout = pathname === '/checkout';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0b0b0b' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: '#0b0b0b' }}>
        <TopBar />
        <Header onMenuOpen={() => setDrawerOpen(true)} onCartOpen={() => setCartOpen(true)} onAccountOpen={() => setAccountOpen(true)} />
        <Navigation />
      </div>
      <div className="header-spacer" />

      <main style={{ flex: 1, paddingBottom: isCheckout ? 0 : 64 }}>
        <Outlet />
      </main>

      {!isCheckout && <Footer />}
      {!isCheckout && <FloatingWhatsApp />}
      <MobileBottomNav />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onAccountOpen={() => setAccountOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
      <Toast />
    </div>
  );
}
