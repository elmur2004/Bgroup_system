'use client'

import React from 'react'
import { Play, RotateCcw, X, PartyPopper, Clock } from 'lucide-react'

interface IntroModalProps {
  headline: string
  body: string
  ctaLabel: string
  estimatedSeconds: number
  onStart: () => void
  onDismiss: () => void
  visible: boolean
}

export function IntroModal({
  headline,
  body,
  ctaLabel,
  estimatedSeconds,
  onStart,
  onDismiss,
  visible,
}: IntroModalProps) {
  if (!visible) return null

  const minutes = Math.ceil(estimatedSeconds / 60)

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onDismiss} />
      <div className="relative bg-card rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-modal-enter">
        {/* Accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-amber-400 to-amber-600" />

        <div className="p-6">
          {/* Close */}
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 text-muted-foreground hover:text-muted-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Icon */}
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
            <Play className="h-6 w-6 text-amber-600" />
          </div>

          <h2 className="text-xl font-bold text-foreground mb-2">{headline}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">{body}</p>

          {/* Duration estimate */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
            <Clock className="h-3.5 w-3.5" />
            <span>About {minutes} {minutes === 1 ? 'minute' : 'minutes'}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onStart}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
            >
              {ctaLabel}
            </button>
            <button
              onClick={onDismiss}
              className="px-4 py-2.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes modal-enter {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-enter {
          animation: modal-enter 200ms ease-out;
        }
      `}</style>
    </div>
  )
}

// ─── Outro Modal ──────────────────────────────────────────────────────────────

interface OutroModalProps {
  headline: string
  body: string
  ctaLabel: string
  onFinish: () => void
  visible: boolean
}

export function OutroModal({
  headline,
  body,
  ctaLabel,
  onFinish,
  visible,
}: OutroModalProps) {
  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-card rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-modal-enter">
        <div className="h-1.5 bg-gradient-to-r from-green-400 to-emerald-600" />

        <div className="p-6 text-center">
          <div className="h-14 w-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <PartyPopper className="h-7 w-7 text-green-600" />
          </div>

          <h2 className="text-xl font-bold text-foreground mb-2">{headline}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">{body}</p>

          <button
            onClick={onFinish}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-8 rounded-lg transition-colors text-sm"
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Resume Modal ─────────────────────────────────────────────────────────────

interface ResumeModalProps {
  onResume: () => void
  onRestart: () => void
  onDismiss: () => void
  visible: boolean
}

export function ResumeModal({ onResume, onRestart, onDismiss, visible }: ResumeModalProps) {
  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onDismiss} />
      <div className="relative bg-card rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden animate-modal-enter">
        <div className="h-1.5 bg-gradient-to-r from-blue-400 to-indigo-600" />

        <div className="p-6">
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 text-muted-foreground hover:text-muted-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
            <RotateCcw className="h-5 w-5 text-blue-600" />
          </div>

          <h2 className="text-lg font-bold text-foreground mb-2">Continue your tour?</h2>
          <p className="text-muted-foreground text-sm mb-5">
            You have an unfinished guided tour. Would you like to pick up where you left off?
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={onResume}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
            >
              Resume tour
            </button>
            <button
              onClick={onRestart}
              className="w-full border border-border hover:bg-muted/50 text-foreground font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
            >
              Start over
            </button>
            <button
              onClick={onDismiss}
              className="w-full text-muted-foreground hover:text-muted-foreground py-2 text-sm transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
