import Link from 'next/link'

export default function VerifyPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-[var(--color-paper-soft,var(--color-paper))]">
      <div className="card-classical bg-[var(--color-paper)] rounded-lg p-8 max-w-md w-full space-y-6 shadow-sm text-center">
        <Link href="/" className="block">
          <span className="font-serif text-2xl text-[var(--color-ink-900)] font-bold">太极</span>
        </Link>
        <h1 className="font-serif text-lg text-[var(--color-ink-800)]">请验证你的邮箱</h1>
        <p className="text-sm font-serif text-[var(--color-ink-600)] leading-relaxed">
          我们已经发送验证 link 到你刚才填写的邮箱。
          <br />
          点击邮件里的 link 完成验证，验证后再回来登录。
        </p>
        <p className="text-xs font-serif text-[var(--color-ink-500)]">
          没收到？检查垃圾邮件文件夹，或
          <Link
            href="/auth/forgot-password"
            className="underline mx-1 hover:text-[var(--color-ink-900)]"
          >
            重新发送
          </Link>
        </p>
        <Link
          href="/login"
          className="block text-sm font-serif underline text-[var(--color-ink-600)] hover:text-[var(--color-ink-900)]"
        >
          返回登录
        </Link>
      </div>
    </main>
  )
}
