/**
 * Unit tests for store-remote-mappers.
 *
 * 验证 DB row (snake_case + ISO timestamps) ↔ ConsultationRecord (camelCase + epoch ms)
 * 之间的双向 mapping。
 */

import { describe, expect, it } from 'vitest'

import {
  recordFromRow,
  recordToInsertRow,
  type ZhengRecordRow,
} from '@/lib/zheng/store-remote-mappers'
import type { ConsultationRecord, SaveRecordInput } from '@/lib/zheng/types'

const FIXED_USER_ID = '00000000-0000-4000-8000-000000000001'
const FIXED_RECORD_ID = '11111111-1111-4000-8000-000000000001'
const FIXED_CREATED_ISO = '2026-05-24T10:00:00.000Z'
const FIXED_CREATED_MS = new Date(FIXED_CREATED_ISO).getTime()

function makeRow(overrides: Partial<ZhengRecordRow> = {}): ZhengRecordRow {
  return {
    id: FIXED_RECORD_ID,
    user_id: FIXED_USER_ID,
    schema_version: 1,
    created_at: FIXED_CREATED_ISO,
    updated_at: FIXED_CREATED_ISO,
    situation: '我要不要换工作',
    hexagram_id: 3,
    hexagram_name: '屯',
    fit_score: 0.82,
    yao_location: null,
    ai_yao: null,
    consult_mode: 'classic',
    user_note: null,
    verification: 'unverified',
    verification_note: null,
    verified_at: null,
    deleted_at: null,
    ...overrides,
  }
}

describe('recordFromRow', () => {
  it('maps snake_case row to camelCase ConsultationRecord', () => {
    const row = makeRow()
    const record = recordFromRow(row)
    expect(record.id).toBe(FIXED_RECORD_ID)
    expect(record.userId).toBe(FIXED_USER_ID)
    expect(record.schemaVersion).toBe(1)
    expect(record.situation).toBe('我要不要换工作')
    expect(record.hexagramId).toBe(3)
    expect(record.hexagramName).toBe('屯')
    expect(record.fitScore).toBe(0.82)
    expect(record.consultMode).toBe('classic')
    expect(record.verification).toBe('unverified')
  })

  it('converts ISO created_at to epoch ms', () => {
    const row = makeRow({ created_at: '2026-05-24T10:00:00.000Z' })
    const record = recordFromRow(row)
    expect(record.createdAt).toBe(FIXED_CREATED_MS)
    expect(typeof record.createdAt).toBe('number')
  })

  it('uses updated_at as syncedAt (epoch ms)', () => {
    const row = makeRow({ updated_at: '2026-05-25T12:00:00.000Z' })
    const record = recordFromRow(row)
    expect(record.syncedAt).toBe(new Date('2026-05-25T12:00:00.000Z').getTime())
  })

  it('preserves yao_location jsonb verbatim', () => {
    const yao = {
      topPosition: 1 as const,
      topYaoName: '初九',
      topRatio: 0.6,
    }
    const row = makeRow({ yao_location: yao })
    const record = recordFromRow(row)
    expect(record.yaoLocation).toEqual(yao)
  })

  it('preserves ai_yao jsonb verbatim', () => {
    const ai = {
      position: 5 as const,
      name: '九五',
      brief: '飞龙在天',
      confidence: 'high' as const,
    }
    const row = makeRow({ ai_yao: ai, consult_mode: 'ai' })
    const record = recordFromRow(row)
    expect(record.aiYao).toEqual(ai)
    expect(record.consultMode).toBe('ai')
  })

  it('treats null yao_location / ai_yao as undefined', () => {
    const row = makeRow({ yao_location: null, ai_yao: null })
    const record = recordFromRow(row)
    expect(record.yaoLocation).toBeUndefined()
    expect(record.aiYao).toBeUndefined()
  })

  it('treats null user_note / verification_note as undefined', () => {
    const row = makeRow({ user_note: null, verification_note: null })
    const record = recordFromRow(row)
    expect(record.userNote).toBeUndefined()
    expect(record.verificationNote).toBeUndefined()
  })

  it('treats null consult_mode as undefined', () => {
    const row = makeRow({ consult_mode: null })
    const record = recordFromRow(row)
    expect(record.consultMode).toBeUndefined()
  })

  it('converts verified_at ISO to epoch ms when present', () => {
    const verifiedIso = '2026-06-01T08:00:00.000Z'
    const row = makeRow({ verified_at: verifiedIso, verification: 'fulfilled' })
    const record = recordFromRow(row)
    expect(record.verifiedAt).toBe(new Date(verifiedIso).getTime())
    expect(record.verification).toBe('fulfilled')
  })

  it('treats null verified_at as undefined', () => {
    const row = makeRow({ verified_at: null })
    const record = recordFromRow(row)
    expect(record.verifiedAt).toBeUndefined()
  })

  it('throws on row missing required fields', () => {
    const bad = { ...makeRow() } as Partial<ZhengRecordRow>
    delete bad.id
    expect(() => recordFromRow(bad as ZhengRecordRow)).toThrow()
  })

  it('throws on invalid verification enum', () => {
    const bad = makeRow({ verification: 'nonsense' as 'unverified' })
    expect(() => recordFromRow(bad)).toThrow()
  })
})

