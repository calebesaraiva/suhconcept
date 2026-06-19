const BASE = '/api';

function getToken() {
  return localStorage.getItem('suh_token');
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
  installments?: number;
  address?: Record<string, string>;
  couponCode?: string; discount?: number;
}

export interface ApiOrder {
  id: string; customerName: string; customerEmail: string;
  items: { productName: string; quantity: number; price: number; size: string; color: string }[];
  subtotal: number; total: number; discount: number;
  status: string; paymentMethod: string; deliveryMethod: string;
  address?: Record<string, string>; cashback: number;
  couponCode?: string; notes?: string; createdAt: string;
}

export interface OrderShippingInfo {
  method: string;
  freeShippingApplied: boolean;
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
  },

  newsletter: {
    subscribe: (email: string) =>
      request<{ ok: boolean }>('/newsletter', { method: 'POST', body: JSON.stringify({ email }) }),
  },

  settings: {
    get: () => request<Record<string, string>>('/settings'),
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
  },
};
