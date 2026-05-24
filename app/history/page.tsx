'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Atmosphere } from '@/components/Atmosphere'
import { RecordCard } from '@/components/zheng/RecordCard'
import { zhengStore } from '@/lib/zheng/store'
import type { ConsultationRecord, VerificationStatus } from '@/lib/zheng/types'

type Filter = 'all' | VerificationStatus

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'unverified', label: '未标注' },
  { value: 'fulfilled', label: '应验' },
  { value: 'partial', label: '部分' },
  { value: 'unfulfilled', label: '未应验' },
]

export default function HistoryListPage() {
  const [records, setRecords] = useState<ConsultationRecord[] | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    zhengStore.listRecords().then(setRecords)
  }, [])

  const filtered = records
    ? filter === 'all'
      ? records
      : records.filter((r) => r.verification === filter)
    : null

  return (
    <>
      <Atmosphere />
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-16 md:py-24">
        <header className="mb-12 text-center">
          <h1 className="font-serif text-5xl font-bold text-[var(--color-ink-900)] tracking-widest">
            履
          </h1>
          <p className="mt-4 text-xs tracking-[0.4em] text-[var(--color-ink-400)] font-serif">
            走过的路 · 暂存本地 — 后续会同步到账号
          </p>
        </header>

        {records === null ? (
          <p className="text-center text-sm font-serif text-[var(--color-ink-400)]">载入中…</p>
        ) : records.length === 0 ? (
          <div className="text-center space-y-4">
            <p className="text-sm font-serif text-[var(--color-ink-600)]">
              还没有记录。在匹配卦后点「记此一卦」即可存下。
            </p>
            <Link
              href="/"
              className="inline-block text-xs font-serif text-[var(--color-vermillion)] hover:underline"
            >
              回首页问卦 →
            </Link>
          </div>
        ) : (
          <>
            <nav className="flex flex-wrap items-center justify-center gap-3 mb-8 text-xs font-serif">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={
                    filter === f.value
                      ? 'px-3 py-1 rounded border border-[var(--color-vermillion)] text-[var(--color-vermillion)]'
                      : 'px-3 py-1 rounded border border-transparent text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)]'
                  }
                >
                  {f.label}
                </button>
              ))}
            </nav>

            {filtered && filtered.length === 0 ? (
              <p className="text-center text-sm font-serif text-[var(--color-ink-400)]">
                此筛选下暂无记录。
              </p>
            ) : (
              <div className="space-y-4">
                {filtered!.map((r) => (
                  <RecordCard key={r.id} record={r} />
                ))}
              </div>
            )}
          </>
        )}

        <footer className="mt-16 text-center">
          <Link
            href="/"
            className="text-xs font-serif text-[var(--color-ink-400)] hover:text-[var(--color-vermillion)] transition-colors"
          >
            ← 回首页
          </Link>
        </footer>
      </div>
    </>
  )
}
