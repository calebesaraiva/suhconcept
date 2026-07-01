import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '../data/products';

export type { Product };

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  totalOrders: number;
  totalSpent: number;
  lastOrder: string;
  status: 'ativo' | 'inativo' | 'vip';
  avatar: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: { productName: string; quantity: number; price: number; size: string }[];
  total: number;
  status: 'pendente' | 'pago' | 'enviado' | 'entregue' | 'cancelado';
  date: string;
  paymentMethod: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  size: string;
  color: string;
}

interface StoreState {
  cart: CartItem[];
  wishlist: string[];
  checkoutBenefitMode: 'pix_discount' | 'cashback';
  currentView: 'store' | 'dashboard';
  dashboardSection: string;
  searchQuery: string;
  selectedCategory: string;
  toast: { message: string; type: 'success' | 'error' } | null;

  addToCart: (product: Product, size: string, color: string) => void;
  removeFromCart: (productId: string, size: string, color: string) => void;
  updateQuantity: (productId: string, size: string, color: string, qty: number) => void;
  toggleWishlist: (productId: string) => void;
  clearCart: () => void;
  setCheckoutBenefitMode: (mode: 'pix_discount' | 'cashback') => void;
  setCurrentView: (view: 'store' | 'dashboard') => void;
  setDashboardSection: (s: string) => void;
  setSearchQuery: (q: string) => void;
  setSelectedCategory: (category: string) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const useStore = create<StoreState>()(persist((set, get) => ({
  cart: [],
  wishlist: [],
  checkoutBenefitMode: 'pix_discount',
  currentView: 'store',
  dashboardSection: 'overview',
  searchQuery: '',
  selectedCategory: 'todos',
  toast: null,

  addToCart: (product, size, color) =>
    set(state => {
      const existing = state.cart.find(i => i.product.id === product.id && i.size === size && i.color === color);
      const newCart = existing
        ? state.cart.map(i => i.product.id === product.id && i.size === size && i.color === color ? { ...i, quantity: i.quantity + 1 } : i)
        : [...state.cart, { product, quantity: 1, size, color }];
      setTimeout(() => get().showToast('Produto adicionado à sacola! 🛍️'), 0);
      return { cart: newCart };
    }),

  removeFromCart: (productId, size, color) =>
    set(state => ({ cart: state.cart.filter(i => !(i.product.id === productId && i.size === size && i.color === color)) })),

  updateQuantity: (productId, size, color, qty) =>
    set(state => ({
      cart: qty <= 0
        ? state.cart.filter(i => !(i.product.id === productId && i.size === size && i.color === color))
        : state.cart.map(i => i.product.id === productId && i.size === size && i.color === color ? { ...i, quantity: qty } : i),
    })),

  toggleWishlist: productId =>
    set(state => ({
      wishlist: state.wishlist.includes(productId)
        ? state.wishlist.filter(id => id !== productId)
        : [...state.wishlist, productId],
    })),

  clearCart: () => set({ cart: [] }),
  setCheckoutBenefitMode: mode => set({ checkoutBenefitMode: mode }),
  setCurrentView: view => set({ currentView: view }),
  setDashboardSection: s => set({ dashboardSection: s }),
  setSearchQuery: q => set({ searchQuery: q }),
  setSelectedCategory: category => set({ selectedCategory: category }),

  showToast: (message, type = 'success') => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 3000);
  },
}), {
  name: 'suh-store',
  storage: createJSONStorage(() => localStorage),
  // Persiste apenas carrinho e favoritos — estado de UI/sessão não é salvo
  partialize: (state) => ({ cart: state.cart, wishlist: state.wishlist, checkoutBenefitMode: state.checkoutBenefitMode }),
}));
