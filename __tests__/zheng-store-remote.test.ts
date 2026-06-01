/**
 * Unit tests for remoteZhengStore.
 *
 * 用 mock Supabase client 测试 CRUD + 错误处理 + importRecords。
 * 真实 Supabase 实例的 E2E 验证在 PR 描述里的手动测试段。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { makeRemoteZhengStore } from '@/lib/zheng/store-remote'
import type { ZhengRecordRow } from '@/lib/zheng/store-remote-mappers'
import type { ConsultationRecord, SaveRecordInput } from '@/lib/zheng/types'

const USER_ID = '00000000-0000-4000-8000-000000000001'
const ID_1 = '11111111-1111-4000-8000-000000000001'

function makeRow(overrides: Partial<ZhengRecordRow> = {}): ZhengRecordRow {
  return {
    id: ID_1,
    user_id: USER_ID,
    schema_version: 1,
    created_at: '2026-05-24T10:00:00.000Z',
    updated_at: '2026-05-24T10:00:00.000Z',
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

/**
 * 构造一个轻量 mock query builder。
 * 每次调用 `from('zheng_records')` 都返回一个新的 builder 实例，
 * 这样多次操作互不影响。
 */
function createMockSupabase(responses: Record<string, { data: unknown; error: unknown }>) {
  const callLog: Array<{ table: string; method: string; args: unknown[] }> = []
  let pendingKey = 'default'

  function builder(table: string) {
    const b: Record<string, unknown> = {}
    const chainables = [
      'select',
      'insert',
      'update',
      'delete',
      'upsert',
      'eq',
      'is',
      'order',
      'limit',
      'in',
    ]
    chainables.forEach((m) => {
      b[m] = vi.fn((...args: unknown[]) => {
        callLog.push({ table, method: m, args })
        // 关键方法用来切换 response key
        if (m === 'insert') pendingKey = 'insert'
        else if (m === 'update') pendingKey = 'update'
        else if (m === 'delete') pendingKey = 'delete'
        else if (m === 'upsert') pendingKey = 'upsert'
        else if (m === 'select' && pendingKey === 'default') pendingKey = 'select'
        return b
      })
    })
    const terminal = () =>
      Promise.resolve(responses[pendingKey] ?? responses.default ?? { data: null, error: null })
    b.then = (onFulfilled: (v: { data: unknown; error: unknown }) => unknown) =>
      terminal().then(onFulfilled)
    b.maybeSingle = vi.fn(() => terminal())
    b.single = vi.fn(() => terminal())
    return b
  }

  return {
    from: vi.fn((table: string) => builder(table)),
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { user: { id: USER_ID } } },
        error: null,
      })),
    },
    __callLog: callLog,
  }
}

function makeStoreWithMock(responses: Record<string, { data: unknown; error: unknown }>) {
  const supabase = createMockSupabase(responses)
  const store = makeRemoteZhengStore({
    getSupabase: () => supabase as never,
    getUserId: () => USER_ID,
  })
  return { store, supabase }
}

describe('remoteZhengStore.listRecords', () => {
  it('returns mapped records on success', async () => {
    const { store } = makeStoreWithMock({
      default: { data: [makeRow()], error: null },
    })
    const records = await store.listRecords()
    expect(records).toHaveLength(1)
    expect(records[0].id).toBe(ID_1)
    expect(records[0].userId).toBe(USER_ID)
    expect(records[0].situation).toBe('我要不要换工作')
  })

  it('returns empty array when no rows', async () => {
    const { store } = makeStoreWithMock({ default: { data: [], error: null } })
    const records = await store.listRecords()
    expect(records).toEqual([])
  })

  it('handles null data gracefully', async () => {
    const { store } = makeStoreWithMock({ default: { data: null, error: null } })
    const records = await store.listRecords()
    expect(records).toEqual([])
  })

  it('throws network error on Supabase error', async () => {
    const { store } = makeStoreWithMock({
      default: { data: null, error: { message: 'fetch failed' } },
    })
    await expect(store.listRecords()).rejects.toThrow(/fetch failed|network|error/i)
  })

  it('queries the correct table with filters', async () => {
    const { store, supabase } = makeStoreWithMock({ default: { data: [], error: null } })
    await store.listRecords()
    expect(supabase.from).toHaveBeenCalledWith('zheng_records')
  })
})

describe('remoteZhengStore.getRecord', () => {
  it('returns mapped record by id', async () => {
    const { store } = makeStoreWithMock({
      default: { data: makeRow(), error: null },
    })
    const record = await store.getRecord(ID_1)
    expect(record?.id).toBe(ID_1)
  })

  it('returns null when not found', async () => {
    const { store } = makeStoreWithMock({
      default: { data: null, error: null },
    })
    const record = await store.getRecord('nonexistent')
    expect(record).toBeNull()
  })

  it('throws on error', async () => {
    const { store } = makeStoreWithMock({
      default: { data: null, error: { message: 'db error' } },
    })
    await expect(store.getRecord(ID_1)).rejects.toThrow()
  })
})

