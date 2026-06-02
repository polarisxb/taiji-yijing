'use client'

import dynamic from 'next/dynamic'

/**
 * YaoLocator 的动态加载包装器。
 *
 * 原因：
 * - YaoLocator 是一个纯客户端交互工具（大量 useState / useEffect）。
 * - 在 Server Component 中直接使用 next/dynamic + ssr: false 会报错。
 * - 因此把 dynamic 逻辑抽离到 Client Component 中。
 */
const YaoLocator = dynamic(() => import('./YaoLocator').then((mod) => mod.YaoLocator), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] flex items-center justify-center text-[var(--color-ink-400)] font-serif text-sm">
      爻位定位器加载中...
    </div>
  ),
})

export default YaoLocator
