# Yao Locator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a transparent, deterministic phase-locator questionnaire that maps a user's self-selected indicators onto the 6 yao of a matched hexagram, integrated into both the `MatchCard` (rank 1 only) and the `/hexagram/[id]` detail page.

**Architecture:** A single pure scoring function in `lib/yao-locator.ts` + three React components under `components/yao-locator/`. No new data, no API, no persistence. TDD against the pure function. Component tests skipped to avoid adding RTL — UI verified by build + manual smoke.

**Tech Stack:** TypeScript, React 19, Tailwind CSS 4, Vitest. Reuses existing CSS variables and `font-serif`/`font-sans` conventions.

---

## File Map

| Action | Path                                            | Responsibility                               |
| ------ | ----------------------------------------------- | -------------------------------------------- |
| Create | `lib/yao-locator.ts`                            | `scoreYao` pure function + types             |
| Create | `__tests__/yao-locator.test.ts`                 | TDD: 9 cases for `scoreYao`                  |
| Create | `components/yao-locator/YaoLocator.tsx`         | Container: state + submit toggle             |
| Create | `components/yao-locator/IndicatorChecklist.tsx` | Grouped multi-select checklist               |
| Create | `components/yao-locator/LocatorResult.tsx`      | 6-yao bars + top-1 detail + cross-yao banner |
| Modify | `components/MatchCard.tsx`                      | Render `<YaoLocator>` when `rank === 1`      |
| Modify | `app/hexagram/[id]/page.tsx`                    | Render `<YaoLocator>` before `<YaoTimeline>` |

---

### Task 1: Pure scoring logic (TDD)

**Files:**

- Create: `lib/yao-locator.ts`
- Create: `__tests__/yao-locator.test.ts`

- [ ] **Step 1.1: Write failing tests for `scoreYao`**

Create `__tests__/yao-locator.test.ts` with the cases enumerated in the design (basic, ratio fairness, tiebreak, cross-yao thresholds, all-zero, determinism, dedup).

- [ ] **Step 1.2: Run and confirm RED**

```
npm run test -- --run __tests__/yao-locator.test.ts
```

Expected: all tests fail with `Cannot find module '@/lib/yao-locator'`.

- [ ] **Step 1.3: Implement minimal `scoreYao`**

In `lib/yao-locator.ts`:

```ts
import type { Yao } from './types'

export type YaoScore = {
  position: 1 | 2 | 3 | 4 | 5 | 6
  yaoName: string
  hits: number
  total: number
  ratio: number
}

export type LocatorResult = {
  scores: YaoScore[]
  topPosition: 1 | 2 | 3 | 4 | 5 | 6
  topRatio: number
  crossYao:
    | false
    | {
        secondPosition: 1 | 2 | 3 | 4 | 5 | 6
        secondRatio: number
        narrative: string
      }
}

export const CROSS_YAO_RATIO_THRESHOLD = 0.8
export const CROSS_YAO_MIN_SECOND_RATIO = 0.3

export function scoreYao(yao: Yao[], selected: Set<string>): LocatorResult {
  const scores: YaoScore[] = [...yao]
    .sort((a, b) => a.position - b.position)
    .map((y) => {
      const uniqueIndicators = Array.from(new Set(y.indicators))
      const hits = uniqueIndicators.filter((ind) => selected.has(ind)).length
      const total = uniqueIndicators.length
      const ratio = total === 0 ? 0 : hits / total
      return { position: y.position, yaoName: y.name, hits, total, ratio }
    })

  // Find top: max ratio, tiebreak by higher position
  let topIdx = 0
  for (let i = 1; i < scores.length; i++) {
    const a = scores[i]
    const b = scores[topIdx]
    if (a.ratio > b.ratio || (a.ratio === b.ratio && a.position > b.position)) {
      topIdx = i
    }
  }
  const top = scores[topIdx]

  // Cross-yao: best other yao by ratio (tiebreak by higher position again)
  let secondIdx = -1
  for (let i = 0; i < scores.length; i++) {
    if (i === topIdx) continue
    if (secondIdx === -1) {
      secondIdx = i
      continue
    }
    const a = scores[i]
    const b = scores[secondIdx]
    if (a.ratio > b.ratio || (a.ratio === b.ratio && a.position > b.position)) {
      secondIdx = i
    }
  }

  let crossYao: LocatorResult['crossYao'] = false
  if (secondIdx >= 0 && top.ratio > 0) {
    const second = scores[secondIdx]
    if (
      second.ratio >= CROSS_YAO_MIN_SECOND_RATIO &&
      second.ratio >= top.ratio * CROSS_YAO_RATIO_THRESHOLD
    ) {
      crossYao = {
        secondPosition: second.position,
        secondRatio: second.ratio,
        narrative: `你也明显落在「${second.yaoName}」——这种「跨爻」通常意味着你正处在阶段过渡期，建议同时参照两爻的提示。`,
      }
    }
  }

  return {
    scores,
    topPosition: top.position,
    topRatio: top.ratio,
    crossYao,
  }
}
```

