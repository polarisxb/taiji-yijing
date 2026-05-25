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
  /** 调用后 Supabase 会发验证邮件到新地址；未点验证 link 前邮箱不会变更 */
  updateEmail: (newEmail: string) => Promise<AuthMethodResult>
  /** 请求注销账号（30 天软删、可撤回） */
  requestAccountDeletion: () => Promise<AuthMethodResult>
  /** 30 天内撤回注销账号 */
  restoreAccount: () => Promise<AuthMethodResult>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
