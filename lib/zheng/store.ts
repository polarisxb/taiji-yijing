/**
 * 「征」模块 — 顶层 store 入口
 *
 * v1: 总是用 localZhengStore
 * v2: 根据 useAuth() 切换 — `user ? remoteZhengStore : localZhengStore`
 *
 * 所有 UI 调用方（components/zheng/*、app/history/*）应该从这里 import zhengStore，
 * 切勿直接 import store-local。这样 v2 升级时此文件是唯一改动点。
 */

import { localZhengStore } from './store-local'
import type { ZhengStore } from './store-types'

export const zhengStore: ZhengStore = localZhengStore

export type { ZhengStore } from './store-types'
export type {
  AiConfidence,
  AiYaoPrediction,
  ConsultationRecord,
  ConsultMode,
  SavedYaoLocation,
  SaveRecordInput,
  VerificationStatus,
} from './types'