describe('recordToInsertRow', () => {
  function makeInput(overrides: Partial<SaveRecordInput> = {}): SaveRecordInput {
    return {
      situation: '我要不要换工作',
      hexagramId: 3,
      hexagramName: '屯',
      fitScore: 0.82,
      consultMode: 'classic',
      ...overrides,
    }
  }

  it('maps SaveRecordInput to insert-shaped row with user_id injected', () => {
    const row = recordToInsertRow(makeInput(), FIXED_USER_ID)
    expect(row.user_id).toBe(FIXED_USER_ID)
    expect(row.situation).toBe('我要不要换工作')
    expect(row.hexagram_id).toBe(3)
    expect(row.hexagram_name).toBe('屯')
    expect(row.fit_score).toBe(0.82)
    expect(row.consult_mode).toBe('classic')
  })

  it('sets schema_version = 1', () => {
    const row = recordToInsertRow(makeInput(), FIXED_USER_ID)
    expect(row.schema_version).toBe(1)
  })

  it('omits id / created_at / updated_at (let DB generate)', () => {
    const row = recordToInsertRow(makeInput(), FIXED_USER_ID)
    expect(row).not.toHaveProperty('id')
    expect(row).not.toHaveProperty('created_at')
    expect(row).not.toHaveProperty('updated_at')
  })

  it('initializes verification to unverified, verified_at to null', () => {
    const row = recordToInsertRow(makeInput(), FIXED_USER_ID)
    expect(row.verification).toBe('unverified')
    expect(row.verified_at).toBeNull()
  })

  it('converts undefined optional fields to null for jsonb columns', () => {
    const row = recordToInsertRow(
      makeInput({ yaoLocation: undefined, aiYao: undefined }),
      FIXED_USER_ID,
    )
    expect(row.yao_location).toBeNull()
    expect(row.ai_yao).toBeNull()
  })

  it('preserves yaoLocation and aiYao when present', () => {
    const yao = { topPosition: 1 as const, topYaoName: '初九', topRatio: 0.6 }
    const ai = { position: 5 as const, name: '九五', brief: 'X', confidence: 'high' as const }
    const row = recordToInsertRow(
      makeInput({ yaoLocation: yao, aiYao: ai, consultMode: 'ai' }),
      FIXED_USER_ID,
    )
    expect(row.yao_location).toEqual(yao)
    expect(row.ai_yao).toEqual(ai)
    expect(row.consult_mode).toBe('ai')
  })

  it('converts undefined consultMode to null', () => {
    const row = recordToInsertRow(makeInput({ consultMode: undefined }), FIXED_USER_ID)
    expect(row.consult_mode).toBeNull()
  })

  it('converts undefined userNote to null', () => {
    const row = recordToInsertRow(makeInput({ userNote: undefined }), FIXED_USER_ID)
    expect(row.user_note).toBeNull()
  })

  it('round-trip: insert row → recordFromRow（补 id/created_at/updated_at）→ record', () => {
    const input = makeInput({
      yaoLocation: { topPosition: 1, topYaoName: '初九', topRatio: 0.6 },
      consultMode: 'classic',
      userNote: 'my note',
    })
    const insertRow = recordToInsertRow(input, FIXED_USER_ID)
    // 模拟 DB 回写 id + created_at + updated_at
    const full: ZhengRecordRow = {
      ...insertRow,
      id: FIXED_RECORD_ID,
      created_at: FIXED_CREATED_ISO,
      updated_at: FIXED_CREATED_ISO,
    }
    const record: ConsultationRecord = recordFromRow(full)
    expect(record.id).toBe(FIXED_RECORD_ID)
    expect(record.userId).toBe(FIXED_USER_ID)
    expect(record.situation).toBe(input.situation)
    expect(record.hexagramId).toBe(input.hexagramId)
    expect(record.userNote).toBe('my note')
    expect(record.yaoLocation).toEqual(input.yaoLocation)
    expect(record.verification).toBe('unverified')
  })
})
