import type { Hexagram } from '@/lib/types'
import { ScrollRevealSection } from './ScrollRevealSection'

type Props = {
  hexagram: Hexagram
}

export function SituationMapping({ hexagram }: Props) {
  const { appliesWhen, parallels } = hexagram

  return (
    <ScrollRevealSection className="py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="divider-classical mb-10">
          <span className="font-serif tracking-widest">按</span>
        </div>

        <div className="space-y-10">
          {/* 适用情境 */}
          <div>
            <h3 className="text-xs tracking-[0.3em] text-[var(--color-ink-400)] font-serif mb-4">
              若你正处此局
            </h3>
            <ul className="space-y-3">
              {appliesWhen.map((s, i) => (
                <li
                  key={i}
                  className="flex gap-3 items-start font-serif text-[var(--color-ink-700)] leading-relaxed"
                >
                  <span className="text-[var(--color-vermillion)] mt-1 text-xs shrink-0">●</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 现代案例 */}
          {parallels.modernCases && parallels.modernCases.length > 0 && (
            <div>
              <h3 className="text-xs tracking-[0.3em] text-[var(--color-ink-400)] font-serif mb-4">
                今人之鉴
              </h3>
              <div className="space-y-4">
                {parallels.modernCases.map((c, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span
                      className={`shrink-0 mt-0.5 w-6 h-6 flex items-center justify-center text-[10px] font-serif font-bold rounded-full border ${
                        c.outcome === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : c.outcome === 'failure'
                            ? 'bg-red-50 text-red-700 border-red-300'
                            : 'bg-amber-50 text-amber-700 border-amber-300'
                      }`}
                    >
                      {c.outcome === 'success' ? '成' : c.outcome === 'failure' ? '败' : '杂'}
                    </span>
                    <div>
                      <div className="font-semibold text-[var(--color-ink-800)] font-serif">
                        {c.name}
                      </div>
                      <div className="text-sm text-[var(--color-ink-600)] leading-relaxed mt-0.5 font-serif">
                        {c.note}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 西方哲学 */}
          {parallels.westernPhilosophy && parallels.westernPhilosophy.length > 0 && (
            <div>
              <h3 className="text-xs tracking-[0.3em] text-[var(--color-ink-400)] font-serif mb-4">
                西哲参照
              </h3>
              <div className="space-y-4">
                {parallels.westernPhilosophy.map((p, i) => (
                  <div key={i} className="border-l-2 border-[var(--color-gold)] pl-4">
                    <div className="font-semibold text-[var(--color-ink-800)] font-serif">
                      {p.thinker}
                      <span className="ml-2 text-sm text-[var(--color-gold-dark)] font-normal">
                        {p.concept}
                      </span>
                    </div>
                    <div className="text-sm text-[var(--color-ink-600)] leading-relaxed mt-1 font-serif">
                      {p.note}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 文学影视 */}
          {parallels.literature && parallels.literature.length > 0 && (
            <div>
              <h3 className="text-xs tracking-[0.3em] text-[var(--color-ink-400)] font-serif mb-4">
                文学之镜
              </h3>
              <div className="space-y-3">
                {parallels.literature.map((l, i) => (
                  <div
                    key={i}
                    className="font-serif text-sm text-[var(--color-ink-700)] leading-relaxed"
                  >
                    <span className="font-semibold">{l.title}</span>
                    {l.author && <span className="text-[var(--color-ink-400)]"> · {l.author}</span>}
                    <span className="text-[var(--color-ink-400)]"> — </span>
                    {l.note}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ScrollRevealSection>
  )
}
