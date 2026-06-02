'use client'

import { useState, useCallback, useRef } from 'react'

export type MatchData = {
  hexagramNumber: number
  reasoning: string
  confidence: 'high' | 'medium' | 'low'
  yaoPosition: number
  yaoConfidence: 'high' | 'medium' | 'low'
  yaoBrief: string
  runners: number[]
}

type State = {
  loading: boolean
  matchData: MatchData | null
  interpretation: string
  error: string | null
  done: boolean
}

export function useStreamingConsult() {
  const [state, setState] = useState<State>({
    loading: false,
    matchData: null,
    interpretation: '',
    error: null,
    done: false,
  })
  const abortRef = useRef<AbortController | null>(null)

  const submit = useCallback(async (situation: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState({ loading: true, matchData: null, interpretation: '', error: null, done: false })

    try {
      const res = await fetch('/api/consult-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situation }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? `请求失败：${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('无法读取响应流')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const json = JSON.parse(line.slice(6))

          if (json.type === 'match') {
            setState((s) => ({ ...s, loading: false, matchData: json.data }))
          } else if (json.type === 'interpretation') {
            setState((s) => ({ ...s, interpretation: s.interpretation + json.delta }))
          } else if (json.type === 'done') {
            setState((s) => ({ ...s, done: true }))
          }
        }
      }

      // Stream closed; reset loading + ensure done so empty-result path is reachable
      setState((s) => ({ ...s, loading: false, done: true }))
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : '未知错误',
        done: true,
      }))
    }
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setState((s) => ({ ...s, loading: false, done: true }))
  }, [])

  /**
   * 从持久化数据恢复结果（用于返回首页后恢复上一次问卦）
   */
  const restoreResult = useCallback((data: { matchData: MatchData; interpretation: string }) => {
    setState({
      loading: false,
      matchData: data.matchData,
      interpretation: data.interpretation,
      error: null,
      done: true,
    })
  }, [])

  return { ...state, submit, cancel, restoreResult }
}
