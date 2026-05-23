import { describe, it, expect } from 'vitest'
import { situationFeaturesSchema, cotJudgmentSchema, yaoPositioningSchema } from '@/lib/ai/schemas'

describe('situationFeaturesSchema', () => {
  it('parses valid features', () => {
    const result = situationFeaturesSchema.safeParse({
      archetype: 'creating',
      phase: 'germinal',
      scale: 'personal',
      power: 'disadvantaged',
      agency: 'active',
      risk: 'moderate',
    })
    expect(result.success).toBe(true)
  })

  it('allows partial features', () => {
    const result = situationFeaturesSchema.safeParse({
      phase: 'emerging',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid enum values', () => {
    const result = situationFeaturesSchema.safeParse({
      phase: 'nonexistent',
    })
    expect(result.success).toBe(false)
  })
})

describe('cotJudgmentSchema', () => {
  it('parses valid judgment', () => {
    const result = cotJudgmentSchema.safeParse({
      selectedNumber: 3,
      reasoning: '用户处于创业初期...',
      confidence: 'high',
      runners: [1, 2],
    })
    expect(result.success).toBe(true)
  })
})

describe('yaoPositioningSchema', () => {
  it('parses valid positioning', () => {
    const result = yaoPositioningSchema.safeParse({
      yaoPosition: 4,
      confidence: 'medium',
      brief: '你正处于寻求合作的阶段',
    })
    expect(result.success).toBe(true)
  })

  it('rejects yaoPosition out of range', () => {
    const result = yaoPositioningSchema.safeParse({
      yaoPosition: 7,
      confidence: 'high',
      brief: 'test',
    })
    expect(result.success).toBe(false)
  })
})
