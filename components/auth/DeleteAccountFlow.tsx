'use client'

/**
 * 注销账号 4 步流程：
 *   1. warning  ——   提示数据量 + 30 天软删 + 可撤回
 *   2. backup   ——   建议先导出 JSON / Markdown 备份
 *   3. confirm  ——   输入"注销账号"四字才能提交
 *   4. done     ——   完成提示 + 返回主页
 *
 * 不在此组件内做 sign-out 或 redirect；由 onDeleted 回调交给父组件处理。
 */

import { useState, type FormEvent } from 'react'
import type { AuthMethodResult } from '@/lib/auth/auth-context'
import { authErrorToMessage } from '@/lib/auth/errors'

const CONFIRM_PHRASE = '注销账号'

type Step = 'warning' | 'backup' | 'confirm' | 'done'

export type DeleteAccountFlowProps = {
  open: boolean
  recordCount: number
  requestAccountDeletion: () => Promise<AuthMethodResult>
  onClose: () => void
  /** 注销成功 + 用户在 done 步骤点 "返回主页" 后调用，应触发 signOut + redirect */
  onDeleted: () => void
  onExportJson: () => Promise<void> | void
  onExportMarkdown: () => Promise<void> | void
}

export function DeleteAccountFlow({
  open,
  recordCount,
  requestAccountDeletion,
  onClose,
  onDeleted,
  onExportJson,
  onExportMarkdown,
}: DeleteAccountFlowProps) {
  const [step, setStep] = useState<Step>('warning')
  const [phrase, setPhrase] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function handleConfirm(e: FormEvent) {
    e.preventDefault()
    if (phrase.trim() !== CONFIRM_PHRASE) return
    setSubmitting(true)
    setError(null)
    const { error: err } = await requestAccountDeletion()
    setSubmitting(false)
    if (err) {
      setError(authErrorToMessage(err))
      return
    }
    setStep('done')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="card-classical bg-[var(--color-paper)] rounded-lg p-8 max-w-md w-full space-y-5">
        {step === 'warning' && (
          <>
            <header>
              <h2 className="font-serif text-xl text-rose-700 font-bold">⚠️ 注销账号</h2>
              <p className="mt-3 text-sm font-serif text-[var(--color-ink-700)] leading-relaxed">
                你将删除：
              </p>
              <ul className="mt-2 ml-4 text-sm font-serif text-[var(--color-ink-700)] list-disc space-y-1">
                <li>
                  <span className="font-bold">{recordCount}</span> 条云端记录
                </li>
                <li>你的账号信息（邮箱 / 手机号）</li>
              </ul>
              <p className="mt-3 text-sm font-serif text-[var(--color-ink-700)] leading-relaxed">
                注销后 30 天内可登录撤回；30 天后所有数据永久删除。
              </p>
            </header>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-serif px-4 py-2 rounded border border-[var(--color-ink-200)] text-[var(--color-ink-700)] hover:border-[var(--color-ink-900)] hover:text-[var(--color-ink-900)] transition-colors"
              >
                我再想想
              </button>
              <button
                type="button"
                onClick={() => setStep('backup')}
                className="text-sm font-serif px-4 py-2 rounded border border-rose-600 text-rose-700 hover:bg-rose-50 transition-colors"
              >
                继续 →
              </button>
            </div>
          </>
        )}

        {step === 'backup' && (
          <>
            <header>
              <h2 className="font-serif text-xl text-[var(--color-ink-900)] font-bold">
                建议先备份你的数据
              </h2>
              <p className="mt-2 text-sm font-serif text-[var(--color-ink-700)] leading-relaxed">
                如果注销后又改主意，30 天内可登录撤回。但保险起见，先导出一份吧。
              </p>
            </header>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => void onExportJson()}
                className="w-full text-sm font-serif px-4 py-3 rounded border border-[var(--color-ink-900)] text-[var(--color-ink-900)] hover:bg-[var(--color-ink-900)] hover:text-[var(--color-paper)] transition-colors"
              >
                导出 JSON
              </button>
              <button
                type="button"
                onClick={() => void onExportMarkdown()}
                className="w-full text-sm font-serif px-4 py-3 rounded border border-[var(--color-ink-900)] text-[var(--color-ink-900)] hover:bg-[var(--color-ink-900)] hover:text-[var(--color-paper)] transition-colors"
              >
                导出 Markdown
              </button>
              <button
                type="button"
                onClick={() => setStep('confirm')}
                className="w-full text-sm font-serif px-4 py-3 rounded border border-rose-600 text-rose-700 hover:bg-rose-50 transition-colors"
              >
                已备份，继续 →
              </button>
              <button
                type="button"
                onClick={() => setStep('warning')}
                className="w-full text-xs font-serif px-3 py-2 text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)] transition-colors"
              >
                返回上一步
              </button>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            <header>
              <h2 className="font-serif text-xl text-[var(--color-ink-900)] font-bold">最终确认</h2>
              <p className="mt-2 text-sm font-serif text-[var(--color-ink-700)] leading-relaxed">
                请输入「<span className="font-bold">{CONFIRM_PHRASE}</span>」四字以确认。
              </p>
            </header>
            <form onSubmit={handleConfirm} className="space-y-4">
              <input
                type="text"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                autoFocus
                placeholder={CONFIRM_PHRASE}
                disabled={submitting}
                className="w-full px-3 py-2 border border-[var(--color-ink-200)] rounded text-sm font-serif text-[var(--color-ink-800)] bg-transparent focus:outline-none focus:border-rose-600 disabled:opacity-60"
              />

              {error ? (
                <p
                  role="alert"
                  className="text-sm font-serif text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2"
                >
                  {error}
                </p>
              ) : null}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setStep('backup')
                    setPhrase('')
                  }}
                  className="text-xs font-serif px-3 py-2 text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)] transition-colors"
                >
                  返回
                </button>
                <button
                  type="submit"
                  disabled={submitting || phrase.trim() !== CONFIRM_PHRASE}
                  className="text-sm font-serif px-4 py-2 rounded border border-rose-600 text-rose-700 hover:bg-rose-600 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? '注销中…' : '确认注销'}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 'done' && (
          <>
            <header>
              <h2 className="font-serif text-xl text-[var(--color-ink-900)] font-bold">
                账号已注销
              </h2>
              <p className="mt-3 text-sm font-serif text-[var(--color-ink-700)] leading-relaxed">
                30 天内仍可用同样的邮箱 / 手机号登录撤回。30 天后所有数据将永久删除。
              </p>
            </header>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onDeleted}
                className="text-sm font-serif px-4 py-2 rounded border border-[var(--color-ink-900)] text-[var(--color-ink-900)] hover:bg-[var(--color-ink-900)] hover:text-[var(--color-paper)] transition-colors"
              >
                返回主页（匿名态）
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
