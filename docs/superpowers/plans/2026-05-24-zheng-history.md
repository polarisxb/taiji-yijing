# 「征」模块（咨询历史 + 回访应验）— 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an end-to-end "save → revisit → mark verified" loop. v1 uses localStorage but is architected so v2 (account + cloud storage) only needs to swap the storage implementation — UI layer touches nothing.

**Architecture:**

- `lib/zheng/` — data layer (types, zod schema, `ZhengStore` interface, localStorage impl, top-level entry)
- `components/zheng/` — UI building blocks (save button, history link, record card, verification control)
- `app/history/` — two routes (list + detail)
- Lift `YaoLocator` result up to `MatchCard` so save button can include locator state
- Pass `situation` text from `app/page.tsx` into `MatchCard` so save button knows what was asked

**Tech Stack:** TypeScript, React 19, Next.js 15 (App Router), Tailwind CSS 4, Vitest, zod (already installed). No new dependencies.

---

## File Map

| Action | Path                                          | Responsibility                                                                    |
| ------ | --------------------------------------------- | --------------------------------------------------------------------------------- |
| Create | `lib/zheng/types.ts`                          | `VerificationStatus`, `SavedYaoLocation`, `ConsultationRecord`, `SaveRecordInput` |
| Create | `lib/zheng/schema.ts`                         | Zod schemas for runtime validation                                                |
| Create | `lib/zheng/store-types.ts`                    | `ZhengStore` interface (returns Promises)                                         |
| Create | `lib/zheng/store-local.ts`                    | `localZhengStore`: localStorage CRUD + SSR safe                                   |
| Create | `lib/zheng/store.ts`                          | Top-level `zhengStore` entry (v1: `= localZhengStore`)                            |
| Create | `__tests__/zheng-store.test.ts`               | TDD: ~12 cases for store-local                                                    |
| Create | `components/zheng/SaveConsultationButton.tsx` | Collapsed link → expanded textarea+save                                           |
| Create | `components/zheng/HistoryNavLink.tsx`         | Auto-adaptive `「履」` link (visible iff records exist)                           |
| Create | `components/zheng/RecordCard.tsx`             | List item: date + hexagram + situation excerpt + badge                            |
| Create | `components/zheng/VerificationControl.tsx`    | 3-radio + textarea + save button                                                  |
| Create | `app/history/page.tsx`                        | List route `/history`                                                             |
| Create | `app/history/[id]/page.tsx`                   | Detail route `/history/[id]`                                                      |
| Modify | `components/yao-locator/YaoLocator.tsx`       | Accept `onResultChange` callback so parent can read                               |
| Modify | `components/MatchCard.tsx`                    | Hold locator result state; mount `SaveConsultationButton` for rank 1              |
| Modify | `app/page.tsx`                                | Pass `situation` prop into `MatchCard`                                            |
| Modify | `app/page.tsx`                                | Render `HistoryNavLink` in footer                                                 |
| Modify | `app/hexagram/[id]/page.tsx`                  | Render `HistoryNavLink` in footer                                                 |
| Modify | `app/hexagrams/page.tsx`                      | Render `HistoryNavLink` in footer                                                 |

---

## Task 1: Types + Schema

**Files:**

- Create: `lib/zheng/types.ts`
- Create: `lib/zheng/schema.ts`

- [ ] **Step 1.1: Define `lib/zheng/types.ts`**

```ts
export type VerificationStatus = 'unverified' | 'fulfilled' | 'partial' | 'unfulfilled'

export type SavedYaoLocation = {
  topPosition: 1 | 2 | 3 | 4 | 5 | 6
  topYaoName: string
  topRatio: number
  crossYaoPosition?: 1 | 2 | 3 | 4 | 5 | 6
  crossYaoName?: string
}

export type ConsultationRecord = {
  id: string
  schemaVersion: 1
  createdAt: number
  situation: string
  hexagramId: number
  hexagramName: string
  fitScore: number
  yaoLocation?: SavedYaoLocation
  userNote?: string
  verification: VerificationStatus
  verificationNote?: string
  verifiedAt?: number
  userId?: string
  syncedAt?: number
}

export type SaveRecordInput = Omit<
  ConsultationRecord,
  'id' | 'schemaVersion' | 'createdAt' | 'verification' | 'userId' | 'syncedAt'
>
```

