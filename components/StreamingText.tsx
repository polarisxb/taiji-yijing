'use client'

import { splitInterpretationParagraphs } from '@/lib/streaming-segments'

type Props = {
  text: string
  done?: boolean
  className?: string
}

/**
 * Streaming interpretation text. Each completed sentence fades in independently
 * so the AI 解读 feels like ink slowly settling on paper. Paragraph breaks
 * (\n in the source) become visible block-level breaks, preserving the
 * "经文 → 释义 → 映射 → 建议" structure the AI prompt asks for.
 *
 * Sentences/paragraphs are computed deterministically from the streaming text
 * (see `splitInterpretationParagraphs`), so React keys stay stable: only the
 * newly-appended trailing sentence (or new paragraph) animates on each tick.
 */
export function StreamingText({ text, done = false, className = '' }: Props) {
  if (!text) return null

  const paragraphs = splitInterpretationParagraphs(text)

  return (
    <div className={`font-serif text-[var(--color-ink-700)] leading-[2.2] text-sm ${className}`}>
      {paragraphs.map((sentences, pIdx) => {
        const isLastPara = pIdx === paragraphs.length - 1
        return (
          <p key={pIdx} className={pIdx > 0 ? 'mt-3' : ''}>
            {sentences.map((sentence, sIdx) => (
              // 中文句间不插空格：splitInterpretationParagraphs 已经把
              // 。！？ 终止符附在句尾，直接拼接即可
              <span key={sIdx} className="animate-fade-segment">
                {sentence}
              </span>
            ))}
            {isLastPara && !done && (
              <span
                className="inline-block ml-0.5 align-middle animate-pulse"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '3px solid transparent',
                  borderRight: '3px solid transparent',
                  borderTop: '10px solid var(--color-vermillion)',
                  opacity: 0.8,
                }}
              />
            )}
          </p>
        )
      })}
    </div>
  )
}
