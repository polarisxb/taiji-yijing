# Hexagram Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 6-layer scroll narrative detail page for each hexagram (经→传→按→六爻→行→关系), plus a 64-hexagram grid overview page, with navigation from match results.

**Architecture:** Next.js App Router dynamic routes with SSG. Components split by narrative layer under `components/hexagram/`. Data layer adds a helper module for hexagram lookup and relationship resolution. All styling uses existing CSS variable system.

**Tech Stack:** Next.js 15 (App Router, SSG), React 19, TypeScript, Tailwind CSS 4, existing animation hooks

---

## File Map

| Action | Path                                            | Responsibility                        |
| ------ | ----------------------------------------------- | ------------------------------------- |
| Create | `lib/hexagram-utils.ts`                         | Lookup helpers + phase-to-yao mapping |
| Modify | `lib/types.ts`                                  | Add `HexagramRelation` type           |
| Create | `app/hexagram/[id]/page.tsx`                    | Detail page route (SSG)               |
| Create | `app/hexagrams/page.tsx`                        | Grid overview route (SSG)             |
| Create | `components/hexagram/HexagramHero.tsx`          | Layer 1: 卦首                         |
| Create | `components/hexagram/ClassicalText.tsx`         | Layer 2: 经                           |
| Create | `components/hexagram/InterpretationSection.tsx` | Layer 3: 传                           |
| Create | `components/hexagram/SituationMapping.tsx`      | Layer 4: 按                           |
| Create | `components/hexagram/YaoTimeline.tsx`           | Layer 5: 六爻阶段图                   |
| Create | `components/hexagram/ActionSummary.tsx`         | Layer 6: 行                           |
| Create | `components/hexagram/RelatedHexagrams.tsx`      | Layer 7: 卦象关系                     |
| Create | `components/hexagram/FloatingBackBar.tsx`       | Floating back nav                     |
| Create | `components/hexagram/HexagramGrid.tsx`          | 64 卦网格                             |
| Create | `components/hexagram/ScrollRevealSection.tsx`   | Scroll-triggered fade-in wrapper      |
| Modify | `components/MatchCard.tsx`                      | Add「深入此卦」link                   |
| Modify | `app/globals.css`                               | New classical styles                  |
| Create | `__tests__/hexagram-utils.test.ts`              | Unit tests for helpers                |
| Modify | `content/hexagrams/01-qian.ts`                  | Add relations field                   |
| Modify | `content/hexagrams/02-kun.ts`                   | Add relations field                   |
| Modify | `content/hexagrams/03-zhun.ts`                  | Add relations field                   |

---

### Task 1: Data Layer — Types + Helpers

**Files:**

- Modify: `lib/types.ts`
- Create: `lib/hexagram-utils.ts`
- Create: `__tests__/hexagram-utils.test.ts`

- [ ] **Step 1: Add HexagramRelation type to lib/types.ts**

Add after the `Hexagram` type definition:

```typescript
export type HexagramRelation = {
  type: 'complementary' | 'inverse' | 'nuclear' | 'sequence'
  targetNumber: number
  narrative: string
}
```

And add optional field to `Hexagram` type:

```typescript
relations?: HexagramRelation[]
```

- [ ] **Step 2: Write failing tests for hexagram-utils**

```typescript
import { describe, it, expect } from 'vitest'
import { findHexagramByNumber, findHexagramById, getPhaseYaoIndex } from '@/lib/hexagram-utils'

describe('findHexagramByNumber', () => {
  it('finds qian by number 1', () => {
    const hex = findHexagramByNumber(1)
    expect(hex).toBeDefined()
    expect(hex!.name.chinese).toBe('乾')
  })

  it('returns undefined for non-existent number', () => {
    expect(findHexagramByNumber(99)).toBeUndefined()
  })
})

describe('findHexagramById', () => {
  it('finds hexagram by string id "1"', () => {
    const hex = findHexagramById('1')
    expect(hex).toBeDefined()
    expect(hex!.number).toBe(1)
  })

  it('finds hexagram by string id "01"', () => {
    const hex = findHexagramById('01')
    expect(hex).toBeDefined()
    expect(hex!.number).toBe(1)
  })

  it('returns undefined for invalid id', () => {
    expect(findHexagramById('abc')).toBeUndefined()
  })
})

describe('getPhaseYaoIndex', () => {
  it('maps germinal to yao index 0 (初爻)', () => {
    expect(getPhaseYaoIndex('germinal')).toBe(0)
  })

  it('maps emerging to yao index 1', () => {
    expect(getPhaseYaoIndex('emerging')).toBe(1)
  })

  it('maps developing to yao index 2', () => {
    expect(getPhaseYaoIndex('developing')).toBe(2)
  })

  it('maps peak to yao index 3', () => {
    expect(getPhaseYaoIndex('peak')).toBe(3)
  })

  it('maps declining to yao index 4', () => {
    expect(getPhaseYaoIndex('declining')).toBe(4)
  })

  it('maps ending to yao index 5', () => {
    expect(getPhaseYaoIndex('ending')).toBe(5)
  })

  it('returns undefined for unknown phase', () => {
    expect(getPhaseYaoIndex(undefined)).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run __tests__/hexagram-utils.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement lib/hexagram-utils.ts**

```typescript
import type { Phase } from './types'
import { ALL_HEXAGRAMS } from '@/content/hexagrams'

