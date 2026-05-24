/**
 * 「征」模块 — 咨询历史 + 回访应验
 *
 * 设计原则：
 * - 数据模型为 v2（账号体系 + 云端存储）预留迁移路径
 * - id 用 crypto.randomUUID() 确保跨环境唯一
 * - schemaVersion 用于未来 schema 升级时 in-place 迁移
 * - userId / syncedAt 为 v2 服务端字段，v1 全部 undefined
 */

export type VerificationStatus = 'unverified' | 'fulfilled' | 'partial' | 'unfulfilled'

export type SavedYaoLocation = {
  topPosition: 1 | 2 | 3 | 4 | 5 | 6
  topYaoName: string
  topRatio: number
  crossYaoPosition?: 1 | 2 | 3 | 4 | 5 | 6
  crossYaoName?: string
}

export type AiConfidence = 'high' | 'medium' | 'low'

export type AiYaoPrediction = {
  position: 1 | 2 | 3 | 4 | 5 | 6
  name: string
  brief: string
  confidence: AiConfidence
}

export type ConsultMode = 'classic' | 'ai'

export type ConsultationRecord = {
  /** 全局唯一 ID（UUID v4），迁移到后端无需重映射 */
  id: string
  /** 显式版本号，未来 schema 升级时读到老条目可 in-place 升级 */
  schemaVersion: 1
  /** Date.now() epoch ms */
  createdAt: number
  /** 用户提交的原始情境文本 */
  situation: string
  /** 1..64 */
  hexagramId: number
  /** "乾" / "屯" / ... */
  hexagramName: string
  /** matcher 给出的契合度 0..1 */
  fitScore: number
  /** YaoLocator 定位结果（用户没用 locator 时 undefined） */
  yaoLocation?: SavedYaoLocation
  /** AI 模式独有：模型对爻位的判断（与 yaoLocation 互斥；不污染经典 matcher 数据） */
  aiYao?: AiYaoPrediction
  /** 此条记录来自哪种问询模式；老记录可能为 undefined */
  consultMode?: ConsultMode
  /** 保存时可选的"我打算怎么做" */
  userNote?: string
  /** 初始 "unverified"，回访时改成 fulfilled/partial/unfulfilled */
  verification: VerificationStatus
  /** 回访时可选的反思笔记 */
  verificationNote?: string
  /** 标注应验时的时间戳；改回 unverified 时清空 */
  verifiedAt?: number
  /** v2 预留：上云后由服务端写入 */
  userId?: string
  /** v2 预留：上次成功同步到后端的时间戳 */
  syncedAt?: number
}

/**
 * 保存时调用方提供的字段（不含系统字段 id/schemaVersion/createdAt/verification/userId/syncedAt）。
 */
export type SaveRecordInput = Omit<
  ConsultationRecord,
  'id' | 'schemaVersion' | 'createdAt' | 'verification' | 'userId' | 'syncedAt'
>
