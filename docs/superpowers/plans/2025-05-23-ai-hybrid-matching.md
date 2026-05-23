# AI 混合匹配系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将纯规则匹配升级为 Embedding 粗筛 + LLM CoT 精判 + 爻位定位 + 个性化解读的混合 AI 架构。

**Architecture:** 5 个串联模块：LLM 特征抽取 → Embedding 粗筛（卦 ≥ 20 时启用）→ LLM CoT 精判 → LLM 爻位定位 → LLM 个性化解读。所有 LLM 调用走 DeepSeek API，通过 Vercel AI SDK 6 集成，流式输出到前端。

**Tech Stack:** Next.js 15, Vercel AI SDK 6 (`ai`, `@ai-sdk/deepseek`), Zod, DeepSeek Chat + Embedding API

---

## File Structure

| 文件                                              | 职责                                 |
| ------------------------------------------------- | ------------------------------------ |
| **Create:** `lib/ai/deepseek.ts`                  | DeepSeek provider 配置               |
| **Create:** `lib/ai/schemas.ts`                   | Zod schemas（特征、精判、爻位输出）  |
| **Create:** `lib/ai/prompts.ts`                   | System prompts（5 个模块）           |
| **Create:** `lib/ai/embedding.ts`                 | Embedding 预计算 + cosine similarity |
| **Create:** `lib/ai/consult-agent.ts`             | Agent 主流程编排                     |
| **Create:** `app/api/consult-ai/route.ts`         | 流式 API 端点                        |
| **Create:** `components/ReasoningPanel.tsx`       | 可折叠推理面板                       |
| **Create:** `components/StreamingText.tsx`        | 流式打字机渲染                       |
| **Create:** `hooks/useStreamingConsult.ts`        | SSE 流式 hook                        |
| **Create:** `__tests__/ai-schemas.test.ts`        | Schema 单元测试                      |
| **Create:** `__tests__/ai-embedding.test.ts`      | Embedding 工具测试                   |
| **Modify:** `app/page.tsx`                        | 切换到 AI 问卦流程                   |
| **Modify:** `components/MatchCard.tsx`            | 加推理折叠区                         |
| **Modify:** `components/hexagram/YaoTimeline.tsx` | 加置信度标签                         |
| **Create:** `.env.local`                          | DeepSeek API Key                     |

---

### Task 1: 安装依赖 + 环境变量

**Files:**

- Modify: `package.json`
- Create: `.env.local`
- Create: `.env.example`

- [ ] **Step 1: 安装 AI SDK + DeepSeek provider**

```bash
npm install ai @ai-sdk/deepseek zod
```

- [ ] **Step 2: 创建 `.env.example`**

```
# DeepSeek API Key — 注册 https://platform.deepseek.com
DEEPSEEK_API_KEY=your_key_here
```

- [ ] **Step 3: 创建 `.env.local`（用户填入真实 Key）**

```
DEEPSEEK_API_KEY=sk-xxx
```

- [ ] **Step 4: 确认 `.env.local` 在 `.gitignore` 中**

Run: `findstr ".env.local" .gitignore`
Expected: 能找到 `.env.local`

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: add ai sdk + deepseek dependencies"
```

---

### Task 2: DeepSeek Provider 配置

**Files:**

- Create: `lib/ai/deepseek.ts`

- [ ] **Step 1: 创建 provider 配置**

```typescript
// lib/ai/deepseek.ts
import { createDeepSeek } from '@ai-sdk/deepseek'

export const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
})

export const chatModel = deepseek('deepseek-chat')
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/ai/deepseek.ts
git commit -m "feat: add DeepSeek provider config"
```

---

### Task 3: Zod Schemas

**Files:**

- Create: `lib/ai/schemas.ts`
- Create: `__tests__/ai-schemas.test.ts`

- [ ] **Step 1: 写 schema 测试**

```typescript
// __tests__/ai-schemas.test.ts
import { describe, it, expect } from 'vitest'
import { situationFeaturesSchema, cotJudgmentSchema, yaoPositioningSchema } from '@/lib/ai/schemas'

