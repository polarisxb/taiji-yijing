'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { MatchResult, Yao } from '@/lib/types'
import { HexagramSymbol } from './HexagramSymbol'
import { SmoothExpand } from './SmoothExpand'
import { useCountUp, useScrollReveal } from '@/hooks/useAnimations'
import Link from 'next/link'

type Props = {
  match: MatchResult
  rank: number
}

export function MatchCard({ match, rank }: Props) {
  const [expanded, setExpanded] = useState(rank === 1)
  const [openYao, setOpenYao] = useState<number | null>(null)
  const { hexagram, score, reasoning } = match

  const pct = Math.round(score.total * 100)
  const { ref, visible } = useScrollReveal<HTMLElement>(0.1)
  const displayPct = useCountUp(pct, 1000, visible)

  return (
    <article
      ref={ref}
      className="card-classical rounded-lg overflow-hidden"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(20px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      {/* 卡片头部 */}
      <header
        className="flex items-start gap-6 p-6 cursor-pointer hover:bg-[var(--color-paper)] transition-colors duration-200"
        onClick={() => setExpanded(!expanded)}
      >
        {/* 卦象区域 */}
        <div className="hexagram-display flex flex-col items-center justify-center shrink-0 w-20 h-24 rounded group">
          <HexagramSymbol
            binary={hexagram.binary}
            size="lg"
            className="text-[var(--color-ink-800)] transition-transform duration-300 group-hover:scale-110"
          />
          <div className="mt-1.5 text-[10px] tracking-wider text-[var(--color-ink-400)] font-serif">
            {hexagram.trigrams.upper}｜{hexagram.trigrams.lower}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="font-serif text-[10px] text-[var(--color-vermillion)] border border-[var(--color-vermillion)] px-2 py-0.5 rounded-sm tracking-widest">
              第{rank === 1 ? '壹' : rank === 2 ? '贰' : '叁'}卦
            </span>
            <h2 className="font-serif text-4xl font-bold text-[var(--color-ink-900)] tracking-wider">
              {hexagram.name.chinese}
            </h2>
            <span className="text-sm text-[var(--color-ink-400)] font-serif">
              {hexagram.name.pinyin} · {hexagram.name.english}
            </span>
          </div>

          <p className="mt-3 text-[var(--color-ink-600)] leading-relaxed line-clamp-2 font-serif text-sm">
            {hexagram.judgment.modernReading}
          </p>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-ink-400)]">
            {reasoning.map((r, i) => (
              <span
                key={i}
                className="tag-interactive px-2 py-1 bg-[var(--color-paper)] border border-[var(--color-ink-100)] rounded font-serif"
              >
                {r}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 shrink-0">
          <div className="text-right">
            <div className="text-3xl font-serif text-[var(--color-gold)] font-bold tabular-nums">
              {displayPct}
            </div>
            <div className="text-[10px] tracking-widest text-[var(--color-ink-400)] font-serif">
              契合
            </div>
          </div>
          <div
            className="w-5 h-5 flex items-center justify-center rounded-full border border-[var(--color-ink-200)] transition-all duration-300"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <ChevronDown className="w-3 h-3 text-[var(--color-ink-400)]" />
          </div>
        </div>
      </header>

      {/* 展开详情 — 丝滑过渡 */}
      <SmoothExpand open={expanded}>
        <div className="border-t border-[var(--color-ink-100)] divide-y divide-[var(--color-ink-100)]">
          <Section label="卦辞" icon="䷀" original={hexagram.judgment.text}>
            {hexagram.judgment.modernReading}
          </Section>

          <Section label="象传" icon="☲" original={hexagram.image.text}>
            {hexagram.image.modernReading}
          </Section>

          <Section label="此卦所应之局" icon="◎">
            <ul className="space-y-2">
              {hexagram.appliesWhen.map((s, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="text-[var(--color-vermillion)] mt-0.5 text-xs">●</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section label="六爻 · 事之六阶" icon="爻">
            <div className="space-y-2">
              {hexagram.yao.map((y) => (
                <YaoRow
                  key={y.position}
                  yao={y}
                  open={openYao === y.position}
                  onToggle={() => setOpenYao(openYao === y.position ? null : y.position)}
                />
              ))}
            </div>
          </Section>

          {hexagram.antiPatterns.length > 0 && (
            <Section label="误读之戒" icon="⚠">
              <ul className="space-y-2">
                {hexagram.antiPatterns.map((s, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="text-[var(--color-vermillion-dark)] mt-0.5 text-xs">✕</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {hexagram.parallels.modernCases && hexagram.parallels.modernCases.length > 0 && (
            <Section label="今人之鉴" icon="鉴">
              <div className="space-y-4">
                {hexagram.parallels.modernCases.map((c, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span
                      className={`shrink-0 mt-0.5 w-6 h-6 flex items-center justify-center text-[10px] font-serif font-bold rounded-full border transition-transform duration-200 hover:scale-110 ${
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
                      <div className="text-sm text-[var(--color-ink-600)] leading-relaxed mt-0.5">
                        {c.note}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {hexagram.parallels.westernPhilosophy &&
            hexagram.parallels.westernPhilosophy.length > 0 && (
              <Section label="西哲参照" icon="哲">
                <div className="space-y-4">
                  {hexagram.parallels.westernPhilosophy.map((p, i) => (
                    <div
                      key={i}
                      className="border-l-2 border-[var(--color-gold)] pl-3 transition-all duration-200 hover:pl-4 hover:border-l-3"
                    >
                      <div className="font-semibold text-[var(--color-ink-800)] font-serif">
                        {p.thinker}
                        <span className="ml-2 text-sm text-[var(--color-gold-dark)] font-normal">
                          {p.concept}
                        </span>
                      </div>
                      <div className="text-sm text-[var(--color-ink-600)] leading-relaxed mt-1">
                        {p.note}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

          <div className="px-6 py-4 border-t border-[var(--color-ink-100)]">
            <Link
              href={`/hexagram/${hexagram.number}?from=consult`}
              className="inline-flex items-center gap-2 text-xs font-serif text-[var(--color-ink-600)] hover:text-[var(--color-vermillion)] transition-colors duration-200"
            >
              <span>深入此卦</span>
              <span>→</span>
            </Link>
          </div>

          <div className="px-6 py-3 text-[10px] text-[var(--color-ink-400)] flex gap-6 font-mono border-t border-[var(--color-ink-100)]">
            <ScoreChip label="词" value={score.keyword} active={visible} />
            <ScoreChip label="象" value={score.feature} active={visible} />
            <ScoreChip label="意" value={score.theme} active={visible} />
          </div>
        </div>
      </SmoothExpand>
    </article>
  )
}

function ScoreChip({ label, value, active }: { label: string; value: number; active: boolean }) {
  const display = useCountUp(Math.round(value * 100), 1200, active)
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-[var(--color-ink-400)]">{label}</span>
      <span className="tabular-nums text-[var(--color-ink-600)]">{display}</span>
    </span>
  )
}

function Section({
  label,
  icon,
  original,
  children,
}: {
  label: string
  icon?: string
  original?: string
  children: React.ReactNode
}) {
  return (
    <section className="px-6 py-6">
      <h3 className="flex items-center gap-2 text-xs tracking-[0.2em] text-[var(--color-ink-400)] mb-3 font-serif">
        {icon && <span className="text-[var(--color-vermillion)] text-sm opacity-60">{icon}</span>}
        {label}
      </h3>
      {original && (
        <blockquote className="classical-quote text-lg mb-3 leading-relaxed">{original}</blockquote>
      )}
      <div className="text-[var(--color-ink-700)] leading-relaxed text-sm font-serif">
        {children}
      </div>
    </section>
  )
}

function YaoRow({ yao, open, onToggle }: { yao: Yao; open: boolean; onToggle: () => void }) {
  return (
    <div
      className={`yao-row rounded-md overflow-hidden transition-all duration-200 ${open ? 'border-[var(--color-ink-200)] shadow-sm' : ''}`}
    >
      <button onClick={onToggle} className="w-full text-left px-4 py-3 flex items-center gap-3">
        <span
          className={`font-serif text-base font-bold shrink-0 w-12 text-center transition-colors duration-200 ${open ? 'text-[var(--color-vermillion)]' : 'text-[var(--color-ink-600)]'}`}
        >
          {yao.name}
        </span>
        <span className="w-px h-4 bg-[var(--color-ink-200)]" />
        <span className="font-serif text-sm text-[var(--color-ink-700)] flex-1 leading-relaxed">
          {yao.text}
        </span>
        <span className="text-[10px] text-[var(--color-ink-400)] shrink-0 font-serif tracking-wider inline-flex items-center gap-1 transition-all duration-200">
          <span
            style={{
              display: 'inline-block',
              transition: 'transform 0.25s ease',
              transform: open ? 'rotate(180deg)' : 'rotate(0)',
            }}
          >
            ▼
          </span>
          {open ? '收' : '展'}
        </span>
      </button>
      <SmoothExpand open={open} duration={280}>
        <div className="px-4 py-5 bg-[var(--color-paper)] space-y-4 text-sm border-t border-[var(--color-ink-100)]">
          <div>
            <div className="text-[10px] tracking-[0.2em] text-[var(--color-ink-400)] mb-1.5 font-serif flex items-center gap-1.5">
              <span className="text-[var(--color-gold)] text-xs">◆</span> 今释
            </div>
            <p className="text-[var(--color-ink-700)] leading-loose font-serif pl-4">
              {yao.modernReading}
            </p>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.2em] text-[var(--color-ink-400)] mb-1.5 font-serif flex items-center gap-1.5">
              <span className="text-[var(--color-gold)] text-xs">◆</span> 典型之境
            </div>
            <p className="text-[var(--color-ink-700)] leading-loose font-serif pl-4">
              {yao.scenario}
            </p>
          </div>
          {yao.actionable.length > 0 && (
            <div>
              <div className="text-[10px] tracking-[0.2em] text-[var(--color-ink-400)] mb-1.5 font-serif flex items-center gap-1.5">
                <span className="text-[var(--color-gold)] text-xs">◆</span> 可行之策
              </div>
              <ul className="space-y-1.5 pl-4">
                {yao.actionable.map((a, i) => (
                  <li
                    key={i}
                    className="flex gap-2 items-start text-[var(--color-ink-700)] font-serif"
                  >
                    <span className="text-[var(--color-gold-dark)] text-[10px] mt-1">▸</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {yao.indicators.length > 0 && (
            <div>
              <div className="text-[10px] tracking-[0.2em] text-[var(--color-ink-400)] mb-1.5 font-serif flex items-center gap-1.5">
                <span className="text-[var(--color-gold)] text-xs">◆</span> 处此爻之征
              </div>
              <ul className="space-y-1.5 pl-4">
                {yao.indicators.map((a, i) => (
                  <li
                    key={i}
                    className="flex gap-2 items-start text-[var(--color-ink-600)] font-serif"
                  >
                    <span className="text-[var(--color-ink-400)] text-[10px] mt-1">○</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </SmoothExpand>
    </div>
  )
}
