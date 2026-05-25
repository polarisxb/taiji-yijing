'use client'

/**
 * AuthProvider — 包裹整个 app 的 client component。
 *
 * 职责：
 * - 初始化时 getSession()
 * - 订阅 onAuthStateChange 维护 user/session 状态
 * - 暴露 signInWithPassword / signUpWithPassword / signOut / resetPasswordForEmail / updatePassword / updateEmail / requestAccountDeletion / restoreAccount
 * - Supabase 未配置时优雅降级（视为永远未登录）
 *
 * 测试时通过 `getSupabase` prop 注入 mock client。
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, SupabaseClient, User } from '@supabase/supabase-js'

import { createBrowserClient } from '@/lib/supabase/client'

import { AuthContext, type AuthContextValue, type AuthMethodResult } from './auth-context'

const NOT_CONFIGURED_ERROR = new Error('Supabase 未配置：缺少 NEXT_PUBLIC_SUPABASE_URL 或 ANON_KEY')

export type AuthProviderProps = {
  children: ReactNode
  /** 注入 Supabase client；默认从环境变量读 */
  getSupabase?: () => SupabaseClient | null
}

export function AuthProvider({ children, getSupabase }: AuthProviderProps) {
  const supabase = useMemo<SupabaseClient | null>(
    () => (getSupabase ? getSupabase() : createBrowserClient()),
    [getSupabase],
  )

  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let mounted = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return
        setSession(data.session)
        setUser(data.session?.user ?? null)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
    })

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [supabase])

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<AuthMethodResult> => {
      if (!supabase) return { error: NOT_CONFIGURED_ERROR }
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error }
    },
    [supabase],
  )

  const signUpWithPassword = useCallback(
    async (email: string, password: string): Promise<AuthMethodResult> => {
      if (!supabase) return { error: NOT_CONFIGURED_ERROR }
      const emailRedirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: emailRedirectTo ? { emailRedirectTo } : undefined,
      })
      return { error }
    },
    [supabase],
  )

  const resetPasswordForEmail = useCallback(
    async (email: string): Promise<AuthMethodResult> => {
      if (!supabase) return { error: NOT_CONFIGURED_ERROR }
      const redirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : undefined
      const { error } = await supabase.auth.resetPasswordForEmail(
        email,
        redirectTo ? { redirectTo } : undefined,
      )
      return { error }
    },
    [supabase],
  )

  const updatePassword = useCallback(
    async (newPassword: string): Promise<AuthMethodResult> => {
      if (!supabase) return { error: NOT_CONFIGURED_ERROR }
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      return { error }
    },
    [supabase],
  )

  const updateEmail = useCallback(
    async (newEmail: string): Promise<AuthMethodResult> => {
      if (!supabase) return { error: NOT_CONFIGURED_ERROR }
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      return { error }
    },
    [supabase],
  )

  const requestAccountDeletion = useCallback(async (): Promise<AuthMethodResult> => {
    if (!supabase) return { error: NOT_CONFIGURED_ERROR }
    const { error } = await supabase.rpc('request_account_deletion')
    return { error }
  }, [supabase])

  const restoreAccount = useCallback(async (): Promise<AuthMethodResult> => {
    if (!supabase) return { error: NOT_CONFIGURED_ERROR }
    const { error } = await supabase.rpc('restore_account')
    return { error }
  }, [supabase])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }, [supabase])

  const value: AuthContextValue = {
    user,
    session,
    loading,
    signInWithPassword,
    signUpWithPassword,
    resetPasswordForEmail,
    updatePassword,
    updateEmail,
    requestAccountDeletion,
    restoreAccount,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
