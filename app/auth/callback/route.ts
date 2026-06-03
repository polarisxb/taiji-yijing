/**
 * Supabase OAuth / email-confirmation callback handler.
 *
 * Supabase 邮件 link 会重定向到这里（带 `code` 查询参数），
 * 我们用 server-side client 交换为 session（写入 cookie），然后跳到 next 或 /。
 */

import { NextResponse } from 'next/server'

import { safeRedirectPath } from '@/lib/auth/redirect'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeRedirectPath(searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=not_configured`)
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  return NextResponse.redirect(new URL(next, origin))
}
