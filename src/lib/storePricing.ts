import { useEffect, useState } from 'react';
import { api } from './api';
import type { ApiProduct } from './api';

export interface StorePricingSettings {
  pixDiscount: number;
  maxInstallments: number;
  interestFreeInstallments: number;
  freeShipThreshold: number;
}

const DEFAULT_SETTINGS: StorePricingSettings = {
  pixDiscount: 5,
  maxInstallments: 12,
  interestFreeInstallments: 3,
  freeShipThreshold: 599.99,
};

let cachedSettings: StorePricingSettings | null = null;
let inflightSettings: Promise<StorePricingSettings> | null = null;

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function resolveStorePricingSettings(raw?: Record<string, string> | null): StorePricingSettings {
  const pixDiscount = Number(raw?.pixDiscount);
  const maxInstallments = Number(raw?.maxInstallments);
  const interestFreeInstallments = Number(raw?.interestFreeInstallments);
  const freeShipThreshold = Number(raw?.freeShipThreshold);

  return {
    pixDiscount: Number.isFinite(pixDiscount) ? Math.min(Math.max(pixDiscount, 0), 100) : DEFAULT_SETTINGS.pixDiscount,
    maxInstallments: Number.isFinite(maxInstallments) ? Math.max(1, Math.trunc(maxInstallments)) : DEFAULT_SETTINGS.maxInstallments,
    interestFreeInstallments: Number.isFinite(interestFreeInstallments)
      ? Math.max(1, Math.min(Math.trunc(interestFreeInstallments), Number.isFinite(maxInstallments) ? Math.max(1, Math.trunc(maxInstallments)) : DEFAULT_SETTINGS.maxInstallments))
      : DEFAULT_SETTINGS.interestFreeInstallments,
    freeShipThreshold: Number.isFinite(freeShipThreshold) ? Math.max(0, freeShipThreshold) : DEFAULT_SETTINGS.freeShipThreshold,
  };
}

async function loadStorePricingSettings() {
  if (cachedSettings) return cachedSettings;
  if (!inflightSettings) {
    inflightSettings = api.settings.get()
      .then((raw) => {
        cachedSettings = resolveStorePricingSettings(raw);
        return cachedSettings;
      })
      .catch(() => DEFAULT_SETTINGS)
      .finally(() => {
        inflightSettings = null;
      });
  }
  return inflightSettings;
}

export function useStorePricingSettings() {
  const [settings, setSettings] = useState<StorePricingSettings>(cachedSettings ?? DEFAULT_SETTINGS);

  useEffect(() => {
    let active = true;
    void loadStorePricingSettings().then((loaded) => {
      if (active) setSettings(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  return settings;
}

export function getProductPricing(product: Pick<ApiProduct, 'price' | 'pixPrice' | 'installments'>, settings: StorePricingSettings) {
  const installmentCount = Math.max(1, settings.maxInstallments || product.installments?.count || 1);
  const pixPrice = roundMoney(product.price * (1 - settings.pixDiscount / 100));

  return {
    pixDiscountPercent: settings.pixDiscount,
    pixPrice,
    installmentCount,
    installmentValue: roundMoney(product.price / installmentCount),
    pixSavings: roundMoney(product.price - pixPrice),
    freeShipThreshold: settings.freeShipThreshold,
  };
}
