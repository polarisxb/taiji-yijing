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

  if (count === null || count === 0) return null

  return (
    <Link
      href="/history"
      className={
        className ??
        'text-xs font-serif text-[var(--color-ink-400)] hover:text-[var(--color-vermillion)] transition-colors'
      }
    >
      履（{count}）
    </Link>
  )
}
