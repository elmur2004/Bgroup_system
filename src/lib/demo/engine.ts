import type { JourneyScript, JourneyState, JourneyStep } from './types'

type Subscriber = (state: JourneyState) => void

const initialState: JourneyState = {
  status: 'idle',
  currentStepIndex: 0,
  scriptId: null,
}

class JourneyEngine {
  private state: JourneyState = { ...initialState }
  private subscribers: Subscriber[] = []
  private script: JourneyScript | null = null

  getState(): JourneyState {
    return { ...this.state }
  }

  getScript(): JourneyScript | null {
    return this.script
  }

  getCurrentStep(): JourneyStep | null {
    if (!this.script || this.state.currentStepIndex >= this.script.steps.length) return null
    return this.script.steps[this.state.currentStepIndex]
  }

  subscribe(fn: Subscriber): () => void {
    this.subscribers.push(fn)
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== fn)
    }
  }

  private notify() {
    for (const fn of this.subscribers) fn(this.getState())
  }

  start(script: JourneyScript) {
    this.script = script
    this.state = { status: 'intro', currentStepIndex: 0, scriptId: script.id }
    this.notify()
  }

  confirmIntro() {
    this.state = { ...this.state, status: 'running' }
    this.notify()
  }

  pause() {
    this.state = { ...this.state, status: 'paused' }
    this.notify()
  }

  resume() {
    this.state = { ...this.state, status: 'running' }
    this.notify()
  }

  skip() {
    this.state = { ...this.state, status: 'completed' }
    this.notify()
  }

  reset() {
    this.script = null
    this.state = { ...initialState }
    this.notify()
  }

  isCompleted(_scriptId: string): boolean {
    return false
  }

  tryResume(): { scriptId: string } | null {
    return null
  }
}

export const journeyEngine = new JourneyEngine()