- [ ] **Step 1.4: Run and confirm GREEN**

```
npm run test -- --run __tests__/yao-locator.test.ts
```

Expected: 9/9 pass.

- [ ] **Step 1.5: Commit**

```
git add lib/yao-locator.ts __tests__/yao-locator.test.ts
git commit -m "feat(yao-locator): add deterministic scoreYao with cross-yao detection"
```

---

### Task 2: `IndicatorChecklist` component

**Files:** Create: `components/yao-locator/IndicatorChecklist.tsx`

- [ ] **Step 2.1: Write component**

```tsx
'use client'

import type { Yao } from '@/lib/types'

type Props = {
  yao: Yao[]
  selected: Set<string>
  onToggle: (indicator: string) => void
  onClear: () => void
}

export function IndicatorChecklist({ yao, selected, onToggle, onClear }: Props) {
  const sorted = [...yao].sort((a, b) => a.position - b.position)
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-xs text-[var(--color-ink-400)] font-serif">
        <span>勾选所有「与你当下处境相符」的描述（已选 {selected.size} 条）</span>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[var(--color-vermillion)] hover:underline"
          >
            清空
          </button>
        )}
      </div>
      {sorted.map((y) => (
        <fieldset key={y.position} className="border border-[var(--color-ink-100)] rounded p-4">
          <legend className="px-2 font-serif text-sm">
            <span className="text-[var(--color-ink-900)] font-bold">{y.name}</span>
            <span className="ml-2 text-[var(--color-ink-400)] italic">{y.text}</span>
          </legend>
          <ul className="space-y-2 mt-2">
            {y.indicators.map((ind) => {
              const checked = selected.has(ind)
              return (
                <li key={ind}>
                  <label className="flex items-start gap-2 cursor-pointer text-sm leading-relaxed">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(ind)}
                      className="mt-1 shrink-0 accent-[var(--color-vermillion)]"
                    />
                    <span
                      className={
                        checked ? 'text-[var(--color-ink-900)]' : 'text-[var(--color-ink-600)]'
                      }
                    >
                      {ind}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </fieldset>
      ))}
    </div>
  )
}
```

- [ ] **Step 2.2: Commit**

```
git add components/yao-locator/IndicatorChecklist.tsx
git commit -m "feat(yao-locator): IndicatorChecklist component (grouped checklist)"
```

---

### Task 3: `LocatorResult` component

**Files:** Create: `components/yao-locator/LocatorResult.tsx`

- [ ] **Step 3.1: Write component**

