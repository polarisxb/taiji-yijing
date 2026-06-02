'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SmoothExpand } from './SmoothExpand'
import { getConfidenceBadge } from '@/lib/zheng/confidence'
import type { AiConfidence } from '@/lib/zheng/types'

type Props = {
  reasoning: string
  confidence: AiConfidence
}

export function ReasoningPanel({ reasoning, confidence }: Props) {
  const [open, setOpen] = useState(false)
  const badge = getConfidenceBadge(confidence)

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
        <span className={`px-1.5 py-0.5 text-[10px] border rounded ${badge.colorClass}`}>
          {badge.label}
        </span>
      </button>
      <SmoothExpand open={open} duration={300}>
        <div
          className="mt-3 pl-4 text-sm text-[var(--color-ink-600)] font-serif leading-[2.2] prose prose-sm max-w-none"
          style={{
            borderLeft: '2px solid var(--color-vermillion)',
            borderImage:
              'linear-gradient(to bottom, var(--color-vermillion), var(--color-gold-light)) 1',
            opacity: open ? 1 : 0,
            transition: 'opacity 0.4s ease 0.1s',
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{reasoning}</ReactMarkdown>
        </div>
      </SmoothExpand>
    </div>
  )
}
