'use client'

import { useRef, useEffect, useState } from 'react'

/**
 * 平滑展开/收起容器 — 用 grid 行高过渡实现丝滑动画
 */
type Props = {
  open: boolean
  children: React.ReactNode
  duration?: number
}

export function SmoothExpand({ open, children, duration = 350 }: Props) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | undefined>(open ? undefined : 0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    if (open) {
      // 展开：先量高度，再从 0 过渡到目标高度
      const targetHeight = el.scrollHeight
      setHeight(0)
      setIsAnimating(true)
      // 强制 reflow
      void el.offsetHeight
      requestAnimationFrame(() => {
        setHeight(targetHeight)
      })

      const timer = setTimeout(() => {
        setHeight(undefined) // 移除固定高度，允许内容自由伸缩
        setIsAnimating(false)
      }, duration)
      return () => clearTimeout(timer)
    } else {
      // 收起：先设置当前高度，再过渡到 0
      const currentHeight = el.scrollHeight
      setHeight(currentHeight)
      setIsAnimating(true)
      void el.offsetHeight
      requestAnimationFrame(() => {
        setHeight(0)
      })

      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [open, duration])

  return (
    <div
      ref={contentRef}
      style={{
        height: height === undefined ? 'auto' : height,
        overflow: isAnimating || !open ? 'hidden' : 'visible',
        transition: isAnimating
          ? `height ${duration}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${duration}ms ease`
          : 'none',
        opacity: !open && !isAnimating ? 0 : open ? 1 : 0,
      }}
    >
      {children}
    </div>
  )
}
