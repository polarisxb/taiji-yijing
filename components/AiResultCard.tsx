'use client'

import Link from 'next/link'
import type { Hexagram } from '@/lib/types'
import type { MatchData } from '@/hooks/useStreamingConsult'
import { HexagramSymbol } from './HexagramSymbol'
import { ReasoningPanel } from './ReasoningPanel'
import { StreamingText } from './StreamingText'
import { SaveConsultationButton } from './zheng/SaveConsultationButton'
import { confidenceToScore, getConfidenceBadge } from '@/lib/zheng/confidence'

type Props = {
  hexagram: Hexagram
  matchData: MatchData
  interpretation: string
  done: boolean
  situation: string
}

export function AiResultCard({ hexagram, matchData, interpretation, done, situation }: Props) {
  const yaoName = hexagram.yao[matchData.yaoPosition - 1]?.name ?? `第${matchData.yaoPosition}爻`
  const badge = getConfidenceBadge(matchData.confidence)

  return (
    <div
      className="card-classical rounded-lg p-8 border-l-2"
      style={{
        animation: 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.15s both',
        borderLeftColor: '#a89884',
      }}
    >
      {/* 卦首 */}
      <div className="flex items-start gap-6 mb-6">
        <div
          className="hexagram-display flex items-center justify-center w-20 h-20 rounded-lg shrink-0"
          style={{ animation: 'breathe 3s ease-in-out infinite' }}
        >
          <HexagramSymbol binary={hexagram.binary} size="lg" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-3xl text-[var(--color-ink-900)] tracking-wider">
            {hexagram.name.chinese}
          </h2>
          <p className="text-sm text-[var(--color-ink-400)] font-serif mt-1">
            {hexagram.name.pinyin} · 第{hexagram.number}卦
          </p>
        </div>
        <div className="shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-serif tracking-wide border rounded-sm ${badge.colorClass}`}
            aria-label={`AI 确信度 ${badge.label}`}
          >
            {badge.label}
          </span>
          <div className="mt-1 text-[10px] tracking-[0.2em] text-[var(--color-ink-400)] font-serif text-right">
            确信
          </div>
        </div>
      </div>

      {/* AI 定位（爻位 + brief）*/}
      <div className="mb-6 pl-4 border-l-2 border-[#c4b99a]/60">
        <div className="text-[10px] tracking-[0.2em] text-[var(--color-ink-400)] mb-1.5 font-serif">
          AI 定位 · {yaoName}
        </div>
        <p className="font-serif text-[var(--color-ink-700)] leading-relaxed text-sm">
          {matchData.yaoBrief}
        </p>
      </div>

      {/* 推理面板 — 为什么是这一卦 */}
      <ReasoningPanel reasoning={matchData.reasoning} confidence={matchData.confidence} />

      {/* 个性化解读 */}
      {interpretation && (
        <div className="mt-6 pt-6 border-t border-[var(--color-ink-100)]">
          <div className="text-[10px] tracking-[0.2em] text-[var(--color-ink-400)] mb-3 font-serif">
            专属解读
          </div>
          <StreamingText text={interpretation} done={done} />
        </div>
      )}

      {/* 深入此卦 */}
      <div className="mt-6 pt-6 border-t border-[var(--color-ink-100)]">
        <Link
          href={`/hexagram/${hexagram.number}?phase=${matchData.yaoPosition}`}
          className="text-sm text-[var(--color-vermillion)] font-serif hover:underline"
        >
          深入此卦 →
        </Link>
      </div>

      {/* 记此一卦 */}
      {situation.trim() && (
        <SaveConsultationButton
          situation={situation.trim()}
          hexagramId={hexagram.number}
          hexagramName={hexagram.name.chinese}
          fitScore={confidenceToScore(matchData.confidence)}
          aiYao={{
            position: matchData.yaoPosition as 1 | 2 | 3 | 4 | 5 | 6,
            name: yaoName,
            brief: matchData.yaoBrief,
            confidence: matchData.confidence,
          }}
          consultMode="ai"
        />
      )}
    </div>
  )
}
