import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { RestoreAccountBanner } from '@/components/auth/RestoreAccountBanner'

function makeUser(deletedAtSec: number | null) {
  return {
    id: 'u1',
    email: 'old@example.com',
    user_metadata: deletedAtSec === null ? {} : { deleted_at: deletedAtSec },
  } as unknown as Parameters<typeof RestoreAccountBanner>[0]['user']
}

describe('RestoreAccountBanner', () => {
  it('renders nothing when user is null', () => {
    const { container } = render(
      <RestoreAccountBanner user={null} restoreAccount={vi.fn()} now={Date.now()} />,
    )
    expect(container.textContent).toBe('')
  })

  it('renders nothing when user has no deleted_at metadata', () => {
    const { container } = render(
      <RestoreAccountBanner user={makeUser(null)} restoreAccount={vi.fn()} now={Date.now()} />,
    )
    expect(container.textContent).toBe('')
  })

  it('renders banner when deleted_at is within 30 days', () => {
    const nowSec = 1_700_000_000
    const deletedAt = nowSec - 5 * 86400 // 5 days ago
    render(
      <RestoreAccountBanner
        user={makeUser(deletedAt)}
        restoreAccount={vi.fn()}
        now={nowSec * 1000}
      />,
    )
    expect(screen.getByText(/账号已注销/)).toBeTruthy()
    expect(screen.getByText(/30 天/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /恢复账号/ })).toBeTruthy()
  })

  it('shows days remaining (e.g. 25 天后永久删除 if 5 days passed)', () => {
    const nowSec = 1_700_000_000
    const deletedAt = nowSec - 5 * 86400
    render(
      <RestoreAccountBanner
        user={makeUser(deletedAt)}
        restoreAccount={vi.fn()}
        now={nowSec * 1000}
      />,
    )
    expect(screen.getByText(/25 天/)).toBeTruthy()
  })

  it('calls restoreAccount when 恢复账号 clicked', async () => {
    const restoreAccount = vi.fn(async () => ({ error: null }))
    const nowSec = 1_700_000_000
    render(
      <RestoreAccountBanner
        user={makeUser(nowSec - 86400)}
        restoreAccount={restoreAccount}
        now={nowSec * 1000}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /恢复账号/ }))
    await waitFor(() => expect(restoreAccount).toHaveBeenCalled())
  })

  it('shows success after restore (banner content changes)', async () => {
    const restoreAccount = vi.fn(async () => ({ error: null }))
    const nowSec = 1_700_000_000
    render(
      <RestoreAccountBanner
        user={makeUser(nowSec - 86400)}
        restoreAccount={restoreAccount}
        now={nowSec * 1000}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /恢复账号/ }))
    await waitFor(() => expect(screen.getByText(/账号已恢复/)).toBeTruthy())
  })

  it('shows error if restore fails', async () => {
    const restoreAccount = vi.fn(async () => ({
      error: new Error('restore window expired'),
    }))
    const nowSec = 1_700_000_000
    render(
      <RestoreAccountBanner
        user={makeUser(nowSec - 86400)}
        restoreAccount={restoreAccount}
        now={nowSec * 1000}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /恢复账号/ }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
  })
})