```tsx
'use client'

import { useState } from 'react'
import type { Yao } from '@/lib/types'
import type { LocatorResult } from '@/lib/yao-locator'

type Props = {
  result: LocatorResult
  yao: Yao[]
  onReset: () => void
}

export function LocatorResult({ result, yao, onReset }: Props) {
  const topYao = yao.find((y) => y.position === result.topPosition)
  const [showScenario, setShowScenario] = useState(false)
  const topPct = Math.round(result.topRatio * 100)

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-[var(--color-ink-400)] font-serif mb-2 tracking-widest">
          你最可能处在
        </div>
        <div className="flex items-baseline gap-3">
          <span className="font-serif text-3xl font-bold text-[var(--color-ink-900)]">
            {topYao?.name ?? `第${result.topPosition}爻`}
          </span>
          <span className="text-[var(--color-gold)] font-serif text-xl tabular-nums">
            {topPct}%
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        {result.scores.map((s) => {
          const pct = Math.round(s.ratio * 100)
          const isTop = s.position === result.topPosition
          return (
            <div key={s.position} className="flex items-center gap-3 text-xs font-serif">
              <span
                className={
                  isTop
                    ? 'text-[var(--color-vermillion)] font-bold w-12 shrink-0'
                    : 'text-[var(--color-ink-400)] w-12 shrink-0'
                }
              >
                {s.yaoName}
              </span>
              <div className="flex-1 h-2 bg-[var(--color-paper)] rounded overflow-hidden border border-[var(--color-ink-100)]">
                <div
                  className={
                    isTop
                      ? 'h-full bg-[var(--color-vermillion)]'
                      : 'h-full bg-[var(--color-ink-300)]'
                  }
                  style={{
                    width: `${pct}%`,
                    transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                  }}
                />
              </div>
              <span
                className={
                  isTop
                    ? 'text-[var(--color-vermillion)] w-10 text-right tabular-nums'
                    : 'text-[var(--color-ink-400)] w-10 text-right tabular-nums'
                }
              >
                {pct}%
              </span>
            </div>
          )
        })}
      </div>

      {result.crossYao && (
        <div className="border-l-2 border-[var(--color-gold)] pl-3 py-1 text-sm text-[var(--color-ink-600)] font-serif leading-relaxed">
          {result.crossYao.narrative}
        </div>
      )}

      {topYao && result.topRatio > 0 && (
        <div className="border-t border-[var(--color-ink-100)] pt-5 space-y-4">
          <div>
            <div className="text-[10px] tracking-widest text-[var(--color-ink-400)] font-serif mb-1.5">
              义理释读
            </div>
            <p className="text-sm leading-relaxed text-[var(--color-ink-800)] font-serif">
              {topYao.modernReading}
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowScenario((v) => !v)}
              className="text-xs text-[var(--color-vermillion)] hover:underline font-serif"
            >
              {showScenario ? '收起典型场景' : '展开典型场景'}
            </button>
            {showScenario && (
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-600)] font-serif italic">
                {topYao.scenario}
              </p>
            )}
          </div>

          <div>
            <div className="text-[10px] tracking-widest text-[var(--color-ink-400)] font-serif mb-2">
              可执行建议
            </div>
            <ul className="space-y-1.5">
              {topYao.actionable.map((a, i) => (
                <li
                  key={i}
                  className="flex gap-2 items-start text-sm text-[var(--color-ink-800)] font-serif leading-relaxed"
                >
                  <span className="text-[var(--color-vermillion)] mt-0.5 text-xs shrink-0">●</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {result.topRatio === 0 && (
        <div className="text-sm text-[var(--color-ink-400)] font-serif">
          你没勾选任何条目，无法定位。
        </div>
      )}

      <button
        type="button"
        onClick={onReset}
        className="text-xs text-[var(--color-ink-400)] hover:text-[var(--color-vermillion)] hover:underline font-serif"
      >
        ← 重新选择
      </button>
    </div>
  )
}
```

- [ ] **Step 3.2: Commit**

```
git add components/yao-locator/LocatorResult.tsx
git commit -m "feat(yao-locator): LocatorResult component (bars + top-1 detail)"
```

---

### Task 4: `YaoLocator` container

**Files:** Create: `components/yao-locator/YaoLocator.tsx`

- [ ] **Step 4.1: Write container**

