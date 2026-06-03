import Link from 'next/link'
import { AccountSection } from '@/components/auth/AccountSection'
import { Atmosphere } from '@/components/Atmosphere'
import { SettingsPanel } from '@/components/zheng/settings/SettingsPanel'

export default function SettingsPage() {
  return (
    <>
      <Atmosphere />
      {/* 内容视口容器：限制高度为视口减去山的高度，内部滚动，保证山实时在当前屏幕显示的内容下面 */}
      <div
        className="relative z-10 max-w-2xl mx-auto px-6"
        style={{ height: 'calc(100vh - 30vh)', overflow: 'hidden' }}
      >
        <div className="h-full overflow-y-auto py-16 md:py-24 space-y-12">
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
      </div>
    </>
  )
}
