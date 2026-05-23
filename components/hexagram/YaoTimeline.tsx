'use client'

import { useState } from 'react'
import type { Hexagram, Phase } from '@/lib/types'
import { SmoothExpand } from '@/components/SmoothExpand'
import { ScrollRevealSection } from './ScrollRevealSection'
import { getPhaseYaoIndex } from '@/lib/hexagram-utils'

type Props = {
  hexagram: Hexagram
  highlightPhase?: Phase
}

export function YaoTimeline({ hexagram, highlightPhase }: Props) {
  const autoIndex = getPhaseYaoIndex(highlightPhase)
  const [openIndex, setOpenIndex] = useState<number | null>(autoIndex ?? null)

  // yao 数组是 position 1-6（初到上），展示从上到下所以反转
  const yaoReversed = [...hexagram.yao].reverse()

  return (
    <ScrollRevealSection className="py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="divider-classical mb-10">
          <span className="font-serif tracking-widest">六爻 · 事之六阶</span>
        </div>

        {highlightPhase && autoIndex !== undefined && (
          <div className="text-center mb-8">
            <span className="phase-indicator">
              <span>◉</span>
              系统判断你可能处于第{autoIndex + 1}爻阶段
            </span>
          </div>
        )}

        <div className="yao-timeline">
          {yaoReversed.map((yao) => {
            const idx = yao.position - 1
            const isOpen = openIndex === idx
            const isHighlighted = autoIndex === idx

            return (
              <div key={yao.position} className={`yao-node ${isOpen ? 'yao-node-active' : ''}`}>
                {/* 爻头 */}
                <div
                  className="flex items-center gap-3 py-3 cursor-pointer group"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                >
                  <span
                    className={`font-serif text-base font-bold shrink-0 w-14 transition-colors duration-200 ${
                      isOpen
                        ? 'text-[var(--color-vermillion)]'
                        : isHighlighted
                          ? 'text-[var(--color-gold)]'
                          : 'text-[var(--color-ink-600)]'
                    }`}
                  >
                    {yao.name}
                  </span>
                  <span className="font-serif text-sm text-[var(--color-ink-700)] flex-1 leading-relaxed group-hover:text-[var(--color-ink-900)] transition-colors duration-200">
                    {yao.text}
                  </span>
                  <span
                    className="text-[10px] text-[var(--color-ink-400)] shrink-0"
                    style={{
                      display: 'inline-block',
                      transition: 'transform 0.25s ease',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                    }}
                  >
                    ▼
                  </span>
                </div>

                {/* 爻详情：传→按→行 */}
                <SmoothExpand open={isOpen} duration={300}>
                  <div className="pb-6 pl-[4.25rem] space-y-5 text-sm">
                    {/* 释读 */}
                    <div>
                      <div className="text-[10px] tracking-[0.2em] text-[var(--color-ink-400)] mb-2 font-serif flex items-center gap-1.5">
                        <span className="text-[var(--color-gold)] text-xs">◆</span> 释读
                      </div>
                      <p className="text-[var(--color-ink-700)] leading-loose font-serif pl-4">
                        {yao.modernReading}
                      </p>
                    </div>

                    {/* 典型情境 */}
                    <div>
                      <div className="text-[10px] tracking-[0.2em] text-[var(--color-ink-400)] mb-2 font-serif flex items-center gap-1.5">
                        <span className="text-[var(--color-gold)] text-xs">◆</span> 典型之境
                      </div>
                      <p className="text-[var(--color-ink-700)] leading-loose font-serif pl-4">
                        {yao.scenario}
                      </p>
                    </div>

                    {/* 可执行建议 */}
                    {yao.actionable.length > 0 && (
                      <div>
                        <div className="text-[10px] tracking-[0.2em] text-[var(--color-ink-400)] mb-2 font-serif flex items-center gap-1.5">
                          <span className="text-[var(--color-gold)] text-xs">◆</span> 可行之策
                        </div>
                        <ul className="space-y-1.5 pl-4">
                          {yao.actionable.map((a, i) => (
                            <li
                              key={i}
                              className="flex gap-2 items-start text-[var(--color-ink-700)] font-serif"
                            >
                              <span className="text-[var(--color-gold-dark)] text-[10px] mt-1">
                                ▸
                              </span>
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 征兆 */}
                    {yao.indicators.length > 0 && (
                      <div>
                        <div className="text-[10px] tracking-[0.2em] text-[var(--color-ink-400)] mb-2 font-serif flex items-center gap-1.5">
                          <span className="text-[var(--color-gold)] text-xs">◆</span> 处此爻之征
                        </div>
                        <ul className="space-y-1.5 pl-4">
                          {yao.indicators.map((ind, i) => (
                            <li
                              key={i}
                              className="flex gap-2 items-start text-[var(--color-ink-600)] font-serif"
                            >
                              <span className="text-[var(--color-ink-400)] text-[10px] mt-1">
                                ○
                              </span>
                              {ind}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </SmoothExpand>
              </div>
            )
          })}
        </div>
      </div>
    </ScrollRevealSection>
  )
}
