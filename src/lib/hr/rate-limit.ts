// ─── In-Memory Rate Limiter ──────────────────────────────────

interface RateLimitEntry {
  attempts: number
  firstAttempt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function startCleanup(windowMs: number) {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of Array.from(rateLimitStore.entries())) {
      if (now - entry.firstAttempt > windowMs) {
        rateLimitStore.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)
  // Allow the process to exit without waiting for this timer
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref()
  }
}

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetIn: number } {
  startCleanup(windowMs)

  const now = Date.now()
  const entry = rateLimitStore.get(key)

  // No existing entry or window expired — reset
  if (!entry || now - entry.firstAttempt > windowMs) {
    rateLimitStore.set(key, { attempts: 1, firstAttempt: now })
    return { allowed: true, remaining: maxAttempts - 1, resetIn: windowMs }
  }

  const resetIn = windowMs - (now - entry.firstAttempt)

  if (entry.attempts >= maxAttempts) {
    return { allowed: false, remaining: 0, resetIn }
  }

  entry.attempts++
  return { allowed: true, remaining: maxAttempts - entry.attempts, resetIn }
}
