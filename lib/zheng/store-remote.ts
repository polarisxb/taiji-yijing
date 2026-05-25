/**
 * 「征」模块 — Supabase 实现的 ZhengStore
 *
 * 仅在已登录态使用；未登录态由 `localZhengStore` 接管（见 store.ts）。
 * RLS 策略保证每个用户只能访问自己的 row；本文件不重复鉴权，但通过 `getUserId`
 * 作为 fail-fast 的保险（避免未登录态错误命中）。
 */

import type { SupabaseClient } from '@supabase/supabase-js'

import {
  recordFromRow,
  recordToFullRow,
  recordToInsertRow,
  type ZhengRecordRow,
} from './store-remote-mappers'
import type { ImportMode, ImportResult, ZhengStore } from './store-types'
import type { ConsultationRecord, SaveRecordInput, VerificationStatus } from './types'

const TABLE = 'zheng_records'

export type RemoteStoreDeps = {
  /** 返回当前已配置的 Supabase client（懒加载，避免 SSR 阶段构造） */
  getSupabase: () => SupabaseClient
  /** 当前已登录用户 id；未登录返回 null */
  getUserId: () => string | null
}

type SupabaseError = { message?: string; code?: string }

function isSupabaseError(value: unknown): value is SupabaseError {
  return typeof value === 'object' && value !== null && 'message' in value
}

function toFriendlyError(err: unknown): Error {
  if (isSupabaseError(err)) {
    const msg = err.message ?? 'unknown'
    if (msg.toLowerCase().includes('fetch')) return new Error('network')
    if (err.code === 'PGRST301' || msg.toLowerCase().includes('jwt')) return new Error('auth')
    return new Error(msg)
  }
  if (err instanceof Error) return err
  return new Error(String(err))
}

function ensureUser(deps: RemoteStoreDeps): string {
  const uid = deps.getUserId()
  if (!uid) throw new Error('auth: not logged in')
  return uid
}

export function makeRemoteZhengStore(deps: RemoteStoreDeps): ZhengStore {
  return {
    async listRecords(): Promise<ConsultationRecord[]> {
      ensureUser(deps)
      const supabase = deps.getSupabase()
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw toFriendlyError(error)
      const rows = (data ?? []) as ZhengRecordRow[]
      return rows.map(recordFromRow)
    },

    async getRecord(id: string): Promise<ConsultationRecord | null> {
      ensureUser(deps)
      const supabase = deps.getSupabase()
      const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle()
      if (error) throw toFriendlyError(error)
      if (!data) return null
      return recordFromRow(data as ZhengRecordRow)
    },

    async saveRecord(input: SaveRecordInput): Promise<ConsultationRecord> {
      const uid = ensureUser(deps)
      const supabase = deps.getSupabase()
      const insertRow = recordToInsertRow(input, uid)
      const { data, error } = await supabase.from(TABLE).insert(insertRow).select().single()
      if (error) throw toFriendlyError(error)
      if (!data) throw new Error('insert returned no row')
      return recordFromRow(data as ZhengRecordRow)
    },

    async updateVerification(
      id: string,
      status: VerificationStatus,
      note?: string,
    ): Promise<ConsultationRecord | null> {
      ensureUser(deps)
      const supabase = deps.getSupabase()
      const patch: Record<string, unknown> = {
        verification: status,
        verification_note: note ?? null,
        verified_at: status === 'unverified' ? null : new Date().toISOString(),
      }
      const { data, error } = await supabase
        .from(TABLE)
        .update(patch)
        .eq('id', id)
        .select()
        .maybeSingle()
      if (error) throw toFriendlyError(error)
      if (!data) return null
      return recordFromRow(data as ZhengRecordRow)
    },

    async deleteRecord(id: string): Promise<boolean> {
      ensureUser(deps)
      const supabase = deps.getSupabase()
      const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select()
      if (error) throw toFriendlyError(error)
      const rows = (data ?? []) as Array<{ id: string }>
      return rows.length > 0
    },

    async clearAll(): Promise<number> {
      const uid = ensureUser(deps)
      const supabase = deps.getSupabase()
      const { data, error } = await supabase.from(TABLE).delete().eq('user_id', uid).select()
      if (error) throw toFriendlyError(error)
      const rows = (data ?? []) as Array<{ id: string }>
      return rows.length
    },

    async importRecords(records: ConsultationRecord[], mode: ImportMode): Promise<ImportResult> {
      const uid = ensureUser(deps)
      if (records.length === 0) return { imported: 0, skipped: 0, total: 0 }

      const supabase = deps.getSupabase()
      const fullRows = records.map((r) => recordToFullRow(r, uid))

      if (mode === 'overwrite') {
        const { error: clearErr } = await supabase.from(TABLE).delete().eq('user_id', uid).select()
        if (clearErr) throw toFriendlyError(clearErr)
        const { data, error } = await supabase.from(TABLE).insert(fullRows).select()
        if (error) throw toFriendlyError(error)
        const rows = (data ?? []) as ZhengRecordRow[]
        return { imported: rows.length, skipped: 0, total: rows.length }
      }

      // merge: upsert by id (DB 端 last-write-wins by created_at via PK)
      const { data, error } = await supabase
        .from(TABLE)
        .upsert(fullRows, { onConflict: 'id' })
        .select()
      if (error) throw toFriendlyError(error)
      const rows = (data ?? []) as ZhengRecordRow[]
      return { imported: rows.length, skipped: records.length - rows.length, total: rows.length }
    },
  }
}
