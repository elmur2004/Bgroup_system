import type { JourneyScript, JourneyState, JourneyStep } from './types'

type Listener = (state: JourneyState) => void
type Cleanup = () => void

const STORAGE_PREFIX = 'demo:'
const TARGET_WAIT_MS = 3000
const TARGET_POLL_MS = 200

function freshState(scriptId: string): JourneyState {
  return {
    status: 'idle',
    scriptId,
    currentStepIndex: 0,
    completedStepIds: [],
    startedAt: null,
    lastInteractionAt: null,
  }
}

export class JourneyEngine {
  private script: JourneyScript | null = null
  private state: JourneyState = freshState('')
  private listeners: Set<Listener> = new Set()
  private cleanups: Cleanup[] = []
  private observer: MutationObserver | null = null

  // ─── Public API ───────────────────────────────────────────

  getState(): JourneyState {
    return { ...this.state }
  }

  getScript(): JourneyScript | null {
    return this.script
  }

  getCurrentStep(): JourneyStep | null {
    if (!this.script || this.state.status !== 'running') return null
    return this.script.steps[this.state.currentStepIndex] ?? null
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  start(script: JourneyScript) {
    this.cleanup()
    this.script = script
    this.state = freshState(script.id)
    this.state.status = 'intro'
    this.state.startedAt = Date.now()
    this.persist()
    this.notify()
  }

  confirmIntro() {
    if (this.state.status !== 'intro') return
    this.state.status = 'running'
    this.state.lastInteractionAt = Date.now()
    this.persist()
    this.notify()
    this.enterStep(0)
  }

  skip() {
    this.cleanup()
    this.state.status = 'skipped'
    this.persist()
    this.notify()
  }

  pause() {
    if (this.state.status !== 'running') return
    this.cleanupListeners()
    this.state.status = 'paused'
    this.persist()
    this.notify()
  }

  resume() {
    if (this.state.status !== 'paused' || !this.script) return
    this.state.status = 'running'
    this.persist()
    this.notify()
    this.enterStep(this.state.currentStepIndex)
  }

  reset() {
    this.cleanup()
    this.state = freshState('')
    this.script = null
    this.notify()
  }

  // Resume from localStorage if an unfinished journey exists
  tryResume(): { scriptId: string; stepIndex: number } | null {
    if (typeof window === 'undefined') return null
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(STORAGE_PREFIX) || key.endsWith(':completed')) continue
      try {
        const saved: JourneyState = JSON.parse(localStorage.getItem(key)!)
        if (saved.status === 'running' || saved.status === 'paused') {
          return { scriptId: saved.scriptId!, stepIndex: saved.currentStepIndex }
        }
      } catch { /* ignore corrupt entries */ }
    }
    return null
  }

  isCompleted(scriptId: string): boolean {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(`${STORAGE_PREFIX}${scriptId}:completed`) === 'true'
  }

  // ─── Internal ─────────────────────────────────────────────

  private enterStep(index: number) {
    if (!this.script) return
    const step = this.script.steps[index]
    if (!step) return this.complete()

    this.cleanupListeners()
    this.state.currentStepIndex = index
    this.state.lastInteractionAt = Date.now()
    this.persist()

    step.onEnter?.()

    // Wait for target element to appear in DOM
    this.waitForTarget(step.target, (el) => {
      if (this.state.status !== 'running') return
      this.notify() // re-render with found element
      this.attachAwaitListener(step, () => this.advance())
    })

    this.notify()
  }

  private waitForTarget(selector: string, callback: (el: Element) => void) {
    const el = document.querySelector(selector)
    if (el) {
      callback(el)
      return
    }

    // Poll + MutationObserver hybrid for lazy-rendered elements
    const deadline = Date.now() + TARGET_WAIT_MS
    const poll = setInterval(() => {
      const found = document.querySelector(selector)
      if (found) {
        clearInterval(poll)
        this.observer?.disconnect()
        callback(found)
      } else if (Date.now() > deadline) {
        clearInterval(poll)
        this.observer?.disconnect()
        // Target missing — skip ahead
        console.warn(`[Demo] Target not found: ${selector} — skipping step`)
        this.advance()
      }
    }, TARGET_POLL_MS)

    this.cleanups.push(() => clearInterval(poll))
  }

  private attachAwaitListener(step: JourneyStep, done: () => void) {
    const c = step.await

    switch (c.type) {
      case 'click': {
        const handler = () => done()
        const el = document.querySelector(c.selector)
        el?.addEventListener('click', handler, { once: true })
        this.cleanups.push(() => el?.removeEventListener('click', handler))
        break
      }
      case 'input': {
        const handler = (e: Event) => {
          const v = (e.target as HTMLInputElement).value
          if (c.equals ? v === c.equals : v.length >= (c.minLength ?? 1)) done()
        }
        const el = document.querySelector(c.selector)
        el?.addEventListener('input', handler)
        this.cleanups.push(() => el?.removeEventListener('input', handler))
        break
      }
      case 'submit': {
        const handler = (e: Event) => {
          e.preventDefault()
          done()
        }
        const el = document.querySelector(c.selector)
        el?.addEventListener('submit', handler, { once: true })
        this.cleanups.push(() => el?.removeEventListener('submit', handler))
        break
      }
      case 'navigation': {
        const regex = new RegExp(c.urlMatches)
        const check = () => {
          if (regex.test(window.location.pathname)) {
            done()
            return true
          }
          return false
        }
        if (check()) break

        // Use popstate + interval for SPA navigation
        const interval = setInterval(() => {
          if (check()) clearInterval(interval)
        }, 300)
        this.cleanups.push(() => clearInterval(interval))
        break
      }
      case 'custom': {
        const handler = () => done()
        window.addEventListener(c.eventName, handler, { once: true })
        this.cleanups.push(() => window.removeEventListener(c.eventName, handler))
        break
      }
      case 'auto': {
        const timer = setTimeout(done, c.delayMs)
        this.cleanups.push(() => clearTimeout(timer))
        break
      }
    }
  }

  private advance() {
    if (!this.script) return
    const step = this.script.steps[this.state.currentStepIndex]
    if (step) {
      step.onExit?.()
      this.state.completedStepIds.push(step.id)
    }
    const next = this.state.currentStepIndex + 1
    if (next >= this.script.steps.length) {
      this.complete()
    } else {
      this.enterStep(next)
    }
  }

  private complete() {
    this.cleanup()
    this.state.status = 'completed'
    if (this.state.scriptId) {
      localStorage.setItem(`${STORAGE_PREFIX}${this.state.scriptId}:completed`, 'true')
    }
    this.persist()
    this.notify()
  }

  private persist() {
    if (typeof window === 'undefined' || !this.state.scriptId) return
    localStorage.setItem(
      `${STORAGE_PREFIX}${this.state.scriptId}`,
      JSON.stringify(this.state)
    )
  }

  private cleanupListeners() {
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
    this.observer?.disconnect()
    this.observer = null
  }

  private cleanup() {
    this.cleanupListeners()
    const step = this.getCurrentStep()
    step?.onExit?.()
  }

  private notify() {
    const snapshot = this.getState()
    this.listeners.forEach((fn) => fn(snapshot))
  }
}

// Singleton
export const journeyEngine = new JourneyEngine()
