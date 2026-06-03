import { notFound } from 'next/navigation'
import { Atmosphere } from '@/components/Atmosphere'
import { ALL_HEXAGRAMS } from '@/content/hexagrams'
import { findHexagramById } from '@/lib/hexagram-utils'
import { HexagramHero } from '@/components/hexagram/HexagramHero'
import { ClassicalText } from '@/components/hexagram/ClassicalText'
import { InterpretationSection } from '@/components/hexagram/InterpretationSection'
import { SituationMapping } from '@/components/hexagram/SituationMapping'
import { YaoTimeline } from '@/components/hexagram/YaoTimeline'
import YaoLocator from '@/components/yao-locator/YaoLocatorDynamic'
import { ActionSummary } from '@/components/hexagram/ActionSummary'
import { RelatedHexagrams } from '@/components/hexagram/RelatedHexagrams'
import { FloatingBackBar } from '@/components/hexagram/FloatingBackBar'
import { HistoryNavLink } from '@/components/zheng/HistoryNavLink'
import type { Phase } from '@/lib/types'
import type { Metadata } from 'next'
import Link from 'next/link'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string; phase?: string }>
}

export async function generateStaticParams() {
  return ALL_HEXAGRAMS.map((h) => ({ id: String(h.number) }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const hexagram = findHexagramById(id)
  if (!hexagram) return { title: '卦象未找到' }

  return {
    title: `${hexagram.name.chinese} · ${hexagram.name.pinyin} — 太极`,
    description: hexagram.judgment.modernReading.slice(0, 120),
  }
}

export default async function HexagramDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { phase } = await searchParams

  const hexagram = findHexagramById(id)
  if (!hexagram) notFound()

  const highlightPhase = phase as Phase | undefined

  return (
    <>
      <Atmosphere />
      <FloatingBackBar />

      {/* 内容视口容器：限制高度为视口减去山的高度，内部滚动，保证山实时在当前屏幕显示的内容下面 */}
      <div
        className="relative z-10 max-w-3xl mx-auto px-6"
        style={{ height: 'calc(100vh - 30vh)', overflow: 'hidden' }}
      >
        <div className="h-full overflow-y-auto">
          <HexagramHero hexagram={hexagram} />
          <ClassicalText hexagram={hexagram} />
          <InterpretationSection hexagram={hexagram} />
          <SituationMapping hexagram={hexagram} />
          <section className="py-12">
            <YaoLocator yao={hexagram.yao} hexagramName={hexagram.name.chinese} />
          </section>
          <YaoTimeline hexagram={hexagram} highlightPhase={highlightPhase} />
          <ActionSummary hexagram={hexagram} />
          <RelatedHexagrams hexagram={hexagram} />

          {/* Footer */}
          <footer className="py-16 text-center">
            <div className="divider-classical mb-8">
              <span className="font-serif text-lg">☯</span>
            </div>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/hexagrams"
                className="text-xs font-serif text-[var(--color-ink-400)] hover:text-[var(--color-vermillion)] transition-colors"
              >
                览六十四卦
              </Link>
              <HistoryNavLink className="text-sm font-serif text-[var(--color-vermillion)] hover:text-[var(--color-ink-900)] transition-colors before:content-['·'] before:mr-4 before:text-[var(--color-ink-300)]" />
            </div>
          </footer>
        </div>
      </div>
    </>
  )
}
