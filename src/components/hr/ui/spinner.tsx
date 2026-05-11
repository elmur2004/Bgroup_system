import { cn } from '@/lib/hr/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
}

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-border border-t-brand-navy',
          sizeMap[size]
        )}
        role="status"
        aria-label={label || 'Loading...'}
      />
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  )
}
