import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from './api';
import type { ApiProduct, DashboardUser, ProductsResponse } from './api';

// Generic data fetcher hook
function useFetch<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const result = await fetcher();
        if (!active) return;
        setData(result);
        setError(null);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Erro desconhecido');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [fetcher]);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetcher();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  return { data, loading, error, refetch };
}

export function useProducts(params?: Record<string, string>) {
  const mergedParams = useMemo(() => ({ limit: '500', ...(params ?? {}) }), [params]);
  const key = JSON.stringify(mergedParams);
  const stableParams = useMemo(() => (
    key ? JSON.parse(key) as Record<string, string> | null : null
  ), [key]);
  const fetcher = useCallback(() => api.products.list(stableParams ?? undefined), [stableParams]);
  return useFetch<ProductsResponse>(fetcher);
}

export function useProduct(slug: string) {
  const fetcher = useCallback(() => api.products.get(slug), [slug]);
  return useFetch<ApiProduct>(fetcher);
}

export function useDashboardOverview() {
  const fetcher = useCallback(() => api.dashboard.overview(), []);
  return useFetch(fetcher);
}

export function useDashboardOrders(params?: Record<string, string>) {
  const key = JSON.stringify(params ?? null);
  const stableParams = useMemo(() => (
    key ? JSON.parse(key) as Record<string, string> | null : null
  ), [key]);
  const fetcher = useCallback(() => api.dashboard.orders(stableParams ?? undefined), [stableParams]);
  return useFetch(fetcher);
}

export function useDashboardCustomers(search?: string) {
  const fetcher = useCallback(() => api.dashboard.customers(search ? { search } : undefined), [search]);
  return useFetch(fetcher);
}

export function useDashboardProducts() {
  const fetcher = useCallback(() => api.dashboard.products(), []);
  return useFetch(fetcher);
}

export function useDashboardCoupons() {
  const fetcher = useCallback(() => api.dashboard.coupons(), []);
  return useFetch(fetcher);
}

export function useDashboardFinance(period: 'mensal' | 'trimestral' | 'anual') {
  const fetcher = useCallback(() => api.dashboard.finance(period), [period]);
  return useFetch(fetcher);
}

export function useDashboardUsers() {
  const fetcher = useCallback(() => api.dashboard.users(), []);
  return useFetch<DashboardUser[]>(fetcher);
}
