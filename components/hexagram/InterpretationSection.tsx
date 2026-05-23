import type { Hexagram } from '@/lib/types'
import { ScrollRevealSection } from './ScrollRevealSection'

type Props = {
  hexagram: Hexagram
}

export function InterpretationSection({ hexagram }: Props) {
  const { classicalCommentary } = hexagram

  return (
    <ScrollRevealSection className="py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="divider-classical mb-10">
          <span className="font-serif tracking-widest">传</span>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-xs tracking-[0.3em] text-[var(--color-ink-400)] font-serif">
              卦辞释读
            </h3>
            <p className="font-serif text-[var(--color-ink-700)] leading-[2.2] text-base">
              {hexagram.judgment.modernReading}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs tracking-[0.3em] text-[var(--color-ink-400)] font-serif">
              象传释读
            </h3>
            <p className="font-serif text-[var(--color-ink-700)] leading-[2.2] text-base">
              {hexagram.image.modernReading}
            </p>
          </div>

          {classicalCommentary && (
            <div className="space-y-4 pt-4">
              <h3 className="text-xs tracking-[0.3em] text-[var(--color-ink-400)] font-serif">
                义理派注
              </h3>
              <div className="space-y-4">
                {classicalCommentary.chengYi && (
                  <blockquote className="classical-quote text-sm leading-loose">
                    <span className="text-[10px] text-[var(--color-ink-400)] tracking-wider block mb-1">
                      程颐《伊川易传》
                    </span>
                    {classicalCommentary.chengYi}
                  </blockquote>
                )}
                {classicalCommentary.zhuXi && (
                  <blockquote className="classical-quote text-sm leading-loose">
                    <span className="text-[10px] text-[var(--color-ink-400)] tracking-wider block mb-1">
                      朱熹《周易本义》
                    </span>
                    {classicalCommentary.zhuXi}
                  </blockquote>
                )}
                {classicalCommentary.wangBi && (
                  <blockquote className="classical-quote text-sm leading-loose">
                    <span className="text-[10px] text-[var(--color-ink-400)] tracking-wider block mb-1">
                      王弼《周易注》
                    </span>
                    {classicalCommentary.wangBi}
                  </blockquote>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ScrollRevealSection>
  )
}
