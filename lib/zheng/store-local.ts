/**
 * 「征」模块 — localStorage 实现的 ZhengStore
 *
 * v1 用法：直接 import { localZhengStore } 即可。
 * v2 加账号体系时：新增 store-remote.ts，让 store.ts 根据登录态切换；
 * 本文件保持不变，调用方代码（components/zheng/*）零改动。
 */

import { ConsultationRecordSchema } from './schema'
import type { ZhengStore } from './store-types'
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
}
