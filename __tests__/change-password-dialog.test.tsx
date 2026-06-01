import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChangePasswordDialog } from '@/components/settings/ChangePasswordDialog'

const mockUpdatePassword = vi.fn(async () => ({ error: null }))

function renderDialog(open = true) {
  return render(
    <ChangePasswordDialog open={open} onClose={vi.fn()} updatePassword={mockUpdatePassword} />,
  )
}

describe('ChangePasswordDialog', () => {
  it('renders nothing when open=false', () => {
    const { container } = renderDialog(false)
    expect(container.textContent).toBe('')
  })

  it('renders heading 修改密码', () => {
    renderDialog()
    expect(screen.getByText('修改密码')).toBeTruthy()
  })

  it('disables submit when password < 6 chars', () => {
    renderDialog()
    const input = screen.getByPlaceholderText('新密码（至少 6 位）')
    fireEvent.change(input, { target: { value: '12345' } })
    expect(screen.getByRole('button', { name: '确认修改' })).toBeDisabled()
  })

  it('enables submit when password >= 6 and passwords match', () => {
    renderDialog()
    fireEvent.change(screen.getByPlaceholderText('新密码（至少 6 位）'), {
      target: { value: 'abcdef' },
    })
    fireEvent.change(screen.getByPlaceholderText('再输入一次'), {
      target: { value: 'abcdef' },
    })
    expect(screen.getByRole('button', { name: '确认修改' })).not.toBeDisabled()
  })

  it('disables submit when passwords mismatch', () => {
    renderDialog()
    fireEvent.change(screen.getByPlaceholderText('新密码（至少 6 位）'), {
      target: { value: 'abcdef' },
    })
    fireEvent.change(screen.getByPlaceholderText('再输入一次'), {
      target: { value: 'abcdeg' },
    })
    expect(screen.getByRole('button', { name: '确认修改' })).toBeDisabled()
  })

  it('calls updatePassword and shows success on submit', async () => {
    const onClose = vi.fn()
    render(<ChangePasswordDialog open updatePassword={mockUpdatePassword} onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText('新密码（至少 6 位）'), {
      target: { value: 'newPw123' },
    })
    fireEvent.change(screen.getByPlaceholderText('再输入一次'), {
      target: { value: 'newPw123' },
    })
    fireEvent.click(screen.getByRole('button', { name: '确认修改' }))
    await waitFor(() => expect(mockUpdatePassword).toHaveBeenCalledWith('newPw123'))
    await waitFor(() => expect(screen.getByText('密码已修改')).toBeTruthy())
  })

  it('shows error message on failure', async () => {
    const failUpdate = vi.fn(async () => ({
      error: new Error('Password should be at least 6 characters'),
    }))
    render(<ChangePasswordDialog open updatePassword={failUpdate} onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('新密码（至少 6 位）'), {
      target: { value: 'newPw123' },
    })
    fireEvent.change(screen.getByPlaceholderText('再输入一次'), {
      target: { value: 'newPw123' },
    })
    fireEvent.click(screen.getByRole('button', { name: '确认修改' }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
  })
})
