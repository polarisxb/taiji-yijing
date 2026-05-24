/**
 * 爻位定位器 — 把用户对 indicators 的勾选映射到 6 爻得分排名
 *
 * 设计原则：
 * - 确定性：同样输入 → 同样输出，遍历顺序固定（按 position 升序）
 * - 比例公平：用 hits/total 而非绝对 hits，避免 indicator 多的爻不公平占优
 * - 破平局：ratio 相等时取 position 较高者（后期爻通常代表更明确的当下）
 * - 跨爻识别：仅当次高 ratio ≥ top × 0.8 且 ≥ 0.3 时触发，避免"少量勾选"假阳性
 */

import type { Yao } from './types'

export type YaoScore = {
  position: 1 | 2 | 3 | 4 | 5 | 6
  yaoName: string
  hits: number
  total: number
  /** hits / total，0-1；total 为 0 时返回 0 */
  ratio: number
}

export type LocatorResult = {
  /** 按 position 升序（1→6），便于按时间线渲染 */
  scores: YaoScore[]
  topPosition: 1 | 2 | 3 | 4 | 5 | 6
  topRatio: number
  crossYao:
    | false
    | {
        secondPosition: 1 | 2 | 3 | 4 | 5 | 6
        secondRatio: number
        narrative: string
      }
}

export const CROSS_YAO_RATIO_THRESHOLD = 0.8
export const CROSS_YAO_MIN_SECOND_RATIO = 0.3

export function scoreYao(yao: Yao[], selected: Set<string>): LocatorResult {
  const scores: YaoScore[] = [...yao]
    .sort((a, b) => a.position - b.position)
    .map((y) => {
      const uniqueIndicators = Array.from(new Set(y.indicators))
      const total = uniqueIndicators.length
      const hits = uniqueIndicators.filter((ind) => selected.has(ind)).length
      const ratio = total === 0 ? 0 : hits / total
      return { position: y.position, yaoName: y.name, hits, total, ratio }
    })

  // Top: highest ratio; tiebreak by higher position
  let topIdx = 0
  for (let i = 1; i < scores.length; i++) {
    const a = scores[i]
    const b = scores[topIdx]
    if (a.ratio > b.ratio || (a.ratio === b.ratio && a.position > b.position)) {
      topIdx = i
    }
  }
  const top = scores[topIdx]

  // Second best: same rule, excluding top
  let secondIdx = -1
  for (let i = 0; i < scores.length; i++) {
    if (i === topIdx) continue
    if (secondIdx === -1) {
      secondIdx = i
      continue
    }
    const a = scores[i]
    const b = scores[secondIdx]
    if (a.ratio > b.ratio || (a.ratio === b.ratio && a.position > b.position)) {
      secondIdx = i
    }
  }

  let crossYao: LocatorResult['crossYao'] = false
  if (secondIdx >= 0 && top.ratio > 0) {
    const second = scores[secondIdx]
    if (
      second.ratio >= CROSS_YAO_MIN_SECOND_RATIO &&
      second.ratio >= top.ratio * CROSS_YAO_RATIO_THRESHOLD
    ) {
      crossYao = {
        secondPosition: second.position,
        secondRatio: second.ratio,
        narrative: `你也明显落在「${second.yaoName}」——这种「跨爻」通常意味着你正处在阶段过渡期，建议同时参照两爻的提示。`,
      }
    }
  }

  // Convention: when nothing matches, default topPosition to 1 (lowest),
  // not whichever yao won the position-based tiebreak among all-zero scores.
  const topPosition: 1 | 2 | 3 | 4 | 5 | 6 = top.ratio === 0 ? 1 : top.position

  return {
    scores,
    topPosition,
    topRatio: top.ratio,
    crossYao,
  }
}
