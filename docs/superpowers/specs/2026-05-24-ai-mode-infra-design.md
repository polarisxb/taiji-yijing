# Spec: AI 模式基础设施补齐（B1）

**Date:** 2026-05-24
**Status:** Draft (pending review)
**Branch:** `devin/1779612605-ai-mode-parity`

## 背景

PR #5 (D 包) merge 后，两个查询模式（经典 / AI）功能不对齐：

- 经典模式有「记此一卦」按钮，AI 模式没有 → 用户用 AI 模式问完无法保存到「履」
- `useStreamingConsult` hook 已有 `cancel()` 方法但没接 UI
- 错误使用裸 `<p>{error}</p>` 渲染在主问询区上方，体验差
- AI 流式可能没返回 matchData（接口超时、API 失败、空响应）但无空结果提示

经过 brainstorming，决定**先做跨模式基础设施（B1），再做模式身份深化（B2）**。本 spec 只覆盖 B1。

## 范围（B1）

跨模式的、跟身份无关的"基本功能"：

1. **保存到「履」** — AI 模式加 `SaveConsultationButton`，复用现有组件
2. **取消进行中请求** — AI 流式期间显示「取消」按钮
3. **错误友好提示** — 提取 `<InlineErrorState>` 组件，带「重试」按钮
4. **空结果状态** — AI 完成但无 matchData 时显示空态文案

不在范围内（B2 处理）：

- 经典 / AI 模式各自的身份深化（如 AI 流式 reasoning 步进、经典模式的"义理派"美化、Top 3 显示决策等）
- 加 YaoLocator 到 AI 模式
- 移动端 / a11y
- 国际化

## 数据模型变更（向下兼容，无需 migration）

在 `ConsultationRecord` 加两个**可选**字段：

```ts
export type AiYaoPrediction = {
  position: 1 | 2 | 3 | 4 | 5 | 6
  name: string // 衍生自 hexagram.yao[position-1].name，如 "九五"
  brief: string // matchData.yaoBrief
  confidence: 'high' | 'medium' | 'low'
}

export type ConsultationRecord = {
  // ...existing fields...
  /** AI 模式独有：模型对爻位的判断（区别于用户手动 YaoLocator 的 yaoLocation） */
  aiYao?: AiYaoPrediction
  /** 标识此条记录来自哪种问询模式，便于详情页区分渲染 & 未来分析 */
  consultMode?: 'classic' | 'ai'
}
```

**关键判断**：

- 两个字段都 optional → 老记录（PR #3 / #5 创建的）天然兼容，无需 migration
- `schemaVersion` 保持 `1` — 这是 additive 改动，不是 breaking
- AI 的爻位**不**塞进现有 `yaoLocation`，因为 `yaoLocation.topRatio` 语义是"用户勾了几个 indicator / 总数"，对 AI 无意义；强行造假数据会污染未来分析

Zod schema 同步加 optional 字段。

## fitScore 在 AI 模式下的映射

`fitScore` 当前是 0..1 的必填数字。AI 模式没有"几分"的概念，但有 `confidence: 'high' | 'medium' | 'low'`。映射：

| confidence | fitScore |
| ---------- | -------- |
| high       | 0.9      |
| medium     | 0.65     |
| low        | 0.4      |

理由：保证现有列表卡 / 详情页继续工作；详情页同时显示 `consultMode === 'ai'` 标签 + `aiYao.confidence` 文字，用户能看出这个 0.9 是 AI 给的而不是经典的 word/feature/theme 综合分。

## UI 变更

### app/page.tsx

**AI 结果区（`mode === 'ai' && ai.matchData && aiHexagram`）：**

底部追加 `SaveConsultationButton`，props：

```tsx
<SaveConsultationButton
  situation={situation.trim()}
  hexagramId={aiHexagram.number}
  hexagramName={aiHexagram.name.chinese}
  fitScore={confidenceToScore(ai.matchData.confidence)}
  aiYao={{
    position: ai.matchData.yaoPosition,
    name: aiHexagram.yao[ai.matchData.yaoPosition - 1].name,
    brief: ai.matchData.yaoBrief,
    confidence: ai.matchData.confidence,
  }}
  consultMode="ai"
/>
```

**AI 流式中（`mode === 'ai' && ai.loading`）：**

在主问询区下方（或在结果区内）显示状态条：

```
正在解读…           [取消]
```

点取消调用 `ai.cancel()`。

**错误状态（`mode === 'ai' && ai.error`）：**

替换原 `<p className="text-rose-600">{error}</p>` 为 `<InlineErrorState>`：

