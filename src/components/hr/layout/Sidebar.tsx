'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Clock,
  FileText,
  Settings,
  TrendingUp,
  AlertTriangle,
  Gift,
  DollarSign,
  BarChart2,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  UserCheck,
  CalendarDays,
  CheckSquare,
  Shield,
  BookOpen,
  FileBarChart,
  Download,
  User,
  Wallet,
  ClipboardList,
  FolderOpen,
  Briefcase,
} from 'lucide-react'
import { cn } from '@/lib/hr/utils'
import { useAuth } from '@/contexts/hr/AuthContext'
import { DemoLauncher } from '@/components/demo/DemoLauncher'
import type { UserRole } from '@/lib/hr/types'

// ─── Navigation Definitions ───────────────────────────────────────────────────

interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
  children?: NavItem[]
  roles?: UserRole[]
  demoId?: string
}

const adminNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: 'Employees',
    icon: <Users className="h-4 w-4" />,
    demoId: 'nav-employees',
    children: [
      { label: 'All Employees', href: '/employees', icon: <Users className="h-3.5 w-3.5" /> },
      { label: 'Add Employee', href: '/employees/add', icon: <UserPlus className="h-3.5 w-3.5" /> },
    ],
  },
  {
    label: 'Attendance',
    icon: <Clock className="h-4 w-4" />,
    children: [
      { label: "Today's Attendance", href: '/attendance/today', icon: <CalendarDays className="h-3.5 w-3.5" /> },
      { label: 'Attendance Report', href: '/attendance/report', icon: <FileText className="h-3.5 w-3.5" /> },
      { label: 'Attendance Settings', href: '/attendance/settings', icon: <Settings className="h-3.5 w-3.5" /> },
    ],
  },
  {
    label: 'Overtime',
    icon: <TrendingUp className="h-4 w-4" />,
    children: [
      { label: 'OT Requests', href: '/overtime/pending', icon: <CheckSquare className="h-3.5 w-3.5" /> },
      { label: 'OT Report', href: '/overtime/report', icon: <BarChart2 className="h-3.5 w-3.5" /> },
    ],
  },
  {
    label: 'Incidents',
    icon: <AlertTriangle className="h-4 w-4" />,
    children: [
      { label: 'Submit Incident', href: '/incidents/submit', icon: <Shield className="h-3.5 w-3.5" /> },
      { label: 'All Incidents', href: '/incidents/all', icon: <ClipboardList className="h-3.5 w-3.5" /> },
      { label: 'Progressive Discipline', href: '/incidents/progressive', icon: <BookOpen className="h-3.5 w-3.5" /> },
    ],
  },
  {
    label: 'Bonuses',
    icon: <Gift className="h-4 w-4" />,
    children: [
      { label: 'Award Bonus', href: '/bonuses/award', icon: <Gift className="h-3.5 w-3.5" /> },
      { label: 'All Bonuses', href: '/bonuses/all', icon: <ClipboardList className="h-3.5 w-3.5" /> },
    ],
  },
  {
    label: 'Payroll',
    icon: <DollarSign className="h-4 w-4" />,
    children: [
      { label: 'Monthly Payroll', href: '/payroll/monthly', icon: <Wallet className="h-3.5 w-3.5" /> },
      { label: 'Payroll History', href: '/payroll/history', icon: <FileText className="h-3.5 w-3.5" /> },
    ],
  },
  {
    label: 'Reports',
    icon: <BarChart2 className="h-4 w-4" />,
    children: [
      { label: 'PDF Reports', href: '/reports/pdf', icon: <FileBarChart className="h-3.5 w-3.5" /> },
      { label: 'Excel Export', href: '/reports/excel', icon: <Download className="h-3.5 w-3.5" /> },
    ],
  },
  {
    label: 'Settings',
    icon: <Settings className="h-4 w-4" />,
    children: [
      { label: 'Companies', href: '/settings/companies', icon: <Building2 className="h-3.5 w-3.5" /> },
      { label: 'Departments', href: '/settings/departments', icon: <Briefcase className="h-3.5 w-3.5" /> },
      { label: 'Violation Rules', href: '/settings/violations', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
      { label: 'Bonus Rules', href: '/settings/bonuses', icon: <Gift className="h-3.5 w-3.5" /> },
      { label: 'Overtime Policy', href: '/settings/overtime-policy', icon: <Clock className="h-3.5 w-3.5" /> },
      { label: 'Leave Policy', href: '/settings/leave-policy', icon: <CalendarDays className="h-3.5 w-3.5" /> },
      { label: 'App Settings', href: '/settings/app-settings', icon: <Settings className="h-3.5 w-3.5" /> },
      { label: 'Users & Permissions', href: '/settings/users', icon: <UserCheck className="h-3.5 w-3.5" /> },
    ],
  },
]

const teamLeadNavItems: NavItem[] = [
  { label: 'Team Overview', href: '/team', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'My Team', href: '/team/members', icon: <Users className="h-4 w-4" /> },
  { label: 'Team Attendance', href: '/team/attendance', icon: <Clock className="h-4 w-4" /> },
  { label: 'Overtime Approvals', href: '/overtime/pending', icon: <CheckSquare className="h-4 w-4" /> },
  { label: 'Submit Incident', href: '/hr/incidents/submit', icon: <AlertTriangle className="h-4 w-4" /> },
]

