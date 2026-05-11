'use client'

import React from 'react'
import { AuthProvider } from '@/contexts/hr/AuthContext'

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
