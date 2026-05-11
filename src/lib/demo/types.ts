export interface JourneyStep {
  target: string
  placement: string
  story: { title: string; body: string }
  await: { type: string }
  guardrails?: { blockOtherClicks?: boolean }
}

export interface JourneyIntro {
  headline: string
  body: string
  ctaLabel: string
}

export interface JourneyOutro {
  headline: string
  body: string
  ctaLabel: string
}

export interface JourneyScript {
  id: string
  title: string
  intro: JourneyIntro
  outro: JourneyOutro
  steps: JourneyStep[]
  estimatedSeconds: number
}

export interface JourneyState {
  status: 'idle' | 'intro' | 'running' | 'paused' | 'completed' | 'skipped'
  currentStepIndex: number
  scriptId: string | null
}
