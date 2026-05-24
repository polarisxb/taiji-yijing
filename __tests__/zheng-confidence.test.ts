import { describe, it, expect } from 'vitest'
import { confidenceToScore, confidenceLabel } from '@/lib/zheng/confidence'

describe('confidenceToScore', () => {
  it('maps high → 0.9', () => {
    expect(confidenceToScore('high')).toBe(0.9)
  })

  it('maps medium → 0.65', () => {
    expect(confidenceToScore('medium')).toBe(0.65)
  })

  it('maps low → 0.4', () => {
    expect(confidenceToScore('low')).toBe(0.4)
  })

  it('produces scores within the [0, 1] range required by the schema', () => {
    for (const c of ['high', 'medium', 'low'] as const) {
      const s = confidenceToScore(c)
      expect(s).toBeGreaterThanOrEqual(0)
      expect(s).toBeLessThanOrEqual(1)
    }
  })
})

describe('confidenceLabel', () => {
  it('returns 义理派 labels (定见 / 待审 / 审慎)', () => {
    expect(confidenceLabel('high')).toBe('定见')
    expect(confidenceLabel('medium')).toBe('待审')
    expect(confidenceLabel('low')).toBe('审慎')
  })
})
