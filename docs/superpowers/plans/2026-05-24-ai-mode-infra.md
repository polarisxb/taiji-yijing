# Plan: AI 模式基础设施补齐（B1）

**Spec:** `docs/superpowers/specs/2026-05-24-ai-mode-infra-design.md`
**Branch:** `devin/1779612605-ai-mode-parity`
**Base:** `main` (post-merge `790276c`)

## 步骤

1. **数据模型扩展**（无 migration、向下兼容）
   - `lib/zheng/types.ts` — 新增 `AiConfidence`、`AiYaoPrediction`、`ConsultMode`；扩 `ConsultationRecord` 加 optional `aiYao` + `consultMode`
   - `lib/zheng/schema.ts` — 同步加 zod schema
   - `lib/zheng/store.ts` — re-export 新类型

2. **置信度映射工具**
   - 新建 `lib/zheng/confidence.ts`：`confidenceToScore`（high=0.9 / medium=0.65 / low=0.4）+ `confidenceLabel`（中文标签）

3. **保存按钮支持新数据**
   - `components/zheng/SaveConsultationButton.tsx` — 加 optional `aiYao` + `consultMode` props，转发给 `saveRecord`
   - `components/MatchCard.tsx` — 在经典调用点传 `consultMode="classic"`

4. **错误状态组件**
   - 新建 `components/InlineErrorState.tsx`：rose 左竖条 + 文案 + 可选重试按钮

5. **主问询页改造**（`app/page.tsx`）
   - 引入新组件 + `confidenceToScore`
   - Loading 时（AI 模式）加「取消」按钮 → 调 `ai.cancel()`
   - Error 时用 `InlineErrorState`，重试 = 重新调 submit
   - AI done 但无 matchData + 无 error → 显示空结果文案
   - AI Results 区底部加 `SaveConsultationButton`，aiYao 由 `aiHexagram.yao[position-1].name` 拿名字

6. **详情页扩展**（`app/history/[id]/page.tsx`）
   - 顶部时间戳旁加 mode 徽章（AI 模式 / 经典模式 / 老记录不显示）
   - 在 yaoLocation 区块下方加 aiYao 区块：显示 AI 定位 + 置信度 + brief

7. **测试**
   - `__tests__/zheng-store.test.ts` — 加 aiYao + consultMode round-trip 测试
   - `__tests__/zheng-confidence.test.ts` — 新文件，覆盖映射函数
   - `__tests__/zheng-import.test.ts` — 验导入接受新字段、拒绝非法值

8. **验证 + 出 PR**
   - typecheck / lint / test / build 全过
   - 提交 + push + 开 PR

## 验证清单

- [x] typecheck（tsc --noEmit）通过
- [x] 156 tests pass（新增 8 个）
- [x] lint 无新警告
- [x] build 成功

## 不在此 PR 内（B2）

- 经典模式 / AI 模式各自身份深化（不同 UX 气质）
- AI 模式加 YaoLocator 二次定位
- Top 3 显示决策（AI 是否展示 runners）
- 移动端适配 / a11y
