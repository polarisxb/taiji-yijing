'use client'

import { useMemo, useRef, useEffect, useState } from 'react'
import type { Yao } from '@/lib/types'
import { scoreYao, type LocatorResult as LocatorResultData } from '@/lib/yao-locator'
import { IndicatorChecklist } from './IndicatorChecklist'
import { LocatorResult } from './LocatorResult'

type Props = {
  yao: Yao[]
  hexagramName: string
  /** Called when the user submits a result (with data) or resets (with null). */
  onResultChange?: (result: LocatorResultData | null) => void
}

export function YaoLocator({ yao, hexagramName, onResultChange }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitted, setSubmitted] = useState(false)

  function toggle(indicator: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(indicator)) next.delete(indicator)
      else next.add(indicator)
      return next
    })
  }

  function clear() {
    setSelected(new Set())
  }

  function submit() {
    if (selected.size === 0) return
    setSubmitted(true)
  }

  function reset() {
    setSubmitted(false)
  }

  // Memo on [yao, selected, submitted] so the result reference is stable across
  // unrelated re-renders, avoiding infinite useEffect loops in parents.
  const result = useMemo<LocatorResultData | null>(
    () => (submitted ? scoreYao(yao, selected) : null),
    [yao, selected, submitted],
  )

  const cbRef = useRef(onResultChange)
  cbRef.current = onResultChange
  useEffect(() => {
    cbRef.current?.(result)
  }, [result])

  return (
    <section className="card-classical rounded-lg p-5 md:p-6 space-y-5">
      <header>
        <div className="text-[10px] tracking-widest text-[var(--color-vermillion)] font-serif mb-1">
          阶段定位
        </div>
        <h3 className="font-serif text-lg text-[var(--color-ink-900)] font-bold">
          你在「{hexagramName}」的第几阶？
        </h3>
        <p className="text-xs text-[var(--color-ink-400)] font-serif mt-1 leading-relaxed">
          爻位是流动的——同一卦的六阶段对应的建议截然不同。勾选与你当下处境相符的描述，得出你最可能所处的爻位。
        </p>
      </header>

      {!submitted ? (
        <>
          <IndicatorChecklist yao={yao} selected={selected} onToggle={toggle} onClear={clear} />
          <div className="flex items-center justify-end pt-2 border-t border-[var(--color-ink-100)]">
            <button
              type="button"
              disabled={selected.size === 0}
              onClick={submit}
              className="px-4 py-2 text-sm font-serif rounded border border-[var(--color-ink-900)] text-[var(--color-ink-900)] hover:bg-[var(--color-ink-900)] hover:text-[var(--color-paper)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--color-ink-900)]"
            >
              定位 →
            </button>
          </div>
        </>
      ) : (
        result && <LocatorResult result={result} yao={yao} onReset={reset} />
      )}
    </section>
  )
}
