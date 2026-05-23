/**
 * 太极图 SVG 组件 — 精确阴阳鱼 + 缓慢旋转 + 呼吸光晕
 */
type Props = {
  size?: number
  className?: string
  animate?: boolean
}

export function TaijiSymbol({ size = 80, className = '', animate = true }: Props) {
  const r = size / 2
  const sr = r / 2
  const dr = r / 7
  const glowR = r + 12

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* 呼吸光晕 */}
      {animate && (
        <div
          className="absolute rounded-full"
          style={{
            width: glowR * 2,
            height: glowR * 2,
            background:
              'radial-gradient(circle, rgba(196,80,58,0.08) 0%, rgba(184,150,44,0.04) 40%, transparent 70%)',
            animation: 'breathe 4s ease-in-out infinite',
          }}
        />
      )}

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-label="太极图"
        role="img"
        style={animate ? { animation: 'taiji-spin 30s linear infinite' } : undefined}
      >
        <defs>
          <filter id="taiji-shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#1a1610" floodOpacity="0.15" />
          </filter>
        </defs>

        <g filter="url(#taiji-shadow)">
          {/* 外圆 */}
          <circle
            cx={r}
            cy={r}
            r={r - 1}
            fill="none"
            stroke="var(--color-ink-800)"
            strokeWidth="1.5"
          />

          {/* 阴 — 右半 */}
          <path
            d={`M ${r} 2 A ${r - 2} ${r - 2} 0 0 1 ${r} ${size - 2} A ${sr} ${sr} 0 0 1 ${r} ${r} A ${sr} ${sr} 0 0 0 ${r} 2 Z`}
            fill="var(--color-ink-900)"
          />

          {/* 阳 — 左半 */}
          <path
            d={`M ${r} ${size - 2} A ${r - 2} ${r - 2} 0 0 1 ${r} 2 A ${sr} ${sr} 0 0 1 ${r} ${r} A ${sr} ${sr} 0 0 0 ${r} ${size - 2} Z`}
            fill="var(--color-paper-light, #faf7f0)"
          />

          {/* 鱼眼 */}
          <circle cx={r} cy={r / 2 + 1} r={dr} fill="var(--color-ink-900)" />
          <circle cx={r} cy={r + sr} r={dr} fill="var(--color-paper-light, #faf7f0)" />
        </g>
      </svg>
    </div>
  )
}
