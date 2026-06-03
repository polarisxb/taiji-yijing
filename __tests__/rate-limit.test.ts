import { beforeEach, describe, expect, it } from 'vitest'

import { checkRateLimit, resetRateLimitStore } from '@/lib/rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetRateLimitStore()
  })

  it('allows requests up to the limit within a fixed window', () => {
    const options = { limit: 2, windowMs: 1000, now: 100 }

    expect(checkRateLimit('client-a', options).allowed).toBe(true)
    expect(checkRateLimit('client-a', options).allowed).toBe(true)
    expect(checkRateLimit('client-a', options).allowed).toBe(false)
  })

  it('opens a fresh window after the reset time', () => {
    expect(checkRateLimit('client-a', { limit: 1, windowMs: 1000, now: 100 }).allowed).toBe(true)
    expect(checkRateLimit('client-a', { limit: 1, windowMs: 1000, now: 200 }).allowed).toBe(false)
    expect(checkRateLimit('client-a', { limit: 1, windowMs: 1000, now: 1101 }).allowed).toBe(true)
  })
})
