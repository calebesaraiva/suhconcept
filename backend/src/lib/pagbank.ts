import crypto from 'crypto';
import type { PrismaClient } from '../generated/prisma';
import { getStoreSettingsMap, parseBool, parseNumber } from './storeSettings';

type PagBankEnvironment = 'production' | 'sandbox';

export interface PagBankConfig {
  enabled: boolean;
  token: string;
  environment: PagBankEnvironment;
  storeName: string;
  maxInstallments: number;
  interestFreeInstallments: number;
  webhookUrl: string;
  returnUrl: string;
}

export interface PagBankCheckoutResult {
  checkoutId: string;
  redirectUrl: string;
  raw: unknown;
}

export interface PagBankCheckoutStatus {
  checkoutId: string;
  status: string;
  chargeId?: string;
  chargeStatus?: string;
  paidAt?: string;
  redirectUrl?: string;
  raw: unknown;
}

type JsonObject = Record<string, unknown>;

function getApiBase(environment: PagBankEnvironment) {
  return environment === 'sandbox'
    ? 'https://sandbox.api.pagseguro.com'
    : 'https://api.pagseguro.com';
}

function cleanPhone(value?: string) {
  return String(value || '').replace(/\D/g, '');
}

function getBrazilPhoneParts(value?: string) {
  let digits = cleanPhone(value);
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.slice(2);
  }
  if (digits.length < 10) {
    return null;
  }
  const area = digits.slice(0, 2);
  const number = digits.slice(2);
  if (!area || !number) return null;
  return { country: '55', area, number };
}

function cleanTaxId(value?: string) {
  return String(value || '').replace(/\D/g, '');
}

