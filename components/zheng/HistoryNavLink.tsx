'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { zhengStore } from '@/lib/zheng/store'

/**
 * Auto-adaptive link to /history.
 * Renders nothing during SSR or when there are zero records.
 */
export function HistoryNavLink({ className }: { className?: string }) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    zhengStore.listRecords().then((records) => {
      if (alive) setCount(records.length)
    })
    return () => {
      alive = false
    }
  }, [])

  // Always show "履" for discoverability, even if 0 records (empty state will explain)
  // Only hide during initial SSR/hydration
  if (count === null) return null

  return (
    <Link
      href="/history"
      className={
        className ??
        'inline-flex items-center gap-1.5 text-sm font-serif text-[var(--color-vermillion)] hover:text-[var(--color-ink-900)] transition-colors border border-[var(--color-vermillion)] px-3 py-1 rounded hover:bg-[var(--color-vermillion)] hover:text-white'
      }
    >
      <span>履</span>
      {count > 0 && (
        <span className="inline-flex items-center justify-center min-w-[1.1em] h-[1.1em] text-[10px] font-mono bg-current/10 rounded-full px-1 leading-none">
          {count}
        </span>
      )}
    </Link>
  )
}
