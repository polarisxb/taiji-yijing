'use client'

import { splitInterpretationSegments } from '@/lib/streaming-segments'

type Props = {
  text: string
  done?: boolean
  className?: string
}

/**
 * Streaming interpretation text. Each completed sentence fades in independently
 * so the AI 解读 feels like ink slowly settling on paper.
 *
 * Segments are computed deterministically from the streaming text (see
 * `splitInterpretationSegments`), so the React keys stay stable: only the
 * newly-appended trailing fragment animates on each tick.
 */
export function StreamingText({ text, done = false, className = '' }: Props) {
  if (!text) return null

  const segments = splitInterpretationSegments(text)

  return (
    <div className={`font-serif text-[var(--color-ink-700)] leading-[2.2] text-sm ${className}`}>
      {segments.map((seg, i) => (
        <span key={i} className="animate-fade-segment inline">
          {seg}
          {i < segments.length - 1 ? ' ' : ''}
        </span>
      ))}
      {!done && (
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
    </div>
  )
}
