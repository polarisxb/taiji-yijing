'use client'

/**
 * MigrationOrchestrator — 已登录用户在首页 / 履页挂载它后：
 * 1. 检查 localStorage 是否有未上云的记录
 * 2. 有 → 弹 MigrationDialog 让用户选迁移方式
 * 3. 处理 3 个选项（合并 / 仅云端 / 先导出）
 * 4. 用 sessionStorage 记录"本会话已 dismiss"，避免重复打扰
 *
 * 只在 user !== null 时工作；user === null 时直接返回 null。
 *
 * `onMigrationComplete` 让父组件知道迁移完成 → 刷新列表。
 */

import { useEffect, useState } from 'react'

import { migrateLocalToRemote } from '@/lib/auth/migrate'
import { useAuth } from '@/lib/auth/use-auth'
import { exportFilename, exportToJson } from '@/lib/zheng/export'
import { localZhengStore } from '@/lib/zheng/store-local'
import { zhengStore } from '@/lib/zheng/store'

import { MigrationDialog } from './MigrationDialog'

const DEFER_KEY = 'taiji-yijing.migration.deferred.v1'

export type MigrationOrchestratorProps = {
  onMigrationComplete?: () => void
}

export function MigrationOrchestrator({ onMigrationComplete }: MigrationOrchestratorProps) {
  const { user, loading } = useAuth()
  const [localCount, setLocalCount] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (loading || !user) {
      setOpen(false)
      return
    }
    try {
      const deferred = sessionStorage.getItem(DEFER_KEY)
      if (deferred === user.id) return
    } catch {
      // sessionStorage 不可用（隐私模式等）→ 当作没 deferred
    }
    localZhengStore.listRecords().then((records) => {
      if (records.length > 0) {
        setLocalCount(records.length)
        setOpen(true)
      }
    })
  }, [user, loading])

  if (!user || !open) return null

  function rememberDefer() {
    if (!user) return
    try {
      sessionStorage.setItem(DEFER_KEY, user.id)
    } catch {
      // ignore
    }
  }

  async function handleMerge() {
    const result = await migrateLocalToRemote(localZhengStore, zhengStore)
    setOpen(false)
    rememberDefer()
    if (result.migrated > 0) {
      onMigrationComplete?.()
    }
  }

  function handleCloudOnly() {
    setOpen(false)
    rememberDefer()
  }

  function handleExport() {
    void localZhengStore.listRecords().then((records) => {
      const wrapper = exportToJson(records)
      const json = JSON.stringify(wrapper, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = exportFilename(wrapper.exportedAt)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      // 不关闭弹窗，让用户导出后再决定 合并 or 仅云端
    })
  }

  function handleDefer() {
    setOpen(false)
    rememberDefer()
  }

  return (
    <MigrationDialog
      localCount={localCount}
      onMerge={handleMerge}
      onCloudOnly={handleCloudOnly}
      onExport={handleExport}
      onDefer={handleDefer}
    />
  )
}
