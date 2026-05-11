'use client'

import { useRouter } from 'next/navigation'
import { Building2, Users, AlertTriangle, Gift, Clock, CalendarDays, Settings, UserCheck, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/hr/AuthContext'

const settingsItems = [
  { href: '/settings/companies', icon: Building2, title: 'Companies', desc: 'Manage B Group subsidiary companies' },
  { href: '/settings/departments', icon: Users, title: 'Departments', desc: 'Manage departments per company' },
  { href: '/settings/violations', icon: AlertTriangle, title: 'Violation Rules', desc: 'Progressive discipline rules and categories' },
  { href: '/settings/bonuses', icon: Gift, title: 'Bonus Rules', desc: 'Bonus categories and award rules' },
  { href: '/settings/overtime-policy', icon: Clock, title: 'Overtime Policy', desc: 'OT types, multipliers and approval rules' },
  { href: '/settings/leave-policy', icon: CalendarDays, title: 'Leave Policy', desc: 'Leave types and annual allowances' },
  { href: '/settings/app-settings', icon: Settings, title: 'App Settings', desc: 'System-wide configuration and preferences' },
  { href: '/settings/users', icon: UserCheck, title: 'Users & Permissions', desc: 'Manage user accounts and role assignments' },
]

export default function SettingsPage() {
  const router = useRouter()
  const { hasRole } = useAuth()
  const isSuperAdmin = hasRole('super_admin')

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Access Restricted</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          General settings are only available to Super Administrators. Contact your system admin if you need access.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your HR system</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {settingsItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="bg-card rounded-xl border border-border p-5 text-left hover:border-blue-400 hover:shadow-md transition-all group"
            >
              <div className="h-10 w-10 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center mb-3 transition-colors">
                <Icon className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
