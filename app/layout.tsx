import type { Metadata } from 'next'
import { Noto_Serif_SC } from 'next/font/google'
import './globals.css'

import { AuthProvider } from '@/lib/auth/auth-provider'

export const metadata: Metadata = {
  title: '太极 · 易经决策框架',
  description:
    '把 64 卦当作情境原型，不当占卜——用 3000 年前的中国版决策模式语言，分析你今天面对的局面。',
}

const notoSerifSc = Noto_Serif_SC({
  weight: ['400', '600', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-serif-sc',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={notoSerifSc.variable}>
      <body className="min-h-screen antialiased animate-page-enter">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
