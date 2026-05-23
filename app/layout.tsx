import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '太极 · 易经决策框架',
  description:
    '把 64 卦当作情境原型，不当占卜——用 3000 年前的中国版决策模式语言，分析你今天面对的局面。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased animate-page-enter">{children}</body>
    </html>
  )
}