describe('situationFeaturesSchema', () => {
  it('parses valid features', () => {
    const result = situationFeaturesSchema.safeParse({
      archetype: 'creating',
      phase: 'germinal',
      scale: 'personal',
      power: 'disadvantaged',
      agency: 'active',
      risk: 'moderate',
    })
    expect(result.success).toBe(true)
  })

  it('allows partial features', () => {
    const result = situationFeaturesSchema.safeParse({
      phase: 'emerging',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid enum values', () => {
    const result = situationFeaturesSchema.safeParse({
      phase: 'nonexistent',
    })
    expect(result.success).toBe(false)
  })
})

describe('cotJudgmentSchema', () => {
  it('parses valid judgment', () => {
    const result = cotJudgmentSchema.safeParse({
      selectedNumber: 3,
      reasoning: '用户处于创业初期...',
      confidence: 'high',
      runners: [1, 2],
    })
    expect(result.success).toBe(true)
  })
})

describe('yaoPositioningSchema', () => {
  it('parses valid positioning', () => {
    const result = yaoPositioningSchema.safeParse({
      yaoPosition: 4,
      confidence: 'medium',
      brief: '你正处于寻求合作的阶段',
    })
    expect(result.success).toBe(true)
  })

  it('rejects yaoPosition out of range', () => {
    const result = yaoPositioningSchema.safeParse({
      yaoPosition: 7,
      confidence: 'high',
      brief: 'test',
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — 确认失败**

Run: `npx vitest run __tests__/ai-schemas.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 schemas**

```typescript
// lib/ai/schemas.ts
import { z } from 'zod'

export const situationFeaturesSchema = z.object({
  archetype: z
    .enum([
      'creating',
      'sustaining',
      'transforming',
      'dissolving',
      'waiting',
      'advancing',
      'retreating',
      'conflicting',
      'uniting',
      'separating',
      'learning',
      'leading',
    ])
    .optional(),
  phase: z.enum(['germinal', 'emerging', 'developing', 'peak', 'declining', 'ending']).optional(),
  scale: z.enum(['personal', 'interpersonal', 'team', 'organizational', 'societal']).optional(),
  power: z.enum(['dominant', 'advantaged', 'balanced', 'disadvantaged', 'subordinate']).optional(),
  agency: z.enum(['active', 'responsive', 'patient', 'submissive']).optional(),
  risk: z.enum(['low', 'moderate', 'high', 'existential']).optional(),
})

export const cotJudgmentSchema = z.object({
  selectedNumber: z.number().int().min(1).max(64),
  reasoning: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  runners: z.array(z.number().int().min(1).max(64)),
})

export const yaoPositioningSchema = z.object({
  yaoPosition: z.number().int().min(1).max(6),
  confidence: z.enum(['high', 'medium', 'low']),
  brief: z.string(),
})
```

- [ ] **Step 4: Run test — 确认通过**

Run: `npx vitest run __tests__/ai-schemas.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/ai/schemas.ts __tests__/ai-schemas.test.ts
git commit -m "feat: add Zod schemas for AI structured output"
```

---

### Task 4: System Prompts

**Files:**

- Create: `lib/ai/prompts.ts`

- [ ] **Step 1: 创建 prompt 文件**

```typescript
// lib/ai/prompts.ts
import type { Hexagram } from '@/lib/types'

export const FEATURE_EXTRACTION_PROMPT = `你是一位情境分析专家。用户会描述一个他正面临的情境。

请从中提取以下维度（只输出有把握的，不确定就省略）：
- archetype: 情境基本类型
- phase: 所处阶段
- scale: 规模
- power: 力量对比
- agency: 应对方式
- risk: 风险等级

规则：
1. 只根据用户原文推断，不要添加假设
2. 不做占卜或预测
3. 用枚举值回答，不要用自由文本`

export function buildCoTPrompt(candidates: Hexagram[]): string {
  const hexList = candidates
    .map((h) => {
      const applies = h.appliesWhen.join('；')
      return `### ${h.number}. ${h.name.chinese}（${h.name.pinyin}）
卦辞释读：${h.judgment.modernReading}
适用情境：${applies}
反模式：${h.antiPatterns.join('；')}`
    })
    .join('\n\n')

  return `你是一位义理派易经学者。不做占卜，只做情境模式匹配。

请按以下步骤分析用户情境：
1. 用户的核心困境是什么？（底层矛盾，非表面问题）
2. 这个困境的结构特征（阶段、力量对比、变化方向）
3. 逐一分析每个候选卦与用户情境的吻合度
4. 给出最终判断

候选卦：
${hexList}

规则：
- 推理过程要详细，让用户能理解「为什么是这一卦」
- 用中文回答
- 不要使用感叹号，语气克制`
}

export function buildYaoPrompt(hexagram: Hexagram): string {
  const yaoList = hexagram.yao
    .map((y) => {
      const indicators = y.indicators.join('；')
      return `${y.name}：${y.text}
  释读：${y.modernReading}
  处此爻的表现：${indicators}`
    })
    .join('\n')

  return `你是一位义理派易经学者。用户已匹配到「${hexagram.name.chinese}」卦。

请根据用户的情境描述，判断他最可能处于以下哪一爻的阶段：

${yaoList}

规则：
1. 重点看每一爻的「处此爻的表现」，与用户描述对比
2. 给出 1-6 的爻位编号
3. 给出置信度（high/medium/low）
4. 用一句话解释为什么是这一爻
5. 不做占卜预测`
}

export function buildInterpretationPrompt(hexagram: Hexagram, yaoPosition: number): string {
  const yao = hexagram.yao.find((y) => y.position === yaoPosition)
  return `你是一位义理派易经学者。用户匹配到「${hexagram.name.chinese}」卦，第${yaoPosition}爻（${yao?.name}）。

以下是编辑团队审核的内容：

卦辞：${hexagram.judgment.text}
卦辞释读：${hexagram.judgment.modernReading}
象传：${hexagram.image.text}
象传释读：${hexagram.image.modernReading}

当前爻辞：${yao?.text}
当前爻释读：${yao?.modernReading}
典型场景：${yao?.scenario}
可行之策：${yao?.actionable.join('；')}

规则（分层约束）：
1. 🔒 卦辞和象传原文必须逐字引用，不得修改
2. 🔒 义理解读只能基于以上内容润色，不得添加原文没有的解读
3. 🔓 情境映射可以结合用户的具体场景做类比延伸
4. 🔓 爻位建议可以结合用户具体场景个性化
5. 绝不做预测、占卜、算命
6. 不使用感叹号，语气克制
7. 结构：先引经文，再释义，再映射用户情境，最后给建议`
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/ai/prompts.ts
git commit -m "feat: add system prompts for 5 AI modules"
```

---

### Task 5: Embedding 工具

**Files:**

- Create: `lib/ai/embedding.ts`
- Create: `__tests__/ai-embedding.test.ts`

- [ ] **Step 1: 写测试**

```typescript
// __tests__/ai-embedding.test.ts
import { describe, it, expect } from 'vitest'
import { cosineSimilarity, buildHexagramSummary } from '@/lib/ai/embedding'
import { qian } from '@/content/hexagrams'

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = [1, 2, 3]
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5)
  })

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 5)
  })
})

describe('buildHexagramSummary', () => {
  it('builds summary string for a hexagram', () => {
    const summary = buildHexagramSummary(qian)
    expect(summary).toContain('乾')
    expect(summary).toContain(qian.judgment.modernReading)
    expect(summary.length).toBeGreaterThan(50)
  })
})
```

- [ ] **Step 2: Run test — 确认失败**

Run: `npx vitest run __tests__/ai-embedding.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 embedding 工具**

```typescript
// lib/ai/embedding.ts
import { embed } from 'ai'
import { deepseek } from './deepseek'
import type { Hexagram } from '@/lib/types'

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

export function buildHexagramSummary(hex: Hexagram): string {
  const parts = [
    `${hex.name.chinese}（${hex.name.pinyin}）`,
    hex.judgment.modernReading,
    ...hex.appliesWhen,
  ]
  return parts.join('。')
}

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: deepseek.textEmbeddingModel('deepseek-chat'),
    value: text,
  })
  return embedding
}

export async function findTopCandidates(
  queryEmbedding: number[],
  hexagramEmbeddings: { number: number; embedding: number[] }[],
  topK: number = 5,
): Promise<number[]> {
  const scored = hexagramEmbeddings.map((h) => ({
    number: h.number,
    score: cosineSimilarity(queryEmbedding, h.embedding),
  }))
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK).map((s) => s.number)
}
```

- [ ] **Step 4: Run test — 确认通过**

Run: `npx vitest run __tests__/ai-embedding.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/ai/embedding.ts __tests__/ai-embedding.test.ts
git commit -m "feat: add embedding utilities with cosine similarity"
```

---

### Task 6: Agent 主流程编排

**Files:**

- Create: `lib/ai/consult-agent.ts`

- [ ] **Step 1: 实现 Agent 编排**

```typescript
// lib/ai/consult-agent.ts
import { generateObject, generateText, streamText } from 'ai'
import { chatModel } from './deepseek'
import { situationFeaturesSchema, cotJudgmentSchema, yaoPositioningSchema } from './schemas'
import {
  FEATURE_EXTRACTION_PROMPT,
  buildCoTPrompt,
  buildYaoPrompt,
  buildInterpretationPrompt,
} from './prompts'
import { matchHexagrams } from '@/lib/matcher'
import { findHexagramByNumber } from '@/lib/hexagram-utils'
import { ALL_HEXAGRAMS } from '@/content/hexagrams'
import type { Hexagram, SituationDimension } from '@/lib/types'

const EMBEDDING_THRESHOLD = 20

export type ConsultAIResult = {
  hexagram: Hexagram
  reasoning: string
  confidence: 'high' | 'medium' | 'low'
  yaoPosition: number
  yaoConfidence: 'high' | 'medium' | 'low'
  yaoBrief: string
  runners: number[]
}

// 模块 ①: LLM 特征抽取
async function extractFeatures(situation: string): Promise<Partial<SituationDimension>> {
  const { object } = await generateObject({
    model: chatModel,
    schema: situationFeaturesSchema,
    system: FEATURE_EXTRACTION_PROMPT,
    prompt: situation,
  })
  return object
}

// 模块 ②+③: 获取候选卦 + CoT 精判
async function selectHexagram(
  situation: string,
  features: Partial<SituationDimension>,
): Promise<{
  hexagram: Hexagram
  reasoning: string
  confidence: 'high' | 'medium' | 'low'
  runners: number[]
}> {
  let candidates: Hexagram[]

  if (ALL_HEXAGRAMS.length < EMBEDDING_THRESHOLD) {
    // 卦不足 20：跳过 Embedding，全量传给 LLM
    candidates = ALL_HEXAGRAMS
  } else {
    // 卦 ≥ 20：规则引擎粗筛 top 5
    const ruleResult = matchHexagrams({ situation, features }, 5)
    candidates = ruleResult.matches.map((m) => m.hexagram)
  }

  const { object } = await generateObject({
    model: chatModel,
    schema: cotJudgmentSchema,
    system: buildCoTPrompt(candidates),
    prompt: situation,
  })

  const hexagram = findHexagramByNumber(object.selectedNumber)
  if (!hexagram) {
    // fallback：选候选列表第一个
    return {
      hexagram: candidates[0],
      reasoning: object.reasoning,
      confidence: 'low',
      runners: object.runners,
    }
  }

  return {
    hexagram,
    reasoning: object.reasoning,
    confidence: object.confidence,
    runners: object.runners,
  }
}

// 模块 ④: 爻位定位
async function positionYao(
  situation: string,
  hexagram: Hexagram,
): Promise<{ yaoPosition: number; confidence: 'high' | 'medium' | 'low'; brief: string }> {
  const { object } = await generateObject({
    model: chatModel,
    schema: yaoPositioningSchema,
    system: buildYaoPrompt(hexagram),
    prompt: situation,
  })
  return object
}

// 主流程：① → ②③ → ④（非流式部分）
export async function consultAI(situation: string): Promise<ConsultAIResult> {
  // 模块 ①
  const features = await extractFeatures(situation)

  // 模块 ②③
  const { hexagram, reasoning, confidence, runners } = await selectHexagram(situation, features)

  // 模块 ④
  const { yaoPosition, confidence: yaoConfidence, brief } = await positionYao(situation, hexagram)

  return {
    hexagram,
    reasoning,
    confidence,
    yaoPosition,
    yaoConfidence,
    yaoBrief: brief,
    runners,
  }
}

// 模块 ⑤: 个性化解读（流式）
export function streamInterpretation(situation: string, hexagram: Hexagram, yaoPosition: number) {
  return streamText({
    model: chatModel,
    system: buildInterpretationPrompt(hexagram, yaoPosition),
    prompt: situation,
  })
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/ai/consult-agent.ts
git commit -m "feat: add AI consult agent with 5-module pipeline"
```

---

### Task 7: 流式 API 端点

**Files:**

- Create: `app/api/consult-ai/route.ts`

- [ ] **Step 1: 实现 API 端点**

```typescript
// app/api/consult-ai/route.ts
import { consultAI, streamInterpretation } from '@/lib/ai/consult-agent'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body.situation || typeof body.situation !== 'string') {
      return Response.json({ error: '请提供 situation 字段' }, { status: 400 })
    }
    if (body.situation.length > 2000) {
      return Response.json({ error: '情境描述不要超过 2000 字' }, { status: 400 })
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return Response.json({ error: '服务暂时不可用，请稍后重试' }, { status: 503 })
    }

    // 阶段 1：匹配 + 爻位（非流式）
    const result = await consultAI(body.situation)

    // 阶段 2：个性化解读（流式）
    const stream = streamInterpretation(body.situation, result.hexagram, result.yaoPosition)

    // 用 SSE 格式返回
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        // 先发匹配结果
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'match',
              data: {
                hexagramNumber: result.hexagram.number,
                reasoning: result.reasoning,
                confidence: result.confidence,
                yaoPosition: result.yaoPosition,
                yaoConfidence: result.yaoConfidence,
                yaoBrief: result.yaoBrief,
                runners: result.runners,
              },
            })}\n\n`,
          ),
        )

        // 流式发送解读
        try {
          const textStream = (await stream).textStream
          for await (const chunk of textStream) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'interpretation', delta: chunk })}\n\n`,
              ),
            )
          }
        } catch {
          // 解读流失败不影响匹配结果
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error'
    // DeepSeek API 错误 → 503
    if (message.includes('API') || message.includes('fetch')) {
      return Response.json({ error: '服务暂时不可用，请稍后重试' }, { status: 503 })
    }
    return Response.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/api/consult-ai/route.ts
git commit -m "feat: add streaming SSE API endpoint for AI consult"
```

