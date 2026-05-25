/**
 * 首次登录时把本机记录合并到云端的迁移辅助函数。
 *
 * 保守策略：
 * - 远端 import 抛错 → 不清本机（避免数据丢失）
 * - 远端报告 imported < total → 不清本机（部分成功不能视为安全）
 * - 完全成功后才清本机
 */

import type { ZhengStore } from '@/lib/zheng/store-types'

export type MigrationResult = {
  migrated: number
  skipped: number
}

export async function migrateLocalToRemote(
  local: ZhengStore,
  remote: ZhengStore,
): Promise<MigrationResult> {
  const records = await local.listRecords()
  if (records.length === 0) return { migrated: 0, skipped: 0 }

  const result = await remote.importRecords(records, 'merge')

  const migrated = result.imported
  const skipped = records.length - migrated

  // 只有完全成功才清本机
  if (migrated === records.length && skipped === 0) {
    await local.clearAll()
  }

  return { migrated, skipped }
}
