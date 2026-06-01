/**
 * 把 Supabase / 应用内部 auth 错误转为 friendly 中文文案。
 *
 * 规则：先匹配已知 case，未知 case 兜底显示原文。
 */

export type AuthErrorShape = { message?: string; name?: string } | Error | null

export function authErrorToMessage(err: AuthErrorShape): string {
  if (!err) return ''
  const message = ('message' in err ? err.message : String(err)) ?? ''

  if (!message) return ''

  if (message.includes('Invalid login credentials')) return '邮箱或密码错误'
  if (message.includes('User already registered')) return '该邮箱已注册，去登录吧'
  if (message.includes('already registered')) return '该邮箱已注册'
  if (message.includes('Email not confirmed')) return '请先点击邮箱里的验证 link'
  if (message.includes('Password should be')) return '密码至少 6 位'
  if (message.includes('New email address should be different')) return '新邮箱不能与当前邮箱相同'

  // A3 account governance specific errors (raised by request_account_deletion / restore_account RPCs)
  if (message === 'not authenticated') return '尚未登录，请重新登录后再试'
  if (message === 'account not deleted') return '账号未注销，无需恢复'
  if (message === 'restore window expired') return '已超过 30 天恢复窗口，账号已永久注销'

  if (message === 'network' || message.toLowerCase().includes('failed to fetch')) {
    return '网络断开，请检查连接后重试'
  }

  if (message === 'auth' || message.toLowerCase().includes('jwt')) {
    return '登录已过期，请重新登录'
  }

  return `出错了：${message}`
}
