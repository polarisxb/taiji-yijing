import { generateObject, streamText } from 'ai'
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
