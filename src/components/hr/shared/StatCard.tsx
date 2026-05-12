import React from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Minus, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/hr/utils'
import { Card } from '@/components/hr/ui/card'
import { Skeleton } from '@/components/hr/ui/skeleton'

interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  icon?: React.ReactNode
  trend?: number // positive = up, negative = down
  trendLabel?: string
  color?: 'navy' | 'amber' | 'emerald' | 'red' | 'blue'
  loading?: boolean
  className?: string
  compact?: boolean
  /**
   * Optional deep-link to the data the card summarises. When set, the card
   * renders as a Link with hover affordance — every dashboard stat is now
   * a one-click jump to its source.
   */
  href?: string
}

const colorMap = {
  navy: {
    bg: 'bg-brand-navy/10',
    text: 'text-brand-navy',
    icon: 'text-brand-navy',
  },
  amber: {
    bg: 'bg-amber-100',
    text: 'text-amber-600',
    icon: 'text-amber-600',
  },
  emerald: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-600',
    icon: 'text-emerald-600',
  },
  red: {
    bg: 'bg-red-100',
    text: 'text-red-600',
    icon: 'text-red-600',
  },
  blue: {
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    icon: 'text-blue-600',
  },
}

export function StatCard({
  label,
  value,
  subtext,
  icon,
  trend,
  trendLabel,
  color = 'navy',
  loading = false,
  className,
  compact = false,
  href,
}: StatCardProps) {
  const colors = colorMap[color]

  if (loading) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-24 mb-2" />
        <Skeleton className="h-3 w-20" />
      </Card>
    )
  }

  // Inner content reused for both Link and div wrapper. Pulled out so we don't
  // duplicate 30 lines just to swap the outer element.
  const inner = (
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground truncate flex items-center gap-1">
          {label}
          {href && (
            <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </p>
        <p className={cn('mt-2 font-bold text-foreground', compact ? 'text-xl' : 'text-3xl')}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {subtext && (
          <p className="mt-1 text-xs text-muted-foreground truncate">{subtext}</p>
        )}
          {trend !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              {trend > 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              ) : trend < 0 ? (
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              ) : (
                <Minus className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span
                className={cn(
                  'text-xs font-medium',
                  trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-600' : 'text-muted-foreground'
                )}
              >
                {trend > 0 ? '+' : ''}{trend}%
              </span>
              {trendLabel && (
                <span className="text-xs text-muted-foreground">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ml-4', colors.bg)}>
            <span className={colors.icon}>{icon}</span>
          </div>
        )}
      </div>
  )

  if (href) {
    return (
      <Link href={href} className="group block">
        <Card className={cn('p-6 hover:shadow-card-hover hover:border-primary/40 transition-all cursor-pointer', className)}>
          {inner}
        </Card>
      </Link>
    )
  }

  return (
    <Card className={cn('p-6 hover:shadow-card-hover transition-shadow', className)}>
      {inner}
    </Card>
  )
}
