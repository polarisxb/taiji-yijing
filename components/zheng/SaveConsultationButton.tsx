'use client'

import { useState } from 'react'
import Link from 'next/link'
import { zhengStore } from '@/lib/zheng/store'
import type {
  AiYaoPrediction,
  ConsultMode,
  SaveRecordInput,
  SavedYaoLocation,
} from '@/lib/zheng/types'

type Props = {
  situation: string
  hexagramId: number
  hexagramName: string
  fitScore: number
  yaoLocation?: SavedYaoLocation
  aiYao?: AiYaoPrediction
  consultMode?: ConsultMode
}

type Status = 'idle' | 'saving' | 'saved' | 'error'

export function SaveConsultationButton(props: Props) {
  const [expanded, setExpanded] = useState(false)
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [savedId, setSavedId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSave() {
    setStatus('saving')
    setErrorMsg(null)
    const input: SaveRecordInput = {
      situation: props.situation,
      hexagramId: props.hexagramId,
      hexagramName: props.hexagramName,
      fitScore: props.fitScore,
      yaoLocation: props.yaoLocation,
      aiYao: props.aiYao,
      consultMode: props.consultMode,
      userNote: note.trim() || undefined,
    }
    try {
      const record = await zhengStore.saveRecord(input)
      setSavedId(record.id)
      setStatus('saved')
    } catch (e) {
      setStatus('error')
      setErrorMsg(e instanceof Error ? e.message : '保存失败')
    }
  }

  if (status === 'saved' && savedId) {
    return (
      <div className="px-6 py-4 border-t border-[var(--color-ink-100)] flex items-center gap-3 text-xs font-serif">
        <span className="text-[var(--color-ink-600)]">已记</span>
        <Link
          href={`/history/${savedId}`}
          className="text-[var(--color-vermillion)] hover:underline"
        >
          在「履」中可见 →
        </Link>
      </div>
    )
  }

  if (!expanded) {
    return (
      <div className="px-6 py-4 border-t border-[var(--color-ink-100)]">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs font-serif text-[var(--color-ink-600)] hover:text-[var(--color-vermillion)] transition-colors"
        >
          ✎ 记此一卦
        </button>
        <span className="ml-3 text-[10px] font-serif text-[var(--color-ink-300)]">
          暂存本地 · 后续会同步到账号
        </span>
      </div>
    )
  }

  return (
    <div className="px-6 py-4 border-t border-[var(--color-ink-100)] space-y-3">
      <label htmlFor="save-note" className="block text-xs font-serif text-[var(--color-ink-600)]">
        我打算怎么做（可选）
      </label>
      <textarea
        id="save-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        className="w-full p-3 border border-[var(--color-ink-200)] rounded text-sm font-serif text-[var(--color-ink-800)] focus:outline-none focus:border-[var(--color-vermillion)] resize-none bg-transparent"
        placeholder="例如：本周内与三位顾问通电话，看反馈再定。"
      />
      {errorMsg && <p className="text-xs text-rose-600 font-serif">{errorMsg}</p>}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => {
            setExpanded(false)
            setNote('')
            setStatus('idle')
            setErrorMsg(null)
          }}
          disabled={status === 'saving'}
          className="text-xs font-serif text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)] transition-colors disabled:opacity-40"
        >
          取消
        </button>
        <button
          type="button"
          disabled={status === 'saving'}
          onClick={handleSave}
          className="text-xs font-serif text-[var(--color-vermillion)] border border-[var(--color-vermillion)] px-3 py-1 rounded hover:bg-[var(--color-vermillion)] hover:text-white transition-colors disabled:opacity-50"
        >
          {status === 'saving' ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  )
}
