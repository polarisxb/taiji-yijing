# Plan: B2 PR-1 信息架构差异化

Spec: [docs/superpowers/specs/2026-05-24-mode-identity-info-arch.md](../specs/2026-05-24-mode-identity-info-arch.md)

## Approach

TDD where applicable. Order = least-risky → most-visible:

1. **confidence labels**（纯文本，无 UI 依赖）
2. **ReasoningPanel** 同步新 labels
3. **AiResultCard** 新组件（提取 page.tsx 中的 AI 区）
4. **page.tsx** 接入 AiResultCard + 加自我介绍 + classic features 默认展开
5. **history/[id]** 模式感知显示
6. **RecordCard** AI 小标识
7. lint / typecheck / test / build

## Tasks

- [ ] T1: Update `lib/zheng/confidence.ts` confidenceLabel → 定见/待审/审慎; update test
- [ ] T2: Update `components/ReasoningPanel.tsx` CONFIDENCE_LABELS to match
- [ ] T3: Create `components/AiResultCard.tsx` extracted from page.tsx AI section
- [ ] T4: Update `app/page.tsx`:
  - import AiResultCard, replace AI section JSX
  - add self-intro line above AI result
  - add self-intro line above classic result
  - make classic features/keywords `<details open>`
- [ ] T5: Update `app/history/[id]/page.tsx`:
  - mode-aware fitScore display (AI shows confidence text)
  - AI 定位 row: "确信 定见/待审/审慎" (already auto-updated via confidenceLabel)
- [ ] T6: Update `components/zheng/RecordCard.tsx` add `· AI` indicator for AI records
- [ ] T7: Add basic render test for AiResultCard
- [ ] T8: Run lint / typecheck / test / build
- [ ] T9: Commit + push + open PR

## Verification

- All existing tests pass (156+)
- `npm run typecheck` clean
- `npm run lint` clean (allow pre-existing SmoothExpand warnings)
- `npm run build` clean
- Manual smoke (after PR): AI mode shows 定见/待审/审慎 + no fitScore; classic shows fitScore + features default open
