/**
 * AuthProvider tests.
 *
 * 用 mock Supabase client 验证：
 * - 初始 getSession 拉取
 * - onAuthStateChange 订阅
 * - sign in / sign up / sign out 调用
 * - Supabase 未配置时优雅降级（loading=false, user=null）
 */

import { act, render, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '@/lib/auth/auth-provider'
import { useAuth } from '@/lib/auth/use-auth'

const USER_ID = '00000000-0000-4000-8000-000000000001'

type AuthStateCallback = (event: string, session: unknown) => void

type MockSupabase = {
  auth: {
    getSession: ReturnType<typeof vi.fn>
    onAuthStateChange: ReturnType<typeof vi.fn>
    signInWithPassword: ReturnType<typeof vi.fn>
    signUp: ReturnType<typeof vi.fn>
    signInWithOtp: ReturnType<typeof vi.fn>
    resetPasswordForEmail: ReturnType<typeof vi.fn>
    updateUser: ReturnType<typeof vi.fn>
    signOut: ReturnType<typeof vi.fn>
  }
  __triggerAuthChange: (event: string, session: unknown) => void
}

function makeMockSupabase(initialSession: unknown = null): MockSupabase {
  let callback: AuthStateCallback | null = null
  return {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: initialSession }, error: null })),
      onAuthStateChange: vi.fn((cb: AuthStateCallback) => {
        callback = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      }),
      signInWithPassword: vi.fn(async () => ({ data: { user: null, session: null }, error: null })),
      signUp: vi.fn(async () => ({ data: { user: null, session: null }, error: null })),
      signInWithOtp: vi.fn(async () => ({ data: {}, error: null })),
      resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
      updateUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
    __triggerAuthChange: (event, session) => callback?.(event, session),
  }
}

function wrapper(supabase: MockSupabase | null) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <AuthProvider getSupabase={() => supabase as never}>{children}</AuthProvider>
  }
}

describe('AuthProvider initialization', () => {
  it('starts in loading=true and resolves to user=null when no session', async () => {
    const supabase = makeMockSupabase(null)
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(supabase) })

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
  })

  it('resolves to logged-in state when session exists', async () => {
    const session = { user: { id: USER_ID, email: 'user@example.com' }, access_token: 'tok' }
    const supabase = makeMockSupabase(session)
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(supabase) })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user?.id).toBe(USER_ID)
    expect(result.current.session).toEqual(session)
  })

  it('subscribes to onAuthStateChange on mount', async () => {
    const supabase = makeMockSupabase()
    renderHook(() => useAuth(), { wrapper: wrapper(supabase) })
    await waitFor(() => expect(supabase.auth.onAuthStateChange).toHaveBeenCalled())
  })

  it('updates user when auth state changes (sign-in event)', async () => {
    const supabase = makeMockSupabase(null)
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(supabase) })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()

    act(() => {
      supabase.__triggerAuthChange('SIGNED_IN', {
        user: { id: USER_ID, email: 'user@example.com' },
        access_token: 'tok',
      })
    })

    await waitFor(() => expect(result.current.user?.id).toBe(USER_ID))
  })

  it('clears user on SIGNED_OUT event', async () => {
    const supabase = makeMockSupabase({ user: { id: USER_ID }, access_token: 'tok' })
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(supabase) })

    await waitFor(() => expect(result.current.user?.id).toBe(USER_ID))

    act(() => {
      supabase.__triggerAuthChange('SIGNED_OUT', null)
    })

    await waitFor(() => expect(result.current.user).toBeNull())
  })
})

describe('AuthProvider methods', () => {
  it('signInWithPassword forwards to supabase', async () => {
    const supabase = makeMockSupabase()
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(supabase) })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signInWithPassword('a@b.com', 'pw1234')
    })
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pw1234',
    })
  })

  it('signUpWithPassword forwards to supabase.signUp', async () => {
    const supabase = makeMockSupabase()
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(supabase) })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signUpWithPassword('a@b.com', 'pw1234')
    })
    expect(supabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'a@b.com',
        password: 'pw1234',
      }),
    )
  })

  it('signOut calls supabase.signOut', async () => {
    const supabase = makeMockSupabase()
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(supabase) })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signOut()
    })
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })

  it('resetPasswordForEmail forwards', async () => {
    const supabase = makeMockSupabase()
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(supabase) })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.resetPasswordForEmail('a@b.com')
    })
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalled()
  })

  it('updatePassword forwards', async () => {
    const supabase = makeMockSupabase()
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(supabase) })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.updatePassword('newPw1234')
    })
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newPw1234' })
  })

  it('returns error from signInWithPassword failure', async () => {
    const supabase = makeMockSupabase()
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    })
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(supabase) })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let err: unknown = null
    await act(async () => {
      const r = await result.current.signInWithPassword('a@b.com', 'wrong')
      err = r.error
    })
    expect(err).toMatchObject({ message: expect.stringContaining('Invalid login credentials') })
  })
})

describe('AuthProvider when supabase not configured', () => {
  it('still mounts and resolves loading=false with user=null', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider getSupabase={() => null}>{children}</AuthProvider>,
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
  })

  it('signIn returns informative error', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider getSupabase={() => null}>{children}</AuthProvider>,
    })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let err: unknown = null
    await act(async () => {
      const r = await result.current.signInWithPassword('a@b.com', 'pw')
      err = r.error
    })
    expect(err).not.toBeNull()
  })
})

describe('useAuth without provider', () => {
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleError.mockRestore()
  })

  it('throws helpful error when no AuthProvider in tree', () => {
    expect(() => render(<UseAuthProbe />)).toThrow(/AuthProvider/)
  })
})

function UseAuthProbe() {
  useAuth()
  return null
}
