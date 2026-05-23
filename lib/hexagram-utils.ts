import type { Phase } from './types'
import { ALL_HEXAGRAMS } from '@/content/hexagrams'

export function findHexagramByNumber(num: number) {
  return ALL_HEXAGRAMS.find((h) => h.number === num)
}

export function findHexagramById(id: string) {
  const num = parseInt(id, 10)
  if (isNaN(num)) return undefined
  return findHexagramByNumber(num)
}

const PHASE_YAO_MAP: Record<Phase, number> = {
  germinal: 0,
  emerging: 1,
  developing: 2,
  peak: 3,
  declining: 4,
  ending: 5,
}

export function getPhaseYaoIndex(phase: Phase | undefined): number | undefined {
  if (!phase) return undefined
  return PHASE_YAO_MAP[phase]
}
