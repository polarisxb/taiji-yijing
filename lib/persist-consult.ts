import type { MatchData } from '@/hooks/useStreamingConsult'

export type PersistedConsult = {
  situation: string
  matchData: MatchData
  interpretation: string
  savedAt: number
}

const STORAGE_KEY = 'taiji:last-consult'

export function saveLastConsult(data: Omit<PersistedConsult, 'savedAt'>) {
  if (typeof window === 'undefined') return

  const toSave: PersistedConsult = {
    ...data,
    savedAt: Date.now(),
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch (e) {
    // 存储空间不足或隐私模式等，静默失败
    console.warn('Failed to persist last consult:', e)
  }
}

export function loadLastConsult(): PersistedConsult | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as PersistedConsult
    return parsed
  } catch {
    return null
  }
}

export function clearLastConsult() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
