'use client'

import { useContext } from 'react'

import { AuthContext, type AuthContextValue } from './auth-context'

/**
 * 在 AuthProvider 子树内获取当前 auth 状态 + 方法。
 * 未包裹 AuthProvider 时 throw（fail-fast 暴露 bug）。
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth 必须在 <AuthProvider> 内调用')
  }
  return ctx
}
