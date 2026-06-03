type RateLimitEntry = {
  count: number
  resetAt: number
}

export type RateLimitOptions = {
  limit: number
  windowMs: number
  now?: number
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfterMs: number
}

const store = new Map<string, RateLimitEntry>()

export function resetRateLimitStore(): void {
  store.clear()
}

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = options.now ?? Date.now()
  const limit = Math.max(1, Math.floor(options.limit))
  const windowMs = Math.max(1, Math.floor(options.windowMs))
  const current = store.get(key)

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt, retryAfterMs: 0 }
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
      retryAfterMs: current.resetAt - now,
    }
  }

  current.count += 1
  return {
    allowed: true,
    remaining: limit - current.count,
    resetAt: current.resetAt,
    retryAfterMs: 0,
  }
}