export function findHexagramByNumber(num: number) {
  return ALL_HEXAGRAMS.find((h) => h.number === num)
}

export function findHexagramById(id: string) {
  const num = parseInt(id, 10)
  if (isNaN(num)) return undefined
  return findHexagramByNumber(num)
}

const PHASE_YAO_MAP: Record<Phase, number> = {
  germinal: 0,
  emerging: 1,
  developing: 2,
  peak: 3,
  declining: 4,
  ending: 5,
}

export function getPhaseYaoIndex(phase: Phase | undefined): number | undefined {
  if (!phase) return undefined
  return PHASE_YAO_MAP[phase]
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run __tests__/hexagram-utils.test.ts`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/hexagram-utils.ts __tests__/hexagram-utils.test.ts
git commit -m "feat: add hexagram lookup helpers and HexagramRelation type"
```

---

### Task 2: ScrollRevealSection + CSS Foundation

**Files:**

- Create: `components/hexagram/ScrollRevealSection.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Create ScrollRevealSection wrapper**

```tsx
'use client'

import { useScrollReveal } from '@/hooks/useAnimations'

type Props = {
  children: React.ReactNode
  className?: string
  delay?: number
}

export function ScrollRevealSection({ children, className = '', delay = 0 }: Props) {
  const { ref, visible } = useScrollReveal<HTMLElement>(0.1)

  return (
    <section
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(24px)',
        transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </section>
  )
}
```

- [ ] **Step 2: Add new CSS styles to globals.css**

Append to `app/globals.css`:

```css
/* ——— 经文大字排版 ——— */
.classical-large {
  font-family: var(--font-serif);
  font-size: 1.5rem;
  line-height: 2.4;
  letter-spacing: 0.15em;
  text-align: center;
  color: var(--color-ink-800);
}
.classical-large .punctuation {
  color: var(--color-vermillion);
  opacity: 0.6;
}

/* ——— 爻时间线 ——— */
.yao-timeline {
  position: relative;
  padding-left: 2rem;
}
.yao-timeline::before {
  content: '';
  position: absolute;
  left: 0.75rem;
  top: 1rem;
  bottom: 1rem;
  width: 2px;
  background: linear-gradient(to bottom, var(--color-ink-200), var(--color-ink-100));
}

.yao-node {
  position: relative;
  padding-left: 1.5rem;
  padding-bottom: 0.5rem;
  cursor: pointer;
}
.yao-node::before {
  content: '';
  position: absolute;
  left: -1.6rem;
  top: 0.85rem;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--color-ink-200);
  background: var(--color-paper-light);
  transition: all 0.25s ease;
}
.yao-node:hover::before {
  border-color: var(--color-gold);
}
.yao-node-active::before {
  border-color: var(--color-vermillion);
  background: var(--color-vermillion);
  box-shadow: 0 0 8px rgba(196, 80, 58, 0.3);
}

/* ——— 阶段高亮提示 ——— */
.phase-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.15rem 0.5rem;
  background: var(--color-vermillion-bg);
  border: 1px solid var(--color-vermillion);
  border-radius: 2px;
  color: var(--color-vermillion);
  font-family: var(--font-serif);
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  animation: breathe 2s ease-in-out infinite;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/hexagram/ScrollRevealSection.tsx app/globals.css
git commit -m "feat: add ScrollRevealSection component and detail page CSS"
```

---

### Task 3: HexagramHero + FloatingBackBar

**Files:**

- Create: `components/hexagram/HexagramHero.tsx`
- Create: `components/hexagram/FloatingBackBar.tsx`

- [ ] **Step 1: Create HexagramHero**

```tsx
import { HexagramSymbol } from '@/components/HexagramSymbol'
import type { Hexagram } from '@/lib/types'

type Props = {
  hexagram: Hexagram
}

