'use client'

type Props = {
  text: string
  done?: boolean
  className?: string
}

export function StreamingText({ text, done = false, className = '' }: Props) {
  if (!text) return null

  return (
    <div
      className={`font-serif text-[var(--color-ink-700)] leading-[2.2] text-sm whitespace-pre-wrap ${className}`}
    >
      {text}
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
