'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { Atmosphere } from '@/components/Atmosphere'
import { RestoreAccountBanner } from '@/components/auth/RestoreAccountBanner'
import { useAuth } from '@/lib/auth/use-auth'

export default function RestoreAccountPage() {
  const { user, loading, restoreAccount } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/login?next=/auth/restore')
  }, [loading, user, router])

  return (
    <>
      <Atmosphere />
      <main className="relative z-10 max-w-2xl mx-auto px-6 py-16 md:py-24 space-y-8">
        <header className="text-center space-y-2">
          <Link href="/" className="block">
            <span className="font-serif text-2xl text-[var(--color-ink-900)] font-bold">太极</span>
          </Link>
          <h1 className="font-serif text-3xl text-[var(--color-ink-900)]">恢复账号</h1>
          <p className="text-xs font-serif text-[var(--color-ink-500)]">
            30 天软删窗口内可点击下方按钮恢复你的账号
          </p>
        </header>

        {loading ? (
          <p className="text-center text-xs font-serif text-[var(--color-ink-400)]">加载中…</p>
        ) : user ? (
          <RestoreAccountBanner user={user} restoreAccount={restoreAccount} />
        ) : null}

        <footer className="text-center">
          <Link
            href="/"
            className="text-xs font-serif text-[var(--color-ink-400)] hover:text-[var(--color-vermillion)] transition-colors"
          >
            ← 回主页
          </Link>
        </footer>
      </main>
    </>
  )
}
