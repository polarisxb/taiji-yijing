'use client'

/**
 * 注销账号撤回 banner。
 *
 * 在用户登录后顶部显示，当 user.user_metadata.deleted_at 存在（30 天软删窗口内）时渲染：
 * - 显示剩余可撤回天数
 * - 提供 [恢复账号] 按钮触发 restoreAccount
 *
 * deleted_at 已超过 30 天时 RLS 会在登录时拒绝（实际上账号会被清理 cron 删除），
 * 因此此组件假设 deleted_at 一定在 30 天内；超出场景由上层 banner 不渲染。
 */

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { AuthMethodResult } from '@/lib/auth/auth-context'
import { authErrorToMessage } from '@/lib/auth/errors'

const RESTORE_WINDOW_DAYS = 30

export type RestoreAccountBannerProps = {
  user: User | null
  restoreAccount: () => Promise<AuthMethodResult>
  /** 注入"现在"epoch ms 用于测试；默认 Date.now() */
  now?: number
}

export function RestoreAccountBanner({ user, restoreAccount, now }: RestoreAccountBannerProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restored, setRestored] = useState(false)

  if (!user) return null

  const metadata = (user.user_metadata ?? {}) as { deleted_at?: number }
  const deletedAtSec = typeof metadata.deleted_at === 'number' ? metadata.deleted_at : null
  if (deletedAtSec === null) return null

  const nowMs = now ?? Date.now()
  const elapsedDays = Math.floor((nowMs / 1000 - deletedAtSec) / 86400)
  const daysLeft = Math.max(0, RESTORE_WINDOW_DAYS - elapsedDays)

  async function handleRestore() {
    setSubmitting(true)
    setError(null)
    const { error: err } = await restoreAccount()
    setSubmitting(false)
    if (err) {
      setError(authErrorToMessage(err))
      return
    }
    setRestored(true)
  }

  return (
    <div
      role="region"
      aria-label="账号注销 banner"
      className="border border-amber-300 bg-amber-50 text-amber-900 rounded-lg px-4 py-3 text-sm font-serif"
    >
      {restored ? (
        <p>账号已恢复。请刷新页面后正常使用。</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="space-y-1">
            <p className="font-bold">账号已注销，30 天内可恢复</p>
            <p className="text-xs text-amber-800">{daysLeft} 天后所有数据永久删除</p>
            {error ? (
              <p role="alert" className="text-xs text-rose-700">
                {error}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={handleRestore}
            className="text-sm font-serif px-4 py-2 rounded border border-amber-700 text-amber-900 hover:bg-amber-100 transition-colors disabled:opacity-40 shrink-0"
          >
            {submitting ? '恢复中…' : '恢复账号'}
          </button>
        </div>
      )}
    </div>
  )
}
