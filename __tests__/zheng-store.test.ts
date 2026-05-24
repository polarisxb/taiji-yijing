import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { localZhengStore } from '@/lib/zheng/store-local'
import type { ConsultationRecord, SaveRecordInput } from '@/lib/zheng/types'

// ---------- fake localStorage ----------

type Storage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  clear(): void
}

function createFakeLocalStorage(): Storage {
  const map = new Map<string, string>()
  return {
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => {
      map.set(k, String(v))
    },
    removeItem: (k) => {
      map.delete(k)
    },
    clear: () => map.clear(),
  }
}

const STORAGE_KEY = 'taiji-yijing.zheng.v1'

declare global {
   
  var window: { localStorage: Storage } | undefined
}

beforeEach(() => {
  globalThis.window = { localStorage: createFakeLocalStorage() }
})

afterEach(() => {
  delete (globalThis as { window?: unknown }).window
})

// ---------- helpers ----------

function baseInput(overrides: Partial<SaveRecordInput> = {}): SaveRecordInput {
  return {
    situation: '我在大厂工作了 5 年，最近想辞职',
    hexagramId: 3,
    hexagramName: '屯',
    fitScore: 0.72,
    ...overrides,
  }
}

async function seed(count: number): Promise<ConsultationRecord[]> {
  const records: ConsultationRecord[] = []
  for (let i = 0; i < count; i++) {
    // 1ms gap so createdAt is monotonically increasing
    await new Promise((r) => setTimeout(r, 1))
    const r = await localZhengStore.saveRecord(baseInput({ situation: `情境${i}` }))
    records.push(r)
  }
  return records
}

// ---------- tests ----------

