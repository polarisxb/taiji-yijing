'use client'

import { useState } from 'react'
import type { Yao } from '@/lib/types'
import type { LocatorResult as LocatorResultType } from '@/lib/yao-locator'

type Props = {
  result: LocatorResultType
  yao: Yao[]
  onReset: () => void
}

export function LocatorResult({ result, yao, onReset }: Props) {
  const topYao = yao.find((y) => y.position === result.topPosition)
  const [showScenario, setShowScenario] = useState(false)
  const topPct = Math.round(result.topRatio * 100)

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-[var(--color-ink-400)] font-serif mb-2 tracking-widest">
          你最可能处在
        </div>
        <div className="flex items-baseline gap-3">
          <span className="font-serif text-3xl font-bold text-[var(--color-ink-900)]">
            {topYao?.name ?? `第 ${result.topPosition} 爻`}
          </span>
          <span className="text-[var(--color-gold)] font-serif text-xl tabular-nums">
            {topPct}%
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        {result.scores.map((s) => {
          const pct = Math.round(s.ratio * 100)
          const isTop = s.position === result.topPosition && result.topRatio > 0
          return (
            <div key={s.position} className="flex items-center gap-3 text-xs font-serif">
              <span
                className={
                  isTop
                    ? 'text-[var(--color-vermillion)] font-bold w-12 shrink-0'
                    : 'text-[var(--color-ink-400)] w-12 shrink-0'
                }
              >
                {s.yaoName}
              </span>
              <div className="flex-1 h-2 bg-[var(--color-paper)] rounded overflow-hidden border border-[var(--color-ink-100)]">
                <div
                  className={
                    isTop
                      ? 'h-full bg-[var(--color-vermillion)]'
                      : 'h-full bg-[var(--color-ink-300)]'
                  }
                  style={{
                    width: `${pct}%`,
                    transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                  }}
                />
              </div>
              <span
                className={
                  isTop
                    ? 'text-[var(--color-vermillion)] w-10 text-right tabular-nums'
                    : 'text-[var(--color-ink-400)] w-10 text-right tabular-nums'
                }
              >
                {pct}%
              </span>
            </div>
          )
        })}
      </div>

      {result.crossYao && (
        <div className="border-l-2 border-[var(--color-gold)] pl-3 py-1 text-sm text-[var(--color-ink-600)] font-serif leading-relaxed">
          {result.crossYao.narrative}
        </div>
      )}

      {topYao && result.topRatio > 0 && (
        <div className="border-t border-[var(--color-ink-100)] pt-5 space-y-4">
          <div>
            <div className="text-[10px] tracking-widest text-[var(--color-ink-400)] font-serif mb-1.5">
              义理释读
            </div>
            <p className="text-sm leading-relaxed text-[var(--color-ink-800)] font-serif">
              {topYao.modernReading}
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowScenario((v) => !v)}
              className="text-xs text-[var(--color-vermillion)] hover:underline font-serif"
            >
              {showScenario ? '收起典型场景' : '展开典型场景'}
            </button>
            {showScenario && (
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-600)] font-serif italic">
                {topYao.scenario}
              </p>
            )}
          </div>

          <div>
            <div className="text-[10px] tracking-widest text-[var(--color-ink-400)] font-serif mb-2">
              可执行建议
            </div>
            <ul className="space-y-1.5">
              {topYao.actionable.map((a, i) => (
                <li
                  key={i}
                  className="flex gap-2 items-start text-sm text-[var(--color-ink-800)] font-serif leading-relaxed"
                >
                  <span className="text-[var(--color-vermillion)] mt-0.5 text-xs shrink-0">●</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {result.topRatio === 0 && (
        <div className="text-sm text-[var(--color-ink-400)] font-serif">
          你没勾选任何条目，无法定位。
        </div>
      )}

      <button
        type="button"
        onClick={onReset}
        className="text-xs text-[var(--color-ink-400)] hover:text-[var(--color-vermillion)] hover:underline font-serif"
      >
        ← 重新选择
      </button>
    </div>
  )
}
