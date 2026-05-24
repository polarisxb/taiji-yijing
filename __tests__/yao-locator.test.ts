import { describe, it, expect } from 'vitest'
import { scoreYao, CROSS_YAO_RATIO_THRESHOLD, CROSS_YAO_MIN_SECOND_RATIO } from '@/lib/yao-locator'
import type { Yao } from '@/lib/types'

// Minimal yao fixture: 6 positions, each with a distinct set of indicators.
// Use distinct strings so each indicator unambiguously belongs to one yao.
function makeYao(): Yao[] {
  return [
    {
      position: 1,
      name: '初九',
      text: '潜龙勿用',
      modernReading: '潜伏期',
      scenario: '场景1',
      actionable: ['a1'],
      indicators: ['1-a', '1-b', '1-c'],
    },
    {
      position: 2,
      name: '九二',
      text: '见龙在田',
      modernReading: '初现',
      scenario: '场景2',
      actionable: ['a2'],
      indicators: ['2-a', '2-b', '2-c', '2-d', '2-e'],
    },
    {
      position: 3,
      name: '九三',
      text: '终日乾乾',
      modernReading: '过渡',
      scenario: '场景3',
      actionable: ['a3'],
      indicators: ['3-a', '3-b', '3-c', '3-d'],
    },
    {
      position: 4,
      name: '九四',
      text: '或跃在渊',
      modernReading: '抉择',
      scenario: '场景4',
      actionable: ['a4'],
      indicators: ['4-a', '4-b', '4-c'],
    },
    {
      position: 5,
      name: '九五',
      text: '飞龙在天',
      modernReading: '顶峰',
      scenario: '场景5',
      actionable: ['a5'],
      indicators: ['5-a', '5-b', '5-c', '5-d'],
    },
    {
      position: 6,
      name: '上九',
      text: '亢龙有悔',
      modernReading: '终局',
      scenario: '场景6',
      actionable: ['a6'],
      indicators: ['6-a', '6-b', '6-c'],
    },
  ]
}

