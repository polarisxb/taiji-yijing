const DEFAULT_REDIRECT_PATH = '/'
const SAFE_REDIRECT_BASE = 'https://taiji.local'

export function safeRedirectPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return DEFAULT_REDIRECT_PATH

  try {
    const parsed = new URL(value, SAFE_REDIRECT_BASE)
    if (parsed.origin !== SAFE_REDIRECT_BASE) return DEFAULT_REDIRECT_PATH
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return DEFAULT_REDIRECT_PATH
  }
}
