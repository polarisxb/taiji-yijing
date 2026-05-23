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
        <span className="inline-block w-0.5 h-4 bg-[var(--color-vermillion)] ml-0.5 animate-pulse align-middle" />
      )}
    </div>
  )
}
