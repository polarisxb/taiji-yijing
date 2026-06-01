'use client'

import Link from 'next/link'
import { useState } from 'react'

import { useAuth } from '@/lib/auth/use-auth'

export function AccountSection() {
  const { user, loading, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  if (loading) {
    return (
      <section className="space-y-3">
        <h2 className="font-serif text-sm tracking-wider text-[var(--color-ink-400)]">账号</h2>
        <div className="rounded-lg border border-[var(--color-ink-200)] p-4 text-xs font-serif text-[var(--color-ink-400)]">
          加载中…
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <h2 className="font-serif text-sm tracking-wider text-[var(--color-ink-400)]">账号</h2>

      {user ? (
        <div className="rounded-lg border border-[var(--color-ink-200)] p-4 space-y-3">
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="text-xs font-serif text-[var(--color-ink-400)]">已登录</div>
              <div className="font-serif text-sm text-[var(--color-ink-900)] mt-0.5 break-all">
                {user.email ?? user.id}
              </div>
            </div>
            <button
              type="button"
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true)
                try {
                  await signOut()
                } finally {
                  setSigningOut(false)
                }
              }}
              className="text-xs font-serif px-3 py-1.5 rounded border border-[var(--color-ink-700)] text-[var(--color-ink-700)] hover:bg-[var(--color-ink-900)] hover:text-[var(--color-paper)] hover:border-[var(--color-ink-900)] transition-colors disabled:opacity-40 shrink-0"
            >
              {signingOut ? '退出中…' : '退出登录'}
            </button>
          </div>
          <p className="text-xs font-serif text-[var(--color-ink-500)]">
            登录后，记录同步到云端，多设备可见
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--color-ink-200)] p-4 space-y-3">
          <p className="text-xs font-serif text-[var(--color-ink-600)]">
            当前未登录。记录仅保存在此设备本机；登录后可同步到云端，多设备可见。
          </p>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="text-xs font-serif px-4 py-2 rounded border border-[var(--color-ink-900)] text-[var(--color-ink-900)] hover:bg-[var(--color-ink-900)] hover:text-[var(--color-paper)] transition-colors"
            >
              登录
            </Link>
            <Link
              href="/register"
              className="text-xs font-serif px-4 py-2 rounded border border-[var(--color-ink-300)] text-[var(--color-ink-600)] hover:border-[var(--color-ink-900)] hover:text-[var(--color-ink-900)] transition-colors"
            >
              注册
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
