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

export function confidenceLabel(confidence: AiConfidence): string {
  switch (confidence) {
    case 'high':
      return '高'
    case 'medium':
      return '中'
    case 'low':
      return '低'
  }
}
