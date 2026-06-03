import { Atmosphere } from '@/components/Atmosphere'
import { ALL_HEXAGRAMS } from '@/content/hexagrams'
import { HexagramGrid } from '@/components/hexagram/HexagramGrid'
import { HistoryNavLink } from '@/components/zheng/HistoryNavLink'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '六十四卦 — 太极',
  description: '易经六十四卦全览 — 以情境原型观三千年决策智慧',
}

export default function HexagramsPage() {
  return (
    <>
      <Atmosphere />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16 md:py-24">
        <header className="text-center mb-16">
          <h1 className="font-serif text-5xl font-black text-[var(--color-ink-900)] tracking-widest">
            六十四卦
          </h1>
          <p className="mt-4 text-sm text-[var(--color-ink-400)] font-serif">
            {ALL_HEXAGRAMS.length}/64 卦已就绪
          </p>
          <div className="divider-classical w-48 mx-auto mt-6">
            <span className="font-serif">☰ ☷</span>
          </div>
        </header>

        <HexagramGrid hexagrams={ALL_HEXAGRAMS} />

        <footer className="mt-16 text-center">
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/"
              className="text-xs font-serif text-[var(--color-ink-400)] hover:text-[var(--color-vermillion)] transition-colors"
            >
              ← 回到问卦
            </Link>
            <HistoryNavLink className="text-sm font-serif text-[var(--color-vermillion)] hover:text-[var(--color-ink-900)] transition-colors before:content-['·'] before:mr-4 before:text-[var(--color-ink-300)]" />
          </div>
        </footer>
      </div>
    </>
  )
}
