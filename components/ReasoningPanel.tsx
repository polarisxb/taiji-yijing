'use client'

import { useState } from 'react'
import { SmoothExpand } from './SmoothExpand'

type Props = {
  reasoning: string
  confidence: 'high' | 'medium' | 'low'
}

const CONFIDENCE_LABELS: Record<string, { text: string; color: string }> = {
  high: { text: '高置信', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
  medium: { text: '中置信', color: 'text-amber-700 bg-amber-50 border-amber-300' },
  low: { text: '低置信', color: 'text-red-700 bg-red-50 border-red-300' },
}

export function ReasoningPanel({ reasoning, confidence }: Props) {
  const [open, setOpen] = useState(false)
  const label = CONFIDENCE_LABELS[confidence] ?? CONFIDENCE_LABELS.medium

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)] font-serif transition-colors"
      >
        <span
          style={{
            display: 'inline-block',
            transition: 'transform 0.2s ease',
            transform: open ? 'rotate(90deg)' : 'rotate(0)',
          }}
        >
          ▸
        </span>
        <span>为什么是这一卦？</span>
        <span className={`px-1.5 py-0.5 text-[10px] border rounded ${label.color}`}>
          {label.text}
        </span>
      </button>
      <SmoothExpand open={open} duration={300}>
        <div
          className="mt-3 pl-4 text-sm text-[var(--color-ink-600)] font-serif leading-[2.2] whitespace-pre-wrap"
          style={{
            borderLeft: '2px solid var(--color-vermillion)',
            borderImage:
              'linear-gradient(to bottom, var(--color-vermillion), var(--color-gold-light)) 1',
            opacity: open ? 1 : 0,
            transition: 'opacity 0.4s ease 0.1s',
          }}
        >
          {reasoning}
        </div>
      </SmoothExpand>
    </div>
  )
}
