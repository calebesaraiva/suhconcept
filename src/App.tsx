import { Routes, Route } from 'react-router-dom';
import StoreLayout from './components/layout/StoreLayout';
import Home from './pages/Home';
import CategoryPage from './pages/CategoryPage';
import ProductPage from './pages/ProductPage';
import CheckoutPage from './pages/CheckoutPage';
import DashboardShell from './components/dashboard/DashboardShell';
import SobrePage from './pages/SobrePage';
import CategoriesPage from './pages/CategoriesPage';
import FavoritesPage from './pages/FavoritesPage';
import AccountPage from './pages/AccountPage';
import InfoPage from './pages/InfoPage';
import PaymentReturnPage from './pages/PaymentReturnPage';

export default function App() {
  return (
    <Routes>
      <Route path="/dashboard/*" element={<DashboardShell />} />
      <Route element={<StoreLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/categoria/:slug" element={<CategoryPage />} />
        <Route path="/categorias" element={<CategoriesPage />} />
        <Route path="/produto/:slug" element={<ProductPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/pagamento/retorno" element={<PaymentReturnPage />} />
        <Route path="/sobre" element={<SobrePage />} />
        <Route path="/contato" element={<InfoPage pageKey="contact" />} />
        <Route path="/ajuda" element={<InfoPage pageKey="help" />} />
        <Route path="/trocas-e-devolucoes" element={<InfoPage pageKey="returns" />} />
        <Route path="/formas-de-envio" element={<InfoPage pageKey="shipping" />} />
        <Route path="/privacidade" element={<InfoPage pageKey="privacy" />} />
        <Route path="/termos-de-uso" element={<InfoPage pageKey="terms" />} />
        <Route path="/politica-de-trocas" element={<InfoPage pageKey="exchange-policy" />} />
        <Route path="/favoritos" element={<FavoritesPage />} />
        <Route path="/conta" element={<AccountPage />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}
