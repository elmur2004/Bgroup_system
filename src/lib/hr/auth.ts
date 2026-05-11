import Cookies from 'js-cookie'
import type { User, UserRole } from './types'
import { ACCESS_TOKEN_KEY, clearTokens } from './api'

const USER_KEY = 'bghr_user'

// ─── User Storage ─────────────────────────────────────────────────────────────

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = Cookies.get(USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function storeUser(user: User, remember = false): void {
  const opts = remember ? { expires: 30 } : undefined
  Cookies.set(USER_KEY, JSON.stringify(user), opts)
}

export function clearUser(): void {
  Cookies.remove(USER_KEY)
}

// ─── Auth Helpers ────────────────────────────────────────────────────────────

export function isLoggedIn(): boolean {
  return !!Cookies.get(ACCESS_TOKEN_KEY)
}

export function getUser(): User | null {
  return getStoredUser()
}

export function hasRole(role: UserRole): boolean {
  const user = getStoredUser()
  if (!user) return false
  return user.roles.includes(role)
}

export function hasAnyRole(roles: UserRole[]): boolean {
  const user = getStoredUser()
  if (!user) return false
  return roles.some((r) => user.roles.includes(r))
}

export function hasAllRoles(roles: UserRole[]): boolean {
  const user = getStoredUser()
  if (!user) return false
  return roles.every((r) => user.roles.includes(r))
}

export function isAdmin(): boolean {
  return hasAnyRole(['super_admin', 'hr_manager'])
}

export function isCEO(): boolean {
  return hasRole('ceo')
}

export function isTeamLead(): boolean {
  return hasRole('team_lead')
}

export function isAccountant(): boolean {
  return hasRole('accountant')
}

export function isEmployee(): boolean {
  return hasRole('employee')
}

// ─── Role-based Redirect ──────────────────────────────────────────────────────

export function getDefaultRoute(user: User): string {
  if (!user.roles || user.roles.length === 0) return `/dashboard`

  const roleRouteMap: Record<UserRole, string> = {
    super_admin: '/dashboard',
    hr_manager: '/dashboard',
    team_lead: '/team',
    accountant: '/accountant',
    ceo: '/management',
    employee: '/employee/home',
  }

  // Use highest-priority role
  const priority: UserRole[] = [
    'super_admin',
    'hr_manager',
    'ceo',
    'accountant',
    'team_lead',
    'employee',
  ]

  for (const role of priority) {
    if (user.roles.includes(role)) {
      return roleRouteMap[role]
    }
  }

  return '/dashboard'
}

// ─── Logout ──────────────────────────────────────────────────────────────────

export function logout(): void {
  clearTokens()
  clearUser()
}
