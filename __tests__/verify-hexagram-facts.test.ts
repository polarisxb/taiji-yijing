import { describe, expect, it } from 'vitest'

import { checkHexagramFacts } from '@/scripts/verify-hexagram-facts.mjs'

const validZhunFacts = {
  number: 3,
  name: { chinese: '屯', pinyin: 'zhūn', english: 'Difficulty at the Beginning' },
  trigrams: { upper: '坎', lower: '震' },
  binary: '010001',
  judgment: { text: '屯：元、亨、利、贞，勿用有攸往，利建侯。' },
  image: { text: '云雷屯，君子以经纶。' },
  yao: [
    { position: 1, name: '初九', text: '磐桓，利居贞，利建侯。' },
    { position: 2, name: '六二', text: '屯如邅如，乘马班如，匪寇婚媾，女子贞不字，十年乃字。' },
    { position: 3, name: '六三', text: '即鹿无虞，惟入于林中，君子几不如舍，往吝。' },
    { position: 4, name: '六四', text: '乘马班如，求婚媾，往吉，无不利。' },
    { position: 5, name: '九五', text: '屯其膏，小贞吉，大贞凶。' },
    { position: 6, name: '上六', text: '乘马班如，泣血涟如。' },
  ],
}

describe('checkHexagramFacts', () => {
  it('passes valid facts', () => {
    const result = checkHexagramFacts(validZhunFacts, '03-zhun.facts.json')

    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('treats trigram/binary mismatches as errors', () => {
    const result = checkHexagramFacts(
      { ...validZhunFacts, trigrams: { upper: '乾', lower: '震' } },
      '03-zhun.facts.json',
    )

    expect(result.errors.join('\n')).toContain('上卦')
  })

  it('requires known trigram names', () => {
    const result = checkHexagramFacts(
      { ...validZhunFacts, trigrams: { upper: '水', lower: '雷' } },
      '03-zhun.facts.json',
    )

    expect(result.errors.join('\n')).toContain('trigrams.upper')
    expect(result.errors.join('\n')).toContain('trigrams.lower')
  })
})
