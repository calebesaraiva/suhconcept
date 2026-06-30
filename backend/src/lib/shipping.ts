import type { PrismaClient } from '../generated/prisma';
import { getStoreSettingsMap, parseBool, parseNumber, type StoreSettingsMap } from './storeSettings';

type JsonObject = Record<string, unknown>;

export interface ShippingQuoteOption {
  serviceCode: string;
  serviceName: string;
  price: number;
  originalPrice: number;
  deadlineDays?: number;
  deadlineText?: string;
}

export interface ShippingQuoteResult {
  provider: 'melhor_envio' | 'local';
  originCep: string;
  destinationCep: string;
  destinationCity?: string;
  destinationState?: string;
  freeShippingApplied: boolean;
  options: ShippingQuoteOption[];
  selected: ShippingQuoteOption;
}

export interface CepAddressResult {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export class ShippingQuoteError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const SERVICE_NAMES: Record<string, string> = {
  '03220': 'SEDEX',
  '03298': 'PAC',
  '04014': 'SEDEX',
  '04510': 'PAC',
};

function onlyDigits(value: unknown) {
  return String(value ?? '').replace(/\D/g, '');
}

function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function isImperatrizDelivery(city: unknown, state: unknown) {
  return normalizeText(city) === 'imperatriz' && normalizeText(state) === 'ma';
}

function parseMoney(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;
  const normalized = value.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getNested(data: unknown, keys: string[]) {
  if (!data || typeof data !== 'object') return undefined;
  const obj = data as JsonObject;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

function getConfig(settings: StoreSettingsMap) {
  const token = String(process.env.MELHOR_ENVIO_ACCESS_TOKEN || settings.melhorEnvioAccessToken || '').trim();
  const originCep = onlyDigits(process.env.MELHOR_ENVIO_CEP_ORIGEM || settings.melhorEnvioCepOrigem || settings.correiosCepOrigem || settings.storeCep || '65900000');
  const serviceCodes = String(process.env.MELHOR_ENVIO_SERVICE_IDS || settings.melhorEnvioServiceIds || '')
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean);
  const environment = String(process.env.MELHOR_ENVIO_ENVIRONMENT || settings.melhorEnvioEnvironment || 'production').trim().toLowerCase() === 'sandbox'
    ? 'sandbox'
    : 'production';
  const appName = String(process.env.MELHOR_ENVIO_APP_NAME || settings.melhorEnvioAppName || settings.storeName || 'SUH CONCEPT').trim() || 'SUH CONCEPT';
  const appEmail = String(process.env.MELHOR_ENVIO_APP_EMAIL || settings.melhorEnvioAppEmail || settings.smtpFromEmail || 'suporte@suhconcept.com').trim() || 'suporte@suhconcept.com';

  return {
    enabled: settings.melhorEnvioEnabled !== undefined
      ? parseBool(settings.melhorEnvioEnabled, true)
      : parseBool(settings.correiosEnabled, true),
    token,
    originCep,
    serviceCodes,
    environment,
    baseUrl: environment === 'sandbox'
      ? 'https://sandbox.melhorenvio.com.br'
      : 'https://melhorenvio.com.br',
    userAgent: `${appName} (${appEmail})`,
    weightGrams: Math.max(1, parseNumber(process.env.CORREIOS_PACKAGE_WEIGHT_GRAMS || settings.correiosPesoGramas, 500)),
    lengthCm: Math.max(16, parseNumber(process.env.CORREIOS_PACKAGE_LENGTH_CM || settings.correiosComprimentoCm, 24)),
    widthCm: Math.max(11, parseNumber(process.env.CORREIOS_PACKAGE_WIDTH_CM || settings.correiosLarguraCm, 18)),
    heightCm: Math.max(2, parseNumber(process.env.CORREIOS_PACKAGE_HEIGHT_CM || settings.correiosAlturaCm, 8)),
    handlingFee: Math.max(0, parseNumber(process.env.SHIPPING_HANDLING_FEE || settings.shippingHandlingFee, 0)),
    freeShipPromo: parseBool(settings.freeShipPromo),
    freeShipThreshold: parseNumber(settings.freeShipThreshold, 599.99),
  };
}

export async function lookupCepAddress(rawCep: unknown): Promise<CepAddressResult> {
  const cep = onlyDigits(rawCep);
  if (cep.length !== 8) {
    throw new ShippingQuoteError('CEP inválido. Verifique e tente novamente.', 400);
  }

  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new ShippingQuoteError('CEP inválido. Verifique e tente novamente.', 400);
  }

  const data = await res.json().catch(() => null) as Record<string, unknown> | null;
  if (!data || data.erro) {
    throw new ShippingQuoteError('CEP inválido. Verifique e tente novamente.', 400);
  }

  const cidade = String(data.localidade || '').trim();
  const estado = String(data.uf || '').trim();
  if (!cidade || !estado) {
    throw new ShippingQuoteError('CEP inválido. Verifique e tente novamente.', 400);
  }

  return {
    cep,
    logradouro: String(data.logradouro || '').trim(),
    bairro: String(data.bairro || '').trim(),
    cidade,
    estado,
  };
}

type MelhorEnvioQuote = {
  id?: number | string;
  name?: string;
  price?: string | number;
  custom_price?: string | number;
  delivery_time?: number;
  custom_delivery_time?: number;
  delivery_range?: { min?: number; max?: number };
  custom_delivery_range?: { min?: number; max?: number };
  company?: { name?: string };
  error?: string;
};

async function melhorEnvioCalculate(
  config: ReturnType<typeof getConfig>,
  destinationCep: string,
  subtotal: number,
  itemCount: number,
) {
  const quantity = Math.max(1, Math.trunc(itemCount || 1));
  const unitInsuranceValue = +Math.max(0.01, subtotal / quantity).toFixed(2);
  const unitWeightKg = +Math.max(0.001, config.weightGrams / 1000).toFixed(3);

  const payload: Record<string, unknown> = {
    from: { postal_code: config.originCep },
    to: { postal_code: destinationCep },
    products: [
      {
        id: 'suhconcept-order',
        width: config.widthCm,
        height: config.heightCm,
        length: config.lengthCm,
        weight: unitWeightKg,
        insurance_value: unitInsuranceValue,
        quantity,
      },
    ],
    options: {
      receipt: false,
      own_hand: false,
    },
  };

  if (config.serviceCodes.length) {
    payload.services = config.serviceCodes.join(',');
  }

  const res = await fetch(`${config.baseUrl}/api/v2/me/shipment/calculate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': config.userAgent,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  const data: unknown = (() => {
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return text;
    }
  })();

  if (!res.ok) {
    const errors = data && typeof data === 'object'
      ? getNested(data, ['message', 'error', 'errors'])
      : data;
    const message =
      typeof errors === 'string'
        ? errors
        : errors && typeof errors === 'object'
          ? JSON.stringify(errors)
          : `Melhor Envio respondeu ${res.status}`;

    if (res.status === 401) {
      throw new ShippingQuoteError('Token do Melhor Envio inválido ou expirado. Atualize o token no painel da loja.', 401);
    }

    throw new ShippingQuoteError(message, res.status);
  }

  if (!Array.isArray(data)) {
    throw new ShippingQuoteError('Melhor Envio não retornou opções válidas de frete.', 422);
  }

  return data as MelhorEnvioQuote[];
}

function resolveDeadlineText(option: MelhorEnvioQuote) {
  const customDeadline = Number(option.custom_delivery_time);
  if (Number.isFinite(customDeadline) && customDeadline > 0) {
    return {
      deadlineDays: customDeadline,
      deadlineText: `${customDeadline} dia${customDeadline > 1 ? 's' : ''} úteis`,
    };
  }

  const range = option.custom_delivery_range || option.delivery_range;
  const min = Number(range?.min);
  const max = Number(range?.max);
  if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max > 0) {
    return {
      deadlineDays: max,
      deadlineText: min === max ? `${max} dia${max > 1 ? 's' : ''} úteis` : `${min} a ${max} dias úteis`,
    };
  }

  const fallbackDeadline = Number(option.delivery_time);
  if (Number.isFinite(fallbackDeadline) && fallbackDeadline > 0) {
    return {
      deadlineDays: fallbackDeadline,
      deadlineText: `${fallbackDeadline} dia${fallbackDeadline > 1 ? 's' : ''} úteis`,
    };
  }

  return {
    deadlineDays: undefined,
    deadlineText: undefined,
  };
}

function normalizeMelhorEnvioOptions(
  config: ReturnType<typeof getConfig>,
  options: MelhorEnvioQuote[],
): ShippingQuoteOption[] {
  const normalized = options
    .filter((option) => !option.error)
    .map<ShippingQuoteOption | null>((option) => {
      const basePrice = parseMoney(option.custom_price ?? option.price);
      if (!basePrice || basePrice <= 0) return null;

      const { deadlineDays, deadlineText } = resolveDeadlineText(option);
      const serviceCode = String(option.id ?? option.name ?? '');
      const companyName = String(option.company?.name || '').trim();
      const rawServiceName = String(option.name || SERVICE_NAMES[serviceCode] || `Serviço ${serviceCode}`).trim();

      return {
        serviceCode,
        serviceName: companyName && !rawServiceName.toLowerCase().includes(companyName.toLowerCase())
          ? `${companyName} · ${rawServiceName}`
          : rawServiceName,
        price: +(basePrice + config.handlingFee).toFixed(2),
        originalPrice: +(basePrice + config.handlingFee).toFixed(2),
        deadlineDays,
        deadlineText,
      } satisfies ShippingQuoteOption;
    })
    .filter((option): option is ShippingQuoteOption => option !== null)
    .sort((a, b) => a.price - b.price);

  return normalized;
}

export async function quoteShipping(
  prisma: PrismaClient,
  payload: {
    cepDestino: unknown;
    subtotal?: unknown;
    serviceCode?: unknown;
    freeShipping?: boolean;
    cidade?: unknown;
    estado?: unknown;
    itemCount?: unknown;
  },
): Promise<ShippingQuoteResult> {
  const settings = await getStoreSettingsMap(prisma);
  const config = getConfig(settings);
  const destinationCep = onlyDigits(payload.cepDestino);
  const subtotal = parseNumber(String(payload.subtotal ?? 0), 0);
  const preferredServiceCode = String(payload.serviceCode || '').trim();
  const itemCount = Math.max(1, Math.trunc(parseNumber(String(payload.itemCount ?? 1), 1)));
  const freeShippingApplied = Boolean(payload.freeShipping) || config.freeShipPromo || subtotal >= config.freeShipThreshold;

  if (destinationCep.length !== 8) throw new ShippingQuoteError('CEP inválido. Verifique e tente novamente.', 400);
  if (!config.weightGrams || !config.lengthCm || !config.widthCm || !config.heightCm) {
    throw new ShippingQuoteError('Dimensões de frete não configuradas corretamente.', 500);
  }

  const resolvedAddress =
    String(payload.cidade || '').trim() && String(payload.estado || '').trim()
      ? {
          cidade: String(payload.cidade || '').trim(),
          estado: String(payload.estado || '').trim(),
        }
      : await lookupCepAddress(destinationCep);

  if (isImperatrizDelivery(resolvedAddress.cidade, resolvedAddress.estado)) {
    const localPrice = freeShippingApplied ? 0 : 10;
    const option = {
      serviceCode: 'LOCAL-IMP',
      serviceName: 'Entrega local - Imperatriz',
      price: localPrice,
      originalPrice: 10,
      deadlineDays: 1,
      deadlineText: '1 dia útil',
    } satisfies ShippingQuoteOption;

    return {
      provider: 'local',
      originCep: config.originCep,
      destinationCep,
      destinationCity: resolvedAddress.cidade,
      destinationState: resolvedAddress.estado,
      freeShippingApplied,
      options: [option],
      selected: option,
    };
  }

  if (!config.enabled) throw new ShippingQuoteError('Cálculo automático de frete está desativado.', 503);
  if (!config.token) throw new ShippingQuoteError('Token do Melhor Envio não configurado. Atualize no painel da loja para liberar o frete automático.', 503);
  if (config.originCep.length !== 8) throw new ShippingQuoteError('CEP de origem do Melhor Envio inválido.', 500);

  const quoted = await melhorEnvioCalculate(config, destinationCep, subtotal, itemCount);
  const options = normalizeMelhorEnvioOptions(config, quoted);

  if (!options.length) {
    throw new ShippingQuoteError(
      'Não encontramos uma opção de frete automática para sua região. Entre em contato conosco para calcularmos manualmente.',
      422,
    );
  }

  const selectedBase = options.find((option) => option.serviceCode === preferredServiceCode) || options[0];
  const normalizedOptions = options.map((option) => ({
    ...option,
    price: freeShippingApplied ? 0 : option.originalPrice,
  }));
  const selected = normalizedOptions.find((option) => option.serviceCode === selectedBase.serviceCode) || normalizedOptions[0];

  return {
    provider: 'melhor_envio',
    originCep: config.originCep,
    destinationCep,
    destinationCity: resolvedAddress.cidade,
    destinationState: resolvedAddress.estado,
    freeShippingApplied,
    options: normalizedOptions,
    selected,
  };
}