describe('remoteZhengStore.saveRecord', () => {
  function input(overrides: Partial<SaveRecordInput> = {}): SaveRecordInput {
    return {
      situation: '我要不要换工作',
      hexagramId: 3,
      hexagramName: '屯',
      fitScore: 0.82,
      consultMode: 'classic',
      ...overrides,
    }
  }

  it('inserts row + returns mapped record', async () => {
    const { store } = makeStoreWithMock({
      insert: { data: makeRow(), error: null },
    })
    const record = await store.saveRecord(input())
    expect(record.id).toBe(ID_1)
    expect(record.userId).toBe(USER_ID)
    expect(record.situation).toBe('我要不要换工作')
    expect(record.verification).toBe('unverified')
  })

  it('throws on insert error', async () => {
    const { store } = makeStoreWithMock({
      insert: { data: null, error: { message: 'rls violation' } },
    })
    await expect(store.saveRecord(input())).rejects.toThrow()
  })
})

describe('remoteZhengStore.updateVerification', () => {
  it('updates and returns mapped record on success', async () => {
    const { store } = makeStoreWithMock({
      update: {
        data: makeRow({
          verification: 'fulfilled',
          verified_at: '2026-06-01T08:00:00.000Z',
          verification_note: '果然如此',
        }),
        error: null,
      },
    })
    const record = await store.updateVerification(ID_1, 'fulfilled', '果然如此')
    expect(record?.verification).toBe('fulfilled')
    expect(record?.verificationNote).toBe('果然如此')
    expect(record?.verifiedAt).toBeGreaterThan(0)
  })

  it('returns null when not found', async () => {
    const { store } = makeStoreWithMock({
      update: { data: null, error: null },
    })
    const record = await store.updateVerification('nonexistent', 'fulfilled')
    expect(record).toBeNull()
  })

  it('clears verifiedAt when status reverts to unverified', async () => {
    const { store } = makeStoreWithMock({
      update: { data: makeRow({ verification: 'unverified', verified_at: null }), error: null },
    })
    const record = await store.updateVerification(ID_1, 'unverified')
    expect(record?.verifiedAt).toBeUndefined()
  })
})

describe('remoteZhengStore.deleteRecord', () => {
  it('returns true when row deleted', async () => {
    const { store } = makeStoreWithMock({
      delete: { data: [{ id: ID_1 }], error: null },
    })
    const result = await store.deleteRecord(ID_1)
    expect(result).toBe(true)
  })

  it('returns false when no row found', async () => {
    const { store } = makeStoreWithMock({
      delete: { data: [], error: null },
    })
    const result = await store.deleteRecord('nonexistent')
    expect(result).toBe(false)
  })

  it('throws on error', async () => {
    const { store } = makeStoreWithMock({
      delete: { data: null, error: { message: 'db error' } },
    })
    await expect(store.deleteRecord(ID_1)).rejects.toThrow()
  })
})

describe('remoteZhengStore.clearAll', () => {
  it('returns count of deleted rows', async () => {
    const { store } = makeStoreWithMock({
      delete: { data: [{ id: '1' }, { id: '2' }, { id: '3' }], error: null },
    })
    const count = await store.clearAll()
    expect(count).toBe(3)
  })

  it('returns 0 when nothing to delete', async () => {
    const { store } = makeStoreWithMock({
      delete: { data: [], error: null },
    })
    expect(await store.clearAll()).toBe(0)
  })
})

describe('remoteZhengStore.importRecords', () => {
  function localRecord(id: string, createdAt: number): ConsultationRecord {
    return {
      id,
      schemaVersion: 1,
      createdAt,
      situation: 's',
      hexagramId: 1,
      hexagramName: '乾',
      fitScore: 0.5,
      verification: 'unverified',
    }
  }

  it('merge mode: upserts records returns imported count', async () => {
    const upsertedRows = [
      makeRow({ id: '11111111-1111-4000-8000-000000000001' }),
      makeRow({ id: '22222222-2222-4000-8000-000000000002' }),
    ]
    const { store } = makeStoreWithMock({
      upsert: { data: upsertedRows, error: null },
    })
    const result = await store.importRecords(
      [
        localRecord('11111111-1111-4000-8000-000000000001', 1000),
        localRecord('22222222-2222-4000-8000-000000000002', 2000),
      ],
      'merge',
    )
    expect(result.imported).toBe(2)
    expect(result.total).toBe(2)
    expect(result.skipped).toBe(0)
  })

  it('overwrite mode: clears then inserts', async () => {
    const { store, supabase } = makeStoreWithMock({
      delete: { data: [{ id: 'old' }], error: null },
      insert: { data: [makeRow()], error: null },
    })
    const result = await store.importRecords([localRecord(ID_1, 1000)], 'overwrite')
    expect(result.imported).toBe(1)
    expect(result.total).toBe(1)
    // 校验调用顺序：先 delete，再 insert
    const deleteCalls = supabase.__callLog.filter((c) => c.method === 'delete')
    const insertCalls = supabase.__callLog.filter((c) => c.method === 'insert')
    expect(deleteCalls.length).toBeGreaterThan(0)
    expect(insertCalls.length).toBeGreaterThan(0)
  })

  it('returns 0/0/0 for empty records array (merge)', async () => {
    const { store } = makeStoreWithMock({})
    const result = await store.importRecords([], 'merge')
    expect(result).toEqual({ imported: 0, skipped: 0, total: 0 })
  })
})

describe('remoteZhengStore auth gate', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when getUserId returns null', async () => {
    const supabase = createMockSupabase({ default: { data: [], error: null } })
    const store = makeRemoteZhengStore({
      getSupabase: () => supabase as never,
      getUserId: () => null,
    })
    await expect(store.listRecords()).rejects.toThrow(/auth|login/i)
  })
})
