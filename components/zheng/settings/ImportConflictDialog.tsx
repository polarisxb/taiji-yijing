'use client'

import { useState } from 'react'
import type { ZhengExport } from '@/lib/zheng/export-schema'

type Props = {
  incoming: ZhengExport
  existingCount: number
  onConfirm: (mode: 'merge' | 'overwrite') => Promise<void> | void
  onCancel: () => void
}

export function ImportConflictDialog({ incoming, existingCount, onConfirm, onCancel }: Props) {
  const [busy, setBusy] = useState(false)
  const [overwriteConfirming, setOverwriteConfirming] = useState(false)

  async function handle(mode: 'merge' | 'overwrite') {
    setBusy(true)
    try {
      await onConfirm(mode)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="card-classical bg-[var(--color-paper)] rounded-lg p-8 max-w-md w-full space-y-6">
        <header>
          <h2 className="font-serif text-xl text-[var(--color-ink-900)] font-bold">导入记录</h2>
        </header>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm font-serif text-[var(--color-ink-700)]">
          <dt className="text-[var(--color-ink-400)]">文件导出于</dt>
          <dd>{new Date(incoming.exportedAt).toLocaleString()}</dd>
          <dt className="text-[var(--color-ink-400)]">文件中记录数</dt>
          <dd>{incoming.recordCount}</dd>
          <dt className="text-[var(--color-ink-400)]">当前本地记录数</dt>
          <dd>{existingCount}</dd>
        </dl>

        {!overwriteConfirming ? (
          <div className="space-y-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => handle('merge')}
              className="w-full text-sm font-serif px-4 py-3 rounded border border-[var(--color-ink-900)] text-[var(--color-ink-900)] hover:bg-[var(--color-ink-900)] hover:text-[var(--color-paper)] transition-colors disabled:opacity-40"
            >
              合并到当前（保留两边数据）
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setOverwriteConfirming(true)}
              className="w-full text-sm font-serif px-4 py-3 rounded border border-rose-600 text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-40"
            >
              替换当前（将删除现有 {existingCount} 条）
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="w-full text-xs font-serif px-3 py-2 text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)] transition-colors disabled:opacity-40"
            >
              取消
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-serif text-rose-700">
              确认替换？这将删除当前 {existingCount} 条记录，无法撤销。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => setOverwriteConfirming(false)}
                className="text-xs font-serif px-3 py-2 text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)] transition-colors disabled:opacity-40"
              >
                返回
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handle('overwrite')}
                className="text-sm font-serif px-4 py-2 rounded border border-rose-600 text-rose-700 hover:bg-rose-600 hover:text-white transition-colors disabled:opacity-40"
              >
                {busy ? '替换中…' : '确认替换'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
