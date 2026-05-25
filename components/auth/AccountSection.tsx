'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth/use-auth'
import { zhengStore } from '@/lib/zheng/store'
import { exportToJson, exportFilename } from '@/lib/zheng/export'
import { exportToMarkdown, exportMarkdownFilename } from '@/lib/zheng/export-markdown'
import { ChangePasswordDialog } from '@/components/settings/ChangePasswordDialog'
import { ChangeEmailDialog } from '@/components/settings/ChangeEmailDialog'
import { DeleteAccountFlow } from './DeleteAccountFlow'
import { RestoreAccountBanner } from './RestoreAccountBanner'

function formatJoinedDate(iso: string | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${y} 年 ${m} 月 ${day} 日`
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

export function AccountSection() {
  const router = useRouter()
  const {
    user,
    loading,
    signOut,
    updatePassword,
    updateEmail,
    requestAccountDeletion,
    restoreAccount,
  } = useAuth()

  const [signingOut, setSigningOut] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [recordCount, setRecordCount] = useState<number | null>(null)

  useEffect(() => {
    if (!user) {
      setRecordCount(null)
      return
    }
    zhengStore
      .listRecords()
      .then((records) => setRecordCount(records.length))
      .catch(() => setRecordCount(null))
  }, [user])

  if (loading) {
    return (
      <section className="space-y-3">
        <h2 className="font-serif text-sm tracking-wider text-[var(--color-ink-400)]">账号</h2>
        <div className="rounded-lg border border-[var(--color-ink-200)] p-4 text-xs font-serif text-[var(--color-ink-400)]">
          加载中…
        </div>
      </section>
    )
  }

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
    } finally {
      setSigningOut(false)
    }
  }

  async function handleExportJson() {
    const records = await zhengStore.listRecords()
    const wrapper = exportToJson(records)
    triggerDownload(
      JSON.stringify(wrapper, null, 2),
      'application/json',
      exportFilename(wrapper.exportedAt, { source: 'cloud' }),
    )
  }

  async function handleExportMarkdown() {
    const records = await zhengStore.listRecords()
    const now = Date.now()
    triggerDownload(
      exportToMarkdown(records, { now }),
      'text/markdown;charset=utf-8',
      exportMarkdownFilename(now),
    )
  }

  return (
    <section className="space-y-3">
      <h2 className="font-serif text-sm tracking-wider text-[var(--color-ink-400)]">账号</h2>

      {user ? (
        <>
          <RestoreAccountBanner user={user} restoreAccount={restoreAccount} />

          <div className="rounded-lg border border-[var(--color-ink-200)] p-4 space-y-4">
            <div className="space-y-1">
              <div className="text-xs font-serif text-[var(--color-ink-400)]">已登录</div>
              <div className="font-serif text-sm text-[var(--color-ink-900)] break-all">
                {user.email ?? user.id}
              </div>
              {formatJoinedDate(user.created_at) ? (
                <div className="text-xs font-serif text-[var(--color-ink-500)]">
                  注册时间：{formatJoinedDate(user.created_at)}
                </div>
              ) : null}
              <p className="text-xs font-serif text-[var(--color-ink-500)] pt-1">
                记录正在同步到云端
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--color-ink-100)]">
              <button
                type="button"
                onClick={() => setPwOpen(true)}
                className="text-xs font-serif px-3 py-1.5 rounded border border-[var(--color-ink-300)] text-[var(--color-ink-700)] hover:border-[var(--color-ink-900)] hover:text-[var(--color-ink-900)] transition-colors"
              >
                修改密码
              </button>
              {user.email ? (
                <button
                  type="button"
                  onClick={() => setEmailOpen(true)}
                  className="text-xs font-serif px-3 py-1.5 rounded border border-[var(--color-ink-300)] text-[var(--color-ink-700)] hover:border-[var(--color-ink-900)] hover:text-[var(--color-ink-900)] transition-colors"
                >
                  修改邮箱
                </button>
              ) : null}
              <button
                type="button"
                disabled={signingOut}
                onClick={handleSignOut}
                className="text-xs font-serif px-3 py-1.5 rounded border border-[var(--color-ink-700)] text-[var(--color-ink-700)] hover:bg-[var(--color-ink-900)] hover:text-[var(--color-paper)] hover:border-[var(--color-ink-900)] transition-colors disabled:opacity-40"
              >
                {signingOut ? '退出中…' : '退出登录'}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-4 space-y-2">
            <div className="text-xs font-serif text-rose-700 tracking-wider">危险区域</div>
            <p className="text-xs font-serif text-[var(--color-ink-600)] leading-relaxed">
              注销后 30 天内可登录撤回；30 天后所有云端数据永久删除。
            </p>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="text-xs font-serif px-3 py-1.5 rounded border border-rose-600 text-rose-700 hover:bg-rose-100 transition-colors"
            >
              注销账号
            </button>
          </div>

          <ChangePasswordDialog
            open={pwOpen}
            onClose={() => setPwOpen(false)}
            updatePassword={updatePassword}
          />
          <ChangeEmailDialog
            open={emailOpen}
            currentEmail={user.email ?? ''}
            onClose={() => setEmailOpen(false)}
            updateEmail={updateEmail}
          />
          <DeleteAccountFlow
            open={deleteOpen}
            recordCount={recordCount ?? 0}
            requestAccountDeletion={requestAccountDeletion}
            onClose={() => setDeleteOpen(false)}
            onDeleted={async () => {
              setDeleteOpen(false)
              await signOut()
              router.push('/')
            }}
            onExportJson={handleExportJson}
            onExportMarkdown={handleExportMarkdown}
          />
        </>
      ) : (
        <div className="rounded-lg border border-[var(--color-ink-200)] p-4 space-y-3">
          <p className="text-xs font-serif text-[var(--color-ink-600)]">
            当前未登录。记录仅保存在此设备本机；登录后可同步到云端，多设备可见。
          </p>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="text-xs font-serif px-4 py-2 rounded border border-[var(--color-ink-900)] text-[var(--color-ink-900)] hover:bg-[var(--color-ink-900)] hover:text-[var(--color-paper)] transition-colors"
            >
              登录
            </Link>
            <Link
              href="/register"
              className="text-xs font-serif px-4 py-2 rounded border border-[var(--color-ink-300)] text-[var(--color-ink-600)] hover:border-[var(--color-ink-900)] hover:text-[var(--color-ink-900)] transition-colors"
            >
              注册
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
