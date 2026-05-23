'use client'

import { useEffect, useRef } from 'react'

/**
 * 背景氛围层 — 水墨山峦 + 飘浮微粒
 */
export function Atmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let particles: Particle[] = []

    type Particle = {
      x: number
      y: number
      size: number
      speed: number
      opacity: number
      drift: number
      phase: number
    }

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
      initParticles()
    }

    function initParticles() {
      const count = Math.floor((canvas!.width * canvas!.height) / 25000)
      particles = Array.from({ length: Math.min(count, 40) }, () => ({
        x: Math.random() * canvas!.width,
        y: Math.random() * canvas!.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.15 + 0.05,
        opacity: Math.random() * 0.3 + 0.05,
        drift: (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2,
      }))
    }

    let time = 0
    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      time += 0.005

      // 飘浮微粒
      for (const p of particles) {
        p.y -= p.speed
        p.x += Math.sin(time * 2 + p.phase) * p.drift

        if (p.y < -10) {
          p.y = canvas.height + 10
          p.x = Math.random() * canvas.width
        }
        if (p.x < -10) p.x = canvas.width + 10
        if (p.x > canvas.width + 10) p.x = -10

        const pulse = 0.5 + 0.5 * Math.sin(time * 3 + p.phase)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(184, 150, 44, ${p.opacity * pulse})`
        ctx.fill()
      }

      animId = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animId)
    }
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* 水墨山峦 — 多层 SVG 剪影 */}
      <svg
        className="absolute bottom-0 left-0 w-full opacity-[0.04]"
        viewBox="0 0 1440 400"
        preserveAspectRatio="none"
        style={{ height: '40vh' }}
      >
        <path
          d="M0,400 L0,280 Q120,180 240,250 Q360,150 480,220 Q560,120 720,200 Q840,100 960,180 Q1080,80 1200,160 Q1320,100 1440,140 L1440,400 Z"
          fill="currentColor"
          className="text-[var(--color-ink-900)]"
        />
      </svg>
      <svg
        className="absolute bottom-0 left-0 w-full opacity-[0.03]"
        viewBox="0 0 1440 400"
        preserveAspectRatio="none"
        style={{ height: '50vh' }}
      >
        <path
          d="M0,400 L0,320 Q180,220 360,300 Q480,200 600,260 Q720,160 900,240 Q1020,140 1140,200 Q1300,120 1440,180 L1440,400 Z"
          fill="currentColor"
          className="text-[var(--color-ink-900)]"
        />
      </svg>
      <svg
        className="absolute bottom-0 left-0 w-full opacity-[0.02]"
        viewBox="0 0 1440 400"
        preserveAspectRatio="none"
        style={{ height: '60vh' }}
      >
        <path
          d="M0,400 L0,350 Q200,250 400,330 Q550,230 700,290 Q850,190 1000,270 Q1150,180 1300,230 Q1400,200 1440,220 L1440,400 Z"
          fill="currentColor"
          className="text-[var(--color-ink-900)]"
        />
      </svg>

      {/* 粒子 Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  )
}
