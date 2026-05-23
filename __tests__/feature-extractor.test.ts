import { describe, it, expect } from 'vitest'
import { extractFeatures } from '@/lib/feature-extractor'

describe('extractFeatures', () => {
  describe('archetype extraction', () => {
    it('detects creating archetype from 创业', () => {
      const result = extractFeatures('我想创业，做自己的产品')
      expect(result.features.archetype).toBe('creating')
    })

    it('detects transforming archetype from 转型', () => {
      const result = extractFeatures('公司需要转型，从线下到线上')
      expect(result.features.archetype).toBe('transforming')
    })

    it('detects retreating archetype from 辞职', () => {
      const result = extractFeatures('我想辞职，离开这个公司')
      expect(result.features.archetype).toBe('retreating')
    })

    it('detects conflicting archetype from 冲突', () => {
      const result = extractFeatures('和合伙人发生了冲突，分歧很大')
      expect(result.features.archetype).toBe('conflicting')
    })
  })

  describe('phase extraction', () => {
    it('detects germinal phase from 还没开始', () => {
      const result = extractFeatures('项目还没开始，只是在计划中')
      expect(result.features.phase).toBe('germinal')
    })

    it('detects developing phase from 进行中', () => {
      const result = extractFeatures('项目进行中，已经做了三个月')
      expect(result.features.phase).toBe('developing')
    })
  })

  describe('scale extraction', () => {
    it('detects personal scale', () => {
      const result = extractFeatures('我自己一个人面对这个问题')
      expect(result.features.scale).toBe('personal')
    })

    it('detects organizational scale', () => {
      const result = extractFeatures('公司层面需要做战略调整')
      expect(result.features.scale).toBe('organizational')
    })
  })

  describe('risk extraction', () => {
    it('detects high risk', () => {
      const result = extractFeatures('这是一个重大决定，赌上了一切')
      expect(result.features.risk).toBe('high')
    })

    it('detects existential risk', () => {
      const result = extractFeatures('如果失败就破产了，生死存亡')
      expect(result.features.risk).toBe('existential')
    })
  })

  describe('keyword extraction', () => {
    it('extracts keywords from input', () => {
      const result = extractFeatures('我想创业，但是风险很高，是个重大决定')
      expect(result.keywords.length).toBeGreaterThan(0)
      expect(result.keywords).toContain('创业')
    })

    it('returns empty keywords for irrelevant text', () => {
      const result = extractFeatures('今天天气真好')
      expect(result.keywords).toHaveLength(0)
    })
  })

  describe('partial extraction', () => {
    it('only fills dimensions it can detect', () => {
      const result = extractFeatures('我想创业')
      expect(result.features.archetype).toBe('creating')
      expect(Object.keys(result.features).length).toBeGreaterThanOrEqual(1)
    })

    it('returns empty features for unrecognizable input', () => {
      const result = extractFeatures('啊啊啊啊啊')
      expect(Object.keys(result.features)).toHaveLength(0)
      expect(result.keywords).toHaveLength(0)
    })
  })
})
