'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signIn, signOut } from 'next-auth/react'
import { companiesApi } from '@/lib/hr/api'
import type { User, UserRole, LoginCredentials, Company } from '@/lib/hr/types'

// ─── Context Shape ────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  roles: UserRole[]
  companies: Company[]
  currentCompany: Company | null
  setCurrentCompany: (company: Company | null) => void
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  hasRole: (role: UserRole) => boolean
  hasAnyRole: (roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ─── Provider (NextAuth bridge) ──────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [companies, setCompanies] = useState<Company[]>([])
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null)

  const user: User | null = useMemo(() => {
    if (!session?.user || !session.user.modules?.includes('hr')) return null
    const s = session.user
    return {
      id: s.id,
      email: s.email,
      full_name: s.name || s.email,
      roles: (s.hrRoles ?? []) as UserRole[],
      companies: s.hrCompanies ?? [],
      avatar: s.image ?? null,
      employee_id: null,
      is_active: true,
    }
  }, [session])

  const isLoading = status === 'loading'

  // ─── Load companies once we have an HR user ──────────────────────────────
  useEffect(() => {
    if (!user) return
    companiesApi
      .list()
      .then((res) => {
        const raw = res.data as { results?: Company[] } | Company[]
        const all: Company[] = Array.isArray(raw) ? raw : (raw.results ?? [])
        // Filter out junk / empty-name companies created by older migrations —
        // they have no employees and would otherwise become the default scope
        // for super-admins, causing dashboard widgets to read zero rows.
        const list = all.filter((c) => (c.name_en ?? "").trim() !== "")
        setCompanies(list)
        if (list.length > 0 && !currentCompany) {
          const userCompanies = user.companies
          const firstAccessible =
            userCompanies.length > 0
              ? list.find((c) => userCompanies.includes(c.id)) || list[0]
              : list[0]
          setCurrentCompany(firstAccessible)
        }
      })
      .catch(() => {
        // Non-fatal — leave companies empty
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const res = await signIn('hr-credentials', {
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      })
      if (res?.error) throw new Error(res.error)
      router.push('/')
    },
    [router]
  )

  const logout = useCallback(async () => {
    await signOut({ redirect: false })
    setCompanies([])
    setCurrentCompany(null)
    router.push('/login')
  }, [router])

  const refreshUser = useCallback(async () => {
    // NextAuth session refreshes automatically via jwt callback; nothing to do here.
  }, [])

  const hasRole = useCallback(
    (role: UserRole) => user?.roles?.includes(role) ?? false,
    [user]
  )

  const hasAnyRole = useCallback(
    (roles: UserRole[]) => roles.some((r) => user?.roles?.includes(r)) ?? false,
    [user]
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      roles: user?.roles ?? [],
      companies,
      currentCompany,
      setCurrentCompany,
      login,
      logout,
      refreshUser,
      hasRole,
      hasAnyRole,
    }),
    [user, isLoading, companies, currentCompany, login, logout, refreshUser, hasRole, hasAnyRole]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