- [ ] **Step 1.2: Define `lib/zheng/schema.ts`**

```ts
import { z } from 'zod'

export const VerificationStatusSchema = z.enum([
  'unverified',
  'fulfilled',
  'partial',
  'unfulfilled',
])

export const SavedYaoLocationSchema = z.object({
  topPosition: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]),
  topYaoName: z.string(),
  topRatio: z.number().min(0).max(1),
  crossYaoPosition: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)])
    .optional(),
  crossYaoName: z.string().optional(),
})

export const ConsultationRecordSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal(1),
  createdAt: z.number().int().nonnegative(),
  situation: z.string().min(1),
  hexagramId: z.number().int().min(1).max(64),
  hexagramName: z.string().min(1),
  fitScore: z.number().min(0).max(1),
  yaoLocation: SavedYaoLocationSchema.optional(),
  userNote: z.string().optional(),
  verification: VerificationStatusSchema,
  verificationNote: z.string().optional(),
  verifiedAt: z.number().int().nonnegative().optional(),
  userId: z.string().optional(),
  syncedAt: z.number().int().nonnegative().optional(),
})
```

---

## Task 2: Storage Layer (TDD)

**Files:**

- Create: `lib/zheng/store-types.ts`
- Create: `lib/zheng/store-local.ts`
- Create: `lib/zheng/store.ts`
- Create: `__tests__/zheng-store.test.ts`

- [ ] **Step 2.1: Define `ZhengStore` interface**

`lib/zheng/store-types.ts`:

```ts
import type { ConsultationRecord, SaveRecordInput, VerificationStatus } from './types'

export interface ZhengStore {
  listRecords(): Promise<ConsultationRecord[]>
  getRecord(id: string): Promise<ConsultationRecord | null>
  saveRecord(input: SaveRecordInput): Promise<ConsultationRecord>
  updateVerification(
    id: string,
    status: VerificationStatus,
    note?: string,
  ): Promise<ConsultationRecord | null>
  deleteRecord(id: string): Promise<boolean>
}
```

- [ ] **Step 2.2: Write failing tests** — `__tests__/zheng-store.test.ts`

Cover:

1. `saveRecord` writes and returns full record with id/schemaVersion/createdAt/verification='unverified'
2. `listRecords` returns time-descending (newest first)
3. `getRecord` returns record for valid id, null for missing id
4. `updateVerification` sets status + verifiedAt; clearing back to 'unverified' clears verifiedAt; note saved
5. `updateVerification` returns null for missing id
6. `deleteRecord` removes; returns true; subsequent listRecords excludes it; returns false for missing id
7. Dirty data (invalid JSON entry in storage) is silently dropped without breaking other entries
8. Empty storage: listRecords → [], getRecord → null
9. SSR (no window): listRecords → [], saveRecord rejects, etc. (safe defaults)
10. UUID id format check (basic regex)
11. Multiple records preserved in correct order after rewrite
12. yaoLocation optional — saving without it works; saving with it round-trips

- [ ] **Step 2.3: Confirm RED**

```
npm run test -- --run __tests__/zheng-store.test.ts
```

- [ ] **Step 2.4: Implement `localZhengStore`**

`lib/zheng/store-local.ts`:

```ts
import { ConsultationRecordSchema } from './schema'
import type { ZhengStore } from './store-types'
import type { ConsultationRecord, SaveRecordInput, VerificationStatus } from './types'

const STORAGE_KEY = 'taiji-yijing.zheng.v1'

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readAll(): ConsultationRecord[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const valid: ConsultationRecord[] = []
    for (const entry of parsed) {
      const result = ConsultationRecordSchema.safeParse(entry)
      if (result.success) valid.push(result.data)
    }
    return valid
  } catch {
    return []
  }
}

function writeAll(records: ConsultationRecord[]): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // quota or other error — silently fail v1; v1.5 can surface this
  }
}

export const localZhengStore: ZhengStore = {
  async listRecords() {
    return readAll().sort((a, b) => b.createdAt - a.createdAt)
  },

  async getRecord(id) {
    return readAll().find((r) => r.id === id) ?? null
  },

  async saveRecord(input) {
    if (!isBrowser()) throw new Error('saveRecord called in non-browser environment')
    const record: ConsultationRecord = {
      ...input,
      id: crypto.randomUUID(),
      schemaVersion: 1,
      createdAt: Date.now(),
      verification: 'unverified',
    }
    const all = readAll()
    all.push(record)
    writeAll(all)
    return record
  },

  async updateVerification(id, status, note) {
    const all = readAll()
    const idx = all.findIndex((r) => r.id === id)
    if (idx === -1) return null
    const prev = all[idx]
    const updated: ConsultationRecord = {
      ...prev,
      verification: status,
      verificationNote: note,
      verifiedAt: status === 'unverified' ? undefined : Date.now(),
    }
    all[idx] = updated
    writeAll(all)
    return updated
  },

  async deleteRecord(id) {
    const all = readAll()
    const next = all.filter((r) => r.id !== id)
    if (next.length === all.length) return false
    writeAll(next)
    return true
  },
}
```

- [ ] **Step 2.5: Wire `lib/zheng/store.ts` top-level entry**

```ts
import { localZhengStore } from './store-local'
import type { ZhengStore } from './store-types'

// v1: always local
// v2: switch on auth state — `useAuth().user ? remoteZhengStore : localZhengStore`
export const zhengStore: ZhengStore = localZhengStore

export type { ZhengStore } from './store-types'
export type {
  ConsultationRecord,
  SaveRecordInput,
  SavedYaoLocation,
  VerificationStatus,
} from './types'
```

- [ ] **Step 2.6: Confirm GREEN**

```
npm run test -- --run __tests__/zheng-store.test.ts
```

Expected: all cases pass.

- [ ] **Step 2.7: Commit**

```
git add lib/zheng __tests__/zheng-store.test.ts
git commit -m "feat(zheng): storage layer — types, schema, ZhengStore interface, localStorage impl"
```

---

## Task 3: Lift YaoLocator state up

**Files:**

- Modify: `components/yao-locator/YaoLocator.tsx`

- [ ] **Step 3.1: Add optional `onResultChange` callback prop**

Current `YaoLocator` keeps result internal. Add:

```ts
type Props = {
  yao: Yao[]
  hexagramName: string
  onResultChange?: (result: LocatorResult | null) => void
}
```

Call `onResultChange(result)` whenever the submitted result changes; call `onResultChange(null)` when user clicks "重新选择". Use a `useEffect` for safe parent updates.

- [ ] **Step 3.2: Verify YaoLocator tests still pass**

```
npm run test -- --run __tests__/yao-locator.test.ts
```

- [ ] **Step 3.3: Commit**

```
git add components/yao-locator/YaoLocator.tsx
git commit -m "feat(yao-locator): expose result via optional onResultChange callback"
```

---

## Task 4: SaveConsultationButton component

**Files:**

- Create: `components/zheng/SaveConsultationButton.tsx`

- [ ] **Step 4.1: Implement collapsed → expanded UX**

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { zhengStore } from '@/lib/zheng/store'
import type { SaveRecordInput, SavedYaoLocation } from '@/lib/zheng/types'

type Props = {
  situation: string
  hexagramId: number
  hexagramName: string
  fitScore: number
  yaoLocation?: SavedYaoLocation
}

type Status = 'idle' | 'saving' | 'saved'

