'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * 滚动渐现 — 元素进入视口时触发动画
 */
export function useScrollReveal<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, visible }
}

/**
 * 数字跳动动画
 */
export function useCountUp(target: number, duration = 800, active = true) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!active) return
    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [target, duration, active])

  return value
}

/**
 * 墨水涟漪效果
 */
export function useInkRipple<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  const trigger = useCallback((e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const maxDim = Math.max(rect.width, rect.height)

    const ripple = document.createElement('span')
    ripple.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(245, 240, 232, 0.25);
      transform: translate(-50%, -50%);
      pointer-events: none;
      animation: ink-ripple 0.6s ease-out forwards;
    `

    el.style.position = 'relative'
    el.style.overflow = 'hidden'
    el.appendChild(ripple)

    setTimeout(() => ripple.remove(), 700)
  }, [])

  return { ref, trigger }
}
