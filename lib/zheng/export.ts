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

export type ExportFilenameOptions = {
  /** 数据来源；未指定时输出无后缀的兼容文件名 */
  source?: 'local' | 'cloud'
}

/**
 * 生成下载用的文件名。
 *
 * - 默认（无 source）：`taiji-yijing-zheng-YYYY-MM-DD.json`
 * - source='local'：`taiji-yijing-zheng-LOCAL-YYYY-MM-DD.json`
 * - source='cloud'：`taiji-yijing-zheng-CLOUD-YYYY-MM-DD.json`
 *
 * 加 LOCAL/CLOUD 后缀避免用户在 A 包上云后混淆"这个备份是本机还是云端的"。
 */
export function exportFilename(
  at: number = Date.now(),
  options: ExportFilenameOptions = {},
): string {
  const d = new Date(at)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const tag = options.source === 'local' ? 'LOCAL-' : options.source === 'cloud' ? 'CLOUD-' : ''
  return `taiji-yijing-zheng-${tag}${yyyy}-${mm}-${dd}.json`
}
