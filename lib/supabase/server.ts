/**
 * Supabase server client（Route Handler / Server Component / Server Action）。
 *
 * 使用 Next.js cookies API 透传 Supabase 的 session cookies，保持 SSR auth state。
 *
 * 用法：
 *   const supabase = await createServerSupabaseClient()
 *   const { data: { user } } = await supabase.auth.getUser()
 */

import { cookies } from 'next/headers'
import { createServerClient as _createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

import { getSupabaseEnv } from './client'

export async function createServerSupabaseClient(): Promise<SupabaseClient | null> {
  const env = getSupabaseEnv()
  if (!env) return null

  const cookieStore = await cookies()
  return _createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Component (read-only)：Supabase 文档说可忽略
        }
      },
    },
  })
}
