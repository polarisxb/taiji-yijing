import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DeleteAccountFlow } from '@/components/auth/DeleteAccountFlow'

function renderFlow(
  opts: {
    open?: boolean
    recordCount?: number
    requestDelete?: () => Promise<{ error: Error | null }>
    onClose?: () => void
    onDeleted?: () => void
    onExportJson?: () => Promise<void> | void
    onExportMarkdown?: () => Promise<void> | void
  } = {},
) {
  const onClose = opts.onClose ?? vi.fn()
  const onDeleted = opts.onDeleted ?? vi.fn()
  const requestDelete = opts.requestDelete ?? vi.fn(async () => ({ error: null }))
  const onExportJson = opts.onExportJson ?? vi.fn()
  const onExportMarkdown = opts.onExportMarkdown ?? vi.fn()
  return {
    onClose,
    onDeleted,
    requestDelete,
    onExportJson,
    onExportMarkdown,
    ...render(
      <DeleteAccountFlow
        open={opts.open ?? true}
        recordCount={opts.recordCount ?? 5}
        requestAccountDeletion={requestDelete}
        onClose={onClose}
        onDeleted={onDeleted}
        onExportJson={onExportJson}
        onExportMarkdown={onExportMarkdown}
      />,
    ),
  }
}

describe('DeleteAccountFlow', () => {
  it('renders nothing when open=false', () => {
    const { container } = renderFlow({ open: false })
    expect(container.textContent).toBe('')
  })

  it('step 1 (warning): shows record count + 30-day notice + 我再想想/继续 buttons', () => {
    renderFlow({ recordCount: 12 })
    expect(screen.getByText(/注销账号/)).toBeTruthy()
    expect(screen.getByText(/12/)).toBeTruthy()
    expect(screen.getByText(/30 天内可登录撤回/)).toBeTruthy()
    expect(screen.getByRole('button', { name: '我再想想' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '继续 →' })).toBeTruthy()
  })

  it('我再想想 closes the flow', () => {
    const onClose = vi.fn()
    renderFlow({ onClose })
    fireEvent.click(screen.getByRole('button', { name: '我再想想' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('step 2 (backup): 继续 advances to backup step with export options', () => {
    renderFlow()
    fireEvent.click(screen.getByRole('button', { name: '继续 →' }))
    expect(screen.getByText(/建议先备份你的数据/)).toBeTruthy()
    expect(screen.getByRole('button', { name: '导出 JSON' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '导出 Markdown' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '已备份，继续 →' })).toBeTruthy()
  })

  it('clicking 导出 JSON calls onExportJson but stays on step 2', async () => {
    const onExportJson = vi.fn()
    renderFlow({ onExportJson })
    fireEvent.click(screen.getByRole('button', { name: '继续 →' }))
    fireEvent.click(screen.getByRole('button', { name: '导出 JSON' }))
    await waitFor(() => expect(onExportJson).toHaveBeenCalled())
    // Still on backup step
    expect(screen.getByText(/建议先备份你的数据/)).toBeTruthy()
  })

  it('step 3 (confirm): submit disabled until phrase matches', () => {
    renderFlow()
    fireEvent.click(screen.getByRole('button', { name: '继续 →' }))
    fireEvent.click(screen.getByRole('button', { name: '已备份，继续 →' }))

    const submit = screen.getByRole('button', { name: '确认注销' })
    expect(submit).toBeDisabled()

    const input = screen.getByPlaceholderText('注销账号')
    fireEvent.change(input, { target: { value: '注销' } })
    expect(submit).toBeDisabled()

    fireEvent.change(input, { target: { value: '注销账号' } })
    expect(submit).not.toBeDisabled()
  })

  it('step 4 (done): submits → calls requestAccountDeletion → shows done step', async () => {
    const onDeleted = vi.fn()
    const requestDelete = vi.fn(async () => ({ error: null }))
    renderFlow({ requestDelete, onDeleted })
    fireEvent.click(screen.getByRole('button', { name: '继续 →' }))
    fireEvent.click(screen.getByRole('button', { name: '已备份，继续 →' }))
    fireEvent.change(screen.getByPlaceholderText('注销账号'), {
      target: { value: '注销账号' },
    })
    fireEvent.click(screen.getByRole('button', { name: '确认注销' }))

    await waitFor(() => expect(requestDelete).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText(/账号已注销/)).toBeTruthy())
    expect(screen.getByText(/30 天内仍可用同样的邮箱/)).toBeTruthy()
  })

  it('step 4 (done): 返回主页 button calls onDeleted', async () => {
    const onDeleted = vi.fn()
    renderFlow({ onDeleted })
    fireEvent.click(screen.getByRole('button', { name: '继续 →' }))
    fireEvent.click(screen.getByRole('button', { name: '已备份，继续 →' }))
    fireEvent.change(screen.getByPlaceholderText('注销账号'), {
      target: { value: '注销账号' },
    })
    fireEvent.click(screen.getByRole('button', { name: '确认注销' }))
    await waitFor(() => expect(screen.getByText(/账号已注销/)).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /返回主页/ }))
    expect(onDeleted).toHaveBeenCalled()
  })

  it('shows error if requestAccountDeletion fails (stays on confirm step)', async () => {
    const requestDelete = vi.fn(async () => ({
      error: new Error('not authenticated'),
    }))
    renderFlow({ requestDelete })
    fireEvent.click(screen.getByRole('button', { name: '继续 →' }))
    fireEvent.click(screen.getByRole('button', { name: '已备份，继续 →' }))
    fireEvent.change(screen.getByPlaceholderText('注销账号'), {
      target: { value: '注销账号' },
    })
    fireEvent.click(screen.getByRole('button', { name: '确认注销' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    // Still on confirm step
    expect(screen.queryByText(/账号已注销/)).toBeNull()
  })
})
