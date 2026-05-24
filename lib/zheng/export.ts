/**
 * 「征」模块 — 导出为带元数据的 JSON
 *
 * 用法：
 *   const wrapper = exportToJson(records)
 *   const json = JSON.stringify(wrapper, null, 2)
 *   // 然后通过 Blob + <a download> 触发浏览器下载
 */

import type { ConsultationRecord } from './types'
import { ZHENG_EXPORT_SOURCE, type ZhengExport } from './export-schema'

export function exportToJson(records: ConsultationRecord[]): ZhengExport {
  return {
    source: ZHENG_EXPORT_SOURCE,
    schemaVersion: 1,
    exportedAt: Date.now(),
    recordCount: records.length,
    records,
  }
}

/**
 * 生成下载用的文件名，例如 `taiji-yijing-zheng-2026-05-24.json`。
 */
export function exportFilename(at: number = Date.now()): string {
  const d = new Date(at)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `taiji-yijing-zheng-${yyyy}-${mm}-${dd}.json`
}
