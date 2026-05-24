/**
 * 「征」模块 — localStorage 实现的 ZhengStore
 *
 * v1 用法：直接 import { localZhengStore } 即可。
 * v2 加账号体系时：新增 store-remote.ts，让 store.ts 根据登录态切换；
 * 本文件保持不变，调用方代码（components/zheng/*）零改动。
 */

import { ConsultationRecordSchema } from './schema'
import type { ImportMode, ImportResult, ZhengStore } from './store-types'
import type { ConsultationRecord, SaveRecordInput, VerificationStatus } from './types'

const STORAGE_KEY = 'taiji-yijing.zheng.v1'

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readAll(): ConsultationRecord[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const valid: ConsultationRecord[] = []
    for (const entry of parsed) {
      const result = ConsultationRecordSchema.safeParse(entry)
      if (result.success) valid.push(result.data)
    }
    return valid
  } catch {
    return []
  }
}

function writeAll(records: ConsultationRecord[]): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // localStorage quota or other error — fail silently in v1.
    // v1.5 may surface this to the user.
  }
}

export const localZhengStore: ZhengStore = {
  async listRecords() {
    return readAll().sort((a, b) => b.createdAt - a.createdAt)
  },

  async getRecord(id) {
    return readAll().find((r) => r.id === id) ?? null
  },

  async saveRecord(input: SaveRecordInput) {
    if (!isBrowser()) {
      throw new Error('saveRecord called in non-browser environment')
    }
    const record: ConsultationRecord = {
      ...input,
      id: crypto.randomUUID(),
      schemaVersion: 1,
      createdAt: Date.now(),
      verification: 'unverified',
    }
    const all = readAll()
    all.push(record)
    writeAll(all)
    return record
  },

  async updateVerification(id, status: VerificationStatus, note) {
    const all = readAll()
    const idx = all.findIndex((r) => r.id === id)
    if (idx === -1) return null
    const prev = all[idx]
    const updated: ConsultationRecord = {
      ...prev,
      verification: status,
      verificationNote: note,
      verifiedAt: status === 'unverified' ? undefined : Date.now(),
    }
    all[idx] = updated
    writeAll(all)
    return updated
  },

  async deleteRecord(id) {
    const all = readAll()
    const next = all.filter((r) => r.id !== id)
    if (next.length === all.length) return false
    writeAll(next)
    return true
  },

  async clearAll() {
    if (!isBrowser()) return 0
    const before = readAll().length
    window.localStorage.removeItem(STORAGE_KEY)
    return before
  },

  async importRecords(records: ConsultationRecord[], mode: ImportMode): Promise<ImportResult> {
    if (!isBrowser()) return { imported: 0, skipped: 0, total: 0 }

    if (mode === 'overwrite') {
      writeAll(records)
      return { imported: records.length, skipped: 0, total: records.length }
    }

    // merge: 按 UUID 合并，碰撞时取 createdAt 较新者
    const existing = readAll()
    const byId = new Map<string, ConsultationRecord>()
    for (const r of existing) byId.set(r.id, r)

    let imported = 0
    let skipped = 0
    for (const incoming of records) {
      const current = byId.get(incoming.id)
      if (!current) {
        byId.set(incoming.id, incoming)
        imported += 1
      } else if (incoming.createdAt > current.createdAt) {
        byId.set(incoming.id, incoming)
        skipped += 1 // existing was replaced; incoming counted as "skipped-collision"
      } else {
        skipped += 1
      }
    }

    const merged = Array.from(byId.values())
    writeAll(merged)
    return { imported, skipped, total: merged.length }
  },
}
