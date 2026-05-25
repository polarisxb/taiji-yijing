/**
 * DivinationLoader render tests — variant 颜色 / 节奏验证 + CSS 变量纪律
 *
 * 重点不在像素级动画行为（vitest jsdom 不验视觉），而在：
 *  - variant='ai' / variant='classic' 时颜色源头是否走 CSS 变量
 *  - 不允许任何 hex 硬编（.windsurfrules: "CSS variables for all colors"）
 *  - 三个 dot 元素的 background style 是统一的（不是各自硬编）
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { DivinationLoader } from '@/components/DivinationLoader'

describe('DivinationLoader — variant color', () => {
  it('uses var(--color-warm) for AI variant dot background (no hex)', () => {
    const { container } = render(<DivinationLoader variant="ai" />)
    const dots = container.querySelectorAll('span.rounded-full')
    expect(dots.length).toBeGreaterThan(0)
    // jsdom 不解析 CSS var()，只能比对原始 style 字符串
    for (const dot of Array.from(dots)) {
      const bg = (dot as HTMLElement).style.background
      expect(bg).toContain('var(--color-warm)')
      expect(bg).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    }
  })

  it('uses var(--color-vermillion) for classic variant dot background', () => {
    const { container } = render(<DivinationLoader variant="classic" />)
    const dots = container.querySelectorAll('span.rounded-full')
    expect(dots.length).toBeGreaterThan(0)
    for (const dot of Array.from(dots)) {
      const bg = (dot as HTMLElement).style.background
      expect(bg).toContain('var(--color-vermillion)')
      expect(bg).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    }
  })

  it('defaults to classic variant when no variant prop is passed', () => {
    const { container } = render(<DivinationLoader />)
    const dots = container.querySelectorAll('span.rounded-full')
    expect(dots.length).toBeGreaterThan(0)
    const bg = (dots[0] as HTMLElement).style.background
    expect(bg).toContain('var(--color-vermillion)')
  })
})

describe('DivinationLoader — CSS variable 纪律 (anti-regression)', () => {
  it('renders zero hex color values anywhere in the DOM tree', () => {
    // 防倒退：把整个组件的 innerHTML 拍下来，确认没有 #xxxxxx 出现
    // 这能挡住将来任何「改一处忘一处」的 hex 倒退（class names 不会含 #）
    for (const variant of ['classic', 'ai'] as const) {
      const { container, unmount } = render(<DivinationLoader variant={variant} />)
      // inline style 是 hex 倒退的最可能入口
      const allStyledElements = container.querySelectorAll('[style]')
      for (const el of Array.from(allStyledElements)) {
        const style = (el as HTMLElement).getAttribute('style') || ''
        expect(style, `${variant} variant ${el.tagName} style`).not.toMatch(/#[0-9a-fA-F]{3,8}/)
      }
      unmount()
    }
  })
})
