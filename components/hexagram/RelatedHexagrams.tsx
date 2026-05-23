import Link from 'next/link'
import type { Hexagram } from '@/lib/types'
import { HexagramSymbol } from '@/components/HexagramSymbol'
import { findHexagramByNumber } from '@/lib/hexagram-utils'
import { ScrollRevealSection } from './ScrollRevealSection'

type Props = {
  hexagram: Hexagram
}

const TYPE_LABELS: Record<string, string> = {
  complementary: '综卦',
  inverse: '错卦',
  nuclear: '互卦',
  sequence: '序卦',
}

export function RelatedHexagrams({ hexagram }: Props) {
  const relations = hexagram.relations
  if (!relations || relations.length === 0) return null

  const resolved = relations
    .map((r) => ({
      ...r,
      target: findHexagramByNumber(r.targetNumber),
    }))
    .filter((r) => r.target !== undefined)

  if (resolved.length === 0) return null

  return (
    <ScrollRevealSection className="py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="divider-classical mb-10">
          <span className="font-serif tracking-widest">卦象之脉</span>
        </div>

        <div className="space-y-4">
          {resolved.map((r, i) => (
            <Link
              key={i}
              href={`/hexagram/${r.target!.number}`}
              className="flex items-center gap-5 p-4 rounded-lg border border-[var(--color-ink-100)] hover:border-[var(--color-ink-200)] hover:bg-[var(--color-paper)] transition-all duration-200 group"
            >
              <div className="hexagram-display flex flex-col items-center justify-center shrink-0 w-14 h-16 rounded">
                <HexagramSymbol
                  binary={r.target!.binary}
                  size="sm"
                  className="text-[var(--color-ink-700)] group-hover:text-[var(--color-ink-900)] transition-colors"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] px-2 py-0.5 border border-[var(--color-ink-200)] rounded-sm text-[var(--color-ink-400)] font-serif tracking-wider">
                    {TYPE_LABELS[r.type] || r.type}
                  </span>
                  <span className="font-serif text-lg font-bold text-[var(--color-ink-900)]">
                    {r.target!.name.chinese}
                  </span>
                  <span className="text-sm text-[var(--color-ink-400)] font-serif">
                    {r.target!.name.pinyin}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--color-ink-600)] font-serif leading-relaxed">
                  {r.narrative}
                </p>
              </div>
              <span className="text-[var(--color-ink-300)] group-hover:text-[var(--color-vermillion)] transition-colors shrink-0">
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </ScrollRevealSection>
  )
}
