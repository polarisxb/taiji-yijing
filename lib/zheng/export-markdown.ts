/**
 * 「征」模块 — 导出为人可读的 Markdown 文件
 *
 * 与 export.ts (JSON) 互补：JSON 用于机器迁移，Markdown 用于人查看 / 打印 / 存档到
 * Notion / Obsidian。
 *
 * 设计原则：
 * - 输出 deterministic（注入 now + timezone 用于测试与文件名）
 * - 默认按 createdAt 降序排（最新在前）
 * - 引用块 `>` 包裹 situation / userNote / verificationNote，前缀 `>` 避免破坏 markdown
 */

import { confidenceLabel } from './confidence'
import type { ConsultationRecord, VerificationStatus } from './types'

export type ExportMarkdownOptions = {
  /** 当前时间 epoch ms。默认 Date.now()；测试时注入固定值 */
  now?: number
  /** IANA 时区，例如 'Asia/Shanghai' / 'UTC'。默认浏览器本地时区 */
  timezone?: string
}

const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  unverified: '⚪ 未回访',
  fulfilled: '✅ 已应验',
  partial: '🟡 部分应验',
  unfulfilled: '❌ 未应验',
}

export function exportToMarkdown(
  records: ConsultationRecord[],
  options: ExportMarkdownOptions = {},
): string {
  const now = options.now ?? Date.now()
  const tz = options.timezone

  const lines: string[] = []
  lines.push('# 太极易经 · 我的决策档案')
  lines.push('')
  lines.push(`导出于 ${formatDateTime(now, tz)}，共 ${records.length} 条记录`)
  lines.push('')
  lines.push('---')

  const sorted = [...records].sort((a, b) => b.createdAt - a.createdAt)
  for (const r of sorted) {
    lines.push('')
    lines.push(`## ${r.hexagramName} · ${formatDateTime(r.createdAt, tz)}`)
    lines.push('')
    lines.push('**情境**')
    lines.push('')
    lines.push(...blockquote(r.situation))
    lines.push('')
    lines.push(`**取象** ${matchLabel(r)}`)
    lines.push('')
    lines.push(`- 卦：${r.hexagramName}（第 ${r.hexagramId} 卦）`)
    const yaoLine = yaoLineFor(r)
    if (yaoLine) lines.push(`- ${yaoLine}`)
    if (r.userNote && r.userNote.trim() !== '') {
      lines.push('')
      lines.push('**我的笔记**')
      lines.push('')
      lines.push(...blockquote(r.userNote))
    }
    lines.push('')
    lines.push('**应验**')
    lines.push('')
    lines.push(verificationLine(r, tz))
    if (r.verificationNote && r.verificationNote.trim() !== '') {
      lines.push('')
      lines.push(...blockquote(r.verificationNote))
    }
    lines.push('')
    lines.push('---')
  }

  return lines.join('\n') + '\n'
}

export function exportMarkdownFilename(
  at: number = Date.now(),
  options: ExportMarkdownOptions = {},
): string {
  const tz = options.timezone
  return `taiji-yijing-zheng-${formatDate(at, tz)}.md`
}

function matchLabel(r: ConsultationRecord): string {
  if (r.consultMode === 'ai' && r.aiYao) {
    return `(AI · ${confidenceLabel(r.aiYao.confidence)})`
  }
  const pct = Math.round((r.fitScore ?? 0) * 100)
  return `(经典 · 契合 ${pct}%)`
}

function yaoLineFor(r: ConsultationRecord): string | null {
  if (r.consultMode === 'ai' && r.aiYao) {
    const brief = r.aiYao.brief && r.aiYao.brief.trim() !== '' ? `「${r.aiYao.brief}」` : ''
    return `爻位：${r.aiYao.name}${brief}`
  }
  if (r.yaoLocation) {
    return `爻位：${r.yaoLocation.topYaoName}`
  }
  return null
}

function verificationLine(r: ConsultationRecord, tz?: string): string {
  const label = VERIFICATION_LABEL[r.verification]
  if (r.verification === 'unverified' || !r.verifiedAt) return label
  return `${label} · ${formatDate(r.verifiedAt, tz)}`
}

/**
 * 把多行文本包成 markdown 引用块。每行前缀 `> `；空文本输出 `> `。
 * 不对 `#` / `>` 等字符做转义——blockquote 内部的 markdown 仍按原文呈现，
 * 但前缀 `>` 保证整段被识别为引用，不会被当作 H1 / H2 标题。
 */
function blockquote(text: string): string[] {
  if (!text) return ['> ']
  return text.split('\n').map((line) => `> ${line}`)
}

function formatDateTime(epoch: number, tz?: string): string {
  const d = new Date(epoch)
  const parts = dateParts(d, tz)
  return `${parts.y}-${parts.mo}-${parts.day} ${parts.h}:${parts.mi}`
}

function formatDate(epoch: number, tz?: string): string {
  const d = new Date(epoch)
  const parts = dateParts(d, tz)
  return `${parts.y}-${parts.mo}-${parts.day}`
}

function dateParts(
  d: Date,
  tz?: string,
): { y: string; mo: string; day: string; h: string; mi: string } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const segs = fmt.formatToParts(d)
  const get = (type: string) => segs.find((s) => s.type === type)?.value ?? ''
  return {
    y: get('year'),
    mo: get('month'),
    day: get('day'),
    h: get('hour') === '24' ? '00' : get('hour'),
    mi: get('minute'),
  }
}
