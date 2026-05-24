'use client'

import type { Yao } from '@/lib/types'

type Props = {
  yao: Yao[]
  selected: Set<string>
  onToggle: (indicator: string) => void
  onClear: () => void
}

export function IndicatorChecklist({ yao, selected, onToggle, onClear }: Props) {
  const sorted = [...yao].sort((a, b) => a.position - b.position)
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-xs text-[var(--color-ink-400)] font-serif">
        <span>勾选所有「与你当下处境相符」的描述（已选 {selected.size} 条）</span>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[var(--color-vermillion)] hover:underline"
          >
            清空
          </button>
        )}
      </div>
      {sorted.map((y) => (
        <fieldset key={y.position} className="border border-[var(--color-ink-100)] rounded p-4">
          <legend className="px-2 font-serif text-sm">
            <span className="text-[var(--color-ink-900)] font-bold">{y.name}</span>
            <span className="ml-2 text-[var(--color-ink-400)] italic">{y.text}</span>
          </legend>
          <ul className="space-y-2 mt-2">
            {y.indicators.map((ind) => {
              const checked = selected.has(ind)
              return (
                <li key={ind}>
                  <label className="flex items-start gap-2 cursor-pointer text-sm leading-relaxed">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(ind)}
                      className="mt-1 shrink-0 accent-[var(--color-vermillion)]"
                    />
                    <span
                      className={
                        checked ? 'text-[var(--color-ink-900)]' : 'text-[var(--color-ink-600)]'
                      }
                    >
                      {ind}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </fieldset>
      ))}
    </div>
  )
}
