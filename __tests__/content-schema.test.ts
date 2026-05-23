import { describe, it, expect } from 'vitest'
import { ALL_HEXAGRAMS } from '@/content/hexagrams'

describe('Hexagram content schema validation', () => {
  it('ALL_HEXAGRAMS is not empty', () => {
    expect(ALL_HEXAGRAMS.length).toBeGreaterThan(0)
  })

  for (const hex of ALL_HEXAGRAMS) {
    describe(`${hex.number}. ${hex.name.chinese} (${hex.name.pinyin})`, () => {
      it('has valid number (1-64)', () => {
        expect(hex.number).toBeGreaterThanOrEqual(1)
        expect(hex.number).toBeLessThanOrEqual(64)
      })

      it('has complete name fields', () => {
        expect(hex.name.chinese).toBeTruthy()
        expect(hex.name.pinyin).toBeTruthy()
        expect(hex.name.english).toBeTruthy()
      })

      it('has trigrams', () => {
        expect(hex.trigrams.upper).toBeTruthy()
        expect(hex.trigrams.lower).toBeTruthy()
      })

      it('has valid 6-char binary', () => {
        expect(hex.binary).toMatch(/^[01]{6}$/)
      })

      it('has judgment with text and modernReading', () => {
        expect(hex.judgment.text).toBeTruthy()
        expect(hex.judgment.modernReading).toBeTruthy()
      })

      it('has image with text and modernReading', () => {
        expect(hex.image.text).toBeTruthy()
        expect(hex.image.modernReading).toBeTruthy()
      })

      it('has all situation dimensions', () => {
        expect(hex.features.archetype).toBeTruthy()
        expect(hex.features.phase).toBeTruthy()
        expect(hex.features.scale).toBeTruthy()
        expect(hex.features.power).toBeTruthy()
        expect(hex.features.agency).toBeTruthy()
        expect(hex.features.risk).toBeTruthy()
      })

      it('has keywords (at least 3)', () => {
        expect(hex.keywords.length).toBeGreaterThanOrEqual(3)
      })

      it('has themes (at least 2)', () => {
        expect(hex.themes.length).toBeGreaterThanOrEqual(2)
      })

      it('has appliesWhen (at least 2)', () => {
        expect(hex.appliesWhen.length).toBeGreaterThanOrEqual(2)
      })

      it('has antiPatterns (at least 1)', () => {
        expect(hex.antiPatterns.length).toBeGreaterThanOrEqual(1)
      })

      it('has exactly 6 yao', () => {
        expect(hex.yao).toHaveLength(6)
      })

      it('each yao has required fields', () => {
        for (const y of hex.yao) {
          expect(y.position).toBeGreaterThanOrEqual(1)
          expect(y.position).toBeLessThanOrEqual(6)
          expect(y.name).toBeTruthy()
          expect(y.text).toBeTruthy()
          expect(y.modernReading).toBeTruthy()
          expect(y.scenario).toBeTruthy()
          expect(y.actionable.length).toBeGreaterThan(0)
          expect(y.indicators.length).toBeGreaterThan(0)
        }
      })

      it('has cross-cultural parallels', () => {
        const p = hex.parallels
        const hasAny =
          (p.westernPhilosophy && p.westernPhilosophy.length > 0) ||
          (p.modernCases && p.modernCases.length > 0) ||
          (p.literature && p.literature.length > 0)
        expect(hasAny).toBe(true)
      })
    })
  }
})
