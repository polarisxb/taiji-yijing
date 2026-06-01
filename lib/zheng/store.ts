/**
 * 「征」模块 — 顶层 store 入口
 *
 * v2 (A 包 A1)：根据 auth 状态切换底层 store
 *   未登录 → localZhengStore（localStorage 主存）
 *   登录   → remoteZhengStore（Supabase 云端）
 *
 * 所有 UI 调用方（components/zheng/*、app/history/*）应该从这里 import zhengStore，
 * 切勿直接 import store-local / store-remote。
 */

import { createBrowserClient } from '@/lib/supabase/client'

import { localZhengStore } from './store-local'
import { makeRemoteZhengStore } from './store-remote'
import type { ImportMode, ZhengStore } from './store-types'
import type { ConsultationRecord, SaveRecordInput, VerificationStatus } from './types'

export type SwitchingStoreDeps = {
  getUserId: () => string | null
  localStore: ZhengStore
  remoteStore: ZhengStore
}

/**
 * 工厂函数：根据 getUserId 当前返回值在每次方法调用时挑选 local / remote。
 *
 * 方法 dispatch 是惰性的——`getUserId()` 在每个方法调用瞬时求值，因此
 * 登录 / 登出态切换无需重新获取 store 实例。
 */
export function makeSwitchingZhengStore(deps: SwitchingStoreDeps): ZhengStore {
  const active = (): ZhengStore => (deps.getUserId() ? deps.remoteStore : deps.localStore)
  return {
    listRecords: () => active().listRecords(),
    getRecord: (id: string) => active().getRecord(id),
    saveRecord: (input: SaveRecordInput) => active().saveRecord(input),
    updateVerification: (id: string, status: VerificationStatus, note?: string) =>
      active().updateVerification(id, status, note),
    deleteRecord: (id: string) => active().deleteRecord(id),
    clearAll: () => active().clearAll(),
    importRecords: (records: ConsultationRecord[], mode: ImportMode) =>
      active().importRecords(records, mode),
  }
}

// =====================================================
// 模块级单例：浏览器端订阅 onAuthStateChange 维护 currentUserId
// =====================================================

let _currentUserId: string | null = null

function getCurrentUserId(): string | null {
  return _currentUserId
}

/** Test-only：直接设置 currentUserId（不要在生产代码用） */
export function __setCurrentUserIdForTesting(uid: string | null): void {
  _currentUserId = uid
}

if (typeof window !== 'undefined') {
  const supabase = createBrowserClient()
  if (supabase) {
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        _currentUserId = data.session?.user?.id ?? null
      })
      .catch(() => {
        // 初始化拉取失败视为未登录
        _currentUserId = null
      })
    supabase.auth.onAuthStateChange((_event, session) => {
      _currentUserId = session?.user?.id ?? null
    })
  }
}

const _remoteStore: ZhengStore = makeRemoteZhengStore({
  getSupabase: () => {
    const c = createBrowserClient()
    if (!c) throw new Error('Supabase 未配置')
    return c
  },
  getUserId: getCurrentUserId,
})

export const zhengStore: ZhengStore = makeSwitchingZhengStore({
  getUserId: getCurrentUserId,
  localStore: localZhengStore,
  remoteStore: _remoteStore,
})

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
