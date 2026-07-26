import { describe, it, expect } from 'vitest'
import { exportToMarkdown, exportMarkdownFilename } from '@/lib/zheng/export-markdown'
import type { ConsultationRecord } from '@/lib/zheng/types'

function record(overrides: Partial<ConsultationRecord> = {}): ConsultationRecord {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    schemaVersion: 1,
    createdAt: Date.UTC(2026, 4, 20, 14, 32, 0), // 2026-05-20 14:32 UTC
    situation: '我要不要换工作',
    hexagramId: 3,
    hexagramName: '屯',
    fitScore: 0.72,
    verification: 'unverified',
    ...overrides,
  }
}

const TZ_OPT = { timezone: 'UTC' as const, now: Date.UTC(2026, 4, 24, 9, 0, 0) }

describe('exportToMarkdown', () => {
  it('produces a header with title + export date + record count', () => {
    const md = exportToMarkdown([record()], TZ_OPT)
    expect(md).toMatch(/^# 太极易经 · 我的决策档案/)
    expect(md).toContain('导出于 2026-05-24 09:00')
    expect(md).toContain('共 1 条记录')
  })

  it('renders empty list with header only and 共 0 条记录', () => {
    const md = exportToMarkdown([], TZ_OPT)
    expect(md).toContain('# 太极易经 · 我的决策档案')
    expect(md).toContain('共 0 条记录')
    expect(md).not.toContain('##')
  })

  it('renders one classic-mode record with hexagram + date + situation + yao + fit', () => {
    const r = record({
      consultMode: 'classic',
      situation: '我要不要换工作',
      yaoLocation: {
        topPosition: 2,
        topYaoName: '九二',
        topRatio: 0.6,
      },
    })
    const md = exportToMarkdown([r], TZ_OPT)
    expect(md).toContain('## 屯 · 2026-05-20 14:32')
    expect(md).toMatch(/\*\*情境\*\*[\s\S]*> 我要不要换工作/)
    expect(md).toContain('(经典 · 契合 72%)')
    expect(md).toContain('卦：屯（第 3 卦）')
    expect(md).toContain('爻位：九二')
  })

  it('renders AI-mode record with confidence label + yao brief', () => {
    const r = record({
      consultMode: 'ai',
      situation: '我要不要创业',
      aiYao: {
        position: 6,
        name: '上九',
        brief: '乘马班如',
        confidence: 'high',
      },
    })
    const md = exportToMarkdown([r], TZ_OPT)
    expect(md).toContain('(AI · 定见)')
    expect(md).toContain('爻位：上九')
    expect(md).toContain('乘马班如')
  })

  it('uses 待审 label for medium confidence', () => {
    const r = record({
      consultMode: 'ai',
      aiYao: { position: 3, name: '九三', brief: 'x', confidence: 'medium' },
    })
    expect(exportToMarkdown([r], TZ_OPT)).toContain('(AI · 待审)')
  })

  it('uses 审慎 label for low confidence', () => {
    const r = record({
      consultMode: 'ai',
      aiYao: { position: 3, name: '九三', brief: 'x', confidence: 'low' },
    })
    expect(exportToMarkdown([r], TZ_OPT)).toContain('(AI · 审慎)')
  })

  it('renders userNote as blockquote when present', () => {
    const r = record({ userNote: '下周给老板打电话' })
    const md = exportToMarkdown([r], TZ_OPT)
    expect(md).toMatch(/\*\*我的笔记\*\*[\s\S]*> 下周给老板打电话/)
  })

  it('omits userNote section when absent', () => {
    const md = exportToMarkdown([record({ userNote: undefined })], TZ_OPT)
    expect(md).not.toContain('我的笔记')
  })

  it('renders verification as ⚪ 未回访 when unverified', () => {
    const md = exportToMarkdown([record({ verification: 'unverified' })], TZ_OPT)
    expect(md).toContain('⚪ 未回访')
  })

  it('renders verification as ✅ 已应验 with verifiedAt date for fulfilled', () => {
    const r = record({
      verification: 'fulfilled',
      verifiedAt: Date.UTC(2026, 4, 23, 10, 0, 0),
      verificationNote: '实际谈话比预期顺利',
    })
    const md = exportToMarkdown([r], TZ_OPT)
    expect(md).toContain('✅ 已应验')
    expect(md).toContain('2026-05-23')
    expect(md).toMatch(/> 实际谈话比预期顺利/)
  })

  it('renders 🟡 部分应验 / ❌ 未应验 emoji correctly', () => {
    const partial = exportToMarkdown(
      [record({ verification: 'partial', verifiedAt: Date.UTC(2026, 4, 23) })],
      TZ_OPT,
    )
    const unfulfilled = exportToMarkdown(
      [record({ verification: 'unfulfilled', verifiedAt: Date.UTC(2026, 4, 23) })],
      TZ_OPT,
    )
    expect(partial).toContain('🟡 部分应验')
    expect(unfulfilled).toContain('❌ 未应验')
  })

  it('sorts records by createdAt descending (newest first)', () => {
    const a = record({
      id: 'a-id',
      hexagramName: '乾',
      createdAt: Date.UTC(2026, 4, 10, 0, 0, 0),
    })
    const b = record({
      id: 'b-id',
      hexagramName: '坤',
      createdAt: Date.UTC(2026, 4, 20, 0, 0, 0),
    })
    const md = exportToMarkdown([a, b], TZ_OPT)
    const aIdx = md.indexOf('乾')
    const bIdx = md.indexOf('坤')
    expect(bIdx).toBeLessThan(aIdx)
  })

  it('separates records with --- horizontal rules', () => {
    const md = exportToMarkdown([record({ id: 'a' }), record({ id: 'b' })], TZ_OPT)
    // Header --- + 2 records, each preceded by ---: at least 3 --- lines
    const hrCount = (md.match(/^---$/gm) ?? []).length
    expect(hrCount).toBeGreaterThanOrEqual(3)
  })

  it('handles records without consultMode / yaoLocation / aiYao gracefully (no crash)', () => {
    const r = record({
      consultMode: undefined,
      yaoLocation: undefined,
      aiYao: undefined,
      userNote: undefined,
    })
    const md = exportToMarkdown([r], TZ_OPT)
    expect(md).toContain('## 屯 ·')
    // No 爻位 line should appear
    expect(md).not.toContain('爻位：')
    // Defaults to classic fit display since no aiYao
    expect(md).toContain('契合 72%')
  })

  it('escapes leading > and # in situation / userNote to avoid breaking markdown', () => {
    const r = record({
      situation: '# 不是标题',
      userNote: '> 不是引用',
    })
    const md = exportToMarkdown([r], TZ_OPT)
    // We render situation inside a blockquote; should preserve text but not let it become a heading
    expect(md).toContain('> # 不是标题')
    expect(md).toContain('> > 不是引用')
  })
})

describe('exportMarkdownFilename', () => {
  it('uses .md extension and date suffix', () => {
    const name = exportMarkdownFilename(Date.UTC(2026, 4, 24, 9, 0, 0), { timezone: 'UTC' })
    expect(name).toBe('taiji-yijing-zheng-2026-05-24.md')
  })
})