describe('localZhengStore', () => {
  describe('saveRecord', () => {
    it('writes a record with auto-generated id / schemaVersion / createdAt / verification', async () => {
      const before = Date.now()
      const saved = await localZhengStore.saveRecord(baseInput())
      const after = Date.now()

      expect(saved.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      expect(saved.schemaVersion).toBe(1)
      expect(saved.createdAt).toBeGreaterThanOrEqual(before)
      expect(saved.createdAt).toBeLessThanOrEqual(after)
      expect(saved.verification).toBe('unverified')
      expect(saved.situation).toBe('我在大厂工作了 5 年，最近想辞职')
      expect(saved.hexagramId).toBe(3)
      expect(saved.hexagramName).toBe('屯')
      expect(saved.fitScore).toBe(0.72)
      expect(saved.userId).toBeUndefined()
      expect(saved.syncedAt).toBeUndefined()
    })

    it('preserves optional yaoLocation when provided', async () => {
      const saved = await localZhengStore.saveRecord(
        baseInput({
          yaoLocation: {
            topPosition: 5,
            topYaoName: '九五',
            topRatio: 0.8,
            crossYaoPosition: 4,
            crossYaoName: '六四',
          },
        }),
      )
      expect(saved.yaoLocation).toEqual({
        topPosition: 5,
        topYaoName: '九五',
        topRatio: 0.8,
        crossYaoPosition: 4,
        crossYaoName: '六四',
      })
    })

    it('preserves optional userNote when provided', async () => {
      const saved = await localZhengStore.saveRecord(
        baseInput({ userNote: '本周内与三位顾问通电话' }),
      )
      expect(saved.userNote).toBe('本周内与三位顾问通电话')
    })

    it('round-trips through listRecords', async () => {
      const saved = await localZhengStore.saveRecord(baseInput())
      const all = await localZhengStore.listRecords()
      expect(all).toHaveLength(1)
      expect(all[0]).toEqual(saved)
    })
  })

  describe('listRecords', () => {
    it('returns [] when storage is empty', async () => {
      const all = await localZhengStore.listRecords()
      expect(all).toEqual([])
    })

    it('returns records in createdAt-descending order (newest first)', async () => {
      const seeded = await seed(3)
      const all = await localZhengStore.listRecords()
      expect(all.map((r) => r.id)).toEqual([seeded[2].id, seeded[1].id, seeded[0].id])
    })

    it('silently drops invalid entries via zod schema check', async () => {
      const good = await localZhengStore.saveRecord(baseInput())
      const raw = JSON.parse(globalThis.window!.localStorage.getItem(STORAGE_KEY) as string)
      raw.push({ id: 'broken', schemaVersion: 1, garbage: true }) // schema-invalid
      globalThis.window!.localStorage.setItem(STORAGE_KEY, JSON.stringify(raw))

      const all = await localZhengStore.listRecords()
      expect(all).toHaveLength(1)
      expect(all[0].id).toBe(good.id)
    })

    it('returns [] when raw value is not JSON', async () => {
      globalThis.window!.localStorage.setItem(STORAGE_KEY, '{not json')
      const all = await localZhengStore.listRecords()
      expect(all).toEqual([])
    })

    it('returns [] when raw value is JSON but not an array', async () => {
      globalThis.window!.localStorage.setItem(STORAGE_KEY, '{"foo": "bar"}')
      const all = await localZhengStore.listRecords()
      expect(all).toEqual([])
    })
  })

  describe('getRecord', () => {
    it('returns the matching record for a valid id', async () => {
      const saved = await localZhengStore.saveRecord(baseInput())
      const found = await localZhengStore.getRecord(saved.id)
      expect(found).toEqual(saved)
    })

    it('returns null for a missing id', async () => {
      const found = await localZhengStore.getRecord('does-not-exist')
      expect(found).toBeNull()
    })
  })

  describe('updateVerification', () => {
    it('sets status + verifiedAt + note', async () => {
      const saved = await localZhengStore.saveRecord(baseInput())
      const before = Date.now()
      const updated = await localZhengStore.updateVerification(saved.id, 'fulfilled', '方向对了')
      const after = Date.now()

      expect(updated).not.toBeNull()
      expect(updated!.verification).toBe('fulfilled')
      expect(updated!.verificationNote).toBe('方向对了')
      expect(updated!.verifiedAt).toBeGreaterThanOrEqual(before)
      expect(updated!.verifiedAt).toBeLessThanOrEqual(after)
    })

    it('clears verifiedAt when status reverts to unverified', async () => {
      const saved = await localZhengStore.saveRecord(baseInput())
      await localZhengStore.updateVerification(saved.id, 'fulfilled', 'note')
      const reverted = await localZhengStore.updateVerification(saved.id, 'unverified')
      expect(reverted).not.toBeNull()
      expect(reverted!.verification).toBe('unverified')
      expect(reverted!.verifiedAt).toBeUndefined()
    })

    it('returns null for a missing id', async () => {
      const updated = await localZhengStore.updateVerification('nope', 'fulfilled')
      expect(updated).toBeNull()
    })

    it('persists update through listRecords', async () => {
      const saved = await localZhengStore.saveRecord(baseInput())
      await localZhengStore.updateVerification(saved.id, 'partial', 'roughly right')

      const all = await localZhengStore.listRecords()
      expect(all[0].verification).toBe('partial')
      expect(all[0].verificationNote).toBe('roughly right')
    })
  })

  describe('deleteRecord', () => {
    it('removes the record and returns true', async () => {
      const a = await localZhengStore.saveRecord(baseInput({ situation: 'A' }))
      await new Promise((r) => setTimeout(r, 1))
      const b = await localZhengStore.saveRecord(baseInput({ situation: 'B' }))

      const ok = await localZhengStore.deleteRecord(a.id)
      expect(ok).toBe(true)

      const all = await localZhengStore.listRecords()
      expect(all).toHaveLength(1)
      expect(all[0].id).toBe(b.id)
    })

    it('returns false for a missing id', async () => {
      const ok = await localZhengStore.deleteRecord('nope')
      expect(ok).toBe(false)
    })
  })

  describe('SSR safety', () => {
    it('listRecords returns [] when window is undefined', async () => {
      delete (globalThis as { window?: unknown }).window
      const all = await localZhengStore.listRecords()
      expect(all).toEqual([])
    })

    it('getRecord returns null when window is undefined', async () => {
      delete (globalThis as { window?: unknown }).window
      const found = await localZhengStore.getRecord('any')
      expect(found).toBeNull()
    })

    it('saveRecord throws when window is undefined (caller must be in browser)', async () => {
      delete (globalThis as { window?: unknown }).window
      await expect(localZhengStore.saveRecord(baseInput())).rejects.toThrow()
    })
  })
})
