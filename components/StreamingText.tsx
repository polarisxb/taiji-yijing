'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { splitInterpretationParagraphs } from '@/lib/streaming-segments'

type Props = {
  text: string
  done?: boolean
  className?: string
}

/**
 * Streaming interpretation text.
 *
 * - During streaming (done=false): Use the original sentence-by-sentence animation
 *   for a nice "ink settling" effect (plain text to avoid broken partial markdown).
 * - When streaming finishes (done=true): Switch to full ReactMarkdown rendering
 *   so **bold**, lists, etc. are properly formatted.
 */
export function StreamingText({ text, done = false, className = '' }: Props) {
  if (!text) return null

  // During streaming: keep the nice animated plain-text experience
  if (!done) {
    const paragraphs = splitInterpretationParagraphs(text)

    return (
      <div className={`font-serif text-[var(--color-ink-700)] leading-[2.2] text-sm ${className}`}>
        {paragraphs.map((sentences, pIdx) => {
          const isLastPara = pIdx === paragraphs.length - 1
          return (
            <p key={pIdx} className={pIdx > 0 ? 'mt-3' : ''}>
              {sentences.map((sentence, sIdx) => (
                <span key={sIdx} className="animate-fade-segment">
                  {sentence}
                </span>
              ))}
              {isLastPara && (
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

  // When streaming is finished: render with full markdown support
  return (
    <div
      className={`font-serif text-[var(--color-ink-700)] leading-[2.2] text-sm prose prose-sm max-w-none ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text.replace(/\n+/g, '\n\n')}</ReactMarkdown>
    </div>
  )
}
