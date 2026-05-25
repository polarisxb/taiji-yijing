'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { zhengStore } from '@/lib/zheng/store'
import { exportToJson, exportFilename } from '@/lib/zheng/export'
import { exportToMarkdown, exportMarkdownFilename } from '@/lib/zheng/export-markdown'
import { parseImport } from '@/lib/zheng/import'
import { useAuth } from '@/lib/auth/use-auth'
import type { ZhengExport } from '@/lib/zheng/export-schema'
import { ImportConflictDialog } from './ImportConflictDialog'
import { ClearAllDialog } from './ClearAllDialog'

const MAX_IMPORT_BYTES = 5 * 1024 * 1024 // 5MB

type Toast = { kind: 'info' | 'error'; message: string } | null

export function SettingsPanel() {
  const router = useRouter()
  const { user } = useAuth()
  const [count, setCount] = useState<number | null>(null)
  const [toast, setToast] = useState<Toast>(null)
  const [importPending, setImportPending] = useState<ZhengExport | null>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    zhengStore.listRecords().then((records) => setCount(records.length))
  }, [])

  function showToast(kind: 'info' | 'error', message: string) {
    setToast({ kind, message })
    setTimeout(() => setToast(null), 3000)
  }

  async function refreshCount() {
    const records = await zhengStore.listRecords()
    setCount(records.length)
  }

  function activeSource(): 'local' | 'cloud' {
    return user ? 'cloud' : 'local'
  }

  async function handleExport() {
    const records = await zhengStore.listRecords()
    const wrapper = exportToJson(records)
    const json = JSON.stringify(wrapper, null, 2)
    triggerDownload(
      json,
      'application/json',
      exportFilename(wrapper.exportedAt, { source: activeSource() }),
    )
    showToast('info', `已导出 ${records.length} 条记录（JSON）`)
  }

  async function handleExportMarkdown() {
    const records = await zhengStore.listRecords()
    const now = Date.now()
    const md = exportToMarkdown(records, { now })
    triggerDownload(md, 'text/markdown;charset=utf-8', exportMarkdownFilename(now))
    showToast('info', `已导出 ${records.length} 条记录（Markdown）`)
  }

  function triggerDownload(content: string, mime: string, filename: string) {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function handleImportFile(file: File) {
    if (file.size > MAX_IMPORT_BYTES) {
      showToast('error', '文件过大（> 5MB），拒绝导入')
      return
    }
    const text = await file.text()
    const result = parseImport(text)
    if (!result.ok) {
      showToast('error', result.reason)
      return
    }
    setImportPending(result.data)
  }

  async function confirmImport(mode: 'merge' | 'overwrite') {
    if (!importPending) return
    const r = await zhengStore.importRecords(importPending.records, mode)
    setImportPending(null)
    await refreshCount()
    if (mode === 'merge') {
      showToast('info', `已合并 ${r.imported} 条记录（${r.skipped} 条重复跳过）`)
    } else {
      showToast('info', `已替换为 ${r.total} 条记录`)
    }
  }

  async function handleClear() {
    const cleared = await zhengStore.clearAll()
    setClearOpen(false)
    await refreshCount()
    showToast('info', `已清空 ${cleared} 条记录`)
    router.push('/history')
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-xs font-serif tracking-widest text-[var(--color-vermillion)] mb-3">
          数据
        </h2>
        <div className="card-classical rounded-lg p-6 space-y-6">
          <div className="text-sm font-serif text-[var(--color-ink-700)]">
            {user ? '当前云端共有' : '当前本地共有'}{' '}
            <span className="font-bold text-[var(--color-ink-900)]">
              {count === null ? '…' : count}
            </span>{' '}
            条记录。
          </div>

          {/* Export */}
          <div className="flex items-center justify-between gap-4 border-t border-[var(--color-ink-100)] pt-4">
            <div>
              <div className="font-serif text-sm text-[var(--color-ink-900)]">导出 JSON</div>
              <p className="text-xs font-serif text-[var(--color-ink-400)] mt-1">
                下载完整记录的 JSON 文件，作为备份或迁移使用。
              </p>
            </div>
            <button
              type="button"
              disabled={!count}
              onClick={handleExport}
              className="text-sm font-serif px-4 py-2 rounded border border-[var(--color-ink-900)] text-[var(--color-ink-900)] hover:bg-[var(--color-ink-900)] hover:text-[var(--color-paper)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--color-ink-900)] shrink-0"
            >
              导出
            </button>
          </div>

          {/* Export Markdown */}
          <div className="flex items-center justify-between gap-4 border-t border-[var(--color-ink-100)] pt-4">
            <div>
              <div className="font-serif text-sm text-[var(--color-ink-900)]">导出 Markdown</div>
              <p className="text-xs font-serif text-[var(--color-ink-400)] mt-1">
                人可读的决策档案备份；包含情境、卦象、笔记与应验状态。
              </p>
            </div>
            <button
              type="button"
              disabled={!count}
              onClick={handleExportMarkdown}
              className="text-sm font-serif px-4 py-2 rounded border border-[var(--color-ink-900)] text-[var(--color-ink-900)] hover:bg-[var(--color-ink-900)] hover:text-[var(--color-paper)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--color-ink-900)] shrink-0"
            >
              导出
            </button>
          </div>

          {/* Import */}
          <div className="flex items-center justify-between gap-4 border-t border-[var(--color-ink-100)] pt-4">
            <div>
              <div className="font-serif text-sm text-[var(--color-ink-900)]">导入 JSON</div>
              <p className="text-xs font-serif text-[var(--color-ink-400)] mt-1">
                上传 taiji-yijing 导出的 JSON 文件；可选合并或替换当前数据。
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-sm font-serif px-4 py-2 rounded border border-[var(--color-ink-900)] text-[var(--color-ink-900)] hover:bg-[var(--color-ink-900)] hover:text-[var(--color-paper)] transition-colors shrink-0"
            >
              导入
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleImportFile(f)
                e.target.value = '' // allow re-importing same file
              }}
            />
          </div>

          {/* Clear */}
          <div className="flex items-center justify-between gap-4 border-t border-[var(--color-ink-100)] pt-4">
            <div>
              <div className="font-serif text-sm text-rose-700">清空所有记录</div>
              <p className="text-xs font-serif text-[var(--color-ink-400)] mt-1">
                删除所有本地存档，此操作不可撤销。会建议先导出备份。
              </p>
            </div>
            <button
              type="button"
              disabled={!count}
              onClick={() => setClearOpen(true)}
              className="text-sm font-serif px-4 py-2 rounded border border-rose-600 text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              清空
            </button>
          </div>
        </div>
      </section>

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded text-xs font-serif shadow-md ${
            toast.kind === 'error'
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-[var(--color-paper)] text-[var(--color-ink-900)] border border-[var(--color-ink-200)]'
          }`}
        >
          {toast.message}
        </div>
      )}

      {importPending && (
        <ImportConflictDialog
          incoming={importPending}
          existingCount={count ?? 0}
          onConfirm={confirmImport}
          onCancel={() => setImportPending(null)}
        />
      )}

      {clearOpen && (
        <ClearAllDialog
          count={count ?? 0}
          onExportFirst={handleExport}
          onConfirm={handleClear}
          onCancel={() => setClearOpen(false)}
        />
      )}
    </div>
  )
}
