import { describe, it, expect } from 'vitest'
import { confidenceToScore, confidenceLabel, getConfidenceBadge } from '@/lib/zheng/confidence'

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

describe('getConfidenceBadge', () => {
  it('returns label matching confidenceLabel for each level (DRY guard)', () => {
    expect(getConfidenceBadge('high').label).toBe(confidenceLabel('high'))
    expect(getConfidenceBadge('medium').label).toBe(confidenceLabel('medium'))
    expect(getConfidenceBadge('low').label).toBe(confidenceLabel('low'))
  })

  it('returns a non-empty tailwind colorClass for each level', () => {
    for (const c of ['high', 'medium', 'low'] as const) {
      const badge = getConfidenceBadge(c)
      expect(typeof badge.colorClass).toBe('string')
      expect(badge.colorClass.length).toBeGreaterThan(0)
    }
  })

  it('uses warm 暖纸/暖棕/暖金 palette for high (义理派定见)', () => {
    // 高确信走暖色调（与冷墨经典模式区分开）
    const cls = getConfidenceBadge('high').colorClass
    expect(cls).toContain('#f5f0e8') // 暖纸底
    expect(cls).toContain('#7a6e5d') // 暖棕字
    expect(cls).toContain('#c4b99a') // 暖金边
  })

  it('uses amber palette for medium (待审)', () => {
    const cls = getConfidenceBadge('medium').colorClass
    expect(cls).toMatch(/amber/)
  })

  it('uses rose palette for low (审慎)', () => {
    const cls = getConfidenceBadge('low').colorClass
    expect(cls).toMatch(/rose/)
  })

  it('produces distinct colorClass for each level (no accidental aliasing)', () => {
    const high = getConfidenceBadge('high').colorClass
    const medium = getConfidenceBadge('medium').colorClass
    const low = getConfidenceBadge('low').colorClass
    expect(new Set([high, medium, low]).size).toBe(3)
  })
})
