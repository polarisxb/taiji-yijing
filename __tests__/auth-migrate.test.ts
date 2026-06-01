/**
 * Tests for the migrateLocalToRemote helper.
 *
 * 首次登录时把本机 localStorage 的记录合并到云端，成功后清本机。
 */

import { describe, expect, it, vi } from 'vitest'

import { migrateLocalToRemote } from '@/lib/auth/migrate'
import type { ZhengStore } from '@/lib/zheng/store-types'
import type { ConsultationRecord } from '@/lib/zheng/types'

function makeRecord(id: string, createdAt: number): ConsultationRecord {
  return {
    id,
    schemaVersion: 1,
    createdAt,
    situation: `q-${id}`,
    hexagramId: 1,
    hexagramName: '乾',
    fitScore: 0.5,
    verification: 'unverified',
  }
}

function mockStore(impl: Partial<ZhengStore> = {}): ZhengStore {
  return {
    listRecords: vi.fn(async () => []),
    getRecord: vi.fn(async () => null),
    saveRecord: vi.fn(async () => makeRecord('x', 0)),
    updateVerification: vi.fn(async () => null),
    deleteRecord: vi.fn(async () => true),
    clearAll: vi.fn(async () => 0),
    importRecords: vi.fn(async () => ({ imported: 0, skipped: 0, total: 0 })),
    ...impl,
  }
}

describe('migrateLocalToRemote', () => {
  it('returns 0 when local is empty', async () => {
    const local = mockStore({ listRecords: async () => [] })
    const remote = mockStore()
    const result = await migrateLocalToRemote(local, remote)
    expect(result.migrated).toBe(0)
    expect(remote.importRecords).not.toHaveBeenCalled()
    expect(local.clearAll).not.toHaveBeenCalled()
  })

  it('uploads all local records and clears local on success', async () => {
    const records = [makeRecord('a', 1000), makeRecord('b', 2000)]
    const local = mockStore({
      listRecords: async () => records,
      clearAll: vi.fn(async () => 2),
    })
    const remote = mockStore({
      importRecords: vi.fn(async () => ({ imported: 2, skipped: 0, total: 2 })),
    })
    const result = await migrateLocalToRemote(local, remote)
    expect(result.migrated).toBe(2)
    expect(remote.importRecords).toHaveBeenCalledWith(records, 'merge')
    expect(local.clearAll).toHaveBeenCalled()
  })

  it('does NOT clear local when remote import fails', async () => {
    const records = [makeRecord('a', 1000)]
    const local = mockStore({
      listRecords: async () => records,
      clearAll: vi.fn(async () => 1),
    })
    const remote = mockStore({
      importRecords: vi.fn(async () => {
        throw new Error('network')
      }),
    })
    await expect(migrateLocalToRemote(local, remote)).rejects.toThrow(/network/)
    expect(local.clearAll).not.toHaveBeenCalled()
  })

  it('does NOT clear local on partial import (imported < total)', async () => {
    const records = [makeRecord('a', 1000), makeRecord('b', 2000)]
    const local = mockStore({
      listRecords: async () => records,
      clearAll: vi.fn(async () => 2),
    })
    const remote = mockStore({
      importRecords: vi.fn(async () => ({ imported: 1, skipped: 1, total: 1 })),
    })
    const result = await migrateLocalToRemote(local, remote)
    expect(result.migrated).toBe(1)
    expect(result.skipped).toBe(1)
    expect(local.clearAll).not.toHaveBeenCalled()
  })
})
