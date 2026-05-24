/**
 * 「征」模块 — Storage interface
 *
 * 所有方法返回 Promise——v1 的 localStorage 同步实现包一层 `Promise.resolve()` 即可；
 * 未来换成 fetch-based 后端实现时，UI 调用代码零改动。
 */

import type { ConsultationRecord, SaveRecordInput, VerificationStatus } from './types'

export interface ZhengStore {
  /** 返回所有记录，按 createdAt 倒序（新的在前） */
  listRecords(): Promise<ConsultationRecord[]>

  /** 按 id 查找；不存在返回 null */
  getRecord(id: string): Promise<ConsultationRecord | null>

  /** 写入一条新记录，自动生成 id / createdAt / schemaVersion / verification='unverified' */
  saveRecord(input: SaveRecordInput): Promise<ConsultationRecord>

  /**
   * 修改某条记录的应验状态。
   * - status === 'unverified' 时清空 verifiedAt
   * - 其他状态时把 verifiedAt 更新为当前时间
   * - 不存在返回 null
   */
  updateVerification(
    id: string,
    status: VerificationStatus,
    note?: string,
  ): Promise<ConsultationRecord | null>

  /** 删除一条记录；成功返回 true，不存在返回 false */
  deleteRecord(id: string): Promise<boolean>
}
