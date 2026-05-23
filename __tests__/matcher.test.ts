import { describe, it, expect } from 'vitest'
import { matchHexagrams } from '@/lib/matcher'

describe('matchHexagrams', () => {
  describe('basic matching', () => {
    it('returns top N results', () => {
      const response = matchHexagrams({ situation: '我想创业，从零开始做一个新产品' }, 3)
      expect(response.matches).toHaveLength(3)
    })

    it('results are sorted by total score descending', () => {
      const response = matchHexagrams({ situation: '我想创业，刚开始筹备' })
      const scores = response.matches.map((m) => m.score.total)
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeLessThanOrEqual(scores[i - 1])
      }
    })

    it('each match has valid score fields', () => {
      const response = matchHexagrams({ situation: '团队冲突很严重' })
      for (const match of response.matches) {
        expect(match.score.total).toBeGreaterThanOrEqual(0)
        expect(match.score.total).toBeLessThanOrEqual(1)
        expect(match.score.keyword).toBeGreaterThanOrEqual(0)
        expect(match.score.feature).toBeGreaterThanOrEqual(0)
        expect(match.score.theme).toBeGreaterThanOrEqual(0)
      }
    })

    it('each match has reasoning array', () => {
      const response = matchHexagrams({ situation: '创业初期很艰难' })
      for (const match of response.matches) {
        expect(Array.isArray(match.reasoning)).toBe(true)
        expect(match.reasoning.length).toBeGreaterThan(0)
      }
    })
  })

  describe('feature extraction integration', () => {
    it('extracts features and returns them', () => {
      const response = matchHexagrams({ situation: '我在公司当领导，想主动推进变革' })
      expect(response.extractedFeatures).toBeDefined()
      expect(response.extractedKeywords.length).toBeGreaterThan(0)
    })

    it('accepts pre-specified features', () => {
      const response = matchHexagrams({
        situation: '不确定下一步怎么走',
        features: { archetype: 'waiting', phase: 'germinal' },
      })
      expect(response.extractedFeatures.archetype).toBe('waiting')
      expect(response.extractedFeatures.phase).toBe('germinal')
    })
  })

  describe('scoring correctness', () => {
    it('qian (乾) ranks high for creating + leading scenarios', () => {
      const response = matchHexagrams({
        situation: '我要创业当老板，主动出击做大事，全力以赴',
      })
      const top3Numbers = response.matches.map((m) => m.hexagram.number)
      expect(top3Numbers).toContain(1)
    })

    it('zhun (屯) ranks high for creating + emerging + difficulty', () => {
      const response = matchHexagrams({
        situation: '创业初期非常艰难，刚开始什么都不顺利',
      })
      const top3Numbers = response.matches.map((m) => m.hexagram.number)
      expect(top3Numbers).toContain(3)
    })
  })

  describe('determinism', () => {
    it('same input produces same output', () => {
      const input = { situation: '我想辞职创业但是很犹豫' }
      const r1 = matchHexagrams(input)
      const r2 = matchHexagrams(input)
      expect(r1.matches.map((m) => m.hexagram.number)).toEqual(
        r2.matches.map((m) => m.hexagram.number),
      )
      expect(r1.matches.map((m) => m.score.total)).toEqual(r2.matches.map((m) => m.score.total))
    })
  })
})
