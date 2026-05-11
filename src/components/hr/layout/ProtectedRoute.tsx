'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/hr/AuthContext'
import { Spinner } from '@/components/hr/ui/spinner'
import type { UserRole } from '@/lib/hr/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasAnyRole } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace(redirectTo)
        return
      }
      if (allowedRoles && !hasAnyRole(allowedRoles)) {
        router.replace('/unauthorized')
      }
    }
  }, [isAuthenticated, isLoading, allowedRoles, redirectTo, router, hasAnyRole])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="lg" label="Loading..." />
      </div>
    )
  }

  if (!isAuthenticated) return null

  if (allowedRoles && !hasAnyRole(allowedRoles)) return null

  return <>{children}</>
}
