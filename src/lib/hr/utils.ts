import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Date Helpers ────────────────────────────────────────────────────────────

export function formatDate(date: string | Date, fmt = 'dd MMM yyyy'): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, fmt)
  } catch {
    return String(date)
  }
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'dd MMM yyyy, HH:mm')
}

export function formatTimeAgo(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return String(date)
  }
}

export function formatMonthYear(month: number, year: number): string {
  const date = new Date(year, month - 1, 1)
  return format(date, 'MMMM yyyy')
}

// ─── Number Helpers ──────────────────────────────────────────────────────────

export function formatCurrency(
  amount: number,
  currency: string = 'EGP',
  locale: string = 'en-EG'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-EG').format(value)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

// ─── String Helpers ──────────────────────────────────────────────────────────

export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ')
}

export function getInitials(name: string): string {
  if (!name) return '??'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function truncate(str: string, length: number): string {
  if (!str) return ''
  if (str.length <= length) return str
  return str.slice(0, length) + '…'
}

// ─── Status Helpers ──────────────────────────────────────────────────────────

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'success',
    present: 'success',
    approved: 'success',
    paid: 'success',
    locked: 'info',
    calculated: 'info',
    pending: 'warning',
    late: 'warning',
    probation: 'warning',
    on_leave: 'info',
    half_day: 'info',
    draft: 'default',
    open: 'warning',
    resolved: 'success',
    closed: 'default',
    denied: 'danger',
    absent: 'danger',
    terminated: 'danger',
    suspended: 'danger',
    cancelled: 'danger',
  }
  return map[status] || 'default'
}

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

export function getStatusBadgeVariant(status: string): BadgeVariant {
  return getStatusColor(status) as BadgeVariant
}

// ─── Array Helpers ───────────────────────────────────────────────────────────

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce(
    (groups, item) => {
      const groupKey = String(item[key])
      return {
        ...groups,
        [groupKey]: [...(groups[groupKey] || []), item],
      }
    },
    {} as Record<string, T[]>
  )
}

export function sumBy<T>(array: T[], key: keyof T): number {
  return array.reduce((sum, item) => sum + (Number(item[key]) || 0), 0)
}

// ─── URL Helpers ─────────────────────────────────────────────────────────────

export function buildQueryString(params: Record<string, unknown>): string {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      qs.append(key, String(value))
    }
  })
  const str = qs.toString()
  return str ? `?${str}` : ''
}

// ─── File Helpers ────────────────────────────────────────────────────────────

export function getFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}
