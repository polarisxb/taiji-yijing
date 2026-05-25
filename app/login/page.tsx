'use client'

import Link from 'next/link'
import { Suspense } from 'react'

import { EmailAuthForm } from '@/components/auth/EmailAuthForm'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-[var(--color-paper-soft,var(--color-paper))]">
      <div className="card-classical bg-[var(--color-paper)] rounded-lg p-8 max-w-md w-full space-y-6 shadow-sm">
        <header className="text-center space-y-2">
          <Link href="/" className="block">
            <span className="font-serif text-2xl text-[var(--color-ink-900)] font-bold">太极</span>
          </Link>
          <h1 className="font-serif text-lg text-[var(--color-ink-800)]">登录</h1>
          <p className="text-xs font-serif text-[var(--color-ink-500)]">
            登录后，你的记录将同步到云端，多设备可见
          </p>
        </header>
        <Suspense fallback={null}>
          <EmailAuthForm mode="login" />
        </Suspense>
      </div>
    </main>
  )
}
