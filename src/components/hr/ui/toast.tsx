'use client'

import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/hr/utils'
import { useToast, toast } from './use-toast'

export { useToast, toast }

const ToastProvider = ToastPrimitive.Provider
const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      'fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm',
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitive.Viewport.displayName

type ToastVariant = 'default' | 'success' | 'warning' | 'destructive'

const variantStyles: Record<ToastVariant, string> = {
  default: 'bg-card border-border text-foreground',
  success: 'bg-card border-emerald-300 text-foreground',
  warning: 'bg-card border-amber-300 text-foreground',
  destructive: 'bg-card border-red-300 text-foreground',
}

const variantIcons: Record<ToastVariant, React.ReactNode> = {
  default: <Info className="h-4 w-4 text-blue-500" />,
  success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  destructive: <AlertCircle className="h-4 w-4 text-red-500" />,
}

interface ToastItemProps {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  action?: { label: string; onClick: () => void }
  onDismiss: (id: string) => void
}

function ToastItem({ id, title, description, variant = 'default', action, onDismiss }: ToastItemProps) {
  return (
    <ToastPrimitive.Root
      open={true}
      onOpenChange={(open) => {
        if (!open) onDismiss(id)
      }}
      className={cn(
        'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border p-4 shadow-lg',
        'transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
        'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[swipe=end]:animate-out data-[state=closed]:fade-out-80',
        'data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full',
        variantStyles[variant]
      )}
    >
      <div className="mt-0.5 shrink-0">{variantIcons[variant]}</div>
      <div className="flex-1 min-w-0">
        {title && (
          <ToastPrimitive.Title className="text-sm font-semibold leading-tight">
            {title}
          </ToastPrimitive.Title>
        )}
        {description && (
          <ToastPrimitive.Description className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {description}
          </ToastPrimitive.Description>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className="mt-2 text-xs font-medium text-brand-navy hover:underline"
          >
            {action.label}
          </button>
        )}
      </div>
      <ToastPrimitive.Close
        onClick={() => onDismiss(id)}
        className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-muted-foreground transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  )
}

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          id={t.id}
          title={t.title}
          description={t.description}
          variant={t.variant}
          action={t.action}
          onDismiss={dismiss}
        />
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
