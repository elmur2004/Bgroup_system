import { AuthUser } from './auth-utils'

export function hasRole(user: AuthUser, role: string): boolean {
  return user.roles.includes(role)
}

export function hasAnyRole(user: AuthUser, roles: string[]): boolean {
  return roles.some((r) => user.roles.includes(r))
}

export function isSuperAdmin(user: AuthUser): boolean {
  return hasRole(user, 'super_admin')
}

export function isHROrAdmin(user: AuthUser): boolean {
  return hasAnyRole(user, ['super_admin', 'hr_manager'])
}

export function isCEO(user: AuthUser): boolean {
  return hasRole(user, 'ceo')
}

export function isAccountant(user: AuthUser): boolean {
  return hasRole(user, 'accountant')
}

export function isTeamLead(user: AuthUser): boolean {
  return hasRole(user, 'team_lead')
}

export function isManagement(user: AuthUser): boolean {
  return hasAnyRole(user, ['super_admin', 'hr_manager', 'ceo'])
}

export function canManagePayroll(user: AuthUser): boolean {
  return hasAnyRole(user, ['super_admin', 'hr_manager', 'accountant'])
}

export function canViewAllEmployees(user: AuthUser): boolean {
  return hasAnyRole(user, ['super_admin', 'hr_manager', 'ceo', 'accountant'])
}

export function canAccessCompany(user: AuthUser, companyId: string): boolean {
  if (isSuperAdmin(user) || isCEO(user)) return true
  return user.companies.includes(companyId)
}

export function requireRole(user: AuthUser, roles: string[]): void {
  if (!hasAnyRole(user, roles)) {
    throw new Response(
      JSON.stringify({ detail: 'You do not have permission to perform this action.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// -----------------------------------------------------------------------------
// Unified permission check
//
// Prefer `can(user, 'action:resource')` for new code. The per-action helpers
// above (isHROrAdmin, canManagePayroll, etc.) remain for backwards compatibility
// and are implemented on top of `can()`.
// -----------------------------------------------------------------------------

export type HrPermission =
  | 'user:manage'
  | 'employee:read_all'
  | 'employee:write'
  | 'employee:terminate'
  | 'payroll:read_all'
  | 'payroll:write'
  | 'payroll:lock'
  | 'payroll:finalize'
  | 'payroll:mark_paid'
  | 'bonus:approve'
  | 'bonus:write'
  | 'incident:approve'
  | 'incident:write'
  | 'leave:approve'
  | 'overtime:approve'
  | 'attendance:write_manual'
  | 'company:write'
  | 'department:write'
  | 'shift:write'
  | 'settings:write'
  | 'settings:read'
  | 'audit:read'
  | 'seed:run'

const PERMISSIONS: Record<HrPermission, string[]> = {
  'user:manage':          ['super_admin'],
  'employee:read_all':    ['super_admin', 'hr_manager', 'ceo', 'accountant'],
  'employee:write':       ['super_admin', 'hr_manager'],
  'employee:terminate':   ['super_admin', 'hr_manager'],
  'payroll:read_all':     ['super_admin', 'hr_manager', 'ceo', 'accountant'],
  'payroll:write':        ['super_admin', 'hr_manager', 'accountant'],
  'payroll:lock':         ['super_admin', 'accountant'],
  'payroll:finalize':     ['super_admin', 'accountant'],
  'payroll:mark_paid':    ['super_admin', 'accountant'],
  'bonus:approve':        ['super_admin', 'hr_manager'],
  'bonus:write':          ['super_admin', 'hr_manager'],
  'incident:approve':     ['super_admin', 'hr_manager'],
  'incident:write':       ['super_admin', 'hr_manager'],
  'leave:approve':        ['super_admin', 'hr_manager', 'team_lead'],
  'overtime:approve':     ['super_admin', 'hr_manager', 'team_lead'],
  'attendance:write_manual': ['super_admin', 'hr_manager'],
  'company:write':        ['super_admin'],
  'department:write':     ['super_admin', 'hr_manager'],
  'shift:write':          ['super_admin', 'hr_manager'],
  'settings:write':       ['super_admin'],
  'settings:read':        ['super_admin', 'hr_manager', 'ceo', 'accountant'],
  'audit:read':           ['super_admin'],
  'seed:run':             ['super_admin'],
}

export function can(user: AuthUser, permission: HrPermission): boolean {
  const allowedRoles = PERMISSIONS[permission]
  if (!allowedRoles) return false
  return hasAnyRole(user, allowedRoles)
}

export function assertCan(user: AuthUser, permission: HrPermission): void {
  if (!can(user, permission)) {
    throw new Response(
      JSON.stringify({ detail: 'You do not have permission to perform this action.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
