import type { Hexagram } from '@/lib/types'
import { qian } from './01-qian'
import { kun } from './02-kun'
import { zhun } from './03-zhun'

/**
 * 卦库 — 当前 3/64
 *
 * 增加新卦时：
 * 1. 在此目录下创建 NN-name.ts 文件
 * 2. 参考 docs/CONTENT-GUIDE.md 的字段要求
 * 3. 在此文件 import 并加入 ALL_HEXAGRAMS
 */
export const ALL_HEXAGRAMS: Hexagram[] = [qian, kun, zhun]

export { qian, kun, zhun }
