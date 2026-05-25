import { describe, it, expect } from 'vitest'
import { exportToJson, exportFilename } from '@/lib/zheng/export'
import type { ConsultationRecord } from '@/lib/zheng/types'

function record(overrides: Partial<ConsultationRecord> = {}): ConsultationRecord {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    schemaVersion: 1,
    createdAt: 1_700_000_000_000,
    situation: '我想辞职创业',
    hexagramId: 3,
    hexagramName: '屯',
    fitScore: 0.72,
    verification: 'unverified',
    ...overrides,
  }
}

describe('exportToJson', () => {
  it('wraps records with source/schemaVersion/exportedAt/recordCount metadata', () => {
    const records = [record({ id: 'a-id' }), record({ id: 'b-id' })]
    const before = Date.now()
    const out = exportToJson(records)
    const after = Date.now()

    expect(out.source).toBe('taiji-yijing.zheng')
    expect(out.schemaVersion).toBe(1)
    expect(out.exportedAt).toBeGreaterThanOrEqual(before)
    expect(out.exportedAt).toBeLessThanOrEqual(after)
    expect(out.recordCount).toBe(2)
    expect(out.records).toEqual(records)
  })

  it('produces a valid wrapper for an empty record list', () => {
    const out = exportToJson([])
    expect(out.source).toBe('taiji-yijing.zheng')
    expect(out.schemaVersion).toBe(1)
    expect(out.recordCount).toBe(0)
    expect(out.records).toEqual([])
  })

  it('preserves record order (no sorting)', () => {
    // Use the same id pattern but different createdAt to verify
    // exportToJson does not reorder.
    const a = record({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', createdAt: 100 })
    const b = record({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', createdAt: 200 })
    const c = record({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', createdAt: 50 })

    const out = exportToJson([a, b, c])
    expect(out.records.map((r) => r.id)).toEqual([a.id, b.id, c.id])
  })

  it('JSON.stringify round-trips losslessly', () => {
    const records = [record({ userNote: '本周内做决定' }), record({ verification: 'fulfilled' })]
    const out = exportToJson(records)
    const json = JSON.stringify(out)
    const parsed = JSON.parse(json)
    expect(parsed).toEqual(out)
  })
})

describe('exportFilename', () => {
  const FIXED = new Date(2026, 4, 24).getTime()

  it('defaults to taiji-yijing-zheng-YYYY-MM-DD.json (no source suffix)', () => {
    expect(exportFilename(FIXED)).toBe('taiji-yijing-zheng-2026-05-24.json')
  })

  it('adds LOCAL suffix when source="local"', () => {
    expect(exportFilename(FIXED, { source: 'local' })).toBe(
      'taiji-yijing-zheng-LOCAL-2026-05-24.json',
    )
  })

  it('adds CLOUD suffix when source="cloud"', () => {
    expect(exportFilename(FIXED, { source: 'cloud' })).toBe(
      'taiji-yijing-zheng-CLOUD-2026-05-24.json',
    )
  })
})
