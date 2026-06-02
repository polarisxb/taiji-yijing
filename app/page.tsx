'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MatchCard } from '@/components/MatchCard'
import { TaijiSymbol } from '@/components/TaijiSymbol'
import { Atmosphere } from '@/components/Atmosphere'
import { DivinationLoader } from '@/components/DivinationLoader'
import { InlineErrorState } from '@/components/InlineErrorState'
import { AiResultCard } from '@/components/AiResultCard'
import { HistoryNavLink } from '@/components/zheng/HistoryNavLink'
import { useStreamingConsult } from '@/hooks/useStreamingConsult'
import type { MatchData } from '@/hooks/useStreamingConsult'
import { findHexagramByNumber } from '@/lib/hexagram-utils'
import { saveLastConsult, loadLastConsult, clearLastConsult } from '@/lib/persist-consult'
import { encodeResultToSearchParams, decodeResultFromSearchParams } from '@/lib/result-url'
import type { ResultUrlState } from '@/lib/result-url'
import type { ConsultResponse } from '@/lib/types'
import type { PersistedConsult } from '@/lib/persist-consult'

const SAMPLE_SITUATIONS = [
  {
    label: '考虑辞职创业',
    text: '我在大厂工作了 5 年，最近想辞职出来创业。手里有一些积蓄但不多，方向也还没完全想清楚。每天上班都觉得在浪费时间，但真要走又怕做错决定。',
  },
  {
    label: '公司刚拿到种子轮',
    text: '我们公司刚拿到种子轮融资，团队就 4 个人。投资人和身边的人都鼓励我快速扩张、招大量员工、做更多产品线。但我直觉团队和产品都还没准备好。',
  },
  {
    label: '和合伙人闹分歧',
    text: '我和合伙人在产品方向上吵了很久，他要做 to B，我坚持 to C。最近两次会议都不欢而散，我开始怀疑这个合作还能不能继续。',
  },
  {
    label: '被推上高位',
    text: '公司刚提我做总监，下面带 30 个人。但我自己其实更喜欢做事而不是管人，担心自己在这个位置会失去原本的优势。',
  },
]

// 跨设备打开分享链接、本地无缓存时，仅凭 URL 字段重建的降级结果（reasoning/yaoBrief 留空）
function degradedMatchData(state: ResultUrlState): MatchData {
  return {
    hexagramNumber: state.hexagramNumber,
    reasoning: '',
    confidence: state.confidence,
    yaoPosition: state.yaoPosition,
    yaoConfidence: state.confidence,
    yaoBrief: '',
    runners: [],
  }
}