function toCents(value: number) {
  return Math.round(value * 100);
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function getLinks(raw: unknown) {
  if (!raw || typeof raw !== 'object') return [];
  const links = (raw as JsonObject).links;
  return Array.isArray(links) ? links.filter((item) => item && typeof item === 'object') as JsonObject[] : [];
}

function findFirstString(values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}

function extractCheckoutUrl(raw: unknown) {
  if (!raw || typeof raw !== 'object') return '';
  const data = raw as JsonObject;
  for (const link of getLinks(raw)) {
    const href = getString(link.href);
    const rel = getString(link.rel).toUpperCase();
    const type = getString(link.type).toUpperCase();
    if (!href) continue;
    if (rel.includes('PAY') || rel.includes('REDIRECT') || type === 'REDIRECT') return href;
  }

  const direct = findFirstString([
    data.payment_url,
    data.checkout_url,
  ]);
  if (direct) return direct;

  for (const link of getLinks(raw)) {
    const href = getString(link.href);
    if (href.includes('pagseguro') || href.includes('pagbank')) return href;
  }

  return '';
}

function extractChargeStatus(raw: unknown) {
  if (!raw || typeof raw !== 'object') return { chargeId: '', chargeStatus: '', paidAt: '' };
  const data = raw as JsonObject;
  const charges = Array.isArray(data.charges) ? data.charges : [];
  const firstCharge = charges.find((item) => item && typeof item === 'object') as JsonObject | undefined;
  const paidAt = getString(firstCharge?.paid_at ?? firstCharge?.updated_at);
  return {
    chargeId: getString(firstCharge?.id),
    chargeStatus: getString(firstCharge?.status || data.status),
    paidAt,
  };
}

async function pagBankRequest<T>(config: PagBankConfig, path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${config.token}`);
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  if (!headers.has('x-idempotency-key') && init?.method && init.method !== 'GET') {
    headers.set('x-idempotency-key', crypto.randomUUID());
  }

  const res = await fetch(`${getApiBase(config.environment)}${path}`, {
    ...init,
    headers,
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'message' in (data as JsonObject) && typeof (data as JsonObject).message === 'string'
        ? String((data as JsonObject).message)
        : '') ||
      (typeof data === 'string' ? data : '') ||
      `Erro PagBank ${res.status}`;
    throw new Error(message);
  }

  return data as T;
}

export async function getPagBankConfig(prisma: PrismaClient): Promise<PagBankConfig | null> {
  const settings = await getStoreSettingsMap(prisma);
  const token = getString(process.env.PAGBANK_TOKEN || settings.pagbankToken).trim();
  const enabled = parseBool(settings.pagbankEnabled, true);

  if (!enabled || !token) return null;

  const domain = getString(process.env.PUBLIC_SITE_URL || settings.publicSiteUrl || 'https://suhconcept.com').replace(/\/+$/, '');
  const environment = settings.pagbankEnvironment === 'sandbox' ? 'sandbox' : 'production';

  return {
    enabled,
    token,
    environment,
    storeName: getString(settings.storeDisplayName || 'SUH CONCEPT').slice(0, 17) || 'SUH CONCEPT',
    maxInstallments: Math.max(1, Math.trunc(parseNumber(settings.maxInstallments, 12))),
    interestFreeInstallments: Math.max(1, Math.trunc(parseNumber(settings.interestFreeInstallments, 3))),
    webhookUrl: `${domain}/api/payments/pagbank/webhook`,
    returnUrl: `${domain}/pagamento/retorno`,
  };
}

export function mapPagBankStatus(status: string) {
  switch (status.toUpperCase()) {
    case 'PAID':
    case 'AUTHORIZED':
    case 'AVAILABLE':
      return 'pago';
    case 'DECLINED':
    case 'CANCELED':
    case 'EXPIRED':
    case 'FAILED':
      return 'cancelado';
    case 'WAITING':
    case 'IN_ANALYSIS':
    default:
      return 'aguardando_pagamento';
  }
}

export async function createPagBankCheckout(
  config: PagBankConfig,
  payload: {
    orderId: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    customerCpf?: string;
    items: { name: string; quantity: number; unitAmount: number; referenceId: string }[];
    discountAmount: number;
    paymentMethod: 'PIX' | 'CREDIT_CARD';
    shippingAmount?: number;
    shippingAddress?: Record<string, string>;
    shippingType?: 'FREE' | 'FIXED';
  },
) {
  const phone = getBrazilPhoneParts(payload.customerPhone);
  const taxId = cleanTaxId(payload.customerCpf);
  const data: JsonObject = {
    reference_id: payload.orderId,
    expiration_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    customer_modifiable: false,
    customer: {
      name: payload.customerName,
      email: payload.customerEmail,
      tax_id: taxId || undefined,
      phone: phone || undefined,
    },
    items: payload.items.map((item) => ({
      reference_id: item.referenceId,
      name: item.name,
      quantity: item.quantity,
      unit_amount: toCents(item.unitAmount),
    })),
    discount_amount: payload.discountAmount > 0 ? toCents(payload.discountAmount) : undefined,
    payment_methods: [{ type: payload.paymentMethod }],
    payment_methods_configs: payload.paymentMethod === 'CREDIT_CARD'
      ? [{
          type: 'CREDIT_CARD',
          config_options: [
            { option: 'INSTALLMENTS_LIMIT', value: String(config.maxInstallments) },
            { option: 'INTEREST_FREE_INSTALLMENTS', value: String(config.interestFreeInstallments) },
          ],
        }]
      : undefined,
    soft_descriptor: config.storeName,
    redirect_url: `${config.returnUrl}?order=${payload.orderId}`,
    return_url: `${config.returnUrl}?order=${payload.orderId}`,
    notification_urls: [`${config.webhookUrl}?scope=checkout&orderId=${payload.orderId}`],
    payment_notification_urls: [`${config.webhookUrl}?scope=payment&orderId=${payload.orderId}`],
  };

  if (payload.shippingAddress && payload.shippingType) {
    data.shipping = {
      type: payload.shippingType,
      amount: payload.shippingType === 'FREE' ? 0 : toCents(payload.shippingAmount || 0),
      address: {
        street: payload.shippingAddress.rua,
        number: payload.shippingAddress.num,
        locality: payload.shippingAddress.bairro,
        city: payload.shippingAddress.cidade,
        region_code: payload.shippingAddress.estado,
        country: 'BRA',
        postal_code: cleanPhone(payload.shippingAddress.cep),
      },
    };
  }

  const response = await pagBankRequest<JsonObject>(config, '/checkouts', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'x-idempotency-key': payload.orderId,
    },
  });

  const checkoutId = getString(response.id);
  const redirectUrl = extractCheckoutUrl(response);

  if (!checkoutId || !redirectUrl) {
    throw new Error('PagBank não retornou o link do checkout.');
  }

  return {
    checkoutId,
    redirectUrl,
    raw: response,
  } satisfies PagBankCheckoutResult;
}

export async function getPagBankCheckoutStatus(config: PagBankConfig, checkoutId: string) {
  const response = await pagBankRequest<JsonObject>(config, `/checkouts/${checkoutId}`, {
    method: 'GET',
  });
  const status = getString(response.status);
  const redirectUrl = extractCheckoutUrl(response);
  const charge = extractChargeStatus(response);

  return {
    checkoutId,
    status,
    redirectUrl: redirectUrl || undefined,
    chargeId: charge.chargeId || undefined,
    chargeStatus: charge.chargeStatus || undefined,
    paidAt: charge.paidAt || undefined,
    raw: response,
  } satisfies PagBankCheckoutStatus;
}

export function validatePagBankWebhookSignature(rawBody: string, signature: string | undefined, token: string) {
  if (!signature || !rawBody || !token) return false;
  const expected = crypto.createHash('sha256').update(`${token}-${rawBody}`).digest('hex');
  return expected === signature;
}
