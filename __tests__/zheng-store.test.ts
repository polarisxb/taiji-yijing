import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { localZhengStore } from '@/lib/zheng/store-local'
import type { ConsultationRecord, SaveRecordInput } from '@/lib/zheng/types'

// ---------- fake localStorage ----------

type FakeStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  clear(): void
  readonly length: number
  key(index: number): string | null
}

function createFakeLocalStorage(): FakeStorage {
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
    get length() {
      return map.size
    },
    key: (i) => Array.from(map.keys())[i] ?? null,
  }
}

const STORAGE_KEY = 'taiji-yijing.zheng.v1'

type Sandbox = { window?: { localStorage: FakeStorage } }

function getStorage(): FakeStorage {
  const sb = globalThis as unknown as Sandbox
  if (!sb.window) throw new Error('test setup: window not initialised')
  return sb.window.localStorage
}

beforeEach(() => {
  ;(globalThis as Sandbox).window = { localStorage: createFakeLocalStorage() }
})

afterEach(() => {
  delete (globalThis as Sandbox).window
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
  // Mock Date.now so createdAt is strictly monotonically increasing.
  // Real setTimeout(1) was flaky under load — Date.now() can repeat across calls
  // when the timer resolves in <1ms, breaking the descending-order assertion.
  const records: ConsultationRecord[] = []
  let t = 1_700_000_000_000
  const spy = vi.spyOn(Date, 'now').mockImplementation(() => {
    t += 10
    return t
  })
  try {
    for (let i = 0; i < count; i++) {
      const r = await localZhengStore.saveRecord(baseInput({ situation: `情境${i}` }))
      records.push(r)
    }
  } finally {
    spy.mockRestore()
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

    it('preserves optional aiYao + consultMode when provided', async () => {
      const saved = await localZhengStore.saveRecord(
        baseInput({
          aiYao: {
            position: 5,
            name: '九五',
            brief: '飞龙在天，处于巅峰',
            confidence: 'high',
          },
          consultMode: 'ai',
        }),
      )
      expect(saved.aiYao).toEqual({
        position: 5,
        name: '九五',
        brief: '飞龙在天，处于巅峰',
        confidence: 'high',
      })
      expect(saved.consultMode).toBe('ai')

      const fetched = await localZhengStore.getRecord(saved.id)
      expect(fetched?.aiYao).toEqual(saved.aiYao)
      expect(fetched?.consultMode).toBe('ai')
    })

    it('keeps aiYao + consultMode undefined when not provided (classic / legacy records)', async () => {
      const saved = await localZhengStore.saveRecord(baseInput())
      expect(saved.aiYao).toBeUndefined()
      expect(saved.consultMode).toBeUndefined()
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
      const raw = JSON.parse(getStorage().getItem(STORAGE_KEY) as string)
      raw.push({ id: 'broken', schemaVersion: 1, garbage: true }) // schema-invalid
      getStorage().setItem(STORAGE_KEY, JSON.stringify(raw))

      const all = await localZhengStore.listRecords()
      expect(all).toHaveLength(1)
      expect(all[0].id).toBe(good.id)
    })

    it('returns [] when raw value is not JSON', async () => {
      getStorage().setItem(STORAGE_KEY, '{not json')
      const all = await localZhengStore.listRecords()
      expect(all).toEqual([])
    })

    it('returns [] when raw value is JSON but not an array', async () => {
      getStorage().setItem(STORAGE_KEY, '{"foo": "bar"}')
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
      delete (globalThis as Sandbox).window
      const all = await localZhengStore.listRecords()
      expect(all).toEqual([])
    })

    it('getRecord returns null when window is undefined', async () => {
      delete (globalThis as Sandbox).window
      const found = await localZhengStore.getRecord('any')
      expect(found).toBeNull()
    })

    it('saveRecord throws when window is undefined (caller must be in browser)', async () => {
      delete (globalThis as Sandbox).window
      await expect(localZhengStore.saveRecord(baseInput())).rejects.toThrow()
    })
  })

  describe('clearAll', () => {
    it('removes every record and returns the cleared count', async () => {
      await seed(3)
      const beforeAll = await localZhengStore.listRecords()
      expect(beforeAll).toHaveLength(3)

      const cleared = await localZhengStore.clearAll()
      expect(cleared).toBe(3)

      const afterAll = await localZhengStore.listRecords()
      expect(afterAll).toEqual([])
    })

    it('returns 0 when storage is already empty', async () => {
      const cleared = await localZhengStore.clearAll()
      expect(cleared).toBe(0)
    })

    it('returns 0 when window is undefined (SSR safe)', async () => {
      delete (globalThis as Sandbox).window
      const cleared = await localZhengStore.clearAll()
      expect(cleared).toBe(0)
    })
  })

  describe('importRecords', () => {
    function makeRecord(id: string, createdAt: number, situation = '情境'): ConsultationRecord {
      return {
        id,
        schemaVersion: 1,
        createdAt,
        situation,
        hexagramId: 3,
        hexagramName: '屯',
        fitScore: 0.72,
        verification: 'unverified',
      }
    }

    describe('mode: merge', () => {
      it('appends new records to existing ones', async () => {
        const existing = await seed(2)
        const incoming = [
          makeRecord('new-1', 2_000_000_000_000),
          makeRecord('new-2', 2_000_000_000_100),
        ]
        const result = await localZhengStore.importRecords(incoming, 'merge')

        expect(result.imported).toBe(2)
        expect(result.skipped).toBe(0)
        expect(result.total).toBe(4)

        const all = await localZhengStore.listRecords()
        const ids = all.map((r) => r.id).sort()
        expect(ids).toEqual([existing[0].id, existing[1].id, 'new-1', 'new-2'].sort())
      })

      it('on UUID collision keeps the createdAt-newer one', async () => {
        const existing = await seed(1)
        const colliding = makeRecord(existing[0].id, existing[0].createdAt + 100_000, '更新的情境')

        const result = await localZhengStore.importRecords([colliding], 'merge')
        expect(result.imported).toBe(0)
        expect(result.skipped).toBe(1)
        expect(result.total).toBe(1)

        const all = await localZhengStore.listRecords()
        expect(all).toHaveLength(1)
        expect(all[0].situation).toBe('更新的情境')
      })

      it('on UUID collision keeps the existing one when it is newer', async () => {
        const existing = await seed(1)
        const older = makeRecord(existing[0].id, existing[0].createdAt - 100_000, '更早的情境')

        const result = await localZhengStore.importRecords([older], 'merge')
        expect(result.skipped).toBe(1)

        const all = await localZhengStore.listRecords()
        expect(all).toHaveLength(1)
        expect(all[0].id).toBe(existing[0].id)
        expect(all[0].situation).not.toBe('更早的情境')
      })

      it('merging into empty storage imports everything', async () => {
        const incoming = [makeRecord('a', 1), makeRecord('b', 2)]
        const result = await localZhengStore.importRecords(incoming, 'merge')
        expect(result.imported).toBe(2)
        expect(result.skipped).toBe(0)
        expect(result.total).toBe(2)
      })

      it('merging an empty array is a no-op', async () => {
        await seed(2)
        const result = await localZhengStore.importRecords([], 'merge')
        expect(result.imported).toBe(0)
        expect(result.skipped).toBe(0)
        expect(result.total).toBe(2)
      })
    })

    describe('mode: overwrite', () => {
      it('replaces every existing record', async () => {
        await seed(3)
        const incoming = [makeRecord('only-1', 1)]
        const result = await localZhengStore.importRecords(incoming, 'overwrite')

        expect(result.imported).toBe(1)
        expect(result.skipped).toBe(0)
        expect(result.total).toBe(1)

        const all = await localZhengStore.listRecords()
        expect(all).toHaveLength(1)
        expect(all[0].id).toBe('only-1')
      })

      it('overwriting with an empty array clears storage', async () => {
        await seed(2)
        const result = await localZhengStore.importRecords([], 'overwrite')
        expect(result.total).toBe(0)
        const all = await localZhengStore.listRecords()
        expect(all).toEqual([])
      })

      it('overwriting empty storage just sets the records', async () => {
        const incoming = [makeRecord('x', 1), makeRecord('y', 2)]
        const result = await localZhengStore.importRecords(incoming, 'overwrite')
        expect(result.imported).toBe(2)
        expect(result.total).toBe(2)
      })
    })

    it('returns zero counts when window is undefined (SSR safe)', async () => {
      delete (globalThis as Sandbox).window
      const result = await localZhengStore.importRecords([makeRecord('x', 1)], 'merge')
      expect(result).toEqual({ imported: 0, skipped: 0, total: 0 })
    })
  })
})
