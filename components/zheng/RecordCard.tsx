'use client'

import Link from 'next/link'
import type { ConsultationRecord, VerificationStatus } from '@/lib/zheng/types'

function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function statusLabel(s: VerificationStatus): string {
  if (s === 'fulfilled') return '应验'
  if (s === 'partial') return '部分应验'
  if (s === 'unfulfilled') return '未应验'
  return '未标注'
}

function statusColor(s: VerificationStatus): string {
  if (s === 'fulfilled') return 'text-emerald-700 border-emerald-300 bg-emerald-50'
  if (s === 'partial') return 'text-amber-700 border-amber-300 bg-amber-50'
  if (s === 'unfulfilled') return 'text-rose-700 border-rose-300 bg-rose-50'
  return 'text-[var(--color-ink-400)] border-[var(--color-ink-200)] bg-[var(--color-paper)]'
}

export function RecordCard({ record }: { record: ConsultationRecord }) {
  const excerpt =
    record.situation.length > 60 ? record.situation.slice(0, 60) + '…' : record.situation

  return (
    <Link
      href={`/history/${record.id}`}
      className="block card-classical rounded-lg p-5 hover:border-[var(--color-vermillion)] transition-colors"
    >
      <div className="flex items-baseline gap-3 mb-3 flex-wrap">
        <span className="font-mono text-[10px] tracking-widest text-[var(--color-ink-400)]">
          {formatDate(record.createdAt)}
        </span>
        <span className="font-serif text-2xl text-[var(--color-ink-900)] font-bold">
          {record.hexagramName}
        </span>
        {record.consultMode === 'ai' && (
          <span className="text-[10px] font-serif tracking-wide text-[#a89884]">· AI</span>
        )}
        {record.yaoLocation && (
          <span className="text-[10px] font-serif text-[var(--color-ink-400)]">
            · {record.yaoLocation.topYaoName}
          </span>
        )}
        {record.aiYao && !record.yaoLocation && (
          <span className="text-[10px] font-serif text-[var(--color-ink-400)]">
            · {record.aiYao.name}
          </span>
        )}
        <span
          className={`ml-auto text-[10px] font-serif px-2 py-0.5 rounded-sm border ${statusColor(record.verification)}`}
        >
          {statusLabel(record.verification)}
        </span>
      </div>
      <p className="text-sm font-serif text-[var(--color-ink-600)] leading-relaxed">{excerpt}</p>
    </Link>
  )
}
