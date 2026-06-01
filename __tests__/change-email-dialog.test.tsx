import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChangeEmailDialog } from '@/components/settings/ChangeEmailDialog'

const mockUpdateEmail = vi.fn(async () => ({ error: null }))

function renderDialog(open = true) {
  return render(
    <ChangeEmailDialog
      open={open}
      currentEmail="old@example.com"
      onClose={vi.fn()}
      updateEmail={mockUpdateEmail}
    />,
  )
}

describe('ChangeEmailDialog', () => {
  it('renders nothing when open=false', () => {
    const { container } = renderDialog(false)
    expect(container.textContent).toBe('')
  })

  it('renders heading 修改邮箱', () => {
    renderDialog()
    expect(screen.getByText('修改邮箱')).toBeTruthy()
  })

  it('disables submit when email is empty or invalid', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: '发送验证邮件' })).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText('新邮箱'), {
      target: { value: 'invalid' },
    })
    expect(screen.getByRole('button', { name: '发送验证邮件' })).toBeDisabled()
  })

  it('disables submit when new email equals current email', () => {
    renderDialog()
    fireEvent.change(screen.getByPlaceholderText('新邮箱'), {
      target: { value: 'old@example.com' },
    })
    expect(screen.getByRole('button', { name: '发送验证邮件' })).toBeDisabled()
  })

  it('enables submit for valid different email', () => {
    renderDialog()
    fireEvent.change(screen.getByPlaceholderText('新邮箱'), {
      target: { value: 'new@example.com' },
    })
    expect(screen.getByRole('button', { name: '发送验证邮件' })).not.toBeDisabled()
  })

  it('calls updateEmail and shows success', async () => {
    renderDialog()
    fireEvent.change(screen.getByPlaceholderText('新邮箱'), {
      target: { value: 'new@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: '发送验证邮件' }))
    await waitFor(() => expect(mockUpdateEmail).toHaveBeenCalledWith('new@example.com'))
    await waitFor(() => expect(screen.getByText(/验证邮件已发送/)).toBeTruthy())
  })

  it('shows error on failure', async () => {
    const failUpdate = vi.fn(async () => ({
      error: new Error('Email already registered'),
    }))
    render(
      <ChangeEmailDialog
        open
        currentEmail="old@example.com"
        updateEmail={failUpdate}
        onClose={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByPlaceholderText('新邮箱'), {
      target: { value: 'new@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: '发送验证邮件' }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
  })
})
