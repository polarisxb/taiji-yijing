/**
 * 匹配引擎 — 把情境映射到卦象
 *
 * 算法：
 *   score = 0.45 * keywordOverlap + 0.40 * featureMatch + 0.15 * appliesWhenSemantic
 *
 * 设计原则：
 * - 确定性：同样输入 → 同样输出。不引入随机性
 * - 可解释：每个分数都附带 reasoning
 * - 部分容错：用户描述里抽不到的特征不扣分，只在能匹配时加分
 */

import type {
  ConsultRequest,
  ConsultResponse,
  Hexagram,
  MatchResult,
  MatchScore,
  SituationDimension,
} from './types'
import { ALL_HEXAGRAMS } from '@/content/hexagrams'
import { extractFeatures } from './feature-extractor'

// ============================================================
// 关键词匹配
// ============================================================

function computeKeywordScore(
  hexagram: Hexagram,
  userInput: string,
  extractedKeywords: string[],
): { score: number; matched: string[] } {
  const matched: string[] = []

  // 直接匹配卦的 keywords
  for (const kw of hexagram.keywords) {
    if (userInput.includes(kw)) {
      matched.push(kw)
    }
  }

  // 匹配主题
  for (const theme of hexagram.themes) {
    if (userInput.includes(theme)) {
      matched.push(theme)
    }
  }

  // 抽取出的关键词在卦的 keywords / themes 中是否能找到子串关系
  for (const ek of extractedKeywords) {
    for (const kw of hexagram.keywords) {
      if ((kw.includes(ek) || ek.includes(kw)) && !matched.includes(kw) && kw !== ek) {
        matched.push(`${ek}≈${kw}`)
      }
    }
  }

  // 归一化：根据 keyword 池大小做 log 衰减
  const poolSize = hexagram.keywords.length + hexagram.themes.length
  const score = Math.min(1, matched.length / Math.max(3, Math.log2(poolSize + 1) * 1.5))

  return { score, matched }
}

// ============================================================
// 特征匹配
// ============================================================

const FEATURE_WEIGHTS: Record<keyof SituationDimension, number> = {
  archetype: 3, // 最重要：情境类型必须对
  phase: 2,
  agency: 1.5,
  scale: 1,
  power: 1,
  risk: 0.5,
}

function computeFeatureScore(
  hexagram: Hexagram,
  extractedFeatures: Partial<SituationDimension>,
): { score: number; matched: string[]; missed: string[] } {
  const matched: string[] = []
  const missed: string[] = []
  let totalWeight = 0
  let scored = 0

  for (const key of Object.keys(FEATURE_WEIGHTS) as (keyof SituationDimension)[]) {
    const userValue = extractedFeatures[key]
    if (userValue === undefined) continue // 用户没表达，不参与计分

    const weight = FEATURE_WEIGHTS[key]
    totalWeight += weight

    if (hexagram.features[key] === userValue) {
      scored += weight
      matched.push(`${key}:${userValue}`)
    } else {
      missed.push(`${key}:用户=${userValue} vs 卦=${hexagram.features[key]}`)
    }
  }

  const score = totalWeight > 0 ? scored / totalWeight : 0
  return { score, matched, missed }
}

// ============================================================
// appliesWhen 语义模糊匹配（基于字符 n-gram 重叠）
// ============================================================

function bigrams(s: string): Set<string> {
  const out = new Set<string>()
  for (let i = 0; i < s.length - 1; i++) {
    out.add(s.slice(i, i + 2))
  }
  return out
}

function jaccardOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

function computeAppliesWhenScore(
  hexagram: Hexagram,
  userInput: string,
): { score: number; bestMatch?: string } {
  const userGrams = bigrams(userInput)
  let best = 0
  let bestText: string | undefined
  for (const aw of hexagram.appliesWhen) {
    const sim = jaccardOverlap(userGrams, bigrams(aw))
    if (sim > best) {
      best = sim
      bestText = aw
    }
  }
  return { score: best, bestMatch: bestText }
}

// ============================================================
// 主匹配函数
// ============================================================

const W_KEYWORD = 0.45
const W_FEATURE = 0.4
const W_SEMANTIC = 0.15

export function matchHexagrams(request: ConsultRequest, topN = 3): ConsultResponse {
  const { situation } = request
  const extracted = extractFeatures(situation)
  const features = { ...extracted.features, ...request.features }

  const results: MatchResult[] = ALL_HEXAGRAMS.map((hexagram) => {
    const kw = computeKeywordScore(hexagram, situation, extracted.keywords)
    const fe = computeFeatureScore(hexagram, features)
    const sem = computeAppliesWhenScore(hexagram, situation)

    const total = W_KEYWORD * kw.score + W_FEATURE * fe.score + W_SEMANTIC * sem.score

    const score: MatchScore = {
      total,
      keyword: kw.score,
      feature: fe.score,
      theme: sem.score,
    }

    const reasoning: string[] = []
    if (kw.matched.length > 0) {
      reasoning.push(`关键词命中：${kw.matched.slice(0, 4).join('、')}`)
    }
    if (fe.matched.length > 0) {
      reasoning.push(`情境特征匹配：${fe.matched.join('、')}`)
    }
    if (sem.bestMatch && sem.score > 0.1) {
      reasoning.push(`语义最贴近："${sem.bestMatch}"`)
    }
    if (reasoning.length === 0) {
      reasoning.push('未命中明显信号，仅作为候选')
    }

    return { hexagram, score, reasoning }
  })

  // 排序 + 截取
  results.sort((a, b) => b.score.total - a.score.total)
  const top = results.slice(0, topN)

  return {
    matches: top,
    extractedFeatures: features,
    extractedKeywords: extracted.keywords,
  }
}
