// ─── Journey Script Schema ────────────────────────────────────────────────────

export interface JourneyScript {
  id: string
  module: string
  title: string
  estimatedSeconds: number
  intro: {
    headline: string
    body: string
    ctaLabel: string
  }
  outro: {
    headline: string
    body: string
    ctaLabel: string
  }
  steps: JourneyStep[]
}

export interface JourneyStep {
  id: string
  target: string // CSS selector or data-demo-id
  placement?: 'top' | 'right' | 'bottom' | 'left' | 'auto'
  story: {
    title: string
    body: string
  }
  await: AwaitCondition
  onEnter?: () => void
  onExit?: () => void
  allowSkip?: boolean
  guardrails?: {
    blockOtherClicks?: boolean
    showHandPointer?: boolean
  }
}

export type AwaitCondition =
  | { type: 'click'; selector: string }
  | { type: 'input'; selector: string; minLength?: number; equals?: string }
  | { type: 'submit'; selector: string }
  | { type: 'navigation'; urlMatches: string }
  | { type: 'custom'; eventName: string }
  | { type: 'auto'; delayMs: number }

// ─── Engine State ─────────────────────────────────────────────────────────────

export interface JourneyState {
  status: 'idle' | 'intro' | 'running' | 'paused' | 'completed' | 'skipped'
  scriptId: string | null
  currentStepIndex: number
  completedStepIds: string[]
  startedAt: number | null
  lastInteractionAt: number | null
}

export type JourneyEvent =
  | { type: 'START'; scriptId: string }
  | { type: 'CTA_CLICK' }
  | { type: 'AWAIT_SATISFIED' }
  | { type: 'SKIP' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'COMPLETE' }
  | { type: 'RESET' }
