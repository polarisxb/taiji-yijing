'use client'

import { useEffect, useState } from 'react'

/**
 * 卜筮加载动画 — 六爻逐一绘出 + 闪烁
 */
export function DivinationLoader() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s) => (s + 1) % 12)
    }, 350)
    return () => clearInterval(timer)
  }, [])

  // 随机生成显示模式：0=不显示, 1=阳爻, 2=阴爻, 3=闪烁
  const lines = Array.from({ length: 6 }, (_, i) => {
    if (i > step && step < 6) return 0 // 还没画到
    if (step >= 6) {
      // 全部画完后闪烁循环
      const flickerIdx = (step - 6) % 6
      return i === flickerIdx ? 3 : (i + step) % 2 === 0 ? 1 : 2
    }
    return i === step ? 3 : (i + step) % 2 === 0 ? 1 : 2
  })

  return (
    <div className="flex flex-col items-center gap-8 py-16">
      <div className="flex flex-col items-center gap-[6px]">
        {lines.map((mode, i) => (
          <div
            key={i}
            className="flex items-center justify-center"
            style={{
              opacity: mode === 0 ? 0 : mode === 3 ? 0.4 : 1,
              transition: 'all 0.3s ease',
            }}
          >
            {mode === 2 ? (
              <div className="flex gap-[6px]">
                <div className="h-[5px] w-[22px] bg-[var(--color-ink-800)] rounded-sm" />
                <div className="h-[5px] w-[22px] bg-[var(--color-ink-800)] rounded-sm" />
              </div>
            ) : (
              <div
                className="h-[5px] w-[50px] rounded-sm"
                style={{
                  background: mode === 3 ? 'var(--color-vermillion)' : 'var(--color-ink-800)',
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="text-center space-y-2">
        <p className="font-serif text-sm text-[var(--color-ink-600)] tracking-widest animate-pulse">
          {step < 6 ? '取象中' : '断卦中'}
        </p>
        <div className="flex justify-center gap-1">
          {[0, 1, 2].map((d) => (
            <span
              key={d}
              className="w-1.5 h-1.5 rounded-full bg-[var(--color-vermillion)]"
              style={{
                animation: `pulse 1.2s ease-in-out ${d * 0.2}s infinite`,
                opacity: 0.4,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
