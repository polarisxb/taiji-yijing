/**
 * 「征」模块 — DB row ↔ ConsultationRecord 映射器
 *
 * Supabase 端 zheng_records 表使用 snake_case + timestamptz；
 * 应用内 ConsultationRecord 使用 camelCase + epoch ms。
 * 这里集中处理双向映射 + 校验。
 */

import { z } from 'zod'

import {
  AiYaoPredictionSchema,
  ConsultModeSchema,
  SavedYaoLocationSchema,
  VerificationStatusSchema,
} from './schema'
import type {
  AiYaoPrediction,
  ConsultationRecord,
  ConsultMode,
  SaveRecordInput,
  SavedYaoLocation,
  VerificationStatus,
} from './types'

/**
 * Supabase 返回行的形状。jsonb 列已被 PostgREST 解析为对象 / null。
 */
export type ZhengRecordRow = {
  id: string
  user_id: string
  schema_version: number
  created_at: string
  updated_at: string
  situation: string
  hexagram_id: number
  hexagram_name: string
  fit_score: number
  yao_location: SavedYaoLocation | null
  ai_yao: AiYaoPrediction | null
  consult_mode: string | null
  user_note: string | null
  verification: string
  verification_note: string | null
  verified_at: string | null
  deleted_at: string | null
}

/**
 * 写入时的行形状（不含 id / created_at / updated_at — DB 自动生成）。
 */
export type ZhengRecordInsertRow = Omit<ZhengRecordRow, 'id' | 'created_at' | 'updated_at'>

const RowSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  schema_version: z.number().int(),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
  situation: z.string().min(1),
  hexagram_id: z.number().int(),
  hexagram_name: z.string().min(1),
  fit_score: z.number(),
  yao_location: SavedYaoLocationSchema.nullable(),
  ai_yao: AiYaoPredictionSchema.nullable(),
  consult_mode: ConsultModeSchema.nullable(),
  verification: VerificationStatusSchema,
  user_note: z.string().nullable(),
  verification_note: z.string().nullable(),
  verified_at: z.string().nullable(),
  deleted_at: z.string().nullable(),
})

function toMs(iso: string): number {
  const ms = new Date(iso).getTime()
  if (Number.isNaN(ms)) {
    throw new Error(`invalid timestamp: ${iso}`)
  }
  return ms
}

/**
 * DB 行 → ConsultationRecord（应用内型）。
 * 校验失败 throw。
 */
export function recordFromRow(row: ZhengRecordRow): ConsultationRecord {
  const parsed = RowSchema.parse(row)
  const verification = parsed.verification as VerificationStatus
  const consultMode = (parsed.consult_mode ?? undefined) as ConsultMode | undefined

  const record: ConsultationRecord = {
    id: parsed.id,
    schemaVersion: 1,
    createdAt: toMs(parsed.created_at),
    situation: parsed.situation,
    hexagramId: parsed.hexagram_id,
    hexagramName: parsed.hexagram_name,
    fitScore: parsed.fit_score,
    verification,
    userId: parsed.user_id,
    syncedAt: toMs(parsed.updated_at),
  }

  if (parsed.yao_location) record.yaoLocation = parsed.yao_location
  if (parsed.ai_yao) record.aiYao = parsed.ai_yao
  if (consultMode) record.consultMode = consultMode
  if (parsed.user_note !== null) record.userNote = parsed.user_note
  if (parsed.verification_note !== null) record.verificationNote = parsed.verification_note
  if (parsed.verified_at !== null) record.verifiedAt = toMs(parsed.verified_at)

  return record
}

/**
 * SaveRecordInput → DB 插入行。
 *
 * 由调用方提供 userId（通常从 auth context 取出 auth.uid()）。
 * id / created_at / updated_at 由 DB 默认值 / trigger 生成。
 */
export function recordToInsertRow(input: SaveRecordInput, userId: string): ZhengRecordInsertRow {
  return {
    user_id: userId,
    schema_version: 1,
    situation: input.situation,
    hexagram_id: input.hexagramId,
    hexagram_name: input.hexagramName,
    fit_score: input.fitScore,
    yao_location: input.yaoLocation ?? null,
    ai_yao: input.aiYao ?? null,
    consult_mode: input.consultMode ?? null,
    user_note: input.userNote ?? null,
    verification: 'unverified',
    verification_note: null,
    verified_at: null,
    deleted_at: null,
  }
}

/**
 * 已存在的完整记录（含 id）→ DB 行。
 * 用于 importRecords：把本机 localStorage 记录批量上云时保留原 id 和 createdAt。
 */
export function recordToFullRow(
  record: ConsultationRecord,
  userId: string,
): Omit<ZhengRecordRow, 'updated_at'> {
  return {
    id: record.id,
    user_id: userId,
    schema_version: 1,
    created_at: new Date(record.createdAt).toISOString(),
    situation: record.situation,
    hexagram_id: record.hexagramId,
    hexagram_name: record.hexagramName,
    fit_score: record.fitScore,
    yao_location: record.yaoLocation ?? null,
    ai_yao: record.aiYao ?? null,
    consult_mode: record.consultMode ?? null,
    user_note: record.userNote ?? null,
    verification: record.verification,
    verification_note: record.verificationNote ?? null,
    verified_at: record.verifiedAt ? new Date(record.verifiedAt).toISOString() : null,
    deleted_at: null,
  }
}
