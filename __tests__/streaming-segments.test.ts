import { describe, it, expect } from 'vitest'
import { splitInterpretationSegments } from '@/lib/streaming-segments'

describe('splitInterpretationSegments', () => {
  it('returns empty array for empty text', () => {
    expect(splitInterpretationSegments('')).toEqual([])
  })

  it('returns a single segment when there is no sentence boundary yet', () => {
    expect(splitInterpretationSegments('AI 正在思考中')).toEqual(['AI 正在思考中'])
  })

  it('splits on 中文句号 (。) and keeps the punctuation attached to the preceding segment', () => {
    const segments = splitInterpretationSegments('此卦谓动而能止。当先观己心。')
    expect(segments).toEqual(['此卦谓动而能止。', '当先观己心。'])
  })

  it('splits on multiple Chinese sentence-end marks (。！？)', () => {
    const segments = splitInterpretationSegments('动而能止。守正以待。问己心何安？')
    expect(segments).toHaveLength(3)
    expect(segments[0]).toBe('动而能止。')
    expect(segments[1]).toBe('守正以待。')
    expect(segments[2]).toBe('问己心何安？')
  })

  it('preserves trailing in-progress fragment (no terminator) as final segment', () => {
    const segments = splitInterpretationSegments('动而能止。当先')
    expect(segments).toEqual(['动而能止。', '当先'])
  })

  it('treats explicit newline as a segment boundary', () => {
    const segments = splitInterpretationSegments('段一\n段二')
    expect(segments).toEqual(['段一', '段二'])
  })

  it('drops empty segments produced by consecutive boundaries', () => {
    // 两个换行 / 句号 + 换行 不应产生空段
    expect(splitInterpretationSegments('段一\n\n段二')).toEqual(['段一', '段二'])
    expect(splitInterpretationSegments('段一。\n段二。')).toEqual(['段一。', '段二。'])
  })

  it('trims surrounding whitespace from each segment', () => {
    expect(splitInterpretationSegments('  段一。  段二。  ')).toEqual(['段一。', '段二。'])
  })

  it('is stable for streaming: appending more text only adds new segments, never reshuffles old ones', () => {
    const partial = splitInterpretationSegments('动而能止。守正以')
    const complete = splitInterpretationSegments('动而能止。守正以待。')

    // 第一段在两次调用中保持不变（用于稳定的 React key + 不重复触发动画）
    expect(complete[0]).toBe(partial[0])
    // 第二段在 partial 是 in-progress，在 complete 是已完成
    expect(partial[1]).toBe('守正以')
    expect(complete[1]).toBe('守正以待。')
  })
})
