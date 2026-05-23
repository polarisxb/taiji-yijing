import { describe, it, expect } from 'vitest'
import { findHexagramByNumber, findHexagramById, getPhaseYaoIndex } from '@/lib/hexagram-utils'

describe('findHexagramByNumber', () => {
  it('finds qian by number 1', () => {
    const hex = findHexagramByNumber(1)
    expect(hex).toBeDefined()
    expect(hex!.name.chinese).toBe('乾')
  })

  it('returns undefined for non-existent number', () => {
    expect(findHexagramByNumber(99)).toBeUndefined()
  })
})

describe('findHexagramById', () => {
  it('finds hexagram by string id "1"', () => {
    const hex = findHexagramById('1')
    expect(hex).toBeDefined()
    expect(hex!.number).toBe(1)
  })

  it('finds hexagram by string id "01"', () => {
    const hex = findHexagramById('01')
    expect(hex).toBeDefined()
    expect(hex!.number).toBe(1)
  })

  it('returns undefined for invalid id', () => {
    expect(findHexagramById('abc')).toBeUndefined()
  })
})

describe('getPhaseYaoIndex', () => {
  it('maps germinal to yao index 0 (初爻)', () => {
    expect(getPhaseYaoIndex('germinal')).toBe(0)
  })

  it('maps emerging to yao index 1', () => {
    expect(getPhaseYaoIndex('emerging')).toBe(1)
  })

  it('maps developing to yao index 2', () => {
    expect(getPhaseYaoIndex('developing')).toBe(2)
  })

  it('maps peak to yao index 3', () => {
    expect(getPhaseYaoIndex('peak')).toBe(3)
  })

  it('maps declining to yao index 4', () => {
    expect(getPhaseYaoIndex('declining')).toBe(4)
  })

  it('maps ending to yao index 5', () => {
    expect(getPhaseYaoIndex('ending')).toBe(5)
  })

  it('returns undefined for unknown phase', () => {
    expect(getPhaseYaoIndex(undefined)).toBeUndefined()
  })
})
