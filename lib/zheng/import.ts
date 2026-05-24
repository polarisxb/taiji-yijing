/**
 * 「征」模块 — 解析导入的 JSON 字符串
 *
 * 严格校验：source / schemaVersion / records 三者任一不合规即整体拒绝；
 * 不做"部分导入"，避免静默丢数据。
 */

import { ZhengExportSchema, type ZhengExport } from './export-schema'

export type ParseImportResult = { ok: true; data: ZhengExport } | { ok: false; reason: string }

export function parseImport(text: string): ParseImportResult {
  // 1) JSON 解析
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (e) {
    return {
      ok: false,
      reason: `文件不是有效的 JSON：${e instanceof Error ? e.message : String(e)}`,
    }
  }

  // 2) 顶层必须是 object
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      reason: '文件格式不对：顶层应为对象，包含 source / schemaVersion / records',
    }
  }

  // 3) source 早检（给出更友好的错误信息）
  const obj = raw as Record<string, unknown>
  if (obj.source !== 'taiji-yijing.zheng') {
    return {
      ok: false,
      reason: '不是 taiji-yijing 的导出文件（source 字段不匹配）',
    }
  }

  // 4) schemaVersion 早检（v1 importer 不接受 v2+ 文件）
  if (typeof obj.schemaVersion === 'number' && obj.schemaVersion > 1) {
    return {
      ok: false,
      reason: `此文件来自较新版本（schemaVersion=${obj.schemaVersion}），请升级到最新版本以导入`,
    }
  }

  // 5) 全量 zod 校验（包含 records 的 schema）
  const result = ZhengExportSchema.safeParse(raw)
  if (!result.success) {
    const firstIssue = result.error.issues[0]
    const path = firstIssue?.path?.join('.') ?? '(unknown)'
    return {
      ok: false,
      reason: `文件中有 record 格式不合法（${path}）：${firstIssue?.message ?? 'invalid'}`,
    }
  }

  return { ok: true, data: result.data }
}
