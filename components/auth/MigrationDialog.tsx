'use client'

import { useState } from 'react'

import { authErrorToMessage } from '@/lib/auth/errors'

type MigrationOption = 'merge' | 'cloudOnly' | 'export'

export type MigrationDialogProps = {
  localCount: number
  onMerge: () => Promise<void> | void
  onCloudOnly: () => Promise<void> | void
  onExport: () => Promise<void> | void
  onDefer: () => void
}

export function MigrationDialog({
  localCount,
  onMerge,
  onCloudOnly,
  onExport,
  onDefer,
}: MigrationDialogProps) {
  const [choice, setChoice] = useState<MigrationOption>('merge')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (localCount <= 0) return null

  const handlers: Record<MigrationOption, () => Promise<void> | void> = {
    merge: onMerge,
    cloudOnly: onCloudOnly,
    export: onExport,
  }

  async function handleConfirm() {
    setBusy(true)
    setError(null)
    try {
      await handlers[choice]()
    } catch (err) {
      setError(authErrorToMessage(err as Error) || '上传失败，请检查网络后重试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="card-classical bg-[var(--color-paper)] rounded-lg p-8 max-w-md w-full space-y-6">
        <header>
          <h2 className="font-serif text-xl text-[var(--color-ink-900)] font-bold">上云之前</h2>
          <p className="mt-2 text-sm font-serif text-[var(--color-ink-600)]">
            检测到本机有 <strong>{localCount}</strong> 条记录。选一种方式继续：
          </p>
        </header>

        <fieldset className="space-y-4">
          <label className="flex gap-3 cursor-pointer items-start">
            <input
              type="radio"
              name="migration-choice"
              value="merge"
              checked={choice === 'merge'}
              onChange={() => setChoice('merge')}
              disabled={busy}
              className="mt-1 accent-[var(--color-ink-900)]"
            />
            <span className="font-serif text-sm text-[var(--color-ink-800)]">
              <span className="font-bold">合并到云端账号</span>
              <span className="block text-xs text-[var(--color-ink-500)] mt-0.5">
                上传本机所有 {localCount} 条到你的账号，上传后本机清空
              </span>
            </span>
          </label>

          <label className="flex gap-3 cursor-pointer items-start">
            <input
              type="radio"
              name="migration-choice"
              value="cloudOnly"
              checked={choice === 'cloudOnly'}
              onChange={() => setChoice('cloudOnly')}
              disabled={busy}
              className="mt-1 accent-[var(--color-ink-900)]"
            />
            <span className="font-serif text-sm text-[var(--color-ink-800)]">
              <span className="font-bold">仅使用云端账号</span>
              <span className="block text-xs text-[var(--color-ink-500)] mt-0.5">
                本机数据保留但当前不可见。登出后又能看到
              </span>
            </span>
          </label>

          <label className="flex gap-3 cursor-pointer items-start">
            <input
              type="radio"
              name="migration-choice"
              value="export"
              checked={choice === 'export'}
              onChange={() => setChoice('export')}
              disabled={busy}
              className="mt-1 accent-[var(--color-ink-900)]"
            />
            <span className="font-serif text-sm text-[var(--color-ink-800)]">
              <span className="font-bold">先导出本机数据</span>
              <span className="block text-xs text-[var(--color-ink-500)] mt-0.5">
                下载 JSON 备份，备份后回到此弹窗再选其他选项
              </span>
            </span>
          </label>
        </fieldset>

        {error ? (
          <p
            role="alert"
            className="text-sm font-serif text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2"
          >
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={busy}
            onClick={onDefer}
            className="text-xs font-serif text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)] transition-colors disabled:opacity-40"
          >
            稍后再说
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleConfirm}
            className="text-sm font-serif px-5 py-2 rounded border border-[var(--color-ink-900)] text-[var(--color-ink-900)] hover:bg-[var(--color-ink-900)] hover:text-[var(--color-paper)] transition-colors disabled:opacity-40"
          >
            {busy ? '处理中…' : '确认'}
          </button>
        </div>
      </div>
    </div>
  )
}
