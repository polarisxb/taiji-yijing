'use client'

import { useScrollReveal } from '@/hooks/useAnimations'

type Props = {
  children: React.ReactNode
  className?: string
  delay?: number
}

export function ScrollRevealSection({ children, className = '', delay = 0 }: Props) {
  const { ref, visible } = useScrollReveal<HTMLElement>(0.1)

  return (
    <section
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(24px)',
        transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </section>
  )
}
