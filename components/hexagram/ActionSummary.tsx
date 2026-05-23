import type { Hexagram } from '@/lib/types'
import { ScrollRevealSection } from './ScrollRevealSection'

type Props = {
  hexagram: Hexagram
}

export function ActionSummary({ hexagram }: Props) {
  const { antiPatterns } = hexagram

  if (antiPatterns.length === 0) return null

  return (
    <ScrollRevealSection className="py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="divider-classical mb-10">
          <span className="font-serif tracking-widest">行</span>
        </div>

        <div>
          <h3 className="text-xs tracking-[0.3em] text-[var(--color-ink-400)] font-serif mb-4">
            误读之戒
          </h3>
          <div className="space-y-3">
            {antiPatterns.map((s, i) => (
              <div
                key={i}
                className="flex gap-3 items-start px-4 py-3 bg-[var(--color-vermillion-bg)] border border-[var(--color-vermillion)]/20 rounded"
              >
                <span className="text-[var(--color-vermillion-dark)] mt-0.5 text-xs shrink-0">
                  ✕
                </span>
                <span className="font-serif text-sm text-[var(--color-ink-700)] leading-relaxed">
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollRevealSection>
  )
}