---

### Task 8: 前端 Hook + 流式组件

**Files:**

- Create: `hooks/useStreamingConsult.ts`
- Create: `components/StreamingText.tsx`
- Create: `components/ReasoningPanel.tsx`

- [ ] **Step 1: 创建 SSE hook**

```typescript
// hooks/useStreamingConsult.ts
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

  return { ...state, submit, cancel }
}
```

- [ ] **Step 2: 创建 StreamingText 组件**

```typescript
// components/StreamingText.tsx
'use client'

type Props = {
  text: string
  className?: string
}

export function StreamingText({ text, className = '' }: Props) {
  if (!text) return null

  return (
    <div className={`font-serif text-[var(--color-ink-700)] leading-[2.2] text-sm whitespace-pre-wrap ${className}`}>
      {text}
      <span className="inline-block w-0.5 h-4 bg-[var(--color-vermillion)] ml-0.5 animate-pulse align-middle" />
    </div>
  )
}
```

- [ ] **Step 3: 创建 ReasoningPanel 组件**

```typescript
// components/ReasoningPanel.tsx
'use client'

import { useState } from 'react'
import { SmoothExpand } from './SmoothExpand'

type Props = {
  reasoning: string
  confidence: 'high' | 'medium' | 'low'
}

const CONFIDENCE_LABELS: Record<string, { text: string; color: string }> = {
  high: { text: '高置信', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
  medium: { text: '中置信', color: 'text-amber-700 bg-amber-50 border-amber-300' },
  low: { text: '低置信', color: 'text-red-700 bg-red-50 border-red-300' },
}

export function ReasoningPanel({ reasoning, confidence }: Props) {
  const [open, setOpen] = useState(false)
  const label = CONFIDENCE_LABELS[confidence] ?? CONFIDENCE_LABELS.medium

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)] font-serif transition-colors"
      >
        <span
          style={{
            display: 'inline-block',
            transition: 'transform 0.2s ease',
            transform: open ? 'rotate(90deg)' : 'rotate(0)',
          }}
        >
          ▸
        </span>
        <span>为什么是这一卦？</span>
        <span className={`px-1.5 py-0.5 text-[10px] border rounded ${label.color}`}>
          {label.text}
        </span>
      </button>
      <SmoothExpand open={open} duration={300}>
        <div className="mt-3 pl-4 border-l-2 border-[var(--color-ink-100)] text-sm text-[var(--color-ink-600)] font-serif leading-[2.2] whitespace-pre-wrap">
          {reasoning}
        </div>
      </SmoothExpand>
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add hooks/useStreamingConsult.ts components/StreamingText.tsx components/ReasoningPanel.tsx
git commit -m "feat: add streaming hook + UI components for AI consult"
```

