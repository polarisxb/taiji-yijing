# B2 PR-1: 信息架构差异化（D'）

> 让「经典 = 结构性义理」和「AI = 情境性义理」在视觉上一眼可辨。

## 约束

- **两个模式都保持义理派**——取义理面非占卜。不加占卜、象数、运势。
- 不动节奏 / 动效 / 文案语气（PR-2 做）。
- 不动 DivinationLoader、InlineErrorState 文案、空结果文案。
- 不拆路由——两个模式仍在同一 `app/page.tsx`。
- schemaVersion 保持 1，数据模型不变。

## 1. 新组件：`AiResultCard`

从 `app/page.tsx` 的 AI Results section（line 288-371）提取为独立组件。

### 视觉差异（vs 经典 MatchCard）

| 属性                       | 经典 MatchCard                                          | AiResultCard                                                         |
| -------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------- |
| **top 区**                 | 左卦象 + 中标题/reasoning tags + **右 fitScore 大数字** | 左卦象 + 中标题/yao brief + **右 confidence 文字徽章**               |
| **fitScore**               | `85` 金色大字 + `契合` 标注                             | **不显示**；用文字 confidence 替代                                   |
| **confidence 徽章**        | 无                                                      | `定见` / `待审` / `审慎` — 暖底暖边                                  |
| **ReasoningPanel**         | 无                                                      | 保留，折叠态。但"为什么是这一卦？"按钮里的 badge 也用 定见/待审/审慎 |
| **features / keywords**    | `<details>` 展示「观系统所取之象」                      | **不显示**                                                           |
| **YaoLocator**             | rank 1 内嵌                                             | **不显示**                                                           |
| **解读区**                 | 无                                                      | StreamingText 流式解读                                               |
| **深入此卦 link**          | 有                                                      | 有                                                                   |
| **SaveConsultationButton** | rank 1 内嵌                                             | 内嵌                                                                 |
| **底部 ScoreChip**         | 词·象·意 三项细分                                       | **不显示**                                                           |
| **accent 色**              | 冷墨 `--color-ink-*`                                    | 暖灰 `#a89884`（用于 confidence 徽章底色、卡片微妙左边框）           |

### Props

```ts
type AiResultCardProps = {
  hexagram: Hexagram
  matchData: MatchData
  interpretation: string
  done: boolean
  situation: string
}
```

### Confidence 徽章样式

```
定见 → bg-[#f5f0e8] text-[#7a6e5d] border-[#c4b99a]  (暖纸底 / 暖棕字 / 暖金边)
待审 → bg-amber-50 text-amber-700 border-amber-300     (复用现有 amber)
审慎 → bg-rose-50/40 text-rose-600 border-rose-300      (复用现有 rose)
```

## 2. 修改 `lib/zheng/confidence.ts`

```ts
export function confidenceLabel(confidence: AiConfidence): string {
  switch (confidence) {
    case 'high':
      return '定见'
    case 'medium':
      return '待审'
    case 'low':
      return '审慎'
  }
}
```

同步更新 `ReasoningPanel.tsx` 的 `CONFIDENCE_LABELS`：

```ts
const CONFIDENCE_LABELS = {
  high: { text: '定见', color: 'text-[#7a6e5d] bg-[#f5f0e8] border-[#c4b99a]' },
  medium: { text: '待审', color: 'text-amber-700 bg-amber-50 border-amber-300' },
  low: { text: '审慎', color: 'text-rose-700 bg-rose-50 border-rose-300' },
}
```

## 3. 修改 `app/page.tsx`

### AI Result Section

- 替换内联 JSX → `<AiResultCard>` 组件调用
- 在 result section 分割线下方加**模式自我介绍**：
  ```
  以情境取象 · 由你的局直入义理脉络
  ```
  样式：`text-[10px] tracking-[0.3em] text-[var(--color-ink-400)] font-serif text-center mb-6`

### Classic Result Section

- 在 "三卦应之" header 上方加**模式自我介绍**：

  ```
  以结构定象 · 由 64 卦原型与你的局相参
  ```

  样式同上（10px / tracking / ink-400）

- `<details>` for features/keywords: 加 `open` 属性使其**默认展开**（经典模式强调"让你看见骨架"）

## 4. 修改 `app/history/[id]/page.tsx`

### 契合度行

当前（line 107-117）：

```
当时匹配 · 屯（契合度 85%）
```

改为按 mode 分支：

- **classic / undefined**：保持 `契合度 {Math.round(fitScore * 100)}%`
- **ai**：显示 `确信度 定见/待审/审慎`（调用 `confidenceLabel(record.aiYao.confidence)`）

### AI 定位行

当前（line 134-150）用 `置信 高/中/低` — 改为 `确信 定见/待审/审慎`。

### Mode 徽章颜色

当前（line 82-89）AI 模式用 vermillion 边框。不变——已经是暖色了。

## 5. 修改 `components/zheng/RecordCard.tsx`

在 hexagramName 后面加 mode 指示器（小文字）：

```tsx
{
  record.consultMode === 'ai' && <span className="text-[10px] font-serif text-[#a89884]">· AI</span>
}
```

不给 classic 加标签（classic 是默认态，加了反而噪音）。

## 6. 不动的文件

- `MatchCard.tsx` — 经典专用，已经符合"结构性义理"，不改
- `DivinationLoader.tsx` — PR-2
- `InlineErrorState.tsx` — PR-2
- `StreamingText.tsx` — PR-2 做 fade-in
- `hooks/useStreamingConsult.ts` — 不改

## 7. 测试

- 更新 `__tests__/zheng-confidence.test.ts` 断言新的 label（定见/待审/审慎）
- 新增 snapshot / render test for `AiResultCard` 基本渲染
- 确保现有 156+ tests 仍绿

## 8. 估算

~350 行改动（1 个新组件 ~180 行 + page.tsx ~60 行 + confidence ~20 行 + ReasoningPanel ~10 行 + history detail ~30 行 + RecordCard ~5 行 + tests ~45 行）
