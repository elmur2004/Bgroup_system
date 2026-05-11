import React from 'react'
import { Spinner } from '@/components/hr/ui/spinner'
import { cn } from '@/lib/hr/utils'

interface LoadingSpinnerProps {
  fullPage?: boolean
  label?: string
  className?: string
}

export function LoadingSpinner({ fullPage = false, label, className }: LoadingSpinnerProps) {
  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm z-50">
        <Spinner size="lg" label={label || 'Loading...'} />
      </div>
    )
  }

  return (
    <div className={cn('flex items-center justify-center py-16', className)}>
      <Spinner size="lg" label={label} />
    </div>
  )
}
