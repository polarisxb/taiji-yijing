'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { authErrorToMessage } from '@/lib/auth/errors'
import { useAuth } from '@/lib/auth/use-auth'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setError('密码至少 6 位')
      return
    }
    if (password !== confirm) {
      setError('两次输入的密码不一致')
      return
    }
    setSubmitting(true)
    setError(null)
    const { error: err } = await updatePassword(password)
    if (err) {
      setError(authErrorToMessage(err))
      setSubmitting(false)
      return
    }
    setDone(true)
    setSubmitting(false)
    setTimeout(() => router.push('/'), 1500)
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-[var(--color-paper-soft,var(--color-paper))]">
      <div className="card-classical bg-[var(--color-paper)] rounded-lg p-8 max-w-md w-full space-y-6 shadow-sm">
        <header className="text-center space-y-2">
          <Link href="/" className="block">
            <span className="font-serif text-2xl text-[var(--color-ink-900)] font-bold">太极</span>
          </Link>
          <h1 className="font-serif text-lg text-[var(--color-ink-800)]">设置新密码</h1>
          <p className="text-xs font-serif text-[var(--color-ink-500)]">
            请使用来自邮箱的 link 进入此页面后再操作
          </p>
        </header>

        {done ? (
          <p
            role="status"
            className="text-sm font-serif text-[var(--color-ink-800)] bg-[var(--color-paper-soft,#f5efe6)] border border-[var(--color-ink-200)] rounded px-3 py-3 text-center"
          >
            新密码已设置，正在跳转到主页…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label htmlFor="pw1" className="block text-xs font-serif text-[var(--color-ink-500)]">
                新密码
              </label>
              <input
                id="pw1"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                minLength={6}
                className="w-full px-3 py-2 border border-[var(--color-ink-200)] rounded text-sm font-serif text-[var(--color-ink-900)] focus:outline-none focus:border-[var(--color-ink-700)] bg-transparent disabled:opacity-60"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="pw2" className="block text-xs font-serif text-[var(--color-ink-500)]">
                确认新密码
              </label>
              <input
                id="pw2"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={submitting}
                minLength={6}
                className="w-full px-3 py-2 border border-[var(--color-ink-200)] rounded text-sm font-serif text-[var(--color-ink-900)] focus:outline-none focus:border-[var(--color-ink-700)] bg-transparent disabled:opacity-60"
                required
              />
            </div>

            {error ? (
              <p
                role="alert"
                className="text-sm font-serif text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full text-sm font-serif px-4 py-3 rounded border border-[var(--color-ink-900)] text-[var(--color-ink-900)] hover:bg-[var(--color-ink-900)] hover:text-[var(--color-paper)] transition-colors disabled:opacity-40"
            >
              {submitting ? '保存中…' : '保存新密码'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
