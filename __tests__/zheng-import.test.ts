import { describe, it, expect } from 'vitest'
import { parseImport } from '@/lib/zheng/import'

const validWrapper = {
  source: 'taiji-yijing.zheng',
  schemaVersion: 1,
  exportedAt: 1_700_000_000_000,
  recordCount: 1,
  records: [
    {
      id: '11111111-1111-4111-8111-111111111111',
      schemaVersion: 1,
      createdAt: 1_700_000_000_000,
      situation: '我想辞职创业',
      hexagramId: 3,
      hexagramName: '屯',
      fitScore: 0.72,
      verification: 'unverified',
    },
  ],
}

describe('parseImport', () => {
  it('returns ok=true for a valid taiji-yijing.zheng export', () => {
    const result = parseImport(JSON.stringify(validWrapper))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.records).toHaveLength(1)
      expect(result.data.source).toBe('taiji-yijing.zheng')
    }
  })

  it('returns ok=false when input is not valid JSON', () => {
    const result = parseImport('{not json')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toMatch(/JSON/i)
    }
  })

  it('returns ok=false when input is JSON but not an object', () => {
    const result = parseImport(JSON.stringify(['array', 'not', 'object']))
    expect(result.ok).toBe(false)
  })

  it('returns ok=false when source is wrong', () => {
    const result = parseImport(JSON.stringify({ ...validWrapper, source: 'some-other-app' }))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toMatch(/source|taiji-yijing/i)
    }
  })

  it('returns ok=false when schemaVersion is missing', () => {
    const { schemaVersion: _, ...without } = validWrapper
    void _
    const result = parseImport(JSON.stringify(without))
    expect(result.ok).toBe(false)
  })

  it('returns ok=false when schemaVersion is a future version (v2+)', () => {
    const result = parseImport(JSON.stringify({ ...validWrapper, schemaVersion: 2 }))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toMatch(/version|升级|update/i)
    }
  })

  it('returns ok=false when records contain a schema-invalid entry', () => {
    const result = parseImport(
      JSON.stringify({
        ...validWrapper,
        recordCount: 2,
        records: [
          validWrapper.records[0],
          { id: 'broken', schemaVersion: 1, garbage: true }, // missing required fields
        ],
      }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toMatch(/record|条|invalid/i)
    }
  })

  it('accepts empty records array', () => {
    const result = parseImport(JSON.stringify({ ...validWrapper, recordCount: 0, records: [] }))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.records).toEqual([])
    }
  })

  it('round-trips an exported wrapper', () => {
    const json = JSON.stringify(validWrapper)
    const result = parseImport(json)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual(validWrapper)
    }
  })
})