export function SaveConsultationButton(props: Props) {
  const [expanded, setExpanded] = useState(false)
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [savedId, setSavedId] = useState<string | null>(null)

  async function handleSave() {
    setStatus('saving')
    const input: SaveRecordInput = {
      situation: props.situation,
      hexagramId: props.hexagramId,
      hexagramName: props.hexagramName,
      fitScore: props.fitScore,
      yaoLocation: props.yaoLocation,
      userNote: note.trim() || undefined,
    }
    const record = await zhengStore.saveRecord(input)
    setSavedId(record.id)
    setStatus('saved')
  }

  if (status === 'saved' && savedId) {
    return (
      <div className="px-6 py-4 border-t border-[var(--color-ink-100)] flex items-center gap-3 text-xs font-serif">
        <span className="text-[var(--color-ink-600)]">已记</span>
        <Link
          href={`/history/${savedId}`}
          className="text-[var(--color-vermillion)] hover:underline"
        >
          在「履」中可见 →
        </Link>
      </div>
    )
  }

  if (!expanded) {
    return (
      <div className="px-6 py-4 border-t border-[var(--color-ink-100)]">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs font-serif text-[var(--color-ink-600)] hover:text-[var(--color-vermillion)] transition-colors"
        >
          ✎ 记此一卦
        </button>
      </div>
    )
  }

  return (
    <div className="px-6 py-4 border-t border-[var(--color-ink-100)] space-y-3">
      <label className="block text-xs font-serif text-[var(--color-ink-600)]">
        我打算怎么做（可选）
      </label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        className="w-full p-3 border border-[var(--color-ink-200)] rounded text-sm font-serif text-[var(--color-ink-800)] focus:outline-none focus:border-[var(--color-vermillion)] resize-none"
        placeholder="例如：本周内与三位顾问通电话，看反馈再定。"
      />
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => {
            setExpanded(false)
            setNote('')
          }}
          className="text-xs font-serif text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)] transition-colors"
        >
          取消
        </button>
        <button
          type="button"
          disabled={status === 'saving'}
          onClick={handleSave}
          className="text-xs font-serif text-[var(--color-vermillion)] border border-[var(--color-vermillion)] px-3 py-1 rounded hover:bg-[var(--color-vermillion)] hover:text-white transition-colors disabled:opacity-50"
        >
          {status === 'saving' ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4.2: Commit**

```
git add components/zheng/SaveConsultationButton.tsx
git commit -m "feat(zheng): SaveConsultationButton component"
```

---

## Task 5: Wire SaveConsultationButton into MatchCard

**Files:**

- Modify: `components/MatchCard.tsx`
- Modify: `app/page.tsx` (to pass `situation` prop)

- [ ] **Step 5.1: Add `situation` prop to MatchCard**

In `components/MatchCard.tsx`:

```ts
type Props = {
  match: MatchResult
  rank: number
  situation?: string // ← new; only rank 1 actually uses it
}
```

- [ ] **Step 5.2: Hold locator result state in MatchCard**

```ts
const [locatorResult, setLocatorResult] = useState<LocatorResult | null>(null)
```

Pass `onResultChange={setLocatorResult}` to `<YaoLocator>`.

- [ ] **Step 5.3: Render SaveConsultationButton in rank 1, after the existing footer Link section**

Compute `savedYaoLocation` from `locatorResult` (or undefined if null).

```tsx
{
  rank === 1 && situation && (
    <SaveConsultationButton
      situation={situation}
      hexagramId={hexagram.number}
      hexagramName={hexagram.name.chinese}
      fitScore={score.total}
      yaoLocation={
        locatorResult
          ? {
              topPosition: locatorResult.topPosition,
              topYaoName: locatorResult.scores.find(
                (s) => s.position === locatorResult.topPosition,
              )!.yaoName,
              topRatio: locatorResult.topRatio,
              crossYaoPosition:
                locatorResult.crossYao !== false
                  ? locatorResult.crossYao.secondPosition
                  : undefined,
              crossYaoName:
                locatorResult.crossYao !== false
                  ? locatorResult.scores.find((s) =>
                      (s.position === locatorResult.crossYao) !== false
                        ? locatorResult.crossYao.secondPosition
                        : 0,
                    )?.yaoName
                  : undefined,
            }
          : undefined
      }
    />
  )
}
```

(Cleanup: factor cross-yao name extraction into a helper to keep readable.)

- [ ] **Step 5.4: In `app/page.tsx`, pass `situation` prop**

Update both `MatchCard` call sites (classic mode + AI mode if applicable) to pass `situation={situation.trim()}` for rank 1. Simplest:

```tsx
<MatchCard match={m} rank={i + 1} situation={i === 0 ? situation.trim() : undefined} />
```

- [ ] **Step 5.5: Lint / typecheck**

```
npm run lint && npm run typecheck
```

- [ ] **Step 5.6: Commit**

```
git add components/MatchCard.tsx app/page.tsx
git commit -m "feat(zheng): wire SaveConsultationButton into MatchCard rank-1"
```

---

## Task 6: HistoryNavLink (auto-adaptive)

**Files:**

- Create: `components/zheng/HistoryNavLink.tsx`
- Modify: `app/page.tsx`
- Modify: `app/hexagram/[id]/page.tsx`
- Modify: `app/hexagrams/page.tsx`

- [ ] **Step 6.1: Implement client component**

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { zhengStore } from '@/lib/zheng/store'

export function HistoryNavLink() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    zhengStore.listRecords().then((records) => {
      if (alive) setCount(records.length)
    })
    return () => {
      alive = false
    }
  }, [])

  if (count === null || count === 0) return null

  return (
    <Link
      href="/history"
      className="text-xs font-serif text-[var(--color-ink-400)] hover:text-[var(--color-vermillion)] transition-colors"
    >
      履（{count}）
    </Link>
  )
}
```

- [ ] **Step 6.2: Wire into 3 footers**

In each of `app/page.tsx`, `app/hexagram/[id]/page.tsx`, `app/hexagrams/page.tsx`, add `<HistoryNavLink />` next to existing footer links (separator: small middle dot or `·`).

`app/hexagram/[id]/page.tsx` is a server component — `HistoryNavLink` is a client component, fine to render inside.

- [ ] **Step 6.3: Lint / typecheck**

```
npm run lint && npm run typecheck
```

- [ ] **Step 6.4: Commit**

```
git add components/zheng/HistoryNavLink.tsx app/page.tsx app/hexagram app/hexagrams
git commit -m "feat(zheng): HistoryNavLink — auto-adaptive 「履」 footer link"
```

---

## Task 7: `/history` list page

**Files:**

- Create: `app/history/page.tsx`
- Create: `components/zheng/RecordCard.tsx`

- [ ] **Step 7.1: RecordCard component**

```tsx
'use client'

