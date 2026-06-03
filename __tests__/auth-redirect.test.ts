import { describe, expect, it } from 'vitest'

import { safeRedirectPath } from '@/lib/auth/redirect'

describe('safeRedirectPath', () => {
  it('allows same-site absolute paths', () => {
    expect(safeRedirectPath('/history/abc?tab=notes#top')).toBe('/history/abc?tab=notes#top')
  })

  it('falls back for external or ambiguous destinations', () => {
    expect(safeRedirectPath('https://evil.example/steal')).toBe('/')
    expect(safeRedirectPath('//evil.example/steal')).toBe('/')
    expect(safeRedirectPath('/\\evil.example/steal')).toBe('/')
    expect(safeRedirectPath('@evil.example')).toBe('/')
    expect(safeRedirectPath('settings')).toBe('/')
  })
})
