import type { PrismaClient, Product } from '../generated/prisma';

export interface StorePricingSettings {
  pixDiscount: number;
  maxInstallments: number;
  interestFreeInstallments: number;
  freeShipThreshold: number;
}

export const DEFAULT_STORE_PRICING_SETTINGS: StorePricingSettings = {
  pixDiscount: 5,
  maxInstallments: 12,
  interestFreeInstallments: 3,
  freeShipThreshold: 599.99,
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function parseNumber(value?: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getStorePricingSettings(prisma: PrismaClient): Promise<StorePricingSettings> {
  const rows = await prisma.setting.findMany();
  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  return {
    pixDiscount: Math.min(Math.max(parseNumber(settings.pixDiscount, DEFAULT_STORE_PRICING_SETTINGS.pixDiscount), 0), 100),
    maxInstallments: Math.max(1, Math.trunc(parseNumber(settings.maxInstallments, DEFAULT_STORE_PRICING_SETTINGS.maxInstallments))),
    interestFreeInstallments: Math.max(
      1,
      Math.min(
        Math.trunc(parseNumber(settings.interestFreeInstallments, DEFAULT_STORE_PRICING_SETTINGS.interestFreeInstallments)),
        Math.max(1, Math.trunc(parseNumber(settings.maxInstallments, DEFAULT_STORE_PRICING_SETTINGS.maxInstallments))),
      ),
    ),
    freeShipThreshold: Math.max(0, parseNumber(settings.freeShipThreshold, DEFAULT_STORE_PRICING_SETTINGS.freeShipThreshold)),
  };
}

export function getProductPricing(product: Pick<Product, 'price'>, settings: StorePricingSettings) {
  const installmentCount = Math.max(1, settings.maxInstallments);
  const pixPrice = roundMoney(product.price * (1 - settings.pixDiscount / 100));

  return {
    pixPrice,
    installmentCount,
    installmentValue: roundMoney(product.price / installmentCount),
  };
}

export function serializeProductWithStorePricing<
  T extends Product & { reviewCount: number },
>(product: T, settings: StorePricingSettings) {
  const pricing = getProductPricing(product, settings);

  return {
    ...product,
    pixPrice: pricing.pixPrice,
    installments: {
      count: pricing.installmentCount,
      value: pricing.installmentValue,
    },
    reviews: product.reviewCount,
  };
}
