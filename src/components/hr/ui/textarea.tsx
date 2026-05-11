import * as React from 'react'
import { cn } from '@/lib/hr/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground',
            'placeholder:text-muted-foreground resize-y',
            'focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-transparent',
            'disabled:cursor-not-allowed disabled:bg-muted/50 disabled:text-muted-foreground',
            'transition-colors',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
