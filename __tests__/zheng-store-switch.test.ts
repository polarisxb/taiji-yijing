/**
 * Tests for the switching zheng store factory.
 *
 * 验证 makeSwitchingZhengStore 根据 getUserId() 把调用 dispatch 到
 * local / remote 两个底层 store 上。
 */

import { describe, expect, it, vi } from 'vitest'

import { makeSwitchingZhengStore } from '@/lib/zheng/store'
import type { ZhengStore } from '@/lib/zheng/store-types'
import type { ConsultationRecord } from '@/lib/zheng/types'

function makeMockStore(label: string): ZhengStore {
  const record: ConsultationRecord = {
    id: `${label}-id`,
    schemaVersion: 1,
    createdAt: 1000,
    situation: label,
    hexagramId: 1,
    hexagramName: '乾',
    fitScore: 0.5,
    verification: 'unverified',
  }
  return {
    listRecords: vi.fn(async () => [record]),
    getRecord: vi.fn(async () => record),
    saveRecord: vi.fn(async () => record),
    updateVerification: vi.fn(async () => record),
    deleteRecord: vi.fn(async () => true),
    clearAll: vi.fn(async () => 1),
    importRecords: vi.fn(async () => ({ imported: 1, skipped: 0, total: 1 })),
  }
}

describe('makeSwitchingZhengStore', () => {
  it('uses localStore when getUserId returns null', async () => {
    const local = makeMockStore('local')
    const remote = makeMockStore('remote')
    const store = makeSwitchingZhengStore({
      getUserId: () => null,
      localStore: local,
      remoteStore: remote,
    })
    const records = await store.listRecords()
    expect(local.listRecords).toHaveBeenCalled()
    expect(remote.listRecords).not.toHaveBeenCalled()
    expect(records[0].situation).toBe('local')
  })

  it('uses remoteStore when getUserId returns a user id', async () => {
    const local = makeMockStore('local')
    const remote = makeMockStore('remote')
    const store = makeSwitchingZhengStore({
      getUserId: () => 'user-1',
      localStore: local,
      remoteStore: remote,
    })
    const records = await store.listRecords()
    expect(remote.listRecords).toHaveBeenCalled()
    expect(local.listRecords).not.toHaveBeenCalled()
    expect(records[0].situation).toBe('remote')
  })

  it('re-evaluates getUserId on every call (live switching)', async () => {
    let uid: string | null = null
    const local = makeMockStore('local')
    const remote = makeMockStore('remote')
    const store = makeSwitchingZhengStore({
      getUserId: () => uid,
      localStore: local,
      remoteStore: remote,
    })

    await store.listRecords()
    expect(local.listRecords).toHaveBeenCalledTimes(1)

    uid = 'user-1'
    await store.listRecords()
    expect(remote.listRecords).toHaveBeenCalledTimes(1)

    uid = null
    await store.listRecords()
    expect(local.listRecords).toHaveBeenCalledTimes(2)
  })

  it('dispatches all methods consistently', async () => {
    const local = makeMockStore('local')
    const remote = makeMockStore('remote')
    const store = makeSwitchingZhengStore({
      getUserId: () => 'user-1',
      localStore: local,
      remoteStore: remote,
    })

    await store.getRecord('x')
    await store.saveRecord({
      situation: 's',
      hexagramId: 1,
      hexagramName: '乾',
      fitScore: 0.5,
    })
    await store.updateVerification('x', 'fulfilled', 'note')
    await store.deleteRecord('x')
    await store.clearAll()
    await store.importRecords([], 'merge')

    expect(remote.getRecord).toHaveBeenCalled()
    expect(remote.saveRecord).toHaveBeenCalled()
    expect(remote.updateVerification).toHaveBeenCalledWith('x', 'fulfilled', 'note')
    expect(remote.deleteRecord).toHaveBeenCalled()
    expect(remote.clearAll).toHaveBeenCalled()
    expect(remote.importRecords).toHaveBeenCalled()
    expect(local.getRecord).not.toHaveBeenCalled()
  })
})
