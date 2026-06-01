/**
 * Auth context value 类型 + context 对象。
 *
 * 拆成单独文件方便 client/server component 共用 / tree-shake，
 * provider 与 hook 各自 import 这里的 context。
 */

import { createContext } from 'react'
import type { AuthError, Session, User } from '@supabase/supabase-js'

export type AuthMethodResult = { error: AuthError | Error | null }

export type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithPassword: (email: string, password: string) => Promise<AuthMethodResult>
  signUpWithPassword: (email: string, password: string) => Promise<AuthMethodResult>
  resetPasswordForEmail: (email: string) => Promise<AuthMethodResult>
  updatePassword: (newPassword: string) => Promise<AuthMethodResult>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
