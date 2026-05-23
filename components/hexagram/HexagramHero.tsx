import { HexagramSymbol } from '@/components/HexagramSymbol'
import type { Hexagram } from '@/lib/types'

type Props = {
  hexagram: Hexagram
}

export function HexagramHero({ hexagram }: Props) {
  const { number, name, trigrams, binary } = hexagram

  return (
    <header className="text-center pt-16 pb-12">
      <div className="text-xs tracking-[0.4em] text-[var(--color-ink-400)] font-serif mb-6">
        第{number}卦
      </div>

      <div className="inline-flex flex-col items-center">
        <div className="hexagram-display flex flex-col items-center justify-center w-28 h-32 rounded-lg mb-8">
          <HexagramSymbol binary={binary} size="lg" className="text-[var(--color-ink-800)]" />
          <div className="mt-2 text-[10px] tracking-wider text-[var(--color-ink-400)] font-serif">
            {trigrams.upper}上 · {trigrams.lower}下
          </div>
        </div>

        <h1 className="font-serif text-7xl md:text-8xl font-black text-[var(--color-ink-900)] leading-none tracking-widest">
          {name.chinese}
        </h1>

        <div className="mt-4 flex items-center gap-3 text-[var(--color-ink-400)] font-serif">
          <span className="text-sm">{name.pinyin}</span>
          <span className="w-px h-3 bg-[var(--color-ink-200)]" />
          <span className="text-sm">{name.english}</span>
        </div>
      </div>

      <div className="divider-classical w-64 mx-auto mt-10">
        <span className="font-serif">☰ ☷</span>
      </div>
    </header>
  )
}
