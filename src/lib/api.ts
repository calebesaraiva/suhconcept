const BASE = '/api';
const TOKEN_KEY = 'suh_token';
const USER_KEY = 'suh_user';
export const SESSION_EVENT = 'suh:session-changed';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): ApiUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) as ApiUser : null;
  } catch {
    return null;
  }
}

export function storeSession(token: string, user: ApiUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: { user } }));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: { user: null } }));
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Erro na requisição');
  }
  return res.json();
}

export interface ApiProduct {
  id: string; slug: string; name: string; price: number;
  originalPrice?: number; costPrice?: number; pixPrice: number;
  installments: { count: number; value: number };
  image: string; images: string[];
  category: string; categorySlug: string; collection?: string;
  tags: string[]; description: string; sizes: string[];
  colors: { name: string; hex: string }[];
  stock: number; rating: number; reviewCount: number;
  reviews: number;
  isNew: boolean; isBestSeller: boolean; discount?: number;
  sku: string; active: boolean;
}

export interface ProductsResponse {
  products: ApiProduct[]; total: number; page: number; pages: number;
}

export interface CreateOrderPayload {
  customerName: string; customerEmail: string;
  customerPhone?: string; customerCpf?: string;
  items: { productId: string; productName: string; quantity: number; price: number; pixPrice: number; size: string; color: string }[];
  paymentMethod: string; deliveryMethod: string;
  benefitMode?: 'pix_discount' | 'cashback';
  installments?: number;
  address?: Record<string, string>;
  shippingQuote?: { serviceCode: string; serviceName?: string; price?: number; deadlineDays?: number; deadlineText?: string };
  couponCode?: string; discount?: number;
}

export interface ShippingQuoteOption {
  serviceCode: string;
  serviceName: string;
  price: number;
  originalPrice: number;
  deadlineDays?: number;
  deadlineText?: string;
}

export interface ShippingQuoteResponse {
  provider: 'melhor_envio' | 'correios' | 'local';
  originCep: string;
  destinationCep: string;
  destinationCity?: string;
  destinationState?: string;
  freeShippingApplied: boolean;
  options: ShippingQuoteOption[];
  selected: ShippingQuoteOption;
}

