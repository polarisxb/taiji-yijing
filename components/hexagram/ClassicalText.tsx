import type { Hexagram } from '@/lib/types'
import { ScrollRevealSection } from './ScrollRevealSection'

type Props = {
  hexagram: Hexagram
}

export function ClassicalText({ hexagram }: Props) {
  return (
    <ScrollRevealSection className="py-16 px-6">
      <div className="max-w-lg mx-auto space-y-12">
        <div>
          <div className="text-xs tracking-[0.3em] text-[var(--color-ink-400)] font-serif text-center mb-6">
            卦 辞
          </div>
          <p className="classical-large">{hexagram.judgment.text}</p>
        </div>

        <div className="divider-classical w-32 mx-auto">
          <span className="text-[var(--color-ink-200)]">·</span>
        </div>

        <div>
          <div className="text-xs tracking-[0.3em] text-[var(--color-ink-400)] font-serif text-center mb-6">
            象 传
          </div>
          <p className="classical-large">{hexagram.image.text}</p>
        </div>
      </div>
    </ScrollRevealSection>
  )
}
