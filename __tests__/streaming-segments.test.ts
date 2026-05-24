import { describe, it, expect } from 'vitest'
import { splitInterpretationParagraphs } from '@/lib/streaming-segments'

describe('splitInterpretationParagraphs', () => {
  it('returns empty array for empty text', () => {
    expect(splitInterpretationParagraphs('')).toEqual([])
  })

  it('returns a single paragraph with a single in-progress sentence (no terminator yet)', () => {
    expect(splitInterpretationParagraphs('AI 正在思考中')).toEqual([['AI 正在思考中']])
  })

  it('splits sentences within a paragraph on 中文 terminators (。！？), keeping terminator attached', () => {
    expect(splitInterpretationParagraphs('此卦谓动而能止。当先观己心。')).toEqual([
      ['此卦谓动而能止。', '当先观己心。'],
    ])
  })

  it('treats newline as a paragraph break (not a sentence break)', () => {
    expect(splitInterpretationParagraphs('段一\n段二')).toEqual([['段一'], ['段二']])
  })

  it('combines: multiple paragraphs each with multiple sentences', () => {
    const text = '经文曰。意思是。\n建议你。'
    expect(splitInterpretationParagraphs(text)).toEqual([['经文曰。', '意思是。'], ['建议你。']])
  })

  it('drops empty paragraphs produced by consecutive newlines (blank lines)', () => {
    expect(splitInterpretationParagraphs('段一\n\n段二')).toEqual([['段一'], ['段二']])
  })

  it('drops empty sentences produced by consecutive terminators', () => {
    expect(splitInterpretationParagraphs('段一。。')).toEqual([['段一。']])
  })

  it('trims surrounding whitespace from each sentence', () => {
    expect(splitInterpretationParagraphs('  段一。  段二。  ')).toEqual([['段一。', '段二。']])
  })

  it('preserves trailing in-progress fragment (no terminator) as final sentence of last paragraph', () => {
    expect(splitInterpretationParagraphs('动而能止。当先')).toEqual([['动而能止。', '当先']])
  })

  it('is stable for streaming: appending more text only changes the trailing sentence/paragraph', () => {
    const partial = splitInterpretationParagraphs('动而能止。守正以')
    const complete = splitInterpretationParagraphs('动而能止。守正以待。')

    expect(partial[0][0]).toBe(complete[0][0])
    expect(partial[0][1]).toBe('守正以')
    expect(complete[0][1]).toBe('守正以待。')
  })

  it('streaming across paragraph boundary: first paragraph stays stable as second begins', () => {
    const partial = splitInterpretationParagraphs('段一。\n段二开头')
    const more = splitInterpretationParagraphs('段一。\n段二开头。段二尾')

    expect(more[0]).toEqual(partial[0])
    expect(more[1]).toEqual(['段二开头。', '段二尾'])
  })
})
