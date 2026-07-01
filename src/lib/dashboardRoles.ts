export const DASHBOARD_STAFF_ROLES = ['master', 'manager', 'seller'] as const;
export type DashboardStaffRole = (typeof DASHBOARD_STAFF_ROLES)[number];

const roleAliases: Record<string, DashboardStaffRole | 'customer'> = {
  admin: 'master',
  staff: 'manager',
  master: 'master',
  manager: 'manager',
  seller: 'seller',
  customer: 'customer',
};

export function normalizeDashboardRole(role: unknown): string {
  const normalized = String(role || '').trim().toLowerCase();
  return roleAliases[normalized] || normalized;
}

export function isDashboardStaffRole(role: unknown): role is DashboardStaffRole {
  return DASHBOARD_STAFF_ROLES.includes(normalizeDashboardRole(role) as DashboardStaffRole);
}

export function canManageDashboardUsers(role: unknown) {
  return normalizeDashboardRole(role) === 'master';
}

export function canViewCustomers(role: unknown) {
  return ['master', 'manager'].includes(normalizeDashboardRole(role));
}

export function canViewCostData(role: unknown) {
  return normalizeDashboardRole(role) === 'master';
}

export function canManageProducts(role: unknown) {
  return ['master', 'manager'].includes(normalizeDashboardRole(role));
}

export function canCancelOrders(role: unknown) {
  return ['master', 'manager'].includes(normalizeDashboardRole(role));
}
