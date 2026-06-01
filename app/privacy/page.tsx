import type { Metadata } from 'next'
import Link from 'next/link'

import { Atmosphere } from '@/components/Atmosphere'

export const metadata: Metadata = {
  title: '隐私政策 · 太极易经决策框架',
  description: '太极易经决策框架的隐私政策——我们收集什么、放在哪、你有什么权利。',
}

export default function PrivacyPage() {
  return (
    <>
      <Atmosphere />
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16 md:py-24 space-y-8">
        <header className="space-y-2">
          <Link
            href="/"
            className="text-xs font-serif text-[var(--color-ink-400)] hover:text-[var(--color-vermillion)] transition-colors"
          >
            ← 回主页
          </Link>
          <h1 className="font-serif text-3xl text-[var(--color-ink-900)]">隐私政策</h1>
          <p className="text-xs font-serif text-[var(--color-ink-500)]">
            最后更新：2026 年 5 月 24 日
          </p>
        </header>

        <article className="space-y-8 font-serif text-[var(--color-ink-800)] leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-serif text-xl text-[var(--color-ink-900)]">1. 我们是谁</h2>
            <p>太极易经决策框架，由个人维护者运营。本政策说明我们如何处理你的数据。</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-xl text-[var(--color-ink-900)]">2. 我们收集什么数据</h2>
            <p className="font-bold">未登录时：</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>localStorage 中的咨询记录（仅在你的浏览器，不传任何服务器）</li>
            </ul>
            <p className="font-bold mt-3">登录后：</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>邮箱（或手机号，A2 上线后）用于身份验证</li>
              <li>你保存的咨询记录（情境文本、卦象元数据、笔记、应验状态）</li>
              <li>服务器 access log（IP、时间戳，30 天自动清理）</li>
            </ul>
            <p className="font-bold mt-3">我们不收集：</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>AI 对话过程文本（流过即丢，不存储原始流）</li>
              <li>浏览器指纹、设备 ID</li>
              <li>第三方追踪数据（无 Google Analytics、无 Pixel）</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-xl text-[var(--color-ink-900)]">3. 数据存放在哪</h2>
            <p>Supabase 平台（Tokyo 或 Singapore region）。</p>
            <p>HTTPS 加密传输；Postgres at-rest 加密由 Supabase 平台保证。</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-xl text-[var(--color-ink-900)]">4. 谁能看到你的数据</h2>
            <ul className="list-disc ml-6 space-y-1">
              <li>你本人（通过登录）</li>
              <li>产品维护者：理论上能通过数据库后台访问，仅在调试 / 客服场景才会查看</li>
              <li>Supabase 平台（基础设施提供者）</li>
            </ul>
            <p className="font-bold mt-3">我们不会：</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>售卖数据</li>
              <li>向第三方分享</li>
              <li>用你的数据训练 AI 模型</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-xl text-[var(--color-ink-900)]">5. 你的权利</h2>
            <ul className="list-disc ml-6 space-y-1">
              <li>
                <span className="font-bold">查看</span>：登录后即可查看所有数据
              </li>
              <li>
                <span className="font-bold">导出</span>：设置页 → 导出 JSON / Markdown
              </li>
              <li>
                <span className="font-bold">删除单条</span>：在记录详情页删除
              </li>
              <li>
                <span className="font-bold">注销账号</span>：设置页 → 注销账号（30 天内可撤回）
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-xl text-[var(--color-ink-900)]">6. 数据保留期</h2>
            <ul className="list-disc ml-6 space-y-1">
              <li>活跃账号：你登录期间永久保留</li>
              <li>注销账号：30 天软删，之后永久删除</li>
              <li>服务器日志：30 天自动清理</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-xl text-[var(--color-ink-900)]">7. Cookies</h2>
            <ul className="list-disc ml-6 space-y-1">
              <li>必要 cookies（auth session）：用于保持登录</li>
              <li>不使用追踪 cookies</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-xl text-[var(--color-ink-900)]">8. 未成年人</h2>
            <p>本产品不为 14 岁以下未成年人提供服务。</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-xl text-[var(--color-ink-900)]">9. 变更</h2>
            <p>本政策可能更新。重大变更会在登录后通过 banner 或邮件提示。</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-xl text-[var(--color-ink-900)]">10. 联系</h2>
            <p>如有疑问，请通过产品仓库 issue 联系。</p>
          </section>

          <hr className="border-[var(--color-ink-100)]" />
          <p className="text-xs font-serif text-[var(--color-ink-400)]">
            本政策为产品方起草草稿，不构成法律意见。如有商业 / 法律需求，建议咨询专业律师。
          </p>
        </article>

        <nav className="flex gap-4 text-xs font-serif text-[var(--color-ink-500)]">
          <Link href="/terms" className="hover:text-[var(--color-vermillion)] transition-colors">
            服务条款 →
          </Link>
          <Link href="/" className="hover:text-[var(--color-vermillion)] transition-colors">
            回主页
          </Link>
        </nav>
      </main>
    </>
  )
}
