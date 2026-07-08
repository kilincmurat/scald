/**
 * Role-based access matrix. Single source of truth used by:
 *  - Sidebar (to build the nav)
 *  - Middleware / RoleGate (to redirect unauthorised requests)
 *  - Existing pages (to hide/disable features per role)
 */

export type Role = 'admin' | 'data_entry' | 'decision_maker' | 'citizen';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrator',
  data_entry: 'Data Entry',
  decision_maker: 'Decision Maker',
  citizen: 'Citizen',
};

export const ROLE_BADGE_COLOR: Record<Role, string> = {
  admin: 'bg-purple-100 text-purple-700 ring-purple-200',
  data_entry: 'bg-blue-100 text-blue-700 ring-blue-200',
  decision_maker: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  citizen: 'bg-slate-100 text-slate-600 ring-slate-200',
};

/** Where each role lands after login. */
export const HOME_PATH: Record<Role, string> = {
  admin: '/admin',
  data_entry: '/data-entry',
  decision_maker: '/',
  citizen: '/public',
};

/**
 * Screens each role can access. Path prefix matching:
 *   '/data-entry' → matches '/data-entry', '/data-entry/[category]', etc.
 * Also '/' matches only exactly '/'.
 */
const ACCESS_MATRIX: Record<Role, string[]> = {
  admin: [
    '/',
    '/data-entry',
    '/efct',
    '/ai-dss',
    '/ai-rt',
    '/map',
    '/admin',
    '/exports',
    '/official-report',
    '/reports',
    '/feedback',
    '/settings',
  ],
  data_entry: [
    '/data-entry',
    '/efct', // read-only
    '/map',
    '/settings',
  ],
  decision_maker: [
    '/',
    '/data-entry', // read-only
    '/efct',
    '/ai-dss',
    '/ai-rt',
    '/map',
    '/exports',
    '/official-report',
    '/reports',
    '/feedback', // inbox
    '/settings',
  ],
  citizen: [
    '/public',
    '/my-municipality',
    '/map', // public layer
    '/feedback', // submit form
    '/settings',
  ],
};

export function canAccess(role: Role, path: string): boolean {
  const allowed = ACCESS_MATRIX[role];
  return allowed.some((p) => {
    if (p === '/') return path === '/';
    return path === p || path.startsWith(p + '/');
  });
}

/** Whether the given role can perform write actions on data entry. */
export function canWriteDataEntry(role: Role): boolean {
  return role === 'admin' || role === 'data_entry';
}

/** Whether this role can approve strategies / respond to feedback. */
export function canRespondFeedback(role: Role): boolean {
  return role === 'admin' || role === 'decision_maker';
}

/** Whether this role can download official / Excel reports. */
export function canExportReports(role: Role): boolean {
  return role === 'admin' || role === 'decision_maker';
}

/** Whether this role can edit indicator thresholds. */
export function canEditThresholds(role: Role): boolean {
  return role === 'admin';
}

/** Whether this role sees the full analytical dashboards (Overview/EFCT/DSS/RT). */
export function seesAnalytics(role: Role): boolean {
  return role === 'admin' || role === 'decision_maker';
}

/**
 * Convenience: a normalised role. Any legacy 'municipality' value in the DB
 * (which the migration should already have converted) is treated as
 * 'data_entry' at the app boundary so we never crash on stale data.
 */
export function normaliseRole(raw: string | null | undefined): Role {
  if (raw === 'admin') return 'admin';
  if (raw === 'decision_maker') return 'decision_maker';
  if (raw === 'citizen') return 'citizen';
  return 'data_entry';
}
