'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'

import { Atmosphere } from '@/components/Atmosphere'
import { authErrorToMessage } from '@/lib/auth/errors'
import { useAuth } from '@/lib/auth/use-auth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordPage() {
  const { resetPasswordForEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(email)) {
      setError('邮箱格式不正确')
      return
    }
    setSubmitting(true)
    setError(null)
    const { error: err } = await resetPasswordForEmail(email)
    if (err) {
      setError(authErrorToMessage(err))
      setSubmitting(false)
      return
    }
    setSent(true)
    setSubmitting(false)
  }

  return (
    <>
      <Atmosphere />
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="card-classical bg-[var(--color-paper)] rounded-lg p-8 max-w-md w-full space-y-6 shadow-sm">
          <header className="text-center space-y-2">
            <Link href="/" className="block">
              <span className="font-serif text-2xl text-[var(--color-ink-900)] font-bold">
                太极
              </span>
            </Link>
            <h1 className="font-serif text-lg text-[var(--color-ink-800)]">忘记密码</h1>
          </header>

          {sent ? (
            <div className="space-y-4">
              <p
                role="status"
                className="text-sm font-serif text-[var(--color-ink-800)] bg-[var(--color-paper-soft,#f5efe6)] border border-[var(--color-ink-200)] rounded px-3 py-3 text-center"
              >
                已发送密码重置 link 到 <strong>{email}</strong>
                <br />
                请到邮箱点击 link 设置新密码
              </p>
              <Link
                href="/login"
                className="block text-center text-sm font-serif underline text-[var(--color-ink-600)] hover:text-[var(--color-ink-900)]"
              >
                返回登录
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-xs font-serif text-[var(--color-ink-500)]">
                输入你的注册邮箱，我们会发一封含重置 link 的邮件给你
              </p>
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="block text-xs font-serif text-[var(--color-ink-500)]"
                >
                  邮箱
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-[var(--color-ink-200)] rounded text-sm font-serif text-[var(--color-ink-900)] focus:outline-none focus:border-[var(--color-ink-700)] bg-transparent disabled:opacity-60"
                  placeholder="you@example.com"
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
                {submitting ? '发送中…' : '发送重置 link'}
              </button>

              <p className="text-xs font-serif text-center text-[var(--color-ink-500)]">
                <Link href="/login" className="underline hover:text-[var(--color-ink-900)]">
                  返回登录
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </>
  )
}
