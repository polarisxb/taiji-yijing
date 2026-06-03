import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}))

import { GET } from '@/app/auth/callback/route'

describe('auth callback route', () => {
  beforeEach(() => {
    mocks.exchangeCodeForSession.mockReset()
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null })
    mocks.createServerSupabaseClient.mockReset()
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: { exchangeCodeForSession: mocks.exchangeCodeForSession },
    })
  })

  it('redirects valid same-site next paths after exchanging the code', async () => {
    const response = await GET(
      new Request('https://taiji.example/auth/callback?code=ok&next=/history/123?from=login'),
    )

    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('ok')
    expect(response.headers.get('location')).toBe('https://taiji.example/history/123?from=login')
  })

  it('does not redirect to attacker-controlled hosts via next', async () => {
    const response = await GET(
      new Request('https://taiji.example/auth/callback?code=ok&next=@evil.example'),
    )

    expect(response.headers.get('location')).toBe('https://taiji.example/')
  })
})
