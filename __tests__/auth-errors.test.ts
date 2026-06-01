import { describe, expect, it } from 'vitest'

import { authErrorToMessage } from '@/lib/auth/errors'

describe('authErrorToMessage', () => {
  it('returns empty string for null', () => {
    expect(authErrorToMessage(null)).toBe('')
  })

  it('translates Invalid login credentials', () => {
    const msg = authErrorToMessage(new Error('Invalid login credentials'))
    expect(msg).toContain('邮箱或密码')
  })

  it('translates User already registered', () => {
    const msg = authErrorToMessage(new Error('User already registered'))
    expect(msg).toMatch(/已注册|登录/)
  })

  it('translates Email not confirmed', () => {
    const msg = authErrorToMessage(new Error('Email not confirmed'))
    expect(msg).toMatch(/邮箱|验证/)
  })

  it('translates Password should be at least 6 characters', () => {
    const msg = authErrorToMessage(new Error('Password should be at least 6 characters'))
    expect(msg).toMatch(/密码|6/)
  })

  it('translates network error', () => {
    const msg = authErrorToMessage(new Error('network'))
    expect(msg).toMatch(/网络|连接/)
  })

  it('translates auth expired', () => {
    const msg = authErrorToMessage(new Error('auth'))
    expect(msg).toMatch(/登录|重新/)
  })

  it('preserves unknown messages as fallback', () => {
    const msg = authErrorToMessage(new Error('something weird'))
    expect(msg).toContain('something weird')
  })

  it('handles AuthError-shaped object', () => {
    const fakeAuthError = { name: 'AuthError', message: 'Invalid login credentials' }
    const msg = authErrorToMessage(fakeAuthError as Error)
    expect(msg).toContain('邮箱或密码')
  })
})
