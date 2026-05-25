'use client'

import { useState, type FormEvent } from 'react'
import type { AuthMethodResult } from '@/lib/auth/auth-context'
import { authErrorToMessage } from '@/lib/auth/errors'

export type ChangePasswordDialogProps = {
  open: boolean
  onClose: () => void
  updatePassword: (pw: string) => Promise<AuthMethodResult>
}

export function ChangePasswordDialog({ open, onClose, updatePassword }: ChangePasswordDialogProps) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!open) return null

  const valid = pw.length >= 6 && pw === pw2

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    setSubmitting(true)
    setError(null)
    const { error: err } = await updatePassword(pw)
    setSubmitting(false)
    if (err) {
      setError(authErrorToMessage(err))
      return
    }
    setSuccess(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="card-classical bg-[var(--color-paper)] rounded-lg p-8 max-w-md w-full space-y-5">
        <h2 className="font-serif text-xl text-[var(--color-ink-900)] font-bold">修改密码</h2>

        {success ? (
          <div className="space-y-4">
            <p className="text-sm font-serif text-[var(--color-ink-700)]">密码已修改</p>
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-serif px-4 py-2 rounded border border-[var(--color-ink-900)] text-[var(--color-ink-900)] hover:bg-[var(--color-ink-900)] hover:text-[var(--color-paper)] transition-colors"
            >
              关闭
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="新密码（至少 6 位）"
              minLength={6}
              autoComplete="new-password"
              disabled={submitting}
              className="w-full px-3 py-2 border border-[var(--color-ink-200)] rounded text-sm font-serif text-[var(--color-ink-900)] bg-transparent focus:outline-none focus:border-[var(--color-ink-700)] disabled:opacity-60"
            />
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="再输入一次"
              autoComplete="new-password"
              disabled={submitting}
              className="w-full px-3 py-2 border border-[var(--color-ink-200)] rounded text-sm font-serif text-[var(--color-ink-900)] bg-transparent focus:outline-none focus:border-[var(--color-ink-700)] disabled:opacity-60"
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
                onClick={onClose}
                className="text-xs font-serif px-3 py-2 text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)] transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!valid || submitting}
                className="text-sm font-serif px-4 py-2 rounded border border-[var(--color-ink-900)] text-[var(--color-ink-900)] hover:bg-[var(--color-ink-900)] hover:text-[var(--color-paper)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? '修改中…' : '确认修改'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
