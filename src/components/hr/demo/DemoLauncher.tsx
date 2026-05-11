'use client'

import React, { useState } from 'react'
import { Compass, ChevronRight, CheckCircle2, Clock } from 'lucide-react'
import { useDemoContext } from './DemoProvider'
import { cn } from '@/lib/hr/utils'

export function DemoLauncher({ collapsed }: { collapsed?: boolean }) {
  const { startJourney, isCompleted, availableJourneys, state } = useDemoContext()
  const [open, setOpen] = useState(false)

  // Don't show launcher while a journey is active
  if (state.status !== 'idle' && state.status !== 'completed' && state.status !== 'skipped') {
    return null
  }

  if (collapsed) {
    return (
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-center px-2 py-2.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-card/10 transition-colors"
        title="Interactive Demo"
      >
        <Compass className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
          'text-amber-400 hover:text-amber-300 hover:bg-card/10',
          open && 'bg-card/10 text-amber-300'
        )}
      >
        <Compass className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Interactive Demo</span>
        <ChevronRight
          className={cn(
            'h-3.5 w-3.5 transition-transform duration-200',
            open && 'rotate-90'
          )}
        />
      </button>

      {open && (
        <div className="mt-1 ml-2 border-l border-white/10 pl-2 space-y-0.5">
          {availableJourneys.map((script) => {
            const done = isCompleted(script.id)
            const minutes = Math.ceil(script.estimatedSeconds / 60)
            return (
              <button
                key={script.id}
                onClick={() => {
                  setOpen(false)
                  startJourney(script.id)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-muted-foreground/60 hover:text-white hover:bg-card/10"
              >
                {done ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                ) : (
                  <Compass className="h-3 w-3 text-amber-400 shrink-0" />
                )}
                <span className="flex-1 text-left truncate">{script.title}</span>
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  {minutes}m
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
