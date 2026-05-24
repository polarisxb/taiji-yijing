/**
 * 「征」模块 — Export wrapper schema (zod)
 *
 * v1 用于导出/导入 JSON 文件，未来 v2 可基于 schemaVersion 自动迁移老文件。
 */

import { z } from 'zod'
import { ConsultationRecordSchema } from './schema'

export const ZHENG_EXPORT_SOURCE = 'taiji-yijing.zheng' as const

export const ZhengExportSchema = z.object({
  source: z.literal(ZHENG_EXPORT_SOURCE),
  schemaVersion: z.literal(1),
  exportedAt: z.number().int().nonnegative(),
  recordCount: z.number().int().nonnegative(),
  records: z.array(ConsultationRecordSchema),
})

export type ZhengExport = z.infer<typeof ZhengExportSchema>