export default function Home() {
  const [situation, setSituation] = useState('')
  const [mode, setMode] = useState<'classic' | 'ai'>('ai')

  // Classic mode state
  const [classicLoading, setClassicLoading] = useState(false)
  const [classicResult, setClassicResult] = useState<ConsultResponse | null>(null)
  const [classicError, setClassicError] = useState<string | null>(null)

  // AI mode state
  const ai = useStreamingConsult()
  const aiHexagram = ai.matchData ? findHexagramByNumber(ai.matchData.hexagramNumber) : null

  // 恢复上次结果
  function handleRestoreLastConsult() {
    if (!persistedConsult) return

    setSituation(persistedConsult.situation)
    setMode('ai')
    ai.restoreResult({
      matchData: persistedConsult.matchData,
      interpretation: persistedConsult.interpretation,
    })

    setShowRestoreBanner(false)
  }

  function handleClearPersistedConsult() {
    clearLastConsult()
    setPersistedConsult(null)
    setShowRestoreBanner(false)
  }

  // 上次结果恢复（localStorage）
  const [persistedConsult, setPersistedConsult] = useState<PersistedConsult | null>(null)
  const [showRestoreBanner, setShowRestoreBanner] = useState(false)

  // 页面加载时恢复结果：URL 优先，localStorage 降级
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlState = decodeResultFromSearchParams(params)

    if (urlState) {
      // URL 命中：尝试用 localStorage 补齐完整结果（同设备），否则走降级视图（跨设备）
      const saved = loadLastConsult()
      setMode('ai')

      if (
        saved &&
        encodeResultToSearchParams({
          situation: saved.situation,
          hexagramNumber: saved.matchData.hexagramNumber,
          yaoPosition: saved.matchData.yaoPosition,
          confidence: saved.matchData.confidence,
        }).get('hash') === urlState.situationHash
      ) {
        setSituation(saved.situation)
        ai.restoreResult({ matchData: saved.matchData, interpretation: saved.interpretation })
      } else {
        if (urlState.situation) setSituation(urlState.situation)
        ai.restoreResult({ matchData: degradedMatchData(urlState), interpretation: '' })
      }
      return // URL 优先，不显示 localStorage 提示条
    }

    // URL 无有效状态 → 回退到 localStorage 提示条
    const saved = loadLastConsult()
    if (saved) {
      setPersistedConsult(saved)
      setShowRestoreBanner(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- mount-only URL/local hydration; restoreResult stable via useCallback

  // AI 结果完成后：持久化到 localStorage + 将状态写入 URL（replace，不新增历史记录）
  useEffect(() => {
    if (mode === 'ai' && ai.done && ai.matchData && ai.interpretation) {
      saveLastConsult({
        situation,
        matchData: ai.matchData,
        interpretation: ai.interpretation,
      })
      const qs = encodeResultToSearchParams({
        situation,
        hexagramNumber: ai.matchData.hexagramNumber,
        yaoPosition: ai.matchData.yaoPosition,
        confidence: ai.matchData.confidence,
      }).toString()
      window.history.replaceState(null, '', `${window.location.pathname}?${qs}`)
    }
  }, [mode, ai.done, ai.matchData, ai.interpretation, situation])

  async function handleClassicSubmit() {
    if (!situation.trim()) return
    setClassicLoading(true)
    setClassicError(null)
    setClassicResult(null)
    try {
      const res = await fetch('/api/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situation: situation.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? `请求失败：${res.status}`)
      }
      const data = (await res.json()) as ConsultResponse
      setClassicResult(data)
    } catch (e) {
      setClassicError(e instanceof Error ? e.message : '未知错误')
    } finally {
      setClassicLoading(false)
    }
  }

  function handleSubmit() {
    if (!situation.trim()) return

    // 开始新的一次问卦时，清除旧的持久化结果与 URL 状态
    clearLastConsult()
    setPersistedConsult(null)
    setShowRestoreBanner(false)
    window.history.replaceState(null, '', window.location.pathname)

    if (mode === 'ai') {
      ai.submit(situation.trim())
    } else {
      handleClassicSubmit()
    }
  }

  const loading = mode === 'ai' ? ai.loading : classicLoading
  const error = mode === 'ai' ? ai.error : classicError

  return (
    <>
      <Atmosphere />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-16 md:py-24">
        {/* ——— Header — 编排入场序列 ——— */}
        <header className="mb-24 text-center">
          <div className="inline-flex flex-col items-center">
            {/* 太极图 — 第 1 层，0s */}
            <div style={{ animation: 'fadeUp 1s cubic-bezier(0.16,1,0.3,1) 0s both' }}>
              <TaijiSymbol size={110} className="mb-10" />
            </div>

            {/* 标题 — 第 2 层，0.3s */}
            <h1
              className="font-serif text-7xl md:text-9xl font-black text-[var(--color-ink-900)] leading-none tracking-widest"
              style={{ animation: 'titleReveal 1.2s cubic-bezier(0.16,1,0.3,1) 0.3s both' }}
            >
              太極
            </h1>

            {/* 副标题 — 第 3 层，0.6s */}
            <div
              className="mt-5 text-xs tracking-[0.6em] text-[var(--color-ink-400)] font-serif"
              style={{ animation: 'fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.6s both' }}
            >
              易 经 决 策 框 架
            </div>

            {/* 古典分割线 — 第 4 层，0.9s */}
            <div
              className="divider-classical w-72 mt-8"
              style={{ animation: 'fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.9s both' }}
            >
              <span className="font-serif">☰ ☷</span>
            </div>
          </div>

          {/* 引言 — 第 5 层，1.1s */}
          <p
            className="mt-10 text-[var(--color-ink-600)] max-w-md mx-auto leading-[2] font-serif text-base"
            style={{ animation: 'fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 1.1s both' }}
          >
            以 <span className="text-[var(--color-vermillion)] font-semibold">六十四卦</span>{' '}
            为情境原型
            <br />取<span className="text-[var(--color-ink-900)] font-semibold">义理</span>而非占卜
            <br />
            <span className="text-[var(--color-ink-400)] text-sm">
              述你所处之局，观三千年决策智慧如何解之
            </span>
          </p>

          {/* 发现入口 — 提升「履」和卦象浏览的可见性 */}
          <div
            className="mt-6 flex justify-center gap-3"
            style={{ animation: 'fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 1.25s both' }}
          >
            <HistoryNavLink />
            <Link
              href="/hexagrams"
              className="inline-flex items-center gap-1.5 text-sm font-serif text-[var(--color-ink-600)] hover:text-[var(--color-vermillion)] transition-colors border border-[var(--color-ink-200)] px-3 py-1 rounded hover:border-[var(--color-vermillion)]"
            >
              六十四卦
            </Link>
          </div>
        </header>

        {/* ——— Input ——— */}
        <section
          className="mb-16"
          style={{ animation: 'fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 1.4s both' }}
        >
          <div className="card-classical rounded-lg corner-ornament input-glow transition-shadow duration-300">
            <div className="p-1">
              <div className="relative">
                <textarea
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  placeholder={
                    '述你之局，越详则越准。\n\n例：我在大厂工作五年，想辞职创业。积蓄不多，方向未明。\n日日上班如虚度，然真要走又恐决策有误。'
                  }
                  rows={7}
                  className="w-full p-6 bg-transparent resize-none outline-none text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-400)] placeholder:font-serif leading-loose font-serif text-base transition-colors duration-200"
                  maxLength={2000}
                  style={{ boxShadow: 'inset 0 2px 8px rgba(26,22,16,0.03)' }}
                />
                <div className="absolute bottom-0 left-4 right-4 h-6 pointer-events-none bg-gradient-to-t from-[var(--color-paper-light)] to-transparent" />
              </div>
              <div className="flex items-center justify-between px-6 pb-5 pt-2 border-t border-[var(--color-ink-100)]">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--color-ink-400)] font-mono tabular-nums">
                    {situation.length} / 2000
                  </span>
                  {situation.length > 0 && (
                    <div className="h-1 w-16 bg-[var(--color-ink-100)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min((situation.length / 2000) * 100, 100)}%`,
                          background:
                            situation.length > 100 ? 'var(--color-gold)' : 'var(--color-ink-400)',
                        }}
                      />
                    </div>
                  )}
                  <div className="relative flex items-center gap-0 ml-3 rounded-full bg-[var(--color-ink-100)] p-[2px]">
                    <div
                      className="absolute top-[2px] bottom-[2px] rounded-full transition-all duration-300 ease-out"
                      style={{
                        left: mode === 'ai' ? '2px' : '50%',
                        width: 'calc(50% - 2px)',
                        background:
                          mode === 'ai' ? 'var(--color-vermillion)' : 'var(--color-ink-700)',
                      }}
                    />
                    <button
                      onClick={() => setMode('ai')}
                      className={`relative z-10 text-[10px] px-3 py-1 rounded-full font-serif transition-colors duration-200 ${mode === 'ai' ? 'text-white' : 'text-[var(--color-ink-500)]'}`}
                    >
                      AI
                    </button>
                    <button
                      onClick={() => setMode('classic')}
                      className={`relative z-10 text-[10px] px-3 py-1 rounded-full font-serif transition-colors duration-200 ${mode === 'classic' ? 'text-white' : 'text-[var(--color-ink-500)]'}`}
                    >
                      经典
                    </button>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    handleSubmit()
                    // 墨水涟漪
                    const btn = e.currentTarget
                    const rect = btn.getBoundingClientRect()
                    const x = e.clientX - rect.left
                    const y = e.clientY - rect.top
                    const ripple = document.createElement('span')
                    ripple.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:0;height:0;border-radius:50%;background:rgba(245,240,232,0.2);transform:translate(-50%,-50%);pointer-events:none;animation:ink-ripple 0.6s ease-out forwards;`
                    btn.style.position = 'relative'
                    btn.style.overflow = 'hidden'
                    btn.appendChild(ripple)
                    setTimeout(() => ripple.remove(), 700)
                  }}
                  disabled={loading || !situation.trim()}
                  className="btn-classical inline-flex items-center gap-3 px-8 py-3 rounded disabled:opacity-40 disabled:cursor-not-allowed text-sm font-serif tracking-widest group"
                >
                  <span className="text-xl leading-none transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3">
                    筮
                  </span>
                  <span>问卦</span>
                </button>
              </div>
            </div>
          </div>

          {/* 示例 */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-xs text-[var(--color-ink-400)] font-serif py-1.5">
              试以此局问之 ——
            </span>
            {SAMPLE_SITUATIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => setSituation(s.text)}
                className="text-xs px-4 py-2 border border-[var(--color-ink-200)] rounded hover:border-[var(--color-vermillion)] hover:text-[var(--color-vermillion)] hover:shadow-[0_0_12px_rgba(196,80,58,0.1)] text-[var(--color-ink-600)] transition-all duration-200 font-serif active:scale-95"
                style={{
                  animation: `fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) ${1.6 + i * 0.08}s both`,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        {/* ——— 恢复上次结果提示条 ——— */}
        {showRestoreBanner && persistedConsult && !ai.matchData && !loading && (
          <div className="mb-8 p-4 border border-[var(--color-ink-200)] rounded flex flex-col sm:flex-row sm:items-center gap-3 bg-[var(--color-paper-light)] animate-fade-up">
            <div className="flex-1 text-sm font-serif text-[var(--color-ink-600)]">
              检测到你上次的问卦结果（{new Date(persistedConsult.savedAt).toLocaleDateString()}）
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRestoreLastConsult}
                className="text-sm font-serif px-4 py-1.5 border border-[var(--color-vermillion)] text-[var(--color-vermillion)] rounded hover:bg-[var(--color-vermillion)] hover:text-white transition-colors"
              >
                恢复结果
              </button>
              <button
                onClick={handleClearPersistedConsult}
                className="text-sm font-serif px-4 py-1.5 text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)] transition-colors"
              >
                清除
              </button>
            </div>
          </div>
        )}

        {/* ——— Loading ——— */}
        {loading && (
          <div className="space-y-4">
            <DivinationLoader variant={mode} />
            {mode === 'ai' && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => ai.cancel()}
                  className="text-xs font-serif text-[var(--color-ink-400)] hover:text-[var(--color-vermillion)] transition-colors underline underline-offset-4"
                >
                  取消
                </button>
              </div>
            )}
          </div>
        )}

        {/* ——— Error ——— */}
        {error && !loading && (
          <div className="mb-8 animate-fade-up">
            <InlineErrorState
              message={
                mode === 'ai' ? `AI 暂时被打断了 · ${error}。重试一下，或者补几句再问。` : error
              }
              onRetry={situation.trim() ? handleSubmit : undefined}
            />
          </div>
        )}

        {/* ——— AI Empty Result ——— */}
        {mode === 'ai' && ai.done && !ai.matchData && !ai.error && !ai.loading && (
          <div className="mb-8 p-6 border border-[var(--color-ink-200)] rounded bg-[var(--color-paper-light)] text-center text-sm font-serif text-[var(--color-ink-600)] leading-relaxed animate-fade-up">
            <p>看了你的局，AI 暂时未能定下一卦。</p>
            <p className="mt-2 text-xs text-[var(--color-ink-400)]">
              试着补几句——你的角色 / 当前最关心什么 / 已经做过什么——AI 会更懂你。
            </p>
          </div>
        )}

        {/* ——— AI Results ——— */}
        {mode === 'ai' && ai.matchData && aiHexagram && (
          <section>
            <div
              className="divider-classical divider-animated mb-4"
              style={{ animation: 'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0s both' }}
            >
              <span className="font-serif">卦 · 象 · 辞</span>
            </div>

            <p
              className="text-center text-[10px] tracking-[0.3em] text-[var(--color-ink-400)] font-serif mb-8"
              style={{ animation: 'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both' }}
            >
              以情境取象 · 由你的局直入义理脉络
            </p>

            <AiResultCard
              hexagram={aiHexagram}
              matchData={ai.matchData}
              interpretation={ai.interpretation}
              done={ai.done}
              situation={situation}
            />
          </section>
        )}

        {/* ——— Classic Results ——— */}
        {mode === 'classic' && classicResult && (
          <section>
            <div className="divider-classical mb-4 animate-fade-up">
              <span className="font-serif">卦 · 象 · 辞</span>
            </div>

            <p className="text-center text-[10px] tracking-[0.3em] text-[var(--color-ink-400)] font-serif mb-8 animate-fade-up">
              以结构定象 · 由 64 卦原型与你的局相参
            </p>

            <header className="flex items-baseline justify-between mb-8 animate-fade-up">
              <h2 className="font-serif text-3xl text-[var(--color-ink-900)] tracking-wider">
                三卦应之
              </h2>
              <span className="text-xs text-[var(--color-ink-400)] font-serif">展之以观全释</span>
            </header>

            {(Object.keys(classicResult.extractedFeatures).length > 0 ||
              classicResult.extractedKeywords.length > 0) && (
              <details
                open
                className="text-xs text-[var(--color-ink-400)] bg-[var(--color-paper-light)] border border-[var(--color-ink-100)] rounded p-4 mb-8 animate-fade-up"
              >
                <summary className="cursor-pointer hover:text-[var(--color-ink-600)] font-serif tracking-wide">
                  观系统所取之象
                </summary>
                <div className="mt-3 space-y-2">
                  {Object.keys(classicResult.extractedFeatures).length > 0 && (
                    <div>
                      <span className="font-medium font-serif">情境之象：</span>
                      {Object.entries(classicResult.extractedFeatures).map(([k, v]) => (
                        <code
                          key={k}
                          className="ml-2 px-2 py-1 bg-[var(--color-paper)] rounded text-[var(--color-ink-600)]"
                        >
                          {k}＝{String(v)}
                        </code>
                      ))}
                    </div>
                  )}
                  {classicResult.extractedKeywords.length > 0 && (
                    <div>
                      <span className="font-medium font-serif">关键之词：</span>
                      {classicResult.extractedKeywords.map((kw, i) => (
                        <code
                          key={i}
                          className="ml-2 px-2 py-1 bg-[var(--color-paper)] rounded text-[var(--color-ink-600)]"
                        >
                          {kw}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="space-y-6">
              {classicResult.matches.map((m, i) => (
                <div key={m.hexagram.number} className={`animate-stagger-${i + 1}`}>
                  <MatchCard
                    match={m}
                    rank={i + 1}
                    situation={i === 0 ? situation.trim() : undefined}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ——— Footer ——— */}
        <footer className="mt-32 text-center">
          {/* 水墨晕染分割 */}
          <div className="relative mb-12">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-[var(--color-ink-200)] to-transparent" />
            </div>
            <div className="relative flex justify-center">
              <div className="bg-[var(--color-paper)] px-6">
                <span className="font-serif text-lg text-[var(--color-ink-300)]">☯</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <p className="font-serif text-[var(--color-ink-600)] text-sm">
              <span className="seal">义理派</span>
            </p>
            <p className="font-serif text-[var(--color-ink-400)] text-xs leading-[2.2] max-w-sm mx-auto">
              易者，象也
              <br />
              六十四卦，六十四种情境之象
              <br />
              此器不卜未来，唯识当下
              <br />
              同输入恒得同输出，确定而可验
            </p>

            {/* 古典尾注 */}
            <div className="pt-6 pb-4 space-y-3">
              <div className="flex items-center justify-center gap-4">
                <span className="w-12 h-px bg-gradient-to-r from-transparent to-[var(--color-ink-200)]" />
                <span className="text-[var(--color-ink-300)] font-mono text-[10px] tracking-[0.3em]">
                  v0.1 · 3/64
                </span>
                <span className="w-12 h-px bg-gradient-to-l from-transparent to-[var(--color-ink-200)]" />
              </div>
              <p className="text-[var(--color-ink-300)] text-[10px] font-serif tracking-wide">
                以义解经 · 以象观变 · 以诚待人
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
