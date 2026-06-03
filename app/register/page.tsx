'use client'

import Link from 'next/link'
import { Suspense } from 'react'

import { Atmosphere } from '@/components/Atmosphere'
import { EmailAuthForm } from '@/components/auth/EmailAuthForm'

export default function RegisterPage() {
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
            <h1 className="font-serif text-lg text-[var(--color-ink-800)]">注册</h1>
            <p className="text-xs font-serif text-[var(--color-ink-500)]">
              创建账号以备份你的决策档案到云端
            </p>
          </header>
          <Suspense fallback={null}>
            <EmailAuthForm mode="register" />
          </Suspense>
        </div>
      </main>
    </>
  )
}
