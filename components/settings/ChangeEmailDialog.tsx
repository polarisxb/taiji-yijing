'use client'

import { useState, type FormEvent } from 'react'
import type { AuthMethodResult } from '@/lib/auth/auth-context'
import { authErrorToMessage } from '@/lib/auth/errors'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type ChangeEmailDialogProps = {
  open: boolean
  currentEmail: string
  onClose: () => void
  updateEmail: (email: string) => Promise<AuthMethodResult>
}

export function ChangeEmailDialog({
  open,
  currentEmail,
  onClose,
  updateEmail,
}: ChangeEmailDialogProps) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!open) return null

  const valid = EMAIL_RE.test(email) && email !== currentEmail

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    setSubmitting(true)
    setError(null)
    const { error: err } = await updateEmail(email)
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
        <h2 className="font-serif text-xl text-[var(--color-ink-900)] font-bold">修改邮箱</h2>

        {success ? (
          <div className="space-y-4">
            <p className="text-sm font-serif text-[var(--color-ink-700)]">
              验证邮件已发送到 <span className="font-bold">{email}</span>
              。请点击邮件中的 link 完成邮箱变更。
            </p>
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
            <p className="text-xs font-serif text-[var(--color-ink-500)]">
              当前邮箱：{currentEmail}
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="新邮箱"
              autoComplete="email"
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
                {submitting ? '发送中…' : '发送验证邮件'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
