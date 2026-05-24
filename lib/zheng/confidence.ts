import type { AiConfidence } from './types'

/**
 * 把 AI 模式的 confidence (high/medium/low) 映射到 fitScore (0..1)，
 * 以便复用现有 list / detail UI（它们假设 fitScore 是数字）。
 *
 * 详情页同时显示 consultMode === 'ai' + aiYao.confidence，所以用户不会
 * 把这个数字误解为经典 matcher 的精确评分。
 */
export function confidenceToScore(confidence: AiConfidence): number {
  switch (confidence) {
    case 'high':
      return 0.9
    case 'medium':
      return 0.65
    case 'low':
      return 0.4
  }
}

/**
 * 义理派表达：AI 的把握以文字而非数字表达。
 * - 定见：AI 有把握
 * - 待审：AI 觉得方向对但需用户自审
 * - 审慎：AI 拿不准，请用户审慎参考
 */
export function confidenceLabel(confidence: AiConfidence): string {
  switch (confidence) {
    case 'high':
      return '定见'
    case 'medium':
      return '待审'
    case 'low':
      return '审慎'
  }
}
