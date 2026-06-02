/**
 * AiResultCard render tests — TDD compliance for the new 114-line component.
 *
 * Covers what the bot-reviewed comment requested:
 *  1. badge text + color class for all three confidence levels (定见/待审/审慎)
 *  2. yaoName fallback when hexagram.yao does NOT have an entry for the position
 *  3. yaoName from hexagram.yao when present
 *  4. 专属解读 section conditional on non-empty interpretation
 *  5. SaveConsultationButton conditional on situation.trim() && done
 *
 * Why use fixtures instead of mocking child components:
 *  - HexagramSymbol / ReasoningPanel / StreamingText are pure render components, no side effects
 *  - SaveConsultationButton only does localStorage on click (not on mount) — jsdom provides it
 *  - Real renders give stronger integration confidence than mocks
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AiResultCard } from '@/components/AiResultCard'
import type { Hexagram, Yao } from '@/lib/types'
import type { MatchData } from '@/hooks/useStreamingConsult'

// ─── Fixtures ──────────────────────────────────────────────────────────────

const makeYao = (position: 1 | 2 | 3 | 4 | 5 | 6, name: string): Yao => ({
  position,
  name,
  text: `爻辞 ${position}`,
  modernReading: `现代释读 ${position}`,
  scenario: `场景 ${position}`,
  actionable: [`行动 ${position}`],
  indicators: [`征兆 ${position}`],
})

const makeHexagram = (overrides: Partial<Hexagram> = {}): Hexagram => ({
  number: 1,
  name: { chinese: '乾', pinyin: 'qián', english: 'The Creative' },
  trigrams: { upper: '乾', lower: '乾' },
  binary: '111111',
  judgment: { text: '元亨利贞', modernReading: '原始亨通利于守正' },
  image: { text: '天行健', modernReading: '天体运行刚健不息' },
  features: {
    archetype: 'creating',
    phase: 'developing',
    scale: 'personal',
    power: 'balanced',
    agency: 'active',
    risk: 'moderate',
  },
  keywords: ['创建', '主动'],
  themes: ['乾道'],
  appliesWhen: ['新事开端'],
  antiPatterns: ['冲动妄进'],
  yao: [
    makeYao(1, '初九'),
    makeYao(2, '九二'),
    makeYao(3, '九三'),
    makeYao(4, '九四'),
    makeYao(5, '九五'),
    makeYao(6, '上九'),
  ],
  parallels: {},
  ...overrides,
})

const makeMatch = (overrides: Partial<MatchData> = {}): MatchData => ({
  hexagramNumber: 1,
  reasoning: '示例推理：你处于初创阶段，需要谨慎前行。',
  confidence: 'high',
  yaoPosition: 1,
  yaoConfidence: 'high',
  yaoBrief: '你正处于潜龙勿用之时，宜蓄势待发。',
  runners: [2, 11],
  ...overrides,
})

// ─── 1. Confidence badge: text + color class per level ─────────────────────

describe('AiResultCard — confidence badge', () => {
  it('renders 定见 badge with warm palette class for high confidence', () => {
    render(
      <AiResultCard
        hexagram={makeHexagram()}
        matchData={makeMatch({ confidence: 'high' })}
        interpretation=""
        done={false}
        situation=""
      />,
    )
    const badge = screen.getByLabelText('AI 确信度 定见')
    expect(badge).toBeInTheDocument()
    expect(badge.textContent).toBe('定见')
    // 暖纸/暖棕/暖金 palette — 走 CSS 变量（globals.css @theme），不硬编 hex
    expect(badge.className).toContain('var(--color-paper)')
    expect(badge.className).toContain('var(--color-warm-text)')
    expect(badge.className).toContain('var(--color-warm-border)')
  })

  it('renders 待审 badge with amber palette class for medium confidence', () => {
    render(
      <AiResultCard
        hexagram={makeHexagram()}
        matchData={makeMatch({ confidence: 'medium' })}
        interpretation=""
        done={false}
        situation=""
      />,
    )
    const badge = screen.getByLabelText('AI 确信度 待审')
    expect(badge).toBeInTheDocument()
    expect(badge.textContent).toBe('待审')
    expect(badge.className).toMatch(/amber/)
  })

  it('renders 审慎 badge with rose palette class for low confidence', () => {
    render(
      <AiResultCard
        hexagram={makeHexagram()}
        matchData={makeMatch({ confidence: 'low' })}
        interpretation=""
        done={false}
        situation=""
      />,
    )
    const badge = screen.getByLabelText('AI 确信度 审慎')
    expect(badge).toBeInTheDocument()
    expect(badge.textContent).toBe('审慎')
    expect(badge.className).toMatch(/rose/)
  })
})

// ─── 2. yaoName lookup + fallback ─────────────────────────────────────────

describe('AiResultCard — yaoName resolution', () => {
  it('uses the yao name from hexagram.yao when the position is present', () => {
    render(
      <AiResultCard
        hexagram={makeHexagram()}
        matchData={makeMatch({ yaoPosition: 3 })}
        interpretation=""
        done={false}
        situation=""
      />,
    )
    expect(screen.getByText(/AI 定位 · 九三/)).toBeInTheDocument()
  })

  it('falls back to "第N爻" when hexagram.yao lacks an entry for the position', () => {
    render(
      <AiResultCard
        hexagram={makeHexagram({ yao: [] })}
        matchData={makeMatch({ yaoPosition: 4 })}
        interpretation=""
        done={false}
        situation=""
      />,
    )
    expect(screen.getByText(/AI 定位 · 第4爻/)).toBeInTheDocument()
  })
})

// ─── 3. Personalized interpretation section conditional ────────────────────

describe('AiResultCard — interpretation section', () => {
  it('hides 专属解读 section when interpretation is empty', () => {
    render(
      <AiResultCard
        hexagram={makeHexagram()}
        matchData={makeMatch()}
        interpretation=""
        done={false}
        situation=""
      />,
    )
    expect(screen.queryByText('专属解读')).not.toBeInTheDocument()
  })

  it('shows 专属解读 section and renders interpretation text when non-empty', () => {
    const interp = '这是你的专属解读内容。请细品。'
    render(
      <AiResultCard
        hexagram={makeHexagram()}
        matchData={makeMatch()}
        interpretation={interp}
        done={true}
        situation=""
      />,
    )
    expect(screen.getByText('专属解读')).toBeInTheDocument()
    // The interpretation text appears in the document (regardless of how
    // StreamingText slices it into spans/paragraphs).
    expect(document.body.textContent).toContain('这是你的专属解读内容')
  })
})

// ─── 4. SaveConsultationButton conditional on situation + done ────────────

describe('AiResultCard — SaveConsultationButton', () => {
  it('does not render save button when situation is empty (even if done)', () => {
    render(
      <AiResultCard
        hexagram={makeHexagram()}
        matchData={makeMatch()}
        interpretation="some interp"
        done={true}
        situation=""
      />,
    )
    expect(screen.queryByText(/记此一卦/)).not.toBeInTheDocument()
  })

  it('renders save button when situation non-empty AND done (PR-2 gate)', () => {
    render(
      <AiResultCard
        hexagram={makeHexagram()}
        matchData={makeMatch()}
        interpretation="full interp"
        done={true}
        situation="我在做一个决定"
      />,
    )
    expect(screen.getByText(/记此一卦/)).toBeInTheDocument()
  })

  it('does NOT render save button while streaming is in progress (done=false)', () => {
    // PR-2 / F (rhythm) adds a `done` gate so the save button only appears
    // after streaming finishes, giving the user space to read before acting.
    render(
      <AiResultCard
        hexagram={makeHexagram()}
        matchData={makeMatch()}
        interpretation="streaming partial text..."
        done={false}
        situation="我在做一个决定"
      />,
    )
    expect(screen.queryByText(/记此一卦/)).not.toBeInTheDocument()
  })
})

// ─── 5. "深入此卦" link carries phase + result URL state ───────────────────

describe('AiResultCard — 深入此卦 link', () => {
  it('links to /hexagram/{number} with phase, from=consult, and r 状态参数', () => {
    render(
      <AiResultCard
        hexagram={makeHexagram({ number: 5 })}
        matchData={makeMatch({ yaoPosition: 4 })}
        interpretation=""
        done={false}
        situation="我在考虑一个重要决定"
      />,
    )
    const link = screen.getByText(/深入此卦/).closest('a')
    expect(link).not.toBeNull()
    const href = link?.getAttribute('href') ?? ''
    expect(href.startsWith('/hexagram/5?phase=4')).toBe(true)
    expect(href).toContain('from=consult')
    // r 参数携带可还原首页结果的编码状态
    const r = new URLSearchParams(href.split('?')[1]).get('r')
    expect(r).toBeTruthy()
    const restored = new URLSearchParams(decodeURIComponent(r!))
    expect(restored.get('h')).toBe('5')
    expect(restored.get('p')).toBe('4')
  })
})
