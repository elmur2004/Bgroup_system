import React from 'react'
import { FileSearch } from 'lucide-react'
import { cn } from '@/lib/hr/utils'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  title = 'No data found',
  description = 'No records match your current criteria.',
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        className
      )}
    >
      <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
        {icon || <FileSearch className="h-7 w-7 text-muted-foreground" />}
      </div>
      <p className="text-foreground font-medium text-base">{title}</p>
      <p className="mt-1 text-muted-foreground text-sm max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