---

### Task 9: 修改 YaoTimeline — 加置信度标签

**Files:**

- Modify: `components/hexagram/YaoTimeline.tsx`

- [ ] **Step 1: 添加 yaoConfidence prop + 置信度标签**

修改 Props 类型，添加 `yaoConfidence` 和 `yaoBrief`：

```typescript
type Props = {
  hexagram: Hexagram
  highlightPhase?: Phase
  highlightYao?: number
  yaoConfidence?: 'high' | 'medium' | 'low'
  yaoBrief?: string
}
```

修改组件内部，优先使用 `highlightYao`（AI 定位）而非 `highlightPhase`（URL 参数）：

```typescript
const autoIndex =
  highlightYao !== undefined ? highlightYao - 1 : (getPhaseYaoIndex(highlightPhase) ?? null)
```

在阶段高亮提示区域，如果有 AI 定位则显示置信度：

```typescript
{autoIndex !== null && (
  <div className="text-center mb-8">
    <span className="phase-indicator">
      <span>◉</span>
      系统判断你可能处于第{autoIndex + 1}爻阶段
      {yaoConfidence && (
        <span className="ml-1 opacity-70">（{yaoConfidence === 'high' ? '高' : yaoConfidence === 'medium' ? '中' : '低'}置信）</span>
      )}
    </span>
    {yaoBrief && (
      <p className="mt-2 text-xs text-[var(--color-ink-500)] font-serif">{yaoBrief}</p>
    )}
    <p className="mt-1 text-[10px] text-[var(--color-ink-400)] font-serif">
      不太对？点击其他爻位查看
    </p>
  </div>
)}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/hexagram/YaoTimeline.tsx
git commit -m "feat: add AI yao positioning with confidence to YaoTimeline"
```

