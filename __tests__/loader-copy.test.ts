import { describe, it, expect } from 'vitest'
import { loaderCopyForVariant } from '@/lib/loader-copy'

describe('loaderCopyForVariant', () => {
  it('classic 早期阶段（step < 6）显示 "取象中"', () => {
    expect(loaderCopyForVariant('classic', 0)).toBe('取象中')
    expect(loaderCopyForVariant('classic', 5)).toBe('取象中')
  })

  it('classic 后期阶段（step >= 6）显示 "断卦中"', () => {
    expect(loaderCopyForVariant('classic', 6)).toBe('断卦中')
    expect(loaderCopyForVariant('classic', 11)).toBe('断卦中')
  })

  it('ai 早期阶段显示 "正在为你观局…"', () => {
    expect(loaderCopyForVariant('ai', 0)).toBe('正在为你观局…')
    expect(loaderCopyForVariant('ai', 5)).toBe('正在为你观局…')
  })

  it('ai 后期阶段显示 "正在为你理事…"', () => {
    expect(loaderCopyForVariant('ai', 6)).toBe('正在为你理事…')
    expect(loaderCopyForVariant('ai', 11)).toBe('正在为你理事…')
  })

  it('classic 和 ai 在同一阶段的文案彼此不同（差异化保证）', () => {
    for (const step of [0, 3, 6, 9]) {
      expect(loaderCopyForVariant('classic', step)).not.toBe(loaderCopyForVariant('ai', step))
    }
  })
})
