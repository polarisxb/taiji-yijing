'use client'

type Props = {
  message: string
  onRetry?: () => void
  retryLabel?: string
}

export function InlineErrorState({ message, onRetry, retryLabel = '重试' }: Props) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 p-4 rounded border-l-2 border-rose-500 bg-rose-50/40 text-sm font-serif"
    >
      <span aria-hidden className="text-rose-600 mt-[1px]">
        ⚠
      </span>
      <div className="flex-1 text-[var(--color-ink-700)] leading-relaxed">{message}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 text-xs font-serif text-[var(--color-vermillion)] border border-[var(--color-vermillion)] px-3 py-1 rounded hover:bg-[var(--color-vermillion)] hover:text-white transition-colors"
        >
          {retryLabel}
        </button>
      )}
    </div>
  )
}
