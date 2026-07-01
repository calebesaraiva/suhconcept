import type { PrismaClient, Product } from '../generated/prisma';

export interface StorePricingSettings {
  pixDiscount: number;
  maxInstallments: number;
  interestFreeInstallments: number;
  freeShipThreshold: number;
}

type ProductLike = Pick<Product, 'price' | 'installments' | 'tags'>;

interface ComboOffer {
  quantity: number;
  totalPrice: number;
}

export const DEFAULT_STORE_PRICING_SETTINGS: StorePricingSettings = {
  pixDiscount: 5,
  maxInstallments: 12,
  interestFreeInstallments: 3,
  freeShipThreshold: 599.99,
};

const MIN_ONLINE_PAYMENT_AMOUNT = 1;

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

export function getProductPricing(
  product: ProductLike,
  settings: StorePricingSettings,
  quantity = 1,
  paymentMode: 'card' | 'pix' = 'card',
) {
  const installmentsData =
    product.installments && typeof product.installments === 'object'
      ? (product.installments as { count?: number })
      : null;
  const pixOverride = parseMoneyTag(product.tags, 'offer-pix:');
  const installmentOverride = parseIntTag(product.tags, 'offer-installments:');
  const comboOffer = getComboOffer(product.tags);
  const installmentCount = installmentOverride ?? Math.max(1, installmentsData?.count ? Number(installmentsData.count) : settings.maxInstallments);
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
    pixPrice,
    installmentCount,
    installmentValue: roundMoney(product.price / installmentCount),
    baseUnitPrice,
    baseTotalPrice,
    totalPrice: comboTotalPrice,
    comboSavings,
    comboApplied: comboSavings > 0,
    comboQuantity: comboOffer?.quantity ?? null,
    comboPrice: comboOffer?.totalPrice ?? null,
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
