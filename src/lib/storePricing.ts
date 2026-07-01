import { useEffect, useState } from 'react';
import { api } from './api';
import type { ApiProduct } from './api';

export interface StorePricingSettings {
  pixDiscount: number;
  maxInstallments: number;
  interestFreeInstallments: number;
  freeShipThreshold: number;
}

type ProductLike = Pick<ApiProduct, 'price' | 'pixPrice' | 'installments'> & {
  tags?: string[];
};

interface ComboOffer {
  quantity: number;
  totalPrice: number;
}

const DEFAULT_SETTINGS: StorePricingSettings = {
  pixDiscount: 5,
  maxInstallments: 12,
  interestFreeInstallments: 3,
  freeShipThreshold: 599.99,
};

const MIN_ONLINE_PAYMENT_AMOUNT = 1;

let cachedSettings: StorePricingSettings | null = null;
let inflightSettings: Promise<StorePricingSettings> | null = null;
let lastLoadedAt = 0;
const SETTINGS_TTL_MS = 30_000;

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function readTagValue(tags: string[] | undefined, prefix: string) {
  const tag = tags?.find((item) => item.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : '';
}

function parseMoneyTag(tags: string[] | undefined, prefix: string) {
  const raw = readTagValue(tags, prefix).replace(',', '.');
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? roundMoney(value) : null;
}

function parseIntTag(tags: string[] | undefined, prefix: string) {
  const value = Number(readTagValue(tags, prefix));
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : null;
}

function getComboOffer(tags: string[] | undefined): ComboOffer | null {
  const raw = readTagValue(tags, 'offer-combo:');
  if (!raw) return null;

  const [quantityRaw, totalRaw] = raw.split(':');
  const quantity = Number(quantityRaw);
  const totalPrice = Number((totalRaw || '').replace(',', '.'));

  if (!Number.isFinite(quantity) || quantity < 2 || !Number.isFinite(totalPrice) || totalPrice <= 0) {
    return null;
  }

  return { quantity: Math.trunc(quantity), totalPrice: roundMoney(totalPrice) };
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
  if (cachedSettings && Date.now() - lastLoadedAt < SETTINGS_TTL_MS) return cachedSettings;
  if (!inflightSettings) {
    inflightSettings = api.settings.get()
      .then((raw) => {
        cachedSettings = resolveStorePricingSettings(raw);
        lastLoadedAt = Date.now();
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

    const syncSettings = () => {
      void loadStorePricingSettings().then((loaded) => {
        if (active) setSettings(loaded);
      });
    };

    syncSettings();

    const interval = window.setInterval(syncSettings, SETTINGS_TTL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        cachedSettings = null;
        syncSettings();
      }
    };

    window.addEventListener('focus', syncSettings);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', syncSettings);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return settings;
}

export function getProductPricing(
  product: ProductLike,
  settings: StorePricingSettings,
  quantity = 1,
  paymentMode: 'card' | 'pix' = 'card',
) {
  const tags = product.tags ?? [];
  const pixOverride = parseMoneyTag(tags, 'offer-pix:');
  const installmentOverride = parseIntTag(tags, 'offer-installments:');
  const comboOffer = getComboOffer(tags);
  const installmentCount = installmentOverride ?? Math.max(1, product.installments?.count || settings.maxInstallments || 1);
  const pixPrice = Math.max(
    MIN_ONLINE_PAYMENT_AMOUNT,
    pixOverride ?? roundMoney(product.price * (1 - settings.pixDiscount / 100)),
  );
  const baseUnitPrice = paymentMode === 'pix' ? pixPrice : product.price;
  const baseTotalPrice = roundMoney(baseUnitPrice * quantity);
  const comboCount = comboOffer ? Math.floor(quantity / comboOffer.quantity) : 0;
  const remainder = comboOffer ? quantity % comboOffer.quantity : quantity;
  const comboTotalPrice = comboOffer
    ? roundMoney(comboCount * comboOffer.totalPrice + remainder * baseUnitPrice)
    : baseTotalPrice;
  const comboSavings = roundMoney(baseTotalPrice - comboTotalPrice);

  return {
    pixDiscountPercent: settings.pixDiscount,
    pixPrice,
    installmentCount,
    installmentValue: roundMoney(product.price / installmentCount),
    pixSavings: roundMoney(product.price - pixPrice),
    freeShipThreshold: settings.freeShipThreshold,
    baseUnitPrice,
    baseTotalPrice,
    totalPrice: comboTotalPrice,
    comboSavings,
    comboApplied: comboSavings > 0,
    comboQuantity: comboOffer?.quantity ?? null,
    comboPrice: comboOffer?.totalPrice ?? null,
  };
}
