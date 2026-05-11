'use client'

import React, { useEffect, useState, useCallback } from 'react'

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

interface SpotlightLayerProps {
  targetSelector: string | null
  blockClicks?: boolean
  visible: boolean
  onOverlayClick?: () => void
}

const PADDING = 8
const BORDER_RADIUS = 12

export function SpotlightLayer({
  targetSelector,
  blockClicks = true,
  visible,
  onOverlayClick,
}: SpotlightLayerProps) {
  const [rect, setRect] = useState<Rect | null>(null)

  const measure = useCallback(() => {
    if (!targetSelector) {
      setRect(null)
      return
    }
    const el = document.querySelector(targetSelector)
    if (!el) {
      setRect(null)
      return
    }
    const r = el.getBoundingClientRect()
    setRect({
      top: r.top - PADDING,
      left: r.left - PADDING,
      width: r.width + PADDING * 2,
      height: r.height + PADDING * 2,
    })
  }, [targetSelector])

  useEffect(() => {
    if (!visible) return
    measure()

    // Re-measure on scroll, resize, and DOM mutations
    const handleReposition = () => measure()
    window.addEventListener('scroll', handleReposition, true)
    window.addEventListener('resize', handleReposition)

    const observer = new MutationObserver(handleReposition)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    })

    return () => {
      window.removeEventListener('scroll', handleReposition, true)
      window.removeEventListener('resize', handleReposition)
      observer.disconnect()
    }
  }, [visible, measure])

  if (!visible) return null

  const clipPath = rect
    ? `polygon(
        0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
        ${rect.left}px ${rect.top}px,
        ${rect.left}px ${rect.top + rect.height}px,
        ${rect.left + rect.width}px ${rect.top + rect.height}px,
        ${rect.left + rect.width}px ${rect.top}px,
        ${rect.left}px ${rect.top}px
      )`
    : undefined

  return (
    <>
      {/* Dark overlay with hole */}
      <div
        className="fixed inset-0 z-[9998] transition-opacity duration-200"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          clipPath,
          pointerEvents: blockClicks ? 'auto' : 'none',
        }}
        onClick={(e) => {
          e.stopPropagation()
          onOverlayClick?.()
        }}
      />

      {/* Highlight ring around target */}
      {rect && (
        <div
          className="fixed z-[9999] pointer-events-none animate-pulse-ring"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            borderRadius: BORDER_RADIUS,
            boxShadow: '0 0 0 3px rgba(251, 191, 36, 0.6), 0 0 20px rgba(251, 191, 36, 0.3)',
            transition: 'all 200ms ease-out',
          }}
        />
      )}

      <style jsx global>{`
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.6), 0 0 20px rgba(251, 191, 36, 0.3); }
          50% { box-shadow: 0 0 0 5px rgba(251, 191, 36, 0.4), 0 0 30px rgba(251, 191, 36, 0.2); }
        }
        .animate-pulse-ring {
          animation: pulse-ring 1.5s ease-in-out infinite;
        }
      `}</style>
    </>
  )
}
