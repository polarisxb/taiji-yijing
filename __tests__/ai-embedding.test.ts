import { describe, it, expect } from 'vitest'
import { cosineSimilarity, buildHexagramSummary } from '@/lib/ai/embedding'
import { qian } from '@/content/hexagrams'

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = [1, 2, 3]
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5)
  })

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 5)
  })
})

describe('buildHexagramSummary', () => {
  it('builds summary string for a hexagram', () => {
    const summary = buildHexagramSummary(qian)
    expect(summary).toContain('乾')
    expect(summary).toContain(qian.judgment.modernReading)
    expect(summary.length).toBeGreaterThan(50)
  })
})
