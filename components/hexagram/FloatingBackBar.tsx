'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'

function BackBarInner() {
  const searchParams = useSearchParams()
  const fromConsult = searchParams.get('from') === 'consult'

  if (!fromConsult) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-paper)]/90 backdrop-blur-sm border-b border-[var(--color-ink-100)]">
      <div className="max-w-3xl mx-auto px-6 py-3 flex items-center">
        <Link
          href="/"
          className="text-xs font-serif text-[var(--color-ink-600)] hover:text-[var(--color-vermillion)] transition-colors duration-200 flex items-center gap-2"
        >
          <span>←</span>
          <span>回到问卦结果</span>
        </Link>
      </div>
    </div>
  )
}

export function FloatingBackBar() {
  return (
    <Suspense fallback={null}>
      <BackBarInner />
    </Suspense>
  )
}