```
[!] {error message}      [重试]
```

重试 = 用同 situation 再调一次 `ai.submit(situation.trim())`。

**空结果状态（`mode === 'ai' && ai.done && !ai.matchData && !ai.error`）：**

```
未匹配到合适的卦象。这通常意味着情境描述不够具体；
请补充关键细节（你的角色 / 当前阶段 / 你最关心什么），再问一次。

[重新问询]
```

「重新问询」= 清空 `ai` state + focus 回 textarea。

### components/zheng/SaveConsultationButton.tsx

新增两个 optional props：

```ts
type Props = {
  situation: string
  hexagramId: number
  hexagramName: string
  fitScore: number
  yaoLocation?: SavedYaoLocation
  aiYao?: AiYaoPrediction // NEW
  consultMode?: 'classic' | 'ai' // NEW
}
```

`handleSave` 把它们原样转发给 `zhengStore.saveRecord`。

### components/InlineErrorState.tsx (新建)

```ts
type Props = {
  message: string
  onRetry?: () => void
  retryLabel?: string
}
```

视觉：`bg-rose-50/40` 浅红底 + 左竖红条 + 文案 + 右侧重试按钮。复用 PR #5 的 toast 风格。

### app/history/[id]/page.tsx

详情页加：

- 顶部卦名旁加 mode 标签：`consultMode === 'ai'` → 显示 `AI 模式` 小徽章；`'classic'` → `经典模式`；undefined → 不显示（老记录）
- `aiYao` 存在时新增一个 section：
  ```
  AI 定位
  第 {aiYao.position} 爻 · {aiYao.name}    [置信 {confidence label}]
  {aiYao.brief}
  ```
- `yaoLocation` 渲染逻辑不变（两者互斥：经典模式记录有 yaoLocation；AI 模式记录有 aiYao；不会同时存在）

## 测试

### 单元测试

- `__tests__/zheng-schema.test.ts`（如果不存在则新建）：验证 `aiYao` + `consultMode` 字段过 zod；遗漏字段时报错（aiYao 内部字段必填）
- `__tests__/zheng-store.test.ts`：扩展 round-trip 测试覆盖 aiYao + consultMode 的写入和读出
- `__tests__/zheng-import.test.ts`：导入 1 条带 aiYao + consultMode 的 record 验证 schema 通过

### 组件测试

- `SaveConsultationButton` 测试：props 传 aiYao 时调用 saveRecord 携带 aiYao；不传时不携带
- `InlineErrorState` 测试：点重试触发 onRetry

### 现场测试（出 PR 后）

- AI 模式问询 → 保存 → /history 看到这条记录 → 点进详情显示"AI 模式"徽章 + AI 定位 section
- AI 流式中点取消 → 请求 abort
- 模拟 API 失败（disconnect 或 mock 后端）→ 看到错误状态 + 重试
- 模拟空响应 → 看到空态文案

## 文件清单

新建：

- `components/InlineErrorState.tsx`
- `docs/superpowers/plans/2026-05-24-ai-mode-infra.md`

修改：

- `lib/zheng/types.ts` — 加 AiYaoPrediction、扩 ConsultationRecord
- `lib/zheng/schema.ts` — 加 zod 字段
- `components/zheng/SaveConsultationButton.tsx` — 接收新 props
- `app/page.tsx` — AI 区加 Save / Cancel / Error / Empty
- `app/history/[id]/page.tsx` — 渲染 aiYao + mode 徽章
- `__tests__/zheng-store.test.ts`、`__tests__/zheng-import.test.ts`

## 非目标 / YAGNI

- 不做后台请求 retry policy（重试是用户点按钮触发，不是自动）
- 不做错误分类（5xx vs 4xx vs 网络）— 一律展示 error message
- 不做 partial state 保存（流式中途取消不保留 partial interpretation；下一次重试是全新请求）
- 不做"AI 模式回看"统计（B2 / E 包可能涉及）

## 风险 / 注意

- **fitScore 映射可能误导用户**：详情页必须清晰显示这是 AI 给的判断，避免用户误以为是经典 matcher 算出来的精确分数
- **aiYao + yaoLocation 互斥**：实现时用 React 条件渲染保证，但 schema 不强制（用户未来手动编辑 JSON 导入时可能同时有）
- **取消时机**：cancel() 后 `ai.loading` → false，但 `ai.matchData` 可能已经部分到达（流式 match 事件先于 interpretation 事件）；这种情况下取消按钮该不该让 matchData 仍可见？决定：保留已到的 matchData，只清空 interpretation；用户看见部分结果但能保存
