'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { X } from 'lucide-react'

interface PopoverUIProps {
  targetSelector: string | null
  placement?: 'top' | 'right' | 'bottom' | 'left' | 'auto'
  title: string
  body: string
  stepNumber: number
  totalSteps: number
  onSkip: () => void
  onPause: () => void
  visible: boolean
  awaitType: string
}

const OFFSET = 16
const POPOVER_MAX_W = 360

export function PopoverUI({
  targetSelector,
  placement = 'auto',
  title,
  body,
  stepNumber,
  totalSteps,
  onSkip,
  onPause,
  visible,
  awaitType,
}: PopoverUIProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; actualPlacement: string } | null>(null)

  const computePosition = useCallback(() => {
    if (!targetSelector) return
    const target = document.querySelector(targetSelector)
    const popover = popoverRef.current
    if (!target || !popover) return

    const tRect = target.getBoundingClientRect()
    const pRect = popover.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Determine best placement
    let chosen = placement
    if (chosen === 'auto') {
      const spaceAbove = tRect.top
      const spaceBelow = vh - tRect.bottom
      const spaceLeft = tRect.left
      const spaceRight = vw - tRect.right

      if (spaceBelow >= pRect.height + OFFSET) chosen = 'bottom'
      else if (spaceAbove >= pRect.height + OFFSET) chosen = 'top'
      else if (spaceRight >= pRect.width + OFFSET) chosen = 'right'
      else if (spaceLeft >= pRect.width + OFFSET) chosen = 'left'
      else chosen = 'bottom' // fallback
    }

    let top = 0
    let left = 0

    switch (chosen) {
      case 'bottom':
        top = tRect.bottom + OFFSET
        left = tRect.left + tRect.width / 2 - pRect.width / 2
        break
      case 'top':
        top = tRect.top - pRect.height - OFFSET
        left = tRect.left + tRect.width / 2 - pRect.width / 2
        break
      case 'right':
        top = tRect.top + tRect.height / 2 - pRect.height / 2
        left = tRect.right + OFFSET
        break
      case 'left':
        top = tRect.top + tRect.height / 2 - pRect.height / 2
        left = tRect.left - pRect.width - OFFSET
        break
    }

    // Clamp to viewport
    left = Math.max(12, Math.min(left, vw - pRect.width - 12))
    top = Math.max(12, Math.min(top, vh - pRect.height - 12))

    setPos({ top, left, actualPlacement: chosen })
  }, [targetSelector, placement])

  useEffect(() => {
    if (!visible) return
    // Wait for next frame to get correct measurements
    const raf = requestAnimationFrame(() => computePosition())
    window.addEventListener('scroll', computePosition, true)
    window.addEventListener('resize', computePosition)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', computePosition, true)
      window.removeEventListener('resize', computePosition)
    }
  }, [visible, computePosition, targetSelector])

  // Focus trap: keep focus inside popover
  useEffect(() => {
    if (!visible) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onPause()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [visible, onPause])

  const hintText = getHintText(awaitType)

  if (!visible) return null

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-live="polite"
      aria-label={title}
      className="fixed z-[10000] animate-popover-enter"
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        maxWidth: POPOVER_MAX_W,
        width: 'max-content',
        opacity: pos ? 1 : 0,
      }}
    >
      <div className="bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            Step {stepNumber} of {totalSteps}
          </span>
          <button
            onClick={onPause}
            className="text-muted-foreground hover:text-muted-foreground transition-colors p-0.5"
            aria-label="Close tour"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 pb-2">
          <h3 className="font-semibold text-foreground text-sm mb-1">{title}</h3>
          <p
            className="text-muted-foreground text-xs leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatBody(body) }}
          />
        </div>

        {/* Hint */}
        {hintText && (
          <div className="px-4 pb-2">
            <p className="text-xs text-amber-700 italic">{hintText}</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 pb-3 flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-xs text-muted-foreground hover:text-muted-foreground transition-colors"
          >
            Skip tour
          </button>
          <button
            onClick={onPause}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Pause
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes popover-enter {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-popover-enter {
          animation: popover-enter 150ms ease-out;
        }
      `}</style>
    </div>
  )
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function formatBody(body: string): string {
  // Sanitize first, then convert **bold** to <strong>
  const escaped = escapeHtml(body)
  return escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

function getHintText(awaitType: string): string {
  switch (awaitType) {
    case 'click':
      return 'Click the highlighted element to continue'
    case 'input':
      return 'Type in the highlighted field to continue'
    case 'submit':
      return 'Submit the form to continue'
    case 'navigation':
      return 'Navigate to continue'
    case 'auto':
      return 'Continuing automatically...'
    default:
      return ''
  }
}
