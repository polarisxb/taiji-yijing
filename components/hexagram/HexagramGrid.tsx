import Link from 'next/link'
import { HexagramSymbol } from '@/components/HexagramSymbol'
import type { Hexagram } from '@/lib/types'

type Props = {
  hexagrams: Hexagram[]
  totalCount?: number
}

export function HexagramGrid({ hexagrams, totalCount = 64 }: Props) {
  const slots = Array.from({ length: totalCount }, (_, i) => {
    const num = i + 1
    const hex = hexagrams.find((h) => h.number === num)
    return { number: num, hexagram: hex }
  })

  return (
    <div className="grid grid-cols-8 gap-2 md:gap-3">
      {slots.map(({ number, hexagram }) => {
        if (hexagram) {
          return (
            <Link
              key={number}
              href={`/hexagram/${number}`}
              className="flex flex-col items-center justify-center p-2 md:p-3 rounded-lg border border-[var(--color-ink-100)] hover:border-[var(--color-vermillion)] hover:shadow-[0_0_12px_rgba(196,80,58,0.1)] transition-all duration-200 group aspect-square"
            >
              <HexagramSymbol
                binary={hexagram.binary}
                size="sm"
                className="text-[var(--color-ink-700)] group-hover:text-[var(--color-ink-900)] transition-colors"
              />
              <span className="mt-1.5 text-xs font-serif text-[var(--color-ink-700)] group-hover:text-[var(--color-vermillion)] transition-colors">
                {hexagram.name.chinese}
              </span>
            </Link>
          )
        }

        return (
          <div
            key={number}
            className="flex flex-col items-center justify-center p-2 md:p-3 rounded-lg border border-dashed border-[var(--color-ink-100)] aspect-square opacity-30"
          >
            <span className="text-[10px] font-mono text-[var(--color-ink-300)]">{number}</span>
          </div>
        )
      })}
    </div>
  )
}
