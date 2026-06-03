import Link from 'next/link'
import { AccountSection } from '@/components/auth/AccountSection'
import { Atmosphere } from '@/components/Atmosphere'
import { SettingsPanel } from '@/components/zheng/settings/SettingsPanel'

export default function SettingsPage() {
  return (
    <>
      <Atmosphere />
      <div className="relative z-10 max-w-2xl mx-auto px-6 py-16 md:py-24 space-y-12">
        <header className="text-center">
          <h1 className="font-serif text-5xl font-bold text-[var(--color-ink-900)] tracking-widest">
            设置
          </h1>
          <p className="mt-4 text-xs tracking-[0.4em] text-[var(--color-ink-400)] font-serif">
            管理「履」中的数据
          </p>
        </header>

        <AccountSection />

        <SettingsPanel />

        <footer className="text-center">
          <Link
            href="/history"
            className="text-xs font-serif text-[var(--color-ink-400)] hover:text-[var(--color-vermillion)] transition-colors"
          >
            ← 回履
          </Link>
        </footer>
      </div>
    </>
  )
}
