# Plan: B2 PR-2 节奏与微交互差异化

Spec: [docs/superpowers/specs/2026-05-24-mode-identity-rhythm.md](../specs/2026-05-24-mode-identity-rhythm.md)

Base: PR-1 (#7) 的分支 `devin/1779619466-mode-identity-info-arch`（stacked PR）。

## Approach

TDD on pure logic. UI-only changes get manual verification only (per PR-1 lesson).

Pure logic to extract + test:

- `splitInterpretationSegments(text)`: split AI streaming text into segments for staggered fade-in
- `loaderCopyForVariant(variant, phase)`: which copy to show for classic vs AI loader

Visual changes (no auto test):

- Empty/error copy strings (asserted via string-match unit tests where reasonable)
- CSS keyframes for fade-in
- AI loader pacing + color
- Save button fade-in wrapper

## Tasks

- [ ] T1: Write tests for `splitInterpretationSegments` (RED)
- [ ] T2: Implement `splitInterpretationSegments` as pure function in `lib/streaming-segments.ts` (GREEN)
- [ ] T3: Refactor `StreamingText` to use segments + stagger fade-in CSS
- [ ] T4: Write tests for `loaderCopyForVariant` (RED)
- [ ] T5: Implement helper + refactor `DivinationLoader` to accept `variant` prop (GREEN)
- [ ] T6: Update `app/page.tsx`:
  - pass `variant={mode}` to `DivinationLoader`
  - new empty-state copy (AI-specific, more "陪伴感")
  - wrap error message with AI prefix when `mode === 'ai'`
- [ ] T7: AI loader visual: when `variant === 'ai'`, use暖灰 `#a89884` flash + slower pacing (500ms)
- [ ] T8: AiResultCard: wrap `SaveConsultationButton` in fade-in container triggered by `done`
- [ ] T9: Add CSS keyframe `fadeSegmentIn` in `app/globals.css` (if not present)
- [ ] T10: Run lint/typecheck/test/build
- [ ] T11: Commit + push + open PR (base = PR-1 branch)

## Out of scope (γ-level)

- 30-second 静思 countdown in YaoLocator
- 5-second 静观 delay after AI interpretation done

These were explicitly skipped per Q4 (β over γ).

## Verification

- All existing tests (162) + new tests still pass
- `npm run typecheck` / `lint` / `build` clean
- Manual smoke: loader text differs, AI segments fade in, AI save button delayed