import Link from 'next/link'
import type { ConsultationRecord, VerificationStatus } from '@/lib/zheng/types'

function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function statusLabel(s: VerificationStatus): string {
  return s === 'fulfilled'
    ? '应验'
    : s === 'partial'
      ? '部分应验'
      : s === 'unfulfilled'
        ? '未应验'
        : '未标注'
}

function statusColor(s: VerificationStatus): string {
  if (s === 'fulfilled') return 'text-emerald-600 border-emerald-300 bg-emerald-50'
  if (s === 'partial') return 'text-amber-600 border-amber-300 bg-amber-50'
  if (s === 'unfulfilled') return 'text-rose-600 border-rose-300 bg-rose-50'
  return 'text-[var(--color-ink-400)] border-[var(--color-ink-200)] bg-[var(--color-paper)]'
}

export function RecordCard({ record }: { record: ConsultationRecord }) {
  const excerpt =
    record.situation.length > 60 ? record.situation.slice(0, 60) + '…' : record.situation
  return (
    <Link
      href={`/history/${record.id}`}
      className="block card-classical rounded-lg p-5 hover:border-[var(--color-vermillion)] transition-colors"
    >
      <div className="flex items-baseline gap-3 mb-2">
        <span className="font-mono text-[10px] tracking-widest text-[var(--color-ink-400)]">
          {formatDate(record.createdAt)}
        </span>
        <span className="font-serif text-2xl text-[var(--color-ink-900)]">
          {record.hexagramName}
        </span>
        {record.yaoLocation && (
          <span className="text-[10px] font-serif text-[var(--color-ink-400)]">
            {record.yaoLocation.topYaoName}
          </span>
        )}
        <span
          className={`ml-auto text-[10px] font-serif px-2 py-0.5 rounded-sm border ${statusColor(record.verification)}`}
        >
          {statusLabel(record.verification)}
        </span>
      </div>
      <p className="text-sm font-serif text-[var(--color-ink-600)] leading-relaxed">{excerpt}</p>
    </Link>
  )
}
```

- [ ] **Step 7.2: List page**

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Atmosphere } from '@/components/Atmosphere'
import { RecordCard } from '@/components/zheng/RecordCard'
import { zhengStore } from '@/lib/zheng/store'
import type { ConsultationRecord } from '@/lib/zheng/types'

export default function HistoryListPage() {
  const [records, setRecords] = useState<ConsultationRecord[] | null>(null)

  useEffect(() => {
    zhengStore.listRecords().then(setRecords)
  }, [])

  return (
    <>
      <Atmosphere />
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-16 md:py-24">
        <header className="mb-12 text-center">
          <h1 className="font-serif text-5xl font-bold text-[var(--color-ink-900)] tracking-widest">
            履
          </h1>
          <p className="mt-4 text-xs tracking-[0.4em] text-[var(--color-ink-400)] font-serif">
            走过的路 · 暂存本地 — 后续会同步到账号
          </p>
        </header>

        {records === null ? (
          <p className="text-center text-sm font-serif text-[var(--color-ink-400)]">载入中…</p>
        ) : records.length === 0 ? (
          <div className="text-center space-y-4">
            <p className="text-sm font-serif text-[var(--color-ink-600)]">
              还没有记录。在匹配卦后点「记此一卦」即可存下。
            </p>
            <Link
              href="/"
              className="inline-block text-xs font-serif text-[var(--color-vermillion)] hover:underline"
            >
              回首页问卦 →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((r) => (
              <RecordCard key={r.id} record={r} />
            ))}
          </div>
        )}

        <footer className="mt-16 text-center">
          <Link
            href="/"
            className="text-xs font-serif text-[var(--color-ink-400)] hover:text-[var(--color-vermillion)] transition-colors"
          >
            ← 回首页
          </Link>
        </footer>
      </div>
    </>
  )
}
```