```tsx
'use client'

import { useState } from 'react'
import type { Yao } from '@/lib/types'
import { scoreYao } from '@/lib/yao-locator'
import { IndicatorChecklist } from './IndicatorChecklist'
import { LocatorResult } from './LocatorResult'

type Props = {
  yao: Yao[]
  hexagramName: string
}

export function YaoLocator({ yao, hexagramName }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitted, setSubmitted] = useState(false)

  function toggle(indicator: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(indicator)) next.delete(indicator)
      else next.add(indicator)
      return next
    })
  }

  function clear() {
    setSelected(new Set())
  }

  function submit() {
    if (selected.size === 0) return
    setSubmitted(true)
  }

  function reset() {
    setSubmitted(false)
  }

  const result = submitted ? scoreYao(yao, selected) : null

  return (
    <section className="card-classical rounded-lg p-5 md:p-6 space-y-5">
      <header>
        <div className="text-[10px] tracking-widest text-[var(--color-vermillion)] font-serif mb-1">
          阶段定位
        </div>
        <h3 className="font-serif text-lg text-[var(--color-ink-900)] font-bold">
          你在「{hexagramName}」的第几阶？
        </h3>
        <p className="text-xs text-[var(--color-ink-400)] font-serif mt-1 leading-relaxed">
          爻位是流动的——同一卦的六阶段对应的建议截然不同。勾选与你当下处境相符的描述，得出你最可能所处的爻位。
        </p>
      </header>

      {!submitted ? (
        <>
          <IndicatorChecklist yao={yao} selected={selected} onToggle={toggle} onClear={clear} />
          <div className="flex items-center justify-end pt-2 border-t border-[var(--color-ink-100)]">
            <button
              type="button"
              disabled={selected.size === 0}
              onClick={submit}
              className="px-4 py-2 text-sm font-serif rounded border border-[var(--color-ink-900)] text-[var(--color-ink-900)] hover:bg-[var(--color-ink-900)] hover:text-[var(--color-paper)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--color-ink-900)]"
            >
              定位 →
            </button>
          </div>
        </>
      ) : (
        result && <LocatorResult result={result} yao={yao} onReset={reset} />
      )}
    </section>
  )
}
```

- [ ] **Step 4.2: Commit**

```
git add components/yao-locator/YaoLocator.tsx
git commit -m "feat(yao-locator): YaoLocator container component"
```

---

### Task 5: Integrate into `MatchCard`

**Files:** Modify: `components/MatchCard.tsx`

- [ ] **Step 5.1: Import + insert**

In the file, add the import:

```tsx
import { YaoLocator } from './yao-locator/YaoLocator'
```

In the body, find the `<Section label="六爻 · 事之六阶" icon="爻">` and insert `<YaoLocator>` immediately before the `<div className="space-y-2">` (the yao list), gated by `rank === 1`.

- [ ] **Step 5.2: Commit**

```
git add components/MatchCard.tsx
git commit -m "feat(yao-locator): integrate YaoLocator into MatchCard (rank 1 only)"
```

---

### Task 6: Integrate into `/hexagram/[id]` page

**Files:** Modify: `app/hexagram/[id]/page.tsx`

- [ ] **Step 6.1: Import + insert**

Add the import for `YaoLocator`, then render it immediately before `<YaoTimeline />`, wrapped in the same `ScrollRevealSection` pattern used by surrounding sections (verify by reading the file).

- [ ] **Step 6.2: Commit**

```
git add app/hexagram/[id]/page.tsx
git commit -m "feat(yao-locator): integrate YaoLocator into hexagram detail page"
```

---

### Task 7: Verify

- [ ] **Step 7.1: Run lint**

```
npm run lint
```

Expected: no errors.

- [ ] **Step 7.2: Run typecheck**

```
npm run typecheck
```

Expected: no errors.

- [ ] **Step 7.3: Run tests**

```
npm run test
```

Expected: all tests pass (existing + 9 new).

- [ ] **Step 7.4: Run build**

```
npm run build
```

Expected: build succeeds.

- [ ] **Step 7.5: Push + open PR**

```
git push -u origin devin/<branch>
```

Then use `git_create_pr` after `fetch_pr_template`.

---

## Self-Review

- **Spec coverage:** scoreYao algorithm, threshold constants, 6-bar UI, top-1 detail, cross-yao banner, both integration points, no persistence — all covered.
- **No placeholders:** all components have full code; tests enumerate all 9 cases.
- **TDD:** Task 1 is RED→GREEN→commit before any component is written.
- **Frequent commits:** 6 commits across 6 logical units.
- **YAGNI:** no localStorage, no RTL, no random / Date, no Hexagram type changes, no new deps.
