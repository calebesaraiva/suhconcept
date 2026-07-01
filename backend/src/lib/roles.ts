export const STAFF_ROLES = ['master', 'manager', 'seller'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

const ROLE_ALIASES: Record<string, StaffRole | 'customer'> = {
  admin: 'master',
  staff: 'manager',
  master: 'master',
  manager: 'manager',
  seller: 'seller',
  customer: 'customer',
};

export function normalizeRole(role: unknown): string {
  const normalized = String(role || '').trim().toLowerCase();
  return ROLE_ALIASES[normalized] || normalized;
}

export function isStaffRole(role: unknown): role is StaffRole {
  return STAFF_ROLES.includes(normalizeRole(role) as StaffRole);
}

export function isMasterRole(role: unknown) {
  return normalizeRole(role) === 'master';
}

export function isManagerRole(role: unknown) {
  return normalizeRole(role) === 'manager';
}

export function isSellerRole(role: unknown) {
  return normalizeRole(role) === 'seller';
}

export function canViewCostData(role: unknown) {
  return normalizeRole(role) === 'master';
}

export function sanitizeStaffRole(role: unknown): StaffRole {
  const normalized = normalizeRole(role);
  if (!STAFF_ROLES.includes(normalized as StaffRole)) {
    return 'seller';
  }
  return normalized as StaffRole;
}
