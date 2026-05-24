'use client'

import { useState } from 'react'
import { zhengStore } from '@/lib/zheng/store'
import type { ConsultationRecord, VerificationStatus } from '@/lib/zheng/types'

type Props = {
  record: ConsultationRecord
  onUpdate: (next: ConsultationRecord) => void
}

const OPTIONS: { value: VerificationStatus; label: string }[] = [
  { value: 'unverified', label: '未标注' },
  { value: 'fulfilled', label: '应验' },
  { value: 'partial', label: '部分应验' },
  { value: 'unfulfilled', label: '未应验' },
]

export function VerificationControl({ record, onUpdate }: Props) {
  const [status, setStatus] = useState<VerificationStatus>(record.verification)
  const [note, setNote] = useState(record.verificationNote ?? '')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const trimmedNote = note.trim() || undefined
  const dirty = status !== record.verification || trimmedNote !== record.verificationNote

  async function handleSave() {
    setSaving(true)
    setErrorMsg(null)
    try {
      const updated = await zhengStore.updateVerification(record.id, status, trimmedNote)
      if (updated) onUpdate(updated)
      else setErrorMsg('记录已不存在')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <fieldset className="space-y-3">
        <legend className="text-xs font-serif text-[var(--color-ink-600)]">回访</legend>
        <div className="flex flex-wrap gap-4 pt-1">
          {OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="verification"
                value={opt.value}
                checked={status === opt.value}
                onChange={() => setStatus(opt.value)}
                className="accent-[var(--color-vermillion)]"
              />
              <span className="text-sm font-serif text-[var(--color-ink-800)]">{opt.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="verification-note"
          className="block text-xs font-serif text-[var(--color-ink-600)] mb-2"
        >
          反思笔记（可选）
        </label>
        <textarea
          id="verification-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="例如：方向对了，但时间点比我预计的早 2 周。"
          className="w-full p-3 border border-[var(--color-ink-200)] rounded text-sm font-serif text-[var(--color-ink-800)] focus:outline-none focus:border-[var(--color-vermillion)] resize-none bg-transparent"
        />
      </div>

      {record.verifiedAt && (
        <p className="text-[10px] font-mono text-[var(--color-ink-400)]">
          上次标注于 {new Date(record.verifiedAt).toLocaleString()}
        </p>
      )}

      {errorMsg && <p className="text-xs text-rose-600 font-serif">{errorMsg}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={!dirty || saving}
        className="text-xs font-serif text-[var(--color-vermillion)] border border-[var(--color-vermillion)] px-4 py-2 rounded hover:bg-[var(--color-vermillion)] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? '保存中…' : '保存标注'}
      </button>
    </div>
  )
}