const accountantNavItems: NavItem[] = [
  { label: 'Financial Dashboard', href: '/accountant', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Monthly Payroll', href: '/payroll/monthly', icon: <DollarSign className="h-4 w-4" /> },
  { label: 'Export Excel', href: '/reports/excel', icon: <Download className="h-4 w-4" /> },
  { label: 'Export PDF', href: '/reports/pdf', icon: <FileBarChart className="h-4 w-4" /> },
]

const employeeNavItems: NavItem[] = [
  { label: 'My Dashboard', href: '/employee/home', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'My Profile', href: '/employee/profile', icon: <User className="h-4 w-4" /> },
  { label: 'My Attendance', href: '/employee/attendance', icon: <Clock className="h-4 w-4" /> },
  { label: 'My Overtime', href: '/employee/overtime', icon: <TrendingUp className="h-4 w-4" /> },
  { label: 'My Salary Slips', href: '/employee/salary', icon: <Wallet className="h-4 w-4" /> },
  { label: 'My Incidents & Bonuses', href: '/employee/incidents', icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'My Documents', href: '/employee/documents', icon: <FolderOpen className="h-4 w-4" /> },
]

const ceoNavItems: NavItem[] = [
  { label: 'Group Dashboard', href: '/management', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Company Dashboards', href: '/management/companies', icon: <Building2 className="h-4 w-4" /> },
  { label: 'Monthly PDF Reports', href: '/reports/pdf', icon: <FileBarChart className="h-4 w-4" /> },
  { label: 'Salary Overview', href: '/management/salary', icon: <DollarSign className="h-4 w-4" /> },
]

function getNavItems(roles: UserRole[]): NavItem[] {
  if (roles.includes('super_admin')) return adminNavItems
  if (roles.includes('hr_manager')) return adminNavItems.filter((item) => item.label !== 'Settings')
  if (roles.includes('ceo')) return ceoNavItems
  if (roles.includes('accountant')) return accountantNavItems
  if (roles.includes('team_lead')) return teamLeadNavItems
  return employeeNavItems
}

// ─── Nav Item Component ───────────────────────────────────────────────────────

interface NavItemProps {
  item: NavItem
  collapsed: boolean
  depth?: number
}

function NavItemComponent({ item, collapsed, depth = 0 }: NavItemProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(() => {
    if (!item.children) return false
    return item.children.some((c) => c.href && pathname.startsWith(c.href))
  })

  const isActive = item.href ? pathname === item.href : false

  if (item.children) {
    const hasActiveChild = item.children.some(
      (c) => c.href && (pathname === c.href || pathname.startsWith(c.href))
    )

    return (
      <div>
        <button
          data-demo-id={item.demoId}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
            'text-sidebar-text-muted hover:text-white hover:bg-card/10',
            hasActiveChild && 'text-white bg-card/10',
            depth > 0 && 'pl-8 py-2',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? item.label : undefined}
        >
          <span className="shrink-0">{item.icon}</span>
          {!collapsed && (
            <>
              <span className="flex-1 text-left truncate">{item.label}</span>
              {open ? (
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
              )}
            </>
          )}
        </button>
        {!collapsed && open && (
          <div className="mt-0.5 ml-2 border-l border-white/10 pl-2">
            {item.children.map((child) => (
              <NavItemComponent key={child.label} item={child} collapsed={false} depth={1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href!}
      data-demo-id={item.demoId}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
        'text-sidebar-text-muted hover:text-white hover:bg-card/10',
        isActive && 'bg-sidebar-active-bg text-sidebar-active-text font-medium',
        depth > 0 && 'pl-4 py-1.5 text-xs',
        collapsed && 'justify-center px-2'
      )}
      title={collapsed ? item.label : undefined}
    >
      <span className="shrink-0">{item.icon}</span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
}

// ─── Sidebar Component ────────────────────────────────────────────────────────

interface SidebarProps {
  isOpen: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, roles, currentCompany } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const navItems = getNavItems(roles)

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen flex flex-col shadow-sidebar',
          'bg-sidebar-bg transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
          // Mobile: slide in/out
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo / Brand */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-brand-amber flex items-center justify-center shrink-0">
                <span className="text-brand-navy font-bold text-sm">B</span>
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">
                  {currentCompany?.name_en || 'B Group'}
                </p>
                <p className="text-muted-foreground text-xs truncate">HR System</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="h-8 w-8 rounded-lg bg-brand-amber flex items-center justify-center mx-auto">
              <span className="text-brand-navy font-bold text-sm">B</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav data-demo-id="sidebar-nav" className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5 scrollbar-thin">
          {navItems.map((item) => (
            <NavItemComponent key={item.label} item={item} collapsed={collapsed} />
          ))}
        </nav>

        {/* Demo Launcher */}
        <div className="px-2 pb-1">
          <DemoLauncher collapsed={collapsed} />
        </div>

        {/* User Info + Collapse */}
        <div className="border-t border-sidebar-border p-3 shrink-0">
          {!collapsed && user && (
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="h-7 w-7 rounded-full bg-brand-amber flex items-center justify-center shrink-0">
                <span className="text-brand-navy text-xs font-bold">
                  {user.full_name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-medium truncate">{user.full_name}</p>
                <p className="text-muted-foreground text-xs truncate capitalize">
                  {roles[0]?.replace('_', ' ')}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-white hover:bg-card/10 transition-colors text-xs"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
