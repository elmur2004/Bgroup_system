'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/partners/auth-compat';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Users, UserCheck, Handshake, FileText, Receipt,
  DollarSign, Briefcase, Bell, Settings, LogOut, Shield, ClipboardList,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const partnerNav = [
  { href: '/partners/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/partners/leads', label: 'Leads', icon: Users },
  { href: '/partners/clients', label: 'Clients', icon: UserCheck },
  { href: '/partners/deals', label: 'Deals', icon: Handshake },
  { href: '/partners/contracts', label: 'Contracts', icon: FileText },
  { href: '/partners/invoices', label: 'Invoices', icon: Receipt },
  { href: '/partners/commissions', label: 'Commissions', icon: DollarSign },
  { href: '/partners/services', label: 'Services', icon: Briefcase },
];

const adminNav = [
  { href: '/partners/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/partners/admin/partners', label: 'Partners', icon: Users },
  { href: '/partners/admin/contracts', label: 'Contracts', icon: FileText },
  { href: '/partners/admin/invoices', label: 'Invoices', icon: Receipt },
  { href: '/partners/admin/commissions', label: 'Commissions', icon: DollarSign },
  { href: '/partners/services', label: 'Services', icon: Briefcase },
  { href: '/partners/admin/audit-logs', label: 'Audit Logs', icon: ClipboardList },
];

const bottomNav = [
  { href: '/partners/notifications', label: 'Notifications', icon: Bell },
  { href: '/partners/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const nav = user?.role === 'ADMIN' ? adminNav : partnerNav;

  const isActive = (href: string) =>
    pathname === href || (href !== '/partners/dashboard' && pathname.startsWith(href));

  return (
    <aside className={clsx(
      'bg-card border-r border-border flex flex-col h-screen sticky top-0 transition-all duration-300',
      collapsed ? 'w-[72px]' : 'w-64'
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border/60">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">PP</span>
            </div>
            <span className="font-bold text-foreground">Partners Portal</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={clsx('p-1.5 rounded-lg text-muted-foreground hover:text-muted-foreground hover:bg-muted transition-colors', collapsed && 'mx-auto')}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* User section */}
      <div className={clsx('px-3 py-4 border-b border-border/60', collapsed && 'px-2')}>
        <div className={clsx('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-semibold">{user?.name?.charAt(0) || 'U'}</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {user?.role === 'ADMIN' && <Shield className="w-3 h-3 text-violet-500" />}
                <span className="text-xs text-muted-foreground">{user?.role === 'ADMIN' ? 'Administrator' : 'Partner'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              collapsed && 'justify-center px-2',
              isActive(item.href)
                ? 'bg-blue-50 text-blue-700'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className={clsx('w-5 h-5 shrink-0', isActive(item.href) ? 'text-blue-600' : 'text-muted-foreground')} />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-border/60 py-3 px-2 space-y-0.5">
        {bottomNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              collapsed && 'justify-center px-2',
              isActive(item.href)
                ? 'bg-blue-50 text-blue-700'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className={clsx('w-5 h-5 shrink-0', isActive(item.href) ? 'text-blue-600' : 'text-muted-foreground')} />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
        <button
          onClick={logout}
          className={clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-all duration-150',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
