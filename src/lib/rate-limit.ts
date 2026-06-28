// Simple in-memory rate limiter for API routes
// For production, use Redis (Upstash) — this works for single-instance Vercel functions

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

export function rateLimit(params: {
  key: string
  limit: number
  windowMs: number
}): { allowed: boolean; remaining: number; resetAt: number } {
  cleanupExpired()
  const now = Date.now()
  const entry = store.get(params.key)

  if (!entry || now > entry.resetAt) {
    const newEntry = { count: 1, resetAt: now + params.windowMs }
    store.set(params.key, newEntry)
    return { allowed: true, remaining: params.limit - 1, resetAt: newEntry.resetAt }
  }

  if (entry.count >= params.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: params.limit - entry.count, resetAt: entry.resetAt }
}

// Clean up expired entries lazily during each call instead of via setInterval
function cleanupExpired() {
  if (store.size > 100) {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) store.delete(key)
    }
  }
}