---

### Task 10: 修改首页 — 接入 AI 问卦

**Files:**

- Modify: `app/page.tsx`

- [ ] **Step 1: 切换到 AI 流程**

关键改动：

1. 导入 `useStreamingConsult` 替代手动 fetch
2. 导入 `findHexagramByNumber` 查找完整卦数据
3. 匹配结果区域增加 `ReasoningPanel` 和 `StreamingText`
4. 保留现有 UI 结构，只替换数据源

修改 imports：

```typescript
import { useStreamingConsult } from '@/hooks/useStreamingConsult'
import { findHexagramByNumber } from '@/lib/hexagram-utils'
import { ReasoningPanel } from '@/components/ReasoningPanel'
import { StreamingText } from '@/components/StreamingText'
```

修改 state 和 submit：用 `useStreamingConsult` 替代手动 fetch + useState。

修改结果区域：匹配到卦后，显示匹配结果 + 推理面板 + 流式解读。

具体 UI 结构：

```
匹配结果区域：
├── 卦名 + 卦象（来自 matchData.hexagramNumber → findHexagramByNumber）
├── ReasoningPanel（折叠推理过程）
├── StreamingText（个性化解读，流式）
└── 「深入此卦」链接（带 yaoPosition 参数）
```

- [ ] **Step 2: Typecheck + Lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: integrate AI consult flow into homepage"
```

---

### Task 11: 全量验证

- [ ] **Step 1: 运行全部测试**

Run: `npm test`
Expected: 所有测试通过

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: 无新增 errors

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 5: 手动测试**

Run: `npm run dev`

验证：

1. 首页输入情境 → 出现加载 → 显示匹配卦象
2. 点击「为什么是这一卦？」→ 展开推理过程
3. 个性化解读流式渲染（打字机效果）
4. 爻位高亮正确 + 置信度标签显示
5. 点击「深入此卦」→ 跳转详情页，爻位参数传递正确

- [ ] **Step 6: Format + Commit + Push**

```bash
npm run format
git add -A
git commit -m "feat: AI hybrid matching system — Phase 2b complete"
git push origin main
```
