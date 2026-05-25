/**
 * Loader 文案差异化：
 * - classic（思）保留原本 "取象中" / "断卦中"——动作主导、可操作
 * - ai（观）改为 "正在为你观局…" / "正在为你理事…"——陪伴感、面向用户
 *
 * step < 6 = 早期阶段（六爻还在逐个画出）
 * step >= 6 = 后期阶段（爻已画完，进入闪烁循环）
 */
export type LoaderVariant = 'classic' | 'ai'

export function loaderCopyForVariant(variant: LoaderVariant, step: number): string {
  const isEarly = step < 6
  if (variant === 'ai') {
    return isEarly ? '正在为你观局…' : '正在为你理事…'
  }
  return isEarly ? '取象中' : '断卦中'
}