export interface CepAddressResponse {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface ApiOrder {
  id: string; customerName: string; customerEmail: string;
  customerPhone?: string; customerCpf?: string;
  items: { productName: string; quantity: number; price: number; pixPrice?: number; size: string; color: string }[];
  subtotal: number; total: number; discount: number;
  status: string; paymentMethod: string; deliveryMethod: string;
  address?: Record<string, unknown>; cashback: number;
  couponCode?: string; notes?: string; createdAt: string; updatedAt?: string;
  history?: ApiOrderStatusHistory[];
}

export interface ApiOrderStatusHistory {
  id: string;
  status: string;
  label: string;
  description: string;
  actorName?: string | null;
  actorRole?: string | null;
  source: string;
  createdAt: string;
}

export interface OrderShippingInfo {
  method: string;
  freeShippingApplied: boolean;
  amount?: number;
  quote?: ShippingQuoteResponse | null;
  message: string;
}

export interface OrderPaymentInfo {
  provider: 'pagbank' | 'manual';
  method?: 'PIX' | 'CREDIT_CARD';
  checkoutId?: string;
  checkoutUrl?: string;
  reason?: string;
  status?: string;
}

export interface ApiUser {
  id: string; name: string; email: string; role: string;
}

export interface SocialProviderStatus {
  provider: 'google' | 'apple';
  enabled: boolean;
  label: string;
}

export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCustomer {
  id: string; name: string; email: string; phone?: string;
  city?: string; status: string; avatar?: string;
  totalOrders: number; totalSpent: number; lastOrder?: string;
}

export interface ApiCoupon {
  id: string; code: string; type: string; value: number;
  minOrder: number; maxUses?: number; uses: number;
  expiresAt?: string; active: boolean; freeShipping: boolean;
}

export interface DashboardAlert {
  id: string; type: 'order' | 'stock'; title: string; desc: string;
  time: string | null; color: string; urgent: boolean;
  orderId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  total?: number;
  paymentMethod?: string;
  itemsCount?: number;
  itemsSummary?: string;
  addressSummary?: string;
}

export interface DashboardAlerts {
  alerts: DashboardAlert[]; urgentCount: number;
}

export interface DashboardFinance {
  chartData: { mes: string; receita: number; pedidos: number; ticketMedio: number }[];
  paymentMethods: { method: string; count: number; total: number; pct: number; color: string }[];
  totals: { receita: number; pedidos: number; ticketMedio: number; clientes: number };
}

export interface DashboardOverview {
  stats: { totalOrders: number; totalRevenue: number; totalCustomers: number; totalProducts: number };
  salesData: { month: string; vendas: number; pedidos: number; meta: number }[];
  recentOrders: ApiOrder[];
  topProducts: { name: string; sales: number; revenue: number }[];
  categoryBreakdown: { name: string; value: number; qty: number }[];
}

export const api = {
  products: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<ProductsResponse>(`/products${q}`);
    },
    get: (slug: string) => request<ApiProduct>(`/products/${slug}`),
  },

  coupons: {
    validate: (code: string, orderTotal: number) =>
      request<{ valid: boolean; code: string; type: string; value: number; discount: number; freeShipping: boolean }>(
        '/coupons/validate',
        { method: 'POST', body: JSON.stringify({ code, orderTotal }) },
      ),
  },

  orders: {
    create: (data: CreateOrderPayload) =>
      request<{ order: ApiOrder; cashback: number; shipping: OrderShippingInfo; payment: OrderPaymentInfo | null }>('/orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    mine: () => request<ApiOrder[]>('/orders/mine'),
    get: (id: string) => request<ApiOrder>(`/orders/${id}`),
    paymentStatus: (id: string) =>
      request<{ order: ApiOrder; payment: Record<string, unknown> | null }>(`/payments/pagbank/orders/${id}/status`),
  },

  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: ApiUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (name: string, email: string, password: string) =>
      request<{ token: string; user: ApiUser }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      }),
    me: () => request<ApiUser>('/auth/me'),
    providers: () => request<SocialProviderStatus[]>('/auth/providers'),
  },

  newsletter: {
    subscribe: (email: string) =>
      request<{ ok: boolean }>('/newsletter', { method: 'POST', body: JSON.stringify({ email }) }),
  },

  settings: {
    get: () => request<Record<string, string>>('/settings'),
  },

  shipping: {
    quote: (data: { cepDestino: string; subtotal: number; itemCount?: number; serviceCode?: string; freeShipping?: boolean; cidade?: string; estado?: string }) =>
      request<ShippingQuoteResponse>('/shipping/quote', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    lookupCep: (cep: string) =>
      request<CepAddressResponse>(`/shipping/address/${encodeURIComponent(cep)}`),
  },

  dashboard: {
    overview: () => request<DashboardOverview>('/dashboard/overview'),
    alerts: () => request<DashboardAlerts>('/dashboard/alerts'),
    getSettings: () => request<Record<string, string>>('/dashboard/settings'),
    saveSettings: (data: Record<string, string>) =>
      request<{ ok: boolean }>('/dashboard/settings', { method: 'PUT', body: JSON.stringify(data) }),
    orders: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<{ orders: ApiOrder[]; total: number }>(`/dashboard/orders${q}`);
    },
    updateOrderStatus: (id: string, status: string) =>
      request<ApiOrder>(`/dashboard/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    customers: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<ApiCustomer[]>(`/dashboard/customers${q}`);
    },
    products: () => request<ApiProduct[]>('/dashboard/products'),
    createProduct: (data: Partial<ApiProduct>) =>
      request<ApiProduct>('/dashboard/products', { method: 'POST', body: JSON.stringify(data) }),
    updateProduct: (id: string, data: Partial<ApiProduct>) =>
      request<ApiProduct>(`/dashboard/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    coupons: () => request<ApiCoupon[]>('/dashboard/coupons'),
    createCoupon: (data: Partial<ApiCoupon>) =>
      request<ApiCoupon>('/dashboard/coupons', { method: 'POST', body: JSON.stringify(data) }),
    updateCoupon: (id: string, data: Partial<ApiCoupon>) =>
      request<ApiCoupon>(`/dashboard/coupons/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteCoupon: (id: string) =>
      request<{ ok: boolean }>(`/dashboard/coupons/${id}`, { method: 'DELETE' }),
    finance: (period: 'mensal' | 'trimestral' | 'anual') =>
      request<DashboardFinance>(`/dashboard/finance?period=${period}`),
    simulateShipping: (data: { cepDestino: string; items: { productId: string; quantity: number }[] }) =>
      request<{
        subtotal: number;
        itemCount: number;
        quote: ShippingQuoteResponse;
        products: { id: string; name: string; quantity: number; unitPrice: number }[];
      }>('/dashboard/shipping/simulate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    users: () => request<DashboardUser[]>('/dashboard/users'),
    createUser: (data: { name: string; email: string; password: string; role: string; active: boolean }) =>
      request<DashboardUser>('/dashboard/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateUser: (id: string, data: Partial<{ name: string; email: string; password: string; role: string; active: boolean }>) =>
      request<DashboardUser>(`/dashboard/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },
};
