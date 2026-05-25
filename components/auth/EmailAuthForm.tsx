'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { authErrorToMessage } from '@/lib/auth/errors'
import { useAuth } from '@/lib/auth/use-auth'

type Mode = 'login' | 'register'

export type EmailAuthFormProps = {
  mode: Mode
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function EmailAuthForm({ mode }: EmailAuthFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams?.get('next') ?? '/'

  const { signInWithPassword, signUpWithPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  function validate(): string | null {
    if (!EMAIL_RE.test(email)) return '邮箱格式不正确'
    if (password.length < 6) return '密码至少 6 位'
    if (mode === 'register' && !agreed) return '请先阅读并同意《用户服务条款》和《隐私政策》'
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const v = validate()
    if (v) {
      setFormError(v)
      return
    }
    setSubmitting(true)
    setFormError(null)
    setSuccessMsg(null)

    const action = mode === 'login' ? signInWithPassword : signUpWithPassword
    const { error } = await action(email, password)

    if (error) {
      setFormError(authErrorToMessage(error))
      setSubmitting(false)
      return
    }

    if (mode === 'register') {
      setSuccessMsg('注册成功！请到邮箱点击验证 link 后再登录。')
      setSubmitting(false)
      return
    }

    router.push(next)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <label htmlFor="email" className="block text-xs font-serif text-[var(--color-ink-500)]">
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

      <div className="space-y-1">
        <label
          htmlFor="password"
          className="flex justify-between items-baseline text-xs font-serif text-[var(--color-ink-500)]"
        >
          <span>密码</span>
          {mode === 'login' ? (
            <Link
              href="/auth/forgot-password"
              className="text-xs text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)] underline"
            >
              忘记密码？
            </Link>
          ) : null}
        </label>
        <input
          id="password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
          className="w-full px-3 py-2 border border-[var(--color-ink-200)] rounded text-sm font-serif text-[var(--color-ink-900)] focus:outline-none focus:border-[var(--color-ink-700)] bg-transparent disabled:opacity-60"
          placeholder={mode === 'login' ? '至少 6 位' : '至少 6 位，建议字母 + 数字'}
          minLength={6}
          required
        />
      </div>

      {mode === 'register' ? (
        <label className="flex gap-2 items-start text-xs font-serif text-[var(--color-ink-600)]">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            disabled={submitting}
            className="mt-0.5 accent-[var(--color-ink-900)]"
          />
          <span>
            我已阅读并同意
            <Link
              href="/terms"
              className="underline hover:text-[var(--color-ink-900)] mx-1"
              target="_blank"
            >
              《用户服务条款》
            </Link>
            和
            <Link
              href="/privacy"
              className="underline hover:text-[var(--color-ink-900)] mx-1"
              target="_blank"
            >
              《隐私政策》
            </Link>
          </span>
        </label>
      ) : null}

      {formError ? (
        <p
          role="alert"
          className="text-sm font-serif text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2"
        >
          {formError}
        </p>
      ) : null}

      {successMsg ? (
        <p
          role="status"
          className="text-sm font-serif text-[var(--color-ink-800)] bg-[var(--color-paper-soft,#f5efe6)] border border-[var(--color-ink-200)] rounded px-3 py-2"
        >
          {successMsg}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full text-sm font-serif px-4 py-3 rounded border border-[var(--color-ink-900)] text-[var(--color-ink-900)] hover:bg-[var(--color-ink-900)] hover:text-[var(--color-paper)] transition-colors disabled:opacity-40"
      >
        {submitting ? '处理中…' : mode === 'login' ? '登录' : '注册'}
      </button>

      <p className="text-xs font-serif text-center text-[var(--color-ink-500)]">
        {mode === 'login' ? (
          <>
            还没账号？
            <Link href="/register" className="underline ml-1 hover:text-[var(--color-ink-900)]">
              去注册
            </Link>
          </>
        ) : (
          <>
            已有账号？
            <Link href="/login" className="underline ml-1 hover:text-[var(--color-ink-900)]">
              去登录
            </Link>
          </>
        )}
      </p>
    </form>
  )
}
