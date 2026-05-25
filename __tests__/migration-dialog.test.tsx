/**
 * MigrationDialog tests.
 *
 * 首次登录后弹出，3 选项：
 * - 合并到云端（默认）
 * - 仅使用云端账号（保留本机但当前不可见）
 * - 先导出本机数据
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MigrationDialog } from '@/components/auth/MigrationDialog'

const RECORD_COUNT = 12

describe('MigrationDialog UI', () => {
  it('shows the local record count', () => {
    render(
      <MigrationDialog
        localCount={RECORD_COUNT}
        onMerge={vi.fn()}
        onCloudOnly={vi.fn()}
        onExport={vi.fn()}
        onDefer={vi.fn()}
      />,
    )
    const matches = screen.getAllByText(new RegExp(`${RECORD_COUNT}`))
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('defaults to "合并到云端" radio selected', () => {
    render(
      <MigrationDialog
        localCount={RECORD_COUNT}
        onMerge={vi.fn()}
        onCloudOnly={vi.fn()}
        onExport={vi.fn()}
        onDefer={vi.fn()}
      />,
    )
    const merge = screen.getByLabelText(/合并到云端/) as HTMLInputElement
    expect(merge.checked).toBe(true)
  })

  it('renders all three options', () => {
    render(
      <MigrationDialog
        localCount={RECORD_COUNT}
        onMerge={vi.fn()}
        onCloudOnly={vi.fn()}
        onExport={vi.fn()}
        onDefer={vi.fn()}
      />,
    )
    expect(screen.getByLabelText(/合并到云端/)).toBeInTheDocument()
    expect(screen.getByLabelText(/仅使用云端/)).toBeInTheDocument()
    expect(screen.getByLabelText(/先导出/)).toBeInTheDocument()
  })

  it('calls onMerge when "合并" selected + 确认 clicked', async () => {
    const onMerge = vi.fn().mockResolvedValue(undefined)
    render(
      <MigrationDialog
        localCount={RECORD_COUNT}
        onMerge={onMerge}
        onCloudOnly={vi.fn()}
        onExport={vi.fn()}
        onDefer={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /确认|开始/ }))
    await waitFor(() => expect(onMerge).toHaveBeenCalled())
  })

  it('calls onCloudOnly when "仅使用云端" selected + 确认 clicked', async () => {
    const onCloudOnly = vi.fn().mockResolvedValue(undefined)
    render(
      <MigrationDialog
        localCount={RECORD_COUNT}
        onMerge={vi.fn()}
        onCloudOnly={onCloudOnly}
        onExport={vi.fn()}
        onDefer={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByLabelText(/仅使用云端/))
    fireEvent.click(screen.getByRole('button', { name: /确认|开始/ }))
    await waitFor(() => expect(onCloudOnly).toHaveBeenCalled())
  })

  it('calls onExport when "先导出" selected + 确认 clicked', async () => {
    const onExport = vi.fn().mockResolvedValue(undefined)
    render(
      <MigrationDialog
        localCount={RECORD_COUNT}
        onMerge={vi.fn()}
        onCloudOnly={vi.fn()}
        onExport={onExport}
        onDefer={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByLabelText(/先导出/))
    fireEvent.click(screen.getByRole('button', { name: /确认|开始/ }))
    await waitFor(() => expect(onExport).toHaveBeenCalled())
  })

  it('calls onDefer when 稍后再说 clicked', () => {
    const onDefer = vi.fn()
    render(
      <MigrationDialog
        localCount={RECORD_COUNT}
        onMerge={vi.fn()}
        onCloudOnly={vi.fn()}
        onExport={vi.fn()}
        onDefer={onDefer}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /稍后/ }))
    expect(onDefer).toHaveBeenCalled()
  })

  it('disables buttons while merge handler is in-flight', async () => {
    let resolveFn: (() => void) | null = null
    const onMerge = vi.fn(
      () =>
        new Promise<void>((r) => {
          resolveFn = r as () => void
        }),
    )
    render(
      <MigrationDialog
        localCount={RECORD_COUNT}
        onMerge={onMerge}
        onCloudOnly={vi.fn()}
        onExport={vi.fn()}
        onDefer={vi.fn()}
      />,
    )
    const confirm = screen.getByRole('button', { name: /确认|开始/ })
    fireEvent.click(confirm)
    await waitFor(() => expect(onMerge).toHaveBeenCalled())
    expect(confirm).toBeDisabled()
    ;(resolveFn as unknown as () => void | null)?.()
  })

  it('displays an error when merge handler rejects', async () => {
    const onMerge = vi.fn().mockRejectedValue(new Error('network'))
    render(
      <MigrationDialog
        localCount={RECORD_COUNT}
        onMerge={onMerge}
        onCloudOnly={vi.fn()}
        onExport={vi.fn()}
        onDefer={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /确认|开始/ }))
    await waitFor(() => {
      expect(screen.getByText(/网络|失败|重试/i)).toBeInTheDocument()
    })
  })

  it('does not render when localCount is 0', () => {
    const { container } = render(
      <MigrationDialog
        localCount={0}
        onMerge={vi.fn()}
        onCloudOnly={vi.fn()}
        onExport={vi.fn()}
        onDefer={vi.fn()}
      />,
    )
    expect(container.firstChild).toBeNull()
  })
})
