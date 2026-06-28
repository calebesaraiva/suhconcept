import type { PrismaClient, Setting } from '../generated/prisma';

export const PUBLIC_SETTINGS_BLOCKLIST = new Set([
  'pagbankToken',
  'mercadopagoAccessToken',
  'mercadopagoWebhookSecret',
  'correiosToken',
  'smtpPass',
]);

const PUBLIC_SETTINGS_PREFIX_BLOCKLIST = [
  'mercadopago',
];

export type StoreSettingsMap = Record<string, string>;

export async function getStoreSettingsMap(prisma: PrismaClient): Promise<StoreSettingsMap> {
  const rows = await prisma.setting.findMany();
  return mapSettingsRows(rows);
}

export function mapSettingsRows(rows: Pick<Setting, 'key' | 'value'>[]): StoreSettingsMap {
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export function toPublicStoreSettings(settings: StoreSettingsMap): StoreSettingsMap {
  return Object.fromEntries(
    Object.entries(settings).filter(([key]) =>
      !PUBLIC_SETTINGS_BLOCKLIST.has(key) &&
      !PUBLIC_SETTINGS_PREFIX_BLOCKLIST.some((prefix) => key.startsWith(prefix)),
    ),
  );
}

export function parseBool(value?: string, fallback = false) {
  if (value === undefined) return fallback;
  return value === 'true';
}

export function parseNumber(value?: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