- [ ] **Step 7.3: Commit**

```
git add app/history/page.tsx components/zheng/RecordCard.tsx
git commit -m "feat(zheng): /history list page + RecordCard"
```

---

## Task 8: `/history/[id]` detail page

**Files:**

- Create: `app/history/[id]/page.tsx`
- Create: `components/zheng/VerificationControl.tsx`

- [ ] **Step 8.1: VerificationControl**

3-radio + textarea + save + delete confirm.

```tsx
'use client'

import { useState } from 'react'
import { zhengStore } from '@/lib/zheng/store'
import type { ConsultationRecord, VerificationStatus } from '@/lib/zheng/types'

type Props = {
  record: ConsultationRecord
  onUpdate: (next: ConsultationRecord) => void
}

const OPTIONS: { value: VerificationStatus; label: string }[] = [
  { value: 'unverified', label: '未标注' },
  { value: 'fulfilled', label: '应验' },
  { value: 'partial', label: '部分应验' },
  { value: 'unfulfilled', label: '未应验' },
]

export function VerificationControl({ record, onUpdate }: Props) {
  const [status, setStatus] = useState<VerificationStatus>(record.verification)
  const [note, setNote] = useState(record.verificationNote ?? '')
  const [saving, setSaving] = useState(false)

  const dirty =
    status !== record.verification || (note.trim() || undefined) !== record.verificationNote

  async function handleSave() {
    setSaving(true)
    const updated = await zhengStore.updateVerification(record.id, status, note.trim() || undefined)
    setSaving(false)
    if (updated) onUpdate(updated)
  }

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-xs font-serif text-[var(--color-ink-600)] mb-2">回访</legend>
        <div className="flex flex-wrap gap-3">
          {OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="verification"
                value={opt.value}
                checked={status === opt.value}
                onChange={() => setStatus(opt.value)}
                className="accent-[var(--color-vermillion)]"
              />
              <span className="text-sm font-serif text-[var(--color-ink-800)]">{opt.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="block text-xs font-serif text-[var(--color-ink-600)] mb-2">
          反思笔记（可选）
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="例如：方向对了，但时间点比我预计的早 2 周。"
          className="w-full p-3 border border-[var(--color-ink-200)] rounded text-sm font-serif text-[var(--color-ink-800)] focus:outline-none focus:border-[var(--color-vermillion)] resize-none"
        />
      </div>

      {record.verifiedAt && (
        <p className="text-[10px] font-mono text-[var(--color-ink-400)]">
          上次标注于 {new Date(record.verifiedAt).toLocaleString()}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={!dirty || saving}
        className="text-xs font-serif text-[var(--color-vermillion)] border border-[var(--color-vermillion)] px-4 py-2 rounded hover:bg-[var(--color-vermillion)] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? '保存中…' : '保存标注'}
      </button>
    </div>
  )
}
```

