import { describe, expect, it } from 'vitest'

import {
  decodeResultFromSearchParams,
  encodeResultToSearchParams,
  hashSituation,
  shouldUseHashFallback,
  SITUATION_PARAM_MAX,
  type EncodeResultInput,
} from '@/lib/result-url'

const base: EncodeResultInput = {
  situation: '我在大厂工作 5 年，想辞职创业，但方向还没想清楚。',
  hexagramNumber: 3,
  yaoPosition: 2,
  confidence: 'high',
}

describe('encode/decode 往返', () => {
  it('正常状态往返一致', () => {
    const params = encodeResultToSearchParams(base)
    const decoded = decodeResultFromSearchParams(params)
    expect(decoded).toEqual({
      situation: base.situation,
      hexagramNumber: 3,
      yaoPosition: 2,
      confidence: 'high',
      situationHash: hashSituation(base.situation),
    })
  })

  it('保留全部三种 confidence', () => {
    for (const c of ['high', 'medium', 'low'] as const) {
      const decoded = decodeResultFromSearchParams(
        encodeResultToSearchParams({ ...base, confidence: c }),
      )
      expect(decoded?.confidence).toBe(c)
    }
  })

  it('特殊字符、emoji、换行、多语言均可往返', () => {
    const situation = '换行\n制表\t emoji 🀄️🔮 中文 English العربية «quote»'
    const decoded = decodeResultFromSearchParams(encodeResultToSearchParams({ ...base, situation }))
    expect(decoded?.situation).toBe(situation)
  })
})

describe('hash 降级', () => {
  it('超长 situation 丢弃 s 参数但保留 hash 与元数据', () => {
    // 高熵文本，避免 lz-string 对重复/周期串的高压缩率（确定性 LCG）
    const pool = '我在大厂工作辞职创业方向资金团队产品abcXYZ012诀择忐忑'
    let seed = 123456789
    let situation = ''
    for (let i = 0; i < 4000; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      situation += pool[seed % pool.length]
    }
    expect(shouldUseHashFallback(situation)).toBe(true)

    const params = encodeResultToSearchParams({ ...base, situation })
    expect(params.has('s')).toBe(false)

    const decoded = decodeResultFromSearchParams(params)
    expect(decoded?.situation).toBeNull()
    expect(decoded?.situationHash).toBe(hashSituation(situation))
    expect(decoded?.hexagramNumber).toBe(3)
  })

  it('普通长度不触发降级', () => {
    expect(shouldUseHashFallback(base.situation)).toBe(false)
    expect(encodeResultToSearchParams(base).has('s')).toBe(true)
  })
})

describe('容错与非法参数', () => {
  it('缺失必要字段返回 null', () => {
    expect(decodeResultFromSearchParams(new URLSearchParams())).toBeNull()
    expect(decodeResultFromSearchParams(new URLSearchParams('h=3&p=2&c=h'))).toBeNull() // 缺 hash
  })

  it('hexagramNumber 越界返回 null', () => {
    expect(decodeResultFromSearchParams(new URLSearchParams('h=99&p=2&c=h&hash=x'))).toBeNull()
    expect(decodeResultFromSearchParams(new URLSearchParams('h=0&p=2&c=h&hash=x'))).toBeNull()
  })

  it('yaoPosition 越界返回 null', () => {
    expect(decodeResultFromSearchParams(new URLSearchParams('h=3&p=7&c=h&hash=x'))).toBeNull()
  })

  it('非法 confidence code 返回 null', () => {
    expect(decodeResultFromSearchParams(new URLSearchParams('h=3&p=2&c=z&hash=x'))).toBeNull()
  })

  it('非数字 h/p 返回 null', () => {
    expect(decodeResultFromSearchParams(new URLSearchParams('h=abc&p=2&c=h&hash=x'))).toBeNull()
  })

  it('s 被篡改导致 hash 不一致时降级为 situation=null 而非崩溃', () => {
    const params = encodeResultToSearchParams(base)
    params.set('s', 'GARBAGE_TAMPERED_VALUE')
    const decoded = decodeResultFromSearchParams(params)
    expect(decoded).not.toBeNull()
    expect(decoded?.situation).toBeNull()
    expect(decoded?.situationHash).toBe(hashSituation(base.situation))
  })
})

describe('hashSituation', () => {
  it('确定性：同输入同输出', () => {
    expect(hashSituation('测试')).toBe(hashSituation('测试'))
  })

  it('不同输入不同输出', () => {
    expect(hashSituation('测试 A')).not.toBe(hashSituation('测试 B'))
  })
})

describe('URL 长度控制', () => {
  it('典型 situation 编码后长度受控', () => {
    const qs = encodeResultToSearchParams(base).toString()
    expect(qs.length).toBeLessThan(SITUATION_PARAM_MAX + 100)
  })
})
