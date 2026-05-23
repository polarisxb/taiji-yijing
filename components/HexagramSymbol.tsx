/**
 * 卦象符号渲染 — 把 6 位二进制画成六爻图形
 * 1=阳爻（实线），0=阴爻（断线）
 * 易经传统从下往上读，所以 binary[5] 是最下方的初爻
 */
type Props = {
  binary: string // 6 位 0/1，例如 "111111" 表示乾
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_MAP = {
  sm: { line: 'h-[2px] w-6', gap: 'gap-[3px]' },
  md: { line: 'h-[3px] w-10', gap: 'gap-[4px]' },
  lg: { line: 'h-[4px] w-12', gap: 'gap-[5px]' },
}

export function HexagramSymbol({ binary, size = 'md', className = '' }: Props) {
  if (binary.length !== 6) return null
  const sz = SIZE_MAP[size]
  // 从上到下渲染：第一行是 binary[0]（最上方第六爻）
  const lines = binary.split('')
  return (
    <div className={`inline-flex flex-col ${sz.gap} ${className}`}>
      {lines.map((b, i) => (
        <span key={i} className={`${sz.line} relative bg-current`} aria-hidden>
          {b === '0' && (
            <span className="absolute left-1/2 top-0 bottom-0 w-[20%] -translate-x-1/2 bg-[var(--color-ink-50)]" />
          )}
        </span>
      ))}
    </div>
  )
}
