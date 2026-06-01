/**
 * Supabase browser client（A 包 A1）。
 *
 * 仅在浏览器端使用；SSR / Route Handler 用 `./server.ts`。
 *
 * 通过环境变量配置：
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * 没配环境变量时返回 null，调用方应优雅降级（视为"未登录"模式）。
 */

import { createBrowserClient as _createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  return { url, anonKey }
}

/** 是否已配置 Supabase（用来在 UI 上判定要不要显示登录入口） */
export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null
}

/**
 * 浏览器 client（单例）。
 *
 * 未配置环境变量时返回 null。调用方应处理 null（视为未登录）。
 */
export function createBrowserClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null
  if (_client) return _client
  const env = getSupabaseEnv()
  if (!env) return null
  _client = _createBrowserClient(env.url, env.anonKey)
  return _client
}
