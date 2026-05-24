'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Atmosphere } from '@/components/Atmosphere'
import { VerificationControl } from '@/components/zheng/VerificationControl'
import { zhengStore } from '@/lib/zheng/store'
import type { ConsultationRecord } from '@/lib/zheng/types'

type RecordState = ConsultationRecord | null | 'loading' | 'missing'

export default function HistoryDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [record, setRecord] = useState<RecordState>('loading')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    let alive = true
    zhengStore.getRecord(params.id).then((r) => {
      if (!alive) return
      setRecord(r ?? 'missing')
    })
    return () => {
      alive = false
    }
  }, [params.id])

  async function handleDelete() {
    await zhengStore.deleteRecord(params.id)
    router.push('/history')
  }

  if (record === 'loading') {
    return (
      <>
        <Atmosphere />
        <div className="relative z-10 max-w-2xl mx-auto px-6 py-16 text-center font-serif text-sm text-[var(--color-ink-400)]">
          载入中…
        </div>
      </>
    )
  }

  if (record === 'missing' || record === null) {
    return (
      <>
        <Atmosphere />
        <div className="relative z-10 max-w-2xl mx-auto px-6 py-16 text-center space-y-4">
          <p className="font-serif text-sm text-[var(--color-ink-600)]">
            这条记录不存在或已被删除。
          </p>
          <Link
            href="/history"
            className="inline-block text-xs font-serif text-[var(--color-vermillion)] hover:underline"
          >
            ← 回履
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <Atmosphere />
      <div className="relative z-10 max-w-2xl mx-auto px-6 py-16 md:py-24 space-y-10">
        <Link
          href="/history"
          className="text-xs font-serif text-[var(--color-ink-400)] hover:text-[var(--color-vermillion)] transition-colors"
        >
          ← 履
        </Link>

        <header>
          <div className="text-xs font-mono tracking-widest text-[var(--color-ink-400)]">
            {new Date(record.createdAt).toLocaleString()}
          </div>
          <h1 className="mt-2 font-serif text-5xl font-bold text-[var(--color-ink-900)]">
            {record.hexagramName}
          </h1>
        </header>

        <section className="card-classical rounded-lg p-6 space-y-5">
          <div>
            <h2 className="text-xs font-serif text-[var(--color-ink-600)] tracking-wide mb-2">
              情境
            </h2>
            <p className="font-serif text-[var(--color-ink-800)] leading-relaxed whitespace-pre-wrap">
              {record.situation}
            </p>
          </div>

          <div className="text-sm font-serif text-[var(--color-ink-600)]">
            当时匹配 ·{' '}
            <span className="text-[var(--color-ink-900)] font-semibold">{record.hexagramName}</span>
            （契合度 {Math.round(record.fitScore * 100)}%）
            <Link
              href={`/hexagram/${record.hexagramId}`}
              className="ml-3 text-xs text-[var(--color-vermillion)] hover:underline"
            >
              前往「{record.hexagramName}」详情 →
            </Link>
          </div>

          {record.yaoLocation && (
            <div className="text-sm font-serif text-[var(--color-ink-600)]">
              YaoLocator 定位 ·{' '}
              <span className="text-[var(--color-ink-900)] font-semibold">
                {record.yaoLocation.topYaoName}
              </span>
              （{Math.round(record.yaoLocation.topRatio * 100)}%）
              {record.yaoLocation.crossYaoName && (
                <span className="ml-2 text-[var(--color-ink-400)]">
                  · 也明显落在 {record.yaoLocation.crossYaoName}
                </span>
              )}
            </div>
          )}

          {record.userNote && (
            <div>
              <h2 className="text-xs font-serif text-[var(--color-ink-600)] tracking-wide mb-2">
                当时笔记
              </h2>
              <p className="font-serif text-[var(--color-ink-800)] leading-relaxed whitespace-pre-wrap">
                {record.userNote}
              </p>
            </div>
          )}
        </section>

        <section className="card-classical rounded-lg p-6">
          <VerificationControl record={record} onUpdate={setRecord} />
        </section>

        <section className="text-center">
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-xs font-serif text-[var(--color-ink-400)] hover:text-rose-600 transition-colors"
            >
              删除这条记录
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-serif text-[var(--color-ink-600)]">
                确认删除？删除后无法恢复。
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="text-xs font-serif text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-xs font-serif text-rose-600 border border-rose-300 px-3 py-1 rounded hover:bg-rose-50"
                >
                  确认删除
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
