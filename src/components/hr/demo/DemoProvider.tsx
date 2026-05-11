'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { journeyEngine } from '@/lib/demo/engine'
import type { JourneyScript, JourneyState } from '@/lib/demo/types'
import { SpotlightLayer } from './SpotlightLayer'
import { PopoverUI } from './PopoverUI'
import { IntroModal, OutroModal, ResumeModal } from './DemoModal'

// ─── Script Registry ──────────────────────────────────────────────────────────

const scriptRegistry = new Map<string, JourneyScript>()

export function registerScript(script: JourneyScript) {
  scriptRegistry.set(script.id, script)
}

export function getRegisteredScripts(): JourneyScript[] {
  return Array.from(scriptRegistry.values())
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface DemoContextValue {
  state: JourneyState
  startJourney: (scriptId: string) => void
  pauseJourney: () => void
  resumeJourney: () => void
  skipJourney: () => void
  resetJourney: () => void
  isCompleted: (scriptId: string) => boolean
  availableJourneys: JourneyScript[]
}

const DemoContext = createContext<DemoContextValue | null>(null)

export function useDemoContext() {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemoContext must be used inside <DemoProvider>')
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<JourneyState>(journeyEngine.getState())
  const [showResume, setShowResume] = useState(false)
  const [pendingResumeId, setPendingResumeId] = useState<string | null>(null)

  // Subscribe to engine state changes
  useEffect(() => {
    const unsub = journeyEngine.subscribe((newState: JourneyState) => setState({ ...newState }))
    return unsub
  }, [])

  // Check for unfinished journeys on mount
  useEffect(() => {
    const pending = journeyEngine.tryResume()
    if (pending && scriptRegistry.has(pending.scriptId)) {
      setPendingResumeId(pending.scriptId)
      setShowResume(true)
    }
  }, [])

  const startJourney = useCallback((scriptId: string) => {
    const script = scriptRegistry.get(scriptId)
    if (!script) {
      console.warn(`[Demo] Script not found: ${scriptId}`)
      return
    }
    journeyEngine.start(script)
  }, [])

  const pauseJourney = useCallback(() => journeyEngine.pause(), [])
  const resumeJourney = useCallback(() => journeyEngine.resume(), [])
  const skipJourney = useCallback(() => journeyEngine.skip(), [])
  const resetJourney = useCallback(() => journeyEngine.reset(), [])
  const isCompleted = useCallback((id: string) => journeyEngine.isCompleted(id), [])

  const handleIntroStart = useCallback(() => journeyEngine.confirmIntro(), [])
  const handleIntroDismiss = useCallback(() => journeyEngine.reset(), [])

  const handleOutroFinish = useCallback(() => journeyEngine.reset(), [])

  const handleResumeResume = useCallback(() => {
    setShowResume(false)
    if (pendingResumeId) {
      const script = scriptRegistry.get(pendingResumeId)
      if (script) {
        journeyEngine.start(script)
        // Skip intro and go straight to running
        journeyEngine.confirmIntro()
      }
    }
  }, [pendingResumeId])

  const handleResumeRestart = useCallback(() => {
    setShowResume(false)
    if (pendingResumeId) startJourney(pendingResumeId)
  }, [pendingResumeId, startJourney])

  const handleResumeDismiss = useCallback(() => {
    setShowResume(false)
    setPendingResumeId(null)
  }, [])

  const script = journeyEngine.getScript()
  const currentStep = journeyEngine.getCurrentStep()

  const contextValue = useMemo<DemoContextValue>(
    () => ({
      state,
      startJourney,
      pauseJourney,
      resumeJourney,
      skipJourney,
      resetJourney,
      isCompleted,
      availableJourneys: getRegisteredScripts(),
    }),
    [state, startJourney, pauseJourney, resumeJourney, skipJourney, resetJourney, isCompleted]
  )

  return (
    <DemoContext.Provider value={contextValue}>
      {children}

      {/* Resume modal for unfinished journeys */}
      <ResumeModal
        visible={showResume}
        onResume={handleResumeResume}
        onRestart={handleResumeRestart}
        onDismiss={handleResumeDismiss}
      />

      {/* Intro modal */}
      {script && (
        <IntroModal
          visible={state.status === 'intro'}
          headline={script.intro.headline}
          body={script.intro.body}
          ctaLabel={script.intro.ctaLabel}
          estimatedSeconds={script.estimatedSeconds}
          onStart={handleIntroStart}
          onDismiss={handleIntroDismiss}
        />
      )}

      {/* Spotlight + Popover during running state */}
      <SpotlightLayer
        targetSelector={currentStep?.target ?? null}
        blockClicks={currentStep?.guardrails?.blockOtherClicks ?? true}
        visible={state.status === 'running' && !!currentStep}
        onOverlayClick={() => {}}
      />

      {currentStep && script && (
        <PopoverUI
          targetSelector={currentStep.target}
          placement={currentStep.placement as 'top' | 'right' | 'bottom' | 'left' | 'auto'}
          title={currentStep.story.title}
          body={currentStep.story.body}
          stepNumber={state.currentStepIndex + 1}
          totalSteps={script.steps.length}
          onSkip={skipJourney}
          onPause={pauseJourney}
          visible={state.status === 'running'}
          awaitType={currentStep.await.type}
        />
      )}

      {/* Outro modal */}
      {script && (
        <OutroModal
          visible={state.status === 'completed'}
          headline={script.outro.headline}
          body={script.outro.body}
          ctaLabel={script.outro.ctaLabel}
          onFinish={handleOutroFinish}
        />
      )}
    </DemoContext.Provider>
  )
}
