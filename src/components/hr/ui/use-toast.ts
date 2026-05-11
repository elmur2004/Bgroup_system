'use client'

import * as React from 'react'

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 5000

type ToastVariant = 'default' | 'success' | 'warning' | 'destructive'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

type ToastAction =
  | { type: 'ADD_TOAST'; toast: Toast }
  | { type: 'DISMISS_TOAST'; id: string }
  | { type: 'REMOVE_TOAST'; id: string }

interface State {
  toasts: Toast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

function reducer(state: State, action: ToastAction): State {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }
    case 'DISMISS_TOAST': {
      const { id } = action
      if (toastTimeouts.has(id)) return state
      const timeout = setTimeout(() => {
        dispatch({ type: 'REMOVE_TOAST', id })
      }, TOAST_REMOVE_DELAY)
      toastTimeouts.set(id, timeout)
      return state
    }
    case 'REMOVE_TOAST':
      toastTimeouts.delete(action.id)
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      }
    default:
      return state
  }
}

let listeners: Array<(state: State) => void> = []
let memoryState: State = { toasts: [] }

function dispatch(action: ToastAction) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

let idCounter = 0
function generateId() {
  idCounter = (idCounter + 1) % Number.MAX_SAFE_INTEGER
  return String(idCounter)
}

export function toast(opts: Omit<Toast, 'id'>) {
  const id = generateId()
  const duration = opts.duration ?? TOAST_REMOVE_DELAY

  dispatch({ type: 'ADD_TOAST', toast: { ...opts, id } })

  // Auto-dismiss
  setTimeout(() => {
    dispatch({ type: 'DISMISS_TOAST', id })
  }, duration)

  return {
    id,
    dismiss: () => dispatch({ type: 'DISMISS_TOAST', id }),
  }
}

// Convenience helpers
toast.success = (title: string, description?: string) =>
  toast({ title, description, variant: 'success' })

toast.error = (title: string, description?: string) =>
  toast({ title, description, variant: 'destructive' })

toast.warning = (title: string, description?: string) =>
  toast({ title, description, variant: 'warning' })

export function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      listeners = listeners.filter((l) => l !== setState)
    }
  }, [])

  return {
    toasts: state.toasts,
    toast,
    dismiss: (id: string) => dispatch({ type: 'REMOVE_TOAST', id }),
  }
}
