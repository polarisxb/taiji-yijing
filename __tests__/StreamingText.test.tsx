/**
 * StreamingText render tests — Chinese typography integrity.
 *
 * 中文句间不应出现空格——splitInterpretationParagraphs 已经把 。！？ 终止符
 * 附在每句尾部，渲染时把句子直接拼接即可，插入 ' ' 会变成
 *   "此卦谓动而能止。 当先观己心。"
 * 这在中文排印上是错的。Devin Review 抓到。
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { StreamingText } from '@/components/StreamingText'

describe('StreamingText — Chinese sentence concatenation', () => {
  it('does NOT insert spaces between sentences in same paragraph', () => {
    const { container } = render(<StreamingText text="此卦谓动而能止。当先观己心。" done={true} />)
    expect(container.textContent).toBe('此卦谓动而能止。当先观己心。')
    expect(container.textContent).not.toContain('。 ') // 终止符后不应有空格
  })

  it('renders 3 paragraphs as 3 <p> blocks; no inter-sentence spaces in any', () => {
    const multi = '第一段第一句。第一段第二句。\n第二段第一句。第二段第二句。\n第三段只有一句。'
    const { container } = render(<StreamingText text={multi} done={true} />)
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs.length).toBe(3)
    expect(paragraphs[0]!.textContent).toBe('第一段第一句。第一段第二句。')
    expect(paragraphs[1]!.textContent).toBe('第二段第一句。第二段第二句。')
    expect(paragraphs[2]!.textContent).toBe('第三段只有一句。')
  })

  it('does NOT add trailing space after the last sentence of a non-last paragraph', () => {
    // bot 指出的尤其严重的 case：isLastSentence = isLastPara && ... 所以
    // 非末段的最后一句也会带空格。
    const { container } = render(
      <StreamingText text={'第一段唯一句。\n第二段唯一句。'} done={true} />,
    )
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs[0]!.textContent).toBe('第一段唯一句。')
    expect(paragraphs[0]!.textContent).not.toMatch(/。 $/)
  })

  it('renders caret only on last paragraph when not done', () => {
    const { container } = render(<StreamingText text={'第一段。\n第二段。'} done={false} />)
    const paragraphs = container.querySelectorAll('p')
    // 第一段不应有 caret（pulse）
    expect(paragraphs[0]!.querySelector('.animate-pulse')).toBeNull()
    // 第二段（最后段）应有 caret
    expect(paragraphs[1]!.querySelector('.animate-pulse')).not.toBeNull()
  })

  it('hides caret entirely when done=true', () => {
    const { container } = render(<StreamingText text="完整句子。" done={true} />)
    expect(container.querySelector('.animate-pulse')).toBeNull()
  })
})
