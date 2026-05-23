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