export function HexagramHero({ hexagram }: Props) {
  const { number, name, trigrams, binary } = hexagram

  return (
    <header className="text-center pt-16 pb-12">
      <div className="text-xs tracking-[0.4em] text-[var(--color-ink-400)] font-serif mb-6">
        第{number}卦
      </div>

      <div className="inline-flex flex-col items-center">
        <div className="hexagram-display flex flex-col items-center justify-center w-28 h-32 rounded-lg mb-8">
          <HexagramSymbol binary={binary} size="lg" className="text-[var(--color-ink-800)]" />
          <div className="mt-2 text-[10px] tracking-wider text-[var(--color-ink-400)] font-serif">
            {trigrams.upper}上 · {trigrams.lower}下
          </div>
        </div>

        <h1 className="font-serif text-7xl md:text-8xl font-black text-[var(--color-ink-900)] leading-none tracking-widest">
          {name.chinese}
        </h1>

        <div className="mt-4 flex items-center gap-3 text-[var(--color-ink-400)] font-serif">
          <span className="text-sm">{name.pinyin}</span>
          <span className="w-px h-3 bg-[var(--color-ink-200)]" />
          <span className="text-sm">{name.english}</span>
        </div>
      </div>

      <div className="divider-classical w-64 mx-auto mt-10">
        <span className="font-serif">☰ ☷</span>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Create FloatingBackBar**

```tsx
'use client'

import { useSearchParams } from 'next/navigation'

export function FloatingBackBar() {
  const searchParams = useSearchParams()
  const fromConsult = searchParams.get('from') === 'consult'

  if (!fromConsult) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-paper)]/90 backdrop-blur-sm border-b border-[var(--color-ink-100)]">
      <div className="max-w-3xl mx-auto px-6 py-3 flex items-center">
        <a
          href="/"
          className="text-xs font-serif text-[var(--color-ink-600)] hover:text-[var(--color-vermillion)] transition-colors duration-200 flex items-center gap-2"
        >
          <span>←</span>
          <span>回到问卦结果</span>
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/hexagram/HexagramHero.tsx components/hexagram/FloatingBackBar.tsx
git commit -m "feat: add HexagramHero and FloatingBackBar components"
```

---

### Task 4: ClassicalText + InterpretationSection（经 + 传）

**Files:**

- Create: `components/hexagram/ClassicalText.tsx`
- Create: `components/hexagram/InterpretationSection.tsx`

- [ ] **Step 1: Create ClassicalText (Layer 2 — 经)**

```tsx
import type { Hexagram } from '@/lib/types'
import { ScrollRevealSection } from './ScrollRevealSection'

type Props = {
  hexagram: Hexagram
}

export function ClassicalText({ hexagram }: Props) {
  return (
    <ScrollRevealSection className="py-16 px-6">
      <div className="max-w-lg mx-auto space-y-12">
        <div>
          <div className="text-xs tracking-[0.3em] text-[var(--color-ink-400)] font-serif text-center mb-6">
            卦 辞
          </div>
          <p className="classical-large">{hexagram.judgment.text}</p>
        </div>

        <div className="divider-classical w-32 mx-auto">
          <span className="text-[var(--color-ink-200)]">·</span>
        </div>

        <div>
          <div className="text-xs tracking-[0.3em] text-[var(--color-ink-400)] font-serif text-center mb-6">
            象 传
          </div>
          <p className="classical-large">{hexagram.image.text}</p>
        </div>
      </div>
    </ScrollRevealSection>
  )
}
```

- [ ] **Step 2: Create InterpretationSection (Layer 3 — 传)**

```tsx
import type { Hexagram } from '@/lib/types'
import { ScrollRevealSection } from './ScrollRevealSection'

type Props = {
  hexagram: Hexagram
}

export function InterpretationSection({ hexagram }: Props) {
  const { classicalCommentary } = hexagram

  return (
    <ScrollRevealSection className="py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="divider-classical mb-10">
          <span className="font-serif tracking-widest">传</span>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-xs tracking-[0.3em] text-[var(--color-ink-400)] font-serif">
              卦辞释读
            </h3>
            <p className="font-serif text-[var(--color-ink-700)] leading-[2.2] text-base">
              {hexagram.judgment.modernReading}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs tracking-[0.3em] text-[var(--color-ink-400)] font-serif">
              象传释读
            </h3>
            <p className="font-serif text-[var(--color-ink-700)] leading-[2.2] text-base">
              {hexagram.image.modernReading}
            </p>
          </div>

          {classicalCommentary && (
            <div className="space-y-4 pt-4">
              <h3 className="text-xs tracking-[0.3em] text-[var(--color-ink-400)] font-serif">
                义理派注
              </h3>
              <div className="space-y-4">
                {classicalCommentary.chengYi && (
                  <blockquote className="classical-quote text-sm leading-loose">
                    <span className="text-[10px] text-[var(--color-ink-400)] tracking-wider block mb-1">
                      程颐《伊川易传》
                    </span>
                    {classicalCommentary.chengYi}
                  </blockquote>
                )}
                {classicalCommentary.zhuXi && (
                  <blockquote className="classical-quote text-sm leading-loose">
                    <span className="text-[10px] text-[var(--color-ink-400)] tracking-wider block mb-1">
                      朱熹《周易本义》
                    </span>
                    {classicalCommentary.zhuXi}
                  </blockquote>
                )}
                {classicalCommentary.wangBi && (
                  <blockquote className="classical-quote text-sm leading-loose">
                    <span className="text-[10px] text-[var(--color-ink-400)] tracking-wider block mb-1">
                      王弼《周易注》
                    </span>
                    {classicalCommentary.wangBi}
                  </blockquote>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ScrollRevealSection>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/hexagram/ClassicalText.tsx components/hexagram/InterpretationSection.tsx
git commit -m "feat: add ClassicalText and InterpretationSection (经 + 传)"
```

---

### Task 5: SituationMapping（按）

**Files:**

- Create: `components/hexagram/SituationMapping.tsx`

- [ ] **Step 1: Create SituationMapping (Layer 4 — 按)**

```tsx
import type { Hexagram } from '@/lib/types'
import { ScrollRevealSection } from './ScrollRevealSection'

type Props = {
  hexagram: Hexagram
}

export function SituationMapping({ hexagram }: Props) {
  const { appliesWhen, parallels } = hexagram

  return (
    <ScrollRevealSection className="py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="divider-classical mb-10">
          <span className="font-serif tracking-widest">按</span>
        </div>

        <div className="space-y-10">
          {/* 适用情境 */}
          <div>
            <h3 className="text-xs tracking-[0.3em] text-[var(--color-ink-400)] font-serif mb-4">
              若你正处此局
            </h3>
            <ul className="space-y-3">
              {appliesWhen.map((s, i) => (
                <li
                  key={i}
                  className="flex gap-3 items-start font-serif text-[var(--color-ink-700)] leading-relaxed"
                >
                  <span className="text-[var(--color-vermillion)] mt-1 text-xs shrink-0">●</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 现代案例 */}
          {parallels.modernCases && parallels.modernCases.length > 0 && (
            <div>
              <h3 className="text-xs tracking-[0.3em] text-[var(--color-ink-400)] font-serif mb-4">
                今人之鉴
              </h3>
              <div className="space-y-4">
                {parallels.modernCases.map((c, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span
                      className={`shrink-0 mt-0.5 w-6 h-6 flex items-center justify-center text-[10px] font-serif font-bold rounded-full border ${
                        c.outcome === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : c.outcome === 'failure'
                            ? 'bg-red-50 text-red-700 border-red-300'
                            : 'bg-amber-50 text-amber-700 border-amber-300'
                      }`}
                    >
                      {c.outcome === 'success' ? '成' : c.outcome === 'failure' ? '败' : '杂'}
                    </span>
                    <div>
                      <div className="font-semibold text-[var(--color-ink-800)] font-serif">
                        {c.name}
                      </div>
                      <div className="text-sm text-[var(--color-ink-600)] leading-relaxed mt-0.5 font-serif">
                        {c.note}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 西方哲学 */}
          {parallels.westernPhilosophy && parallels.westernPhilosophy.length > 0 && (
            <div>
              <h3 className="text-xs tracking-[0.3em] text-[var(--color-ink-400)] font-serif mb-4">
                西哲参照
              </h3>
              <div className="space-y-4">
                {parallels.westernPhilosophy.map((p, i) => (
                  <div key={i} className="border-l-2 border-[var(--color-gold)] pl-4">
                    <div className="font-semibold text-[var(--color-ink-800)] font-serif">
                      {p.thinker}
                      <span className="ml-2 text-sm text-[var(--color-gold-dark)] font-normal">
                        {p.concept}
                      </span>
                    </div>
                    <div className="text-sm text-[var(--color-ink-600)] leading-relaxed mt-1 font-serif">
                      {p.note}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 文学影视 */}
          {parallels.literature && parallels.literature.length > 0 && (
            <div>
              <h3 className="text-xs tracking-[0.3em] text-[var(--color-ink-400)] font-serif mb-4">
                文学之镜
              </h3>
              <div className="space-y-3">
                {parallels.literature.map((l, i) => (
                  <div
                    key={i}
                    className="font-serif text-sm text-[var(--color-ink-700)] leading-relaxed"
                  >
                    <span className="font-semibold">{l.title}</span>
                    {l.author && <span className="text-[var(--color-ink-400)]"> · {l.author}</span>}
                    <span className="text-[var(--color-ink-400)]"> — </span>
                    {l.note}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ScrollRevealSection>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/hexagram/SituationMapping.tsx
git commit -m "feat: add SituationMapping component (按)"
```

---

### Task 6: YaoTimeline（六爻阶段图 — 核心交互）

**Files:**

- Create: `components/hexagram/YaoTimeline.tsx`

- [ ] **Step 1: Create YaoTimeline**

```tsx
'use client'

import { useState } from 'react'
import type { Hexagram, Phase } from '@/lib/types'
import { SmoothExpand } from '@/components/SmoothExpand'
import { ScrollRevealSection } from './ScrollRevealSection'
import { getPhaseYaoIndex } from '@/lib/hexagram-utils'

type Props = {
  hexagram: Hexagram
  highlightPhase?: Phase
}

export function YaoTimeline({ hexagram, highlightPhase }: Props) {
  const autoIndex = getPhaseYaoIndex(highlightPhase)
  const [openIndex, setOpenIndex] = useState<number | null>(autoIndex ?? null)

  // yao 数组是 position 1-6（初到上），展示从上到下所以反转
  const yaoReversed = [...hexagram.yao].reverse()

  return (
    <ScrollRevealSection className="py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="divider-classical mb-10">
          <span className="font-serif tracking-widest">六爻 · 事之六阶</span>
        </div>

        {highlightPhase && autoIndex !== undefined && (
          <div className="text-center mb-8">
            <span className="phase-indicator">
              <span>◉</span>
              系统判断你可能处于第{autoIndex + 1}爻阶段
            </span>
          </div>
        )}

        <div className="yao-timeline">
          {yaoReversed.map((yao) => {
            const idx = yao.position - 1
            const isOpen = openIndex === idx
            const isHighlighted = autoIndex === idx

            return (
              <div
                key={yao.position}
                className={`yao-node ${isOpen ? 'yao-node-active' : ''}`}
                onClick={() => setOpenIndex(isOpen ? null : idx)}
              >
                {/* 爻头 */}
                <div className="flex items-center gap-3 py-3 cursor-pointer group">
                  <span
                    className={`font-serif text-base font-bold shrink-0 w-14 transition-colors duration-200 ${
                      isOpen
                        ? 'text-[var(--color-vermillion)]'
                        : isHighlighted
                          ? 'text-[var(--color-gold)]'
                          : 'text-[var(--color-ink-600)]'
                    }`}
                  >
                    {yao.name}
                  </span>
                  <span className="font-serif text-sm text-[var(--color-ink-700)] flex-1 leading-relaxed group-hover:text-[var(--color-ink-900)] transition-colors duration-200">
                    {yao.text}
                  </span>
                  <span
                    className="text-[10px] text-[var(--color-ink-400)] shrink-0 transition-transform duration-250"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}
                  >
                    ▼
                  </span>
                </div>

                {/* 爻详情：经→传→按→行 */}
                <SmoothExpand open={isOpen} duration={300}>
                  <div className="pb-6 pl-17 space-y-5 text-sm">
                    {/* 传 — 释读 */}
                    <div>
                      <div className="text-[10px] tracking-[0.2em] text-[var(--color-ink-400)] mb-2 font-serif flex items-center gap-1.5">
                        <span className="text-[var(--color-gold)] text-xs">◆</span> 释读
                      </div>
                      <p className="text-[var(--color-ink-700)] leading-loose font-serif pl-4">
                        {yao.modernReading}
                      </p>
                    </div>

                    {/* 按 — 典型情境 */}
                    <div>
                      <div className="text-[10px] tracking-[0.2em] text-[var(--color-ink-400)] mb-2 font-serif flex items-center gap-1.5">
                        <span className="text-[var(--color-gold)] text-xs">◆</span> 典型之境
                      </div>
                      <p className="text-[var(--color-ink-700)] leading-loose font-serif pl-4">
                        {yao.scenario}
                      </p>
                    </div>

                    {/* 行 — 可执行建议 */}
                    {yao.actionable.length > 0 && (
                      <div>
                        <div className="text-[10px] tracking-[0.2em] text-[var(--color-ink-400)] mb-2 font-serif flex items-center gap-1.5">
                          <span className="text-[var(--color-gold)] text-xs">◆</span> 可行之策
                        </div>
                        <ul className="space-y-1.5 pl-4">
                          {yao.actionable.map((a, i) => (
                            <li
                              key={i}
                              className="flex gap-2 items-start text-[var(--color-ink-700)] font-serif"
                            >
                              <span className="text-[var(--color-gold-dark)] text-[10px] mt-1">
                                ▸
                              </span>
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 征 — 处此爻之征兆 */}
                    {yao.indicators.length > 0 && (
                      <div>
                        <div className="text-[10px] tracking-[0.2em] text-[var(--color-ink-400)] mb-2 font-serif flex items-center gap-1.5">
                          <span className="text-[var(--color-gold)] text-xs">◆</span> 处此爻之征
                        </div>
                        <ul className="space-y-1.5 pl-4">
                          {yao.indicators.map((ind, i) => (
                            <li
                              key={i}
                              className="flex gap-2 items-start text-[var(--color-ink-600)] font-serif"
                            >
                              <span className="text-[var(--color-ink-400)] text-[10px] mt-1">
                                ○
                              </span>
                              {ind}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </SmoothExpand>
              </div>
            )
          })}
        </div>
      </div>
    </ScrollRevealSection>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/hexagram/YaoTimeline.tsx
git commit -m "feat: add YaoTimeline component with phase auto-highlight"
```

---

### Task 7: ActionSummary + RelatedHexagrams（行 + 卦象关系）

**Files:**

- Create: `components/hexagram/ActionSummary.tsx`
- Create: `components/hexagram/RelatedHexagrams.tsx`

- [ ] **Step 1: Create ActionSummary (Layer 6 — 行)**

```tsx
import type { Hexagram } from '@/lib/types'
import { ScrollRevealSection } from './ScrollRevealSection'

type Props = {
  hexagram: Hexagram
}

export function ActionSummary({ hexagram }: Props) {
  const { antiPatterns } = hexagram

  return (
    <ScrollRevealSection className="py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="divider-classical mb-10">
          <span className="font-serif tracking-widest">行</span>
        </div>

        {/* 反模式警示 */}
        {antiPatterns.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs tracking-[0.3em] text-[var(--color-ink-400)] font-serif mb-4">
              误读之戒
            </h3>
            <div className="space-y-3">
              {antiPatterns.map((s, i) => (
                <div
                  key={i}
                  className="flex gap-3 items-start px-4 py-3 bg-[var(--color-vermillion-bg)] border border-[var(--color-vermillion)]/20 rounded"
                >
                  <span className="text-[var(--color-vermillion-dark)] mt-0.5 text-xs shrink-0">
                    ✕
                  </span>
                  <span className="font-serif text-sm text-[var(--color-ink-700)] leading-relaxed">
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollRevealSection>
  )
}
```

- [ ] **Step 2: Create RelatedHexagrams (Layer 7 — 卦象关系)**

```tsx
import type { Hexagram } from '@/lib/types'
import { HexagramSymbol } from '@/components/HexagramSymbol'
import { findHexagramByNumber } from '@/lib/hexagram-utils'
import { ScrollRevealSection } from './ScrollRevealSection'

type Props = {
  hexagram: Hexagram
}

const TYPE_LABELS: Record<string, string> = {
  complementary: '综卦',
  inverse: '错卦',
  nuclear: '互卦',
  sequence: '序卦',
}

export function RelatedHexagrams({ hexagram }: Props) {
  const relations = hexagram.relations
  if (!relations || relations.length === 0) return null

  // Only show relations to hexagrams that actually exist in content
  const resolved = relations
    .map((r) => ({
      ...r,
      target: findHexagramByNumber(r.targetNumber),
    }))
    .filter((r) => r.target !== undefined)

  if (resolved.length === 0) return null

  return (
    <ScrollRevealSection className="py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="divider-classical mb-10">
          <span className="font-serif tracking-widest">卦象之脉</span>
        </div>

        <div className="space-y-4">
          {resolved.map((r, i) => (
            <a
              key={i}
              href={`/hexagram/${r.target!.number}`}
              className="flex items-center gap-5 p-4 rounded-lg border border-[var(--color-ink-100)] hover:border-[var(--color-ink-200)] hover:bg-[var(--color-paper)] transition-all duration-200 group"
            >
              <div className="hexagram-display flex flex-col items-center justify-center shrink-0 w-14 h-16 rounded">
                <HexagramSymbol
                  binary={r.target!.binary}
                  size="sm"
                  className="text-[var(--color-ink-700)] group-hover:text-[var(--color-ink-900)] transition-colors"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] px-2 py-0.5 border border-[var(--color-ink-200)] rounded-sm text-[var(--color-ink-400)] font-serif tracking-wider">
                    {TYPE_LABELS[r.type] || r.type}
                  </span>
                  <span className="font-serif text-lg font-bold text-[var(--color-ink-900)]">
                    {r.target!.name.chinese}
                  </span>
                  <span className="text-sm text-[var(--color-ink-400)] font-serif">
                    {r.target!.name.pinyin}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--color-ink-600)] font-serif leading-relaxed">
                  {r.narrative}
                </p>
              </div>
              <span className="text-[var(--color-ink-300)] group-hover:text-[var(--color-vermillion)] transition-colors shrink-0">
                →
              </span>
            </a>
          ))}
        </div>
      </div>
    </ScrollRevealSection>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/hexagram/ActionSummary.tsx components/hexagram/RelatedHexagrams.tsx
git commit -m "feat: add ActionSummary and RelatedHexagrams (行 + 暗线)"
```

---

### Task 8: Detail Page Route Assembly

**Files:**

- Create: `app/hexagram/[id]/page.tsx`

- [ ] **Step 1: Create the detail page**

```tsx
import { notFound } from 'next/navigation'
import { Atmosphere } from '@/components/Atmosphere'
import { ALL_HEXAGRAMS } from '@/content/hexagrams'
import { findHexagramById } from '@/lib/hexagram-utils'
import { HexagramHero } from '@/components/hexagram/HexagramHero'
import { ClassicalText } from '@/components/hexagram/ClassicalText'
import { InterpretationSection } from '@/components/hexagram/InterpretationSection'
import { SituationMapping } from '@/components/hexagram/SituationMapping'
import { YaoTimeline } from '@/components/hexagram/YaoTimeline'
import { ActionSummary } from '@/components/hexagram/ActionSummary'
import { RelatedHexagrams } from '@/components/hexagram/RelatedHexagrams'
import { FloatingBackBar } from '@/components/hexagram/FloatingBackBar'
import type { Phase } from '@/lib/types'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string; phase?: string }>
}

export async function generateStaticParams() {
  return ALL_HEXAGRAMS.map((h) => ({ id: String(h.number) }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const hexagram = findHexagramById(id)
  if (!hexagram) return { title: '卦象未找到' }

  return {
    title: `${hexagram.name.chinese} · ${hexagram.name.pinyin} — 太极`,
    description: hexagram.judgment.modernReading.slice(0, 120),
  }
}

export default async function HexagramDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { phase } = await searchParams

  const hexagram = findHexagramById(id)
  if (!hexagram) notFound()

  const highlightPhase = phase as Phase | undefined

  return (
    <>
      <Atmosphere />
      <FloatingBackBar />

      <div className="relative z-10 max-w-3xl mx-auto px-6">
        <HexagramHero hexagram={hexagram} />
        <ClassicalText hexagram={hexagram} />
        <InterpretationSection hexagram={hexagram} />
        <SituationMapping hexagram={hexagram} />
        <YaoTimeline hexagram={hexagram} highlightPhase={highlightPhase} />
        <ActionSummary hexagram={hexagram} />
        <RelatedHexagrams hexagram={hexagram} />

        {/* Footer */}
        <footer className="py-16 text-center">
          <div className="divider-classical mb-8">
            <span className="font-serif text-lg">☯</span>
          </div>
          <a
            href="/hexagrams"
            className="text-xs font-serif text-[var(--color-ink-400)] hover:text-[var(--color-vermillion)] transition-colors"
          >
            览六十四卦
          </a>
        </footer>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`
Expected: Build passes, static pages generated for `/hexagram/1`, `/hexagram/2`, `/hexagram/3`

- [ ] **Step 3: Commit**

```bash
git add app/hexagram/[id]/page.tsx
git commit -m "feat: add hexagram detail page with 6-layer scroll narrative"
```

---

### Task 9: HexagramGrid + Overview Page

**Files:**

- Create: `components/hexagram/HexagramGrid.tsx`
- Create: `app/hexagrams/page.tsx`

- [ ] **Step 1: Create HexagramGrid**

```tsx
import { HexagramSymbol } from '@/components/HexagramSymbol'
import type { Hexagram } from '@/lib/types'

type Props = {
  hexagrams: Hexagram[]
  totalCount?: number
}

export function HexagramGrid({ hexagrams, totalCount = 64 }: Props) {
  const existingNumbers = new Set(hexagrams.map((h) => h.number))

  // Build 64 slots
  const slots = Array.from({ length: totalCount }, (_, i) => {
    const num = i + 1
    const hex = hexagrams.find((h) => h.number === num)
    return { number: num, hexagram: hex }
  })

  return (
    <div className="grid grid-cols-8 gap-2 md:gap-3">
      {slots.map(({ number, hexagram }) => {
        if (hexagram) {
          return (
            <a
              key={number}
              href={`/hexagram/${number}`}
              className="flex flex-col items-center justify-center p-2 md:p-3 rounded-lg border border-[var(--color-ink-100)] hover:border-[var(--color-vermillion)] hover:shadow-[0_0_12px_rgba(196,80,58,0.1)] transition-all duration-200 group aspect-square"
            >
              <HexagramSymbol
                binary={hexagram.binary}
                size="sm"
                className="text-[var(--color-ink-700)] group-hover:text-[var(--color-ink-900)] transition-colors"
              />
              <span className="mt-1.5 text-xs font-serif text-[var(--color-ink-700)] group-hover:text-[var(--color-vermillion)] transition-colors">
                {hexagram.name.chinese}
              </span>
            </a>
          )
        }

        return (
          <div
            key={number}
            className="flex flex-col items-center justify-center p-2 md:p-3 rounded-lg border border-dashed border-[var(--color-ink-100)] aspect-square opacity-30"
          >
            <span className="text-[10px] font-mono text-[var(--color-ink-300)]">{number}</span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Create overview page**

```tsx
import { Atmosphere } from '@/components/Atmosphere'
import { ALL_HEXAGRAMS } from '@/content/hexagrams'
import { HexagramGrid } from '@/components/hexagram/HexagramGrid'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '六十四卦 — 太极',
  description: '易经六十四卦全览 — 以情境原型观三千年决策智慧',
}

export default function HexagramsPage() {
  return (
    <>
      <Atmosphere />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16 md:py-24">
        <header className="text-center mb-16">
          <h1 className="font-serif text-5xl font-black text-[var(--color-ink-900)] tracking-widest">
            六十四卦
          </h1>
          <p className="mt-4 text-sm text-[var(--color-ink-400)] font-serif">
            {ALL_HEXAGRAMS.length}/64 卦已就绪
          </p>
          <div className="divider-classical w-48 mx-auto mt-6">
            <span className="font-serif">☰ ☷</span>
          </div>
        </header>

        <HexagramGrid hexagrams={ALL_HEXAGRAMS} />

        <footer className="mt-16 text-center">
          <a
            href="/"
            className="text-xs font-serif text-[var(--color-ink-400)] hover:text-[var(--color-vermillion)] transition-colors"
          >
            ← 回到问卦
          </a>
        </footer>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/hexagram/HexagramGrid.tsx app/hexagrams/page.tsx
git commit -m "feat: add hexagram grid overview page (/hexagrams)"
```

---

### Task 10: MatchCard Link + Content Relations

**Files:**

- Modify: `components/MatchCard.tsx`
- Modify: `content/hexagrams/01-qian.ts`
- Modify: `content/hexagrams/02-kun.ts`
- Modify: `content/hexagrams/03-zhun.ts`

- [ ] **Step 1: Add deep-dive link to MatchCard**

In `MatchCard.tsx`, add a link inside the `SmoothExpand` block, just before the score chips `div`:

```tsx
<div className="px-6 py-4 border-t border-[var(--color-ink-100)]">
  <a
    href={`/hexagram/${hexagram.number}?from=consult`}
    className="inline-flex items-center gap-2 text-xs font-serif text-[var(--color-ink-600)] hover:text-[var(--color-vermillion)] transition-colors duration-200"
  >
    <span>深入此卦</span>
    <span>→</span>
  </a>
</div>
```

- [ ] **Step 2: Add relations to qian (乾)**

Add `relations` field to `content/hexagrams/01-qian.ts`:

```typescript
relations: [
  {
    type: 'complementary',
    targetNumber: 2,
    narrative: '乾坤相对 — 纯阳与纯阴，创造与承载，是万物的两极。',
  },
],
```

- [ ] **Step 3: Add relations to kun (坤)**

Add `relations` field to `content/hexagrams/02-kun.ts`:

```typescript
relations: [
  {
    type: 'complementary',
    targetNumber: 1,
    narrative: '坤乾相对 — 承载与创造，顺势而为与主动出击，互为表里。',
  },
  {
    type: 'sequence',
    targetNumber: 3,
    narrative: '乾坤之后为屯 — 天地初开，万物草创，创业之难由此始。',
  },
],
```

- [ ] **Step 4: Add relations to zhun (屯)**

Add `relations` field to `content/hexagrams/03-zhun.ts`:

```typescript
relations: [
  {
    type: 'sequence',
    targetNumber: 1,
    narrative: '屯承乾坤 — 天地既成，万物初生。创始的能量已有，但秩序未立。',
  },
],
```

- [ ] **Step 5: Commit**

```bash
git add components/MatchCard.tsx content/hexagrams/01-qian.ts content/hexagrams/02-kun.ts content/hexagrams/03-zhun.ts
git commit -m "feat: add deep-dive link in MatchCard + hexagram relations"
```

---

### Task 11: Full Verification

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass (66 existing + new hexagram-utils tests)

- [ ] **Step 2: Run lint + typecheck + format**

```bash
npm run lint
npm run typecheck
npm run format:check
```

Expected: All pass

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: Build succeeds. Output should show static pages:

```
├ ○ /hexagrams
├ ● /hexagram/1
├ ● /hexagram/2
├ ● /hexagram/3
```

- [ ] **Step 4: Manual verification in dev mode**

```bash
npm run dev
```

Check:

1. Visit `/hexagram/1` — 乾卦六层卷轴叙事完整
2. Visit `/hexagram/3` — 屯卦详情，六爻可展开收起
3. Visit `/hexagrams` — 网格显示 3 个已完成卦 + 61 个骨架
4. 首页问卦 → 结果卡片展开 → 点击「深入此卦」→ 跳转详情页
5. 详情页 URL 带 `?from=consult` 时显示浮动返回栏

- [ ] **Step 5: Format and final commit**

```bash
npm run format
git add -A
git commit -m "feat: hexagram detail page — 经传按行六层卷轴叙事"
git push origin main
```

---

## Self-Review Checklist

- [x] **Spec coverage**: All 7 layers implemented (Hero, 经, 传, 按, 六爻, 行, 关系)
- [x] **Grid overview page**: `/hexagrams` with 8×8 grid
- [x] **MatchCard link**: Deep-dive navigation
- [x] **FloatingBackBar**: Conditional back nav
- [x] **Phase auto-highlight**: YaoTimeline reads `?phase=` param
- [x] **Relations**: Type defined + content added for 3 hexagrams
- [x] **SSG**: generateStaticParams for all hexagrams
- [x] **No placeholders**: All code complete
- [x] **Type consistency**: HexagramRelation used consistently
- [x] **YAGNI**: No search, no admin, no builder
