'use client'

import { useState } from 'react'

type Props = {
  count: number
  onExportFirst: () => Promise<void> | void
  onConfirm: () => Promise<void> | void
  onCancel: () => void
}

const CONFIRM_PHRASE = '清空'

export function ClearAllDialog({ count, onExportFirst, onConfirm, onCancel }: Props) {
  const [step, setStep] = useState<'backup' | 'confirm'>('backup')
  const [phrase, setPhrase] = useState('')
  const [busy, setBusy] = useState(false)

  async function exportFirst() {
    setBusy(true)
    try {
      await onExportFirst()
    } finally {
      setBusy(false)
    }
  }

  async function confirm() {
    if (phrase.trim() !== CONFIRM_PHRASE) return
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="card-classical bg-[var(--color-paper)] rounded-lg p-8 max-w-md w-full space-y-6">
        {step === 'backup' ? (
          <>
            <header>
              <h2 className="font-serif text-xl text-[var(--color-ink-900)] font-bold">
                清空所有记录？
              </h2>
              <p className="mt-2 text-sm font-serif text-[var(--color-ink-700)] leading-relaxed">
                即将清空 <span className="font-bold">{count}</span> 条记录。强烈建议先导出备份。
              </p>
            </header>

            <div className="space-y-3">
              <button
                type="button"
                disabled={busy}
                onClick={exportFirst}
                className="w-full text-sm font-serif px-4 py-3 rounded border border-[var(--color-ink-900)] text-[var(--color-ink-900)] hover:bg-[var(--color-ink-900)] hover:text-[var(--color-paper)] transition-colors disabled:opacity-40"
              >
                先导出备份 →
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setStep('confirm')}
                className="w-full text-sm font-serif px-4 py-3 rounded border border-rose-600 text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-40"
              >
                跳过备份继续
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
          </>
        ) : (
          <>
            <header>
              <h2 className="font-serif text-xl text-[var(--color-ink-900)] font-bold">最终确认</h2>
              <p className="mt-2 text-sm font-serif text-[var(--color-ink-700)] leading-relaxed">
                请输入「<span className="font-bold">{CONFIRM_PHRASE}</span>
                」二字以确认。此操作不可撤销。
              </p>
            </header>

            <input
              type="text"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              autoFocus
              placeholder={CONFIRM_PHRASE}
              className="w-full p-3 border border-[var(--color-ink-200)] rounded text-sm font-serif text-[var(--color-ink-800)] focus:outline-none focus:border-rose-600 bg-transparent"
            />

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setStep('backup')
                  setPhrase('')
                }}
                className="text-xs font-serif px-3 py-2 text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)] transition-colors disabled:opacity-40"
              >
                返回
              </button>
              <button
                type="button"
                disabled={busy || phrase.trim() !== CONFIRM_PHRASE}
                onClick={confirm}
                className="text-sm font-serif px-4 py-2 rounded border border-rose-600 text-rose-700 hover:bg-rose-600 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? '清空中…' : '确认清空'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
