'use client'

import { useEffect, useState } from 'react'
import { loaderCopyForVariant, type LoaderVariant } from '@/lib/loader-copy'

type Props = {
  /**
   * 模式变体：
   * - classic（默认）= 思 = 紧凑节奏（350ms/步）+ 朱砂闪烁 + "取象中/断卦中"
   * - ai = 观 = 较慢节奏（500ms/步）+ 暖灰闪烁 + "正在为你观局/理事…"
   */
  variant?: LoaderVariant
}

/**
 * 卜筮加载动画 — 六爻逐一绘出 + 闪烁
 *
 * 节奏差异（PR-2 / F）：
 * - classic 350ms：节奏感清晰，配合"思"的主动接收
 * - ai 500ms：稍慢更舒缓，配合"观"的被动陪伴
 */
export function DivinationLoader({ variant = 'classic' }: Props) {
  const [step, setStep] = useState(0)
  const intervalMs = variant === 'ai' ? 500 : 350
  const flickerColor = variant === 'ai' ? '#a89884' : 'var(--color-vermillion)'
  const dotColor = variant === 'ai' ? '#a89884' : 'var(--color-vermillion)'

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s) => (s + 1) % 12)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])

  const lines = Array.from({ length: 6 }, (_, i) => {
    if (i > step && step < 6) return 0
    if (step >= 6) {
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
                  background: mode === 3 ? flickerColor : 'var(--color-ink-800)',
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="text-center space-y-2">
        <p className="font-serif text-sm text-[var(--color-ink-600)] tracking-widest animate-pulse">
          {loaderCopyForVariant(variant, step)}
        </p>
        <div className="flex justify-center gap-1">
          {[0, 1, 2].map((d) => (
            <span
              key={d}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: dotColor,
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
