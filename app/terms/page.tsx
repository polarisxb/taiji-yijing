import type { Metadata } from 'next'
import Link from 'next/link'

import { Atmosphere } from '@/components/Atmosphere'

export const metadata: Metadata = {
  title: '用户服务条款 · 太极易经决策框架',
  description: '太极易经决策框架的用户服务条款——服务性质、使用规则、免责声明。',
}

export default function TermsPage() {
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
          <h1 className="font-serif text-3xl text-[var(--color-ink-900)]">用户服务条款</h1>
          <p className="text-xs font-serif text-[var(--color-ink-500)]">
            最后更新：2026 年 5 月 24 日
          </p>
        </header>

        <article className="space-y-8 font-serif text-[var(--color-ink-800)] leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-serif text-xl text-[var(--color-ink-900)]">1. 服务性质</h2>
            <p>
              太极易经决策框架是一款<span className="font-bold">辅助思考工具</span>
              ，基于《周易》义理派传统，帮助用户从 64 卦原型角度看待自己的情境。
            </p>
            <p className="font-bold">重要声明：</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>本工具不是占卜服务——我们不预测未来</li>
              <li>本工具不是心理咨询——情绪困扰请寻求专业帮助</li>
              <li>本工具不替代专业意见（法律、医疗、财务、心理等）</li>
              <li>决策结果由你自己负责</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-xl text-[var(--color-ink-900)]">2. 使用规则</h2>
            <p>不得用本服务做：</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>违法情境（毒品、暴力、政治敏感）</li>
              <li>骚扰他人（用真实姓名诋毁）</li>
              <li>学术不端（用 AI 解读冒充自己的思考）</li>
              <li>自动化抓取（限速 + 验证码触发）</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-xl text-[var(--color-ink-900)]">3. AI 内容</h2>
            <ul className="list-disc ml-6 space-y-1">
              <li>AI 解读由第三方模型生成，可能出错或不准</li>
              <li>我们不对 AI 输出的准确性 / 完整性负责</li>
              <li>你应当用自己的判断过滤 AI 输出</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-xl text-[var(--color-ink-900)]">4. 知识产权</h2>
            <ul className="list-disc ml-6 space-y-1">
              <li>你保存的内容（情境、笔记）归你所有</li>
              <li>你授予我们储存、显示这些内容的权利（仅用于向你展示）</li>
              <li>系统的 64 卦解读、UI、代码归产品方所有</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-xl text-[var(--color-ink-900)]">5. 服务变更 / 终止</h2>
            <ul className="list-disc ml-6 space-y-1">
              <li>我们可能更新功能或停止维护</li>
              <li>终止前我们会提前 30 天通知</li>
              <li>终止后你有 90 天导出数据</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-xl text-[var(--color-ink-900)]">6. 免责</h2>
            <p>本服务&ldquo;按现状&rdquo;（AS IS）提供。不对：</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>服务可用性 / 连续性</li>
              <li>数据完整性（注销 / 故障等场景）</li>
              <li>任何决策结果</li>
            </ul>
            <p>承担责任。最大赔偿不超过你支付给我们的费用（当前为 0）。</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-xl text-[var(--color-ink-900)]">7. 适用法律</h2>
            <p>中华人民共和国法律。</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-xl text-[var(--color-ink-900)]">8. 联系</h2>
            <p>如有疑问，请通过产品仓库 issue 联系。</p>
          </section>

          <hr className="border-[var(--color-ink-100)]" />
          <p className="text-xs font-serif text-[var(--color-ink-400)]">
            本条款为产品方起草草稿，不构成法律意见。如有商业 / 法律需求，建议咨询专业律师。
          </p>
        </article>

        <nav className="flex gap-4 text-xs font-serif text-[var(--color-ink-500)]">
          <Link href="/privacy" className="hover:text-[var(--color-vermillion)] transition-colors">
            ← 隐私政策
          </Link>
          <Link href="/" className="hover:text-[var(--color-vermillion)] transition-colors">
            回主页
          </Link>
        </nav>
      </main>
    </>
  )
}
