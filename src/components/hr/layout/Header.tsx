'use client'

import React, { useState } from 'react'
import { Bell, Menu, LogOut, User, Settings, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/hr/AuthContext'
import { useUnreadNotificationCount } from '@/hooks/hr/useNotifications'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/hr/ui/avatar'
import { Badge } from '@/components/hr/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/hr/ui/dropdown-menu'
import { Button } from '@/components/hr/ui/button'
import { cn, getInitials, capitalize } from '@/lib/hr/utils'
import type { Company } from '@/lib/hr/types'

interface HeaderProps {
  onMenuToggle: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, roles, companies, currentCompany, setCurrentCompany, logout } = useAuth()
  const { data: unreadData } = useUnreadNotificationCount()
  const router = useRouter()
  const unreadCount = unreadData?.count ?? 0

  const primaryRole = roles[0]

  const roleColors: Record<string, string> = {
    super_admin: 'navy',
    hr_manager: 'info',
    team_lead: 'warning',
    accountant: 'success',
    ceo: 'navy',
    employee: 'default',
  }

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 shadow-sm">
      {/* Left: Hamburger + Company Selector */}
      <div className="flex items-center gap-4">
        {/* Mobile menu toggle */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Company Selector */}
        {companies.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm">
                <div className="h-5 w-5 rounded bg-brand-navy flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {currentCompany?.name_en?.charAt(0) || 'B'}
                  </span>
                </div>
                <span className="font-medium text-foreground max-w-[120px] truncate">
                  {currentCompany?.name_en || 'Select Company'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Switch Company</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {companies.map((company: Company) => (
                <DropdownMenuItem
                  key={company.id}
                  onClick={() => setCurrentCompany(company)}
                  className={cn(
                    currentCompany?.id === company.id && 'bg-muted font-medium'
                  )}
                >
                  <div className="h-5 w-5 rounded bg-brand-navy flex items-center justify-center mr-2">
                    <span className="text-white text-xs font-bold">
                      {company.name_en.charAt(0)}
                    </span>
                  </div>
                  {company.name_en}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={`${unreadCount} unread notifications`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[1rem] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
              <Avatar className="h-8 w-8">
                {user?.avatar && <AvatarImage src={user.avatar} alt={user.full_name} />}
                <AvatarFallback className="text-xs">
                  {getInitials(user?.full_name || 'User')}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start min-w-0">
                <span className="text-sm font-medium text-foreground leading-tight truncate max-w-[120px]">
                  {user?.full_name || 'User'}
                </span>
                {primaryRole && (
                  <Badge
                    variant={roleColors[primaryRole] as 'default' | 'success' | 'warning' | 'danger' | 'info' | 'navy' | 'amber'}
                    className="text-[10px] px-1.5 py-0 h-4 mt-0.5"
                  >
                    {capitalize(primaryRole)}
                  </Badge>
                )}
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="font-semibold text-foreground">{user?.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/hr/employee/profile')}>
              <User className="h-4 w-4 mr-2" />
              My Profile
            </DropdownMenuItem>
            {!roles.includes('employee') && (
              <DropdownMenuItem onClick={() => router.push('/hr/settings/app-settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Account Settings
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              destructive
              onClick={() => logout()}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