describe('scoreYao — basic', () => {
  it('returns 6 scores sorted by position ascending', () => {
    const result = scoreYao(makeYao(), new Set())
    expect(result.scores.length).toBe(6)
    expect(result.scores.map((s) => s.position)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('single yao fully checked → that yao wins with ratio 1', () => {
    const yao = makeYao()
    const selected = new Set(['3-a', '3-b', '3-c', '3-d'])
    const result = scoreYao(yao, selected)
    expect(result.topPosition).toBe(3)
    expect(result.topRatio).toBe(1)
    const s3 = result.scores.find((s) => s.position === 3)!
    expect(s3.hits).toBe(4)
    expect(s3.total).toBe(4)
    expect(s3.ratio).toBe(1)
    // Other yao all at 0
    for (const s of result.scores) {
      if (s.position !== 3) {
        expect(s.hits).toBe(0)
        expect(s.ratio).toBe(0)
      }
    }
  })
})

describe('scoreYao — ratio fairness (not raw count)', () => {
  it('a fully-checked small yao beats a partially-checked large yao', () => {
    const yao = makeYao()
    // Yao 4 has 3 indicators, all checked → ratio 1.0, hits 3
    // Yao 2 has 5 indicators, 3 checked → ratio 0.6, hits 3
    const selected = new Set(['4-a', '4-b', '4-c', '2-a', '2-b', '2-c'])
    const result = scoreYao(yao, selected)
    expect(result.topPosition).toBe(4)
    expect(result.topRatio).toBe(1)
  })
})

describe('scoreYao — tiebreak by higher position', () => {
  it('exact tie in ratio → higher position wins', () => {
    const yao = makeYao()
    // Yao 1 (3 indicators) → check all → 1.0
    // Yao 6 (3 indicators) → check all → 1.0
    const selected = new Set(['1-a', '1-b', '1-c', '6-a', '6-b', '6-c'])
    const result = scoreYao(yao, selected)
    expect(result.topPosition).toBe(6)
    expect(result.topRatio).toBe(1)
  })
})

describe('scoreYao — cross-yao detection', () => {
  it('triggers when second ratio is ≥ top×0.8 AND ≥ 0.3', () => {
    // Make top = 4/4 = 1.0, second = 3/4 = 0.75? Need second ≥ top × 0.8 = 0.8
    // Try top=5/5=1.0, second=4/5=0.8 (≥0.8, ≥0.3) → triggers
    // Use yao 5 (4 inds) and yao 3 (4 inds): top 4/4=1.0, second 3/4=0.75 (<0.8) → no
    // So use yao 2 (5 inds, all): top=1.0, yao 5 (4 inds, all but one): 3/4=0.75... still <0.8
    // Easier: yao 2 (5) all checked = 1.0, yao 3 (4) all checked = 1.0 → tie, position 3 wins, second is yao 2 at 1.0 → 1.0 ≥ 1.0×0.8=0.8 AND ≥0.3 → triggers
    const yao = makeYao()
    const selected = new Set(['2-a', '2-b', '2-c', '2-d', '2-e', '3-a', '3-b', '3-c', '3-d'])
    const result = scoreYao(yao, selected)
    expect(result.topPosition).toBe(3) // tiebreak by higher position
    expect(result.crossYao).not.toBe(false)
    if (result.crossYao) {
      expect(result.crossYao.secondPosition).toBe(2)
      expect(result.crossYao.secondRatio).toBe(1)
      expect(result.crossYao.narrative).toContain('九二')
    }
  })

  it('does NOT trigger when both ratios are very low (second < 0.3)', () => {
    const yao = makeYao()
    // Pick 1 from yao 2 (1/5=0.2) and 1 from yao 5 (1/4=0.25). Top=0.25, second=0.2.
    // second/top = 0.2/0.25 = 0.8 ≥ 0.8 ✓, but second=0.2 < 0.3 → NOT triggered.
    const selected = new Set(['2-a', '5-a'])
    const result = scoreYao(yao, selected)
    expect(result.crossYao).toBe(false)
  })

  it('does NOT trigger when second ratio is well below top×0.8', () => {
    const yao = makeYao()
    // Yao 5 all checked (4/4=1.0), yao 3 only 1 checked (1/4=0.25).
    // 0.25 / 1.0 = 0.25 < 0.8 → no trigger.
    const selected = new Set(['5-a', '5-b', '5-c', '5-d', '3-a'])
    const result = scoreYao(yao, selected)
    expect(result.topPosition).toBe(5)
    expect(result.crossYao).toBe(false)
  })

  it('threshold constants are exported and have expected values', () => {
    expect(CROSS_YAO_RATIO_THRESHOLD).toBe(0.8)
    expect(CROSS_YAO_MIN_SECOND_RATIO).toBe(0.3)
  })
})

describe('scoreYao — edge cases', () => {
  it('empty selection → all ratios 0, topPosition 1, no cross-yao', () => {
    const result = scoreYao(makeYao(), new Set())
    expect(result.topRatio).toBe(0)
    expect(result.topPosition).toBe(1)
    expect(result.crossYao).toBe(false)
    for (const s of result.scores) {
      expect(s.hits).toBe(0)
      expect(s.ratio).toBe(0)
    }
  })

  it('selection containing strings that match no indicator → all ratios 0', () => {
    const result = scoreYao(makeYao(), new Set(['nonexistent-1', 'nonexistent-2']))
    expect(result.topRatio).toBe(0)
    expect(result.crossYao).toBe(false)
  })

  it('is deterministic: same logical input → same output regardless of Set insertion order', () => {
    const yao = makeYao()
    const a = new Set<string>()
    a.add('2-a')
    a.add('5-c')
    a.add('3-b')
    const b = new Set<string>()
    b.add('3-b')
    b.add('5-c')
    b.add('2-a')
    const ra = scoreYao(yao, a)
    const rb = scoreYao(yao, b)
    expect(ra).toEqual(rb)
  })

  it('handles a yao whose indicators contain duplicates (defensive)', () => {
    const yao = makeYao()
    // Mutate yao 1's indicators to contain a duplicate
    yao[0] = { ...yao[0], indicators: ['1-a', '1-a', '1-b'] }
    // Selecting both unique indicators → hits 2, total 2 (dedup), ratio 1
    const result = scoreYao(yao, new Set(['1-a', '1-b']))
    const s1 = result.scores.find((s) => s.position === 1)!
    expect(s1.total).toBe(2)
    expect(s1.hits).toBe(2)
    expect(s1.ratio).toBe(1)
  })

  it('yao with empty indicators array → ratio 0, no division by zero', () => {
    const yao = makeYao()
    yao[2] = { ...yao[2], indicators: [] }
    const result = scoreYao(yao, new Set(['2-a']))
    const s3 = result.scores.find((s) => s.position === 3)!
    expect(s3.total).toBe(0)
    expect(s3.hits).toBe(0)
    expect(s3.ratio).toBe(0)
    expect(Number.isFinite(s3.ratio)).toBe(true)
  })
})