- [ ] **Step 8.2: Detail page**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Atmosphere } from '@/components/Atmosphere'
import { VerificationControl } from '@/components/zheng/VerificationControl'
import { zhengStore } from '@/lib/zheng/store'
import type { ConsultationRecord } from '@/lib/zheng/types'

export default function HistoryDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [record, setRecord] = useState<ConsultationRecord | null | 'missing'>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    zhengStore.getRecord(params.id).then((r) => setRecord(r ?? 'missing'))
  }, [params.id])

  async function handleDelete() {
    await zhengStore.deleteRecord(params.id)
    router.push('/history')
  }

  if (record === null) {
    return (
      <>
        <Atmosphere />
        <div className="relative z-10 max-w-2xl mx-auto px-6 py-16 text-center font-serif text-sm text-[var(--color-ink-400)]">
          载入中…
        </div>
      </>
    )
  }

  if (record === 'missing') {
    return (
      <>
        <Atmosphere />
        <div className="relative z-10 max-w-2xl mx-auto px-6 py-16 text-center space-y-4">
          <p className="font-serif text-sm text-[var(--color-ink-600)]">
            这条记录不存在或已被删除。
          </p>
          <Link
            href="/history"
            className="text-xs font-serif text-[var(--color-vermillion)] hover:underline"
          >
            ← 回履
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <Atmosphere />
      <div className="relative z-10 max-w-2xl mx-auto px-6 py-16 md:py-24 space-y-10">
        <Link
          href="/history"
          className="text-xs font-serif text-[var(--color-ink-400)] hover:text-[var(--color-vermillion)] transition-colors"
        >
          ← 履
        </Link>

        <header>
          <div className="text-xs font-mono tracking-widest text-[var(--color-ink-400)]">
            {new Date(record.createdAt).toLocaleString()}
          </div>
          <h1 className="mt-2 font-serif text-5xl font-bold text-[var(--color-ink-900)]">
            {record.hexagramName}
          </h1>
        </header>

        <section className="card-classical rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-xs font-serif text-[var(--color-ink-600)] tracking-wide mb-2">
              情境
            </h2>
            <p className="font-serif text-[var(--color-ink-800)] leading-relaxed whitespace-pre-wrap">
              {record.situation}
            </p>
          </div>

          <div className="text-sm font-serif text-[var(--color-ink-600)]">
            当时匹配 · {record.hexagramName}（契合度 {Math.round(record.fitScore * 100)}%）
            <Link
              href={`/hexagram/${record.hexagramId}`}
              className="ml-3 text-xs text-[var(--color-vermillion)] hover:underline"
            >
              前往「{record.hexagramName}」详情 →
            </Link>
          </div>

          {record.yaoLocation && (
            <div className="text-sm font-serif text-[var(--color-ink-600)]">
              YaoLocator 定位 ·{' '}
              <span className="text-[var(--color-ink-900)] font-semibold">
                {record.yaoLocation.topYaoName}
              </span>
              （{Math.round(record.yaoLocation.topRatio * 100)}%）
              {record.yaoLocation.crossYaoName && (
                <span className="ml-2 text-[var(--color-ink-400)]">
                  · 也明显落在 {record.yaoLocation.crossYaoName}
                </span>
              )}
            </div>
          )}

          {record.userNote && (
            <div>
              <h2 className="text-xs font-serif text-[var(--color-ink-600)] tracking-wide mb-2">
                当时笔记
              </h2>
              <p className="font-serif text-[var(--color-ink-800)] leading-relaxed whitespace-pre-wrap">
                {record.userNote}
              </p>
            </div>
          )}
        </section>

        <section className="card-classical rounded-lg p-6">
          <VerificationControl record={record} onUpdate={setRecord} />
        </section>

        <section className="text-center">
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-xs font-serif text-[var(--color-ink-400)] hover:text-rose-600 transition-colors"
            >
              删除这条记录
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-serif text-[var(--color-ink-600)]">
                确认删除？删除后无法恢复。
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="text-xs font-serif text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-xs font-serif text-rose-600 border border-rose-300 px-3 py-1 rounded hover:bg-rose-50"
                >
                  确认删除
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
```

- [ ] **Step 8.3: Commit**

```
git add app/history/[id]/page.tsx components/zheng/VerificationControl.tsx
git commit -m "feat(zheng): /history/[id] detail page + VerificationControl"
```

---

## Task 9: Verify everything

- [ ] **Step 9.1: Lint**

```
npm run lint
```

- [ ] **Step 9.2: Typecheck**

```
npm run typecheck
```

- [ ] **Step 9.3: All tests**

```
npm run test -- --run
```

- [ ] **Step 9.4: Build**

```
npm run build
```

If anything fails, fix before moving on. Do not skip.

---

## Task 10: Open PR

- [ ] **Step 10.1: Push branch**

```
git push -u origin devin/1779594800-zheng-history
```

- [ ] **Step 10.2: Fetch PR template & create PR**

Base: `devin/1779592678-yao-locator`（stacked on PR #1）. When PR #1 merges, GitHub auto-rebases this PR's base to `main`.

PR body must follow `.github/pull_request_template.md`. Brief structure:

- **What**: 「征」模块 v1 — 持久化咨询历史 + 回访应验。localStorage + 接口抽象（为账号体系预留）
- **Why**: README 待办之三；闭合"咨询 → 反思 → 校准 matcher"反馈环的第一步
- **How**: `lib/zheng/` 数据层（types/schema/store-types/store-local/store.ts）+ `components/zheng/` UI + `/history` 两个路由 + lift YaoLocator state into MatchCard + 三个 footer 加 `HistoryNavLink`
- **Testing**: 12+ unit tests for store-local + lint/typecheck/build pass + manual smoke
- **Out of scope**: 账号体系、云存储、导出/导入、搜索、统计、反馈回写到 matcher (留给后续 PR)
- **Migration note**: 当前 store-local 是 ZhengStore 的一种实现；v2 加 `store-remote.ts` 时 UI 调用代码零改动

- [ ] **Step 10.3: Verify CI**

Use `git_pr_checks` with `wait_mode="all"`.

- [ ] **Step 10.4: Send PR link to user**

Include preview deployment URL if Vercel/Netlify configured.
