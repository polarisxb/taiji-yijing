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

/**
 * AI confidence 徽章的视觉表达（label + tailwind 颜色类）。
 *
 * 单一来源——所有展示 AI confidence 徽章的组件
 * （ReasoningPanel, AiResultCard, history detail, RecordCard）都应取这里，
 * 不要各自重新定义文案/颜色，否则改一处忘三处。
 *
 * 颜色策略：
 * - 定见 = 暖纸/暖棕/暖金（义理派暖灰系统）
 * - 待审 = amber（标准 tailwind 警示偏温）
 * - 审慎 = rose（标准 tailwind 谨慎偏冷）
 */
export type ConfidenceBadge = {
  label: string
  colorClass: string
}

const CONFIDENCE_COLOR_CLASS: Record<AiConfidence, string> = {
  high: 'text-[#7a6e5d] bg-[#f5f0e8] border-[#c4b99a]',
  medium: 'text-amber-700 bg-amber-50 border-amber-300',
  low: 'text-rose-700 bg-rose-50 border-rose-300',
}

export function getConfidenceBadge(confidence: AiConfidence): ConfidenceBadge {
  return {
    label: confidenceLabel(confidence),
    colorClass: CONFIDENCE_COLOR_CLASS[confidence],
  }
}
