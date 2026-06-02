import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'

export type Confidence = 'high' | 'medium' | 'low'

/**
 * 重建首页结果所需的最小信息。完整 MatchData（reasoning/yaoBrief/runners）与
 * interpretation 不进 URL，靠 situationHash 在 localStorage 中兜底匹配。
 * 跨设备打开时 situation 可能为 null（压缩后过长被丢弃），此时只能渲染降级视图。
 */
export type ResultUrlState = {
  situation: string | null
  hexagramNumber: number
  yaoPosition: number
  confidence: Confidence
  situationHash: string
}

export type EncodeResultInput = {
  situation: string
  hexagramNumber: number
  yaoPosition: number
  confidence: Confidence
}

/** 压缩后的 situation 超过该长度则降级为仅 hash（控制整体 URL 长度，目标 < 1500 字符）。 */
export const SITUATION_PARAM_MAX = 1200

const CONFIDENCE_TO_CODE: Record<Confidence, string> = {
  high: 'h',
  medium: 'm',
  low: 'l',
}
const CODE_TO_CONFIDENCE: Record<string, Confidence> = {
  h: 'high',
  m: 'medium',
  l: 'low',
}

/** cyrb53：确定性的非加密短哈希，用于在 localStorage 中匹配同一次问卦。 */
export function hashSituation(situation: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < situation.length; i++) {
    const ch = situation.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0)
  return hash.toString(36)
}

/** 压缩后的 situation 是否会触发 hash 降级（公开供测试与 UI 判断）。 */
export function shouldUseHashFallback(situation: string): boolean {
  return compressToEncodedURIComponent(situation).length > SITUATION_PARAM_MAX
}

export function encodeResultToSearchParams(input: EncodeResultInput): URLSearchParams {
  const params = new URLSearchParams()
  params.set('h', String(input.hexagramNumber))
  params.set('p', String(input.yaoPosition))
  params.set('c', CONFIDENCE_TO_CODE[input.confidence])
  params.set('hash', hashSituation(input.situation))

  const compressed = compressToEncodedURIComponent(input.situation)
  if (compressed.length <= SITUATION_PARAM_MAX) {
    params.set('s', compressed)
  }
  return params
}

function parseIntStrict(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null
  return Number(value)
}

export function decodeResultFromSearchParams(params: URLSearchParams): ResultUrlState | null {
  const hexagramNumber = parseIntStrict(params.get('h'))
  const yaoPosition = parseIntStrict(params.get('p'))
  const confidence = CODE_TO_CONFIDENCE[params.get('c') ?? '']
  const situationHash = params.get('hash')

  if (
    hexagramNumber === null ||
    hexagramNumber < 1 ||
    hexagramNumber > 64 ||
    yaoPosition === null ||
    yaoPosition < 1 ||
    yaoPosition > 6 ||
    !confidence ||
    !situationHash
  ) {
    return null
  }

  let situation: string | null = null
  const compressed = params.get('s')
  if (compressed) {
    const decompressed = decompressFromEncodedURIComponent(compressed)
    // 篡改/截断会让解压返回 null 或乱码；用 hash 校验一致性，不一致则视为无 situation
    if (decompressed && hashSituation(decompressed) === situationHash) {
      situation = decompressed
    }
  }

  return { situation, hexagramNumber, yaoPosition, confidence, situationHash }
}
