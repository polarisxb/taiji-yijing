# B2 PR-2: 节奏与微交互差异化（F）

> 让「经典 = 思」（用户主动参与）和「AI = 观」（用户被动接受）在交互节奏上不同。

## 约束

- 假设 PR-1（信息架构）已合入 main。
- 不动信息架构、不动颜色、不动组件拆分。
- 只动：文案、动画、出现时机。
- 仍然 schemaVersion 1，数据模型不变。

## 1. 文案差异化（两套 copy）

### Loader 文案

`DivinationLoader.tsx`：

|        | 当前                     | 经典（思）                           | AI（观）                                       |
| ------ | ------------------------ | ------------------------------------ | ---------------------------------------------- |
| 主提示 | "取象中" / "断卦中" 交替 | **保持现状**（动作主导：取象、断卦） | "**正在为你观局…**" / "**正在为你理事…**" 交替 |

实现：`DivinationLoader` 加一个 prop `variant: 'classic' | 'ai'`，分两套 copy。

### 空结果文案（仅 AI 模式）

当前（`app/page.tsx` 280-284）：

```
未匹配到合适的卦象。这通常意味着情境描述不够具体——
补充关键细节（你的角色 / 当前阶段 / 最关心什么）后再问一次。
```

改为更"陪伴感"的文案：

```
看了你的局，AI 暂时未能定下一卦。
试着补几句——你的角色 / 当前最关心什么 / 已经做过什么——AI 会更懂你。
```

### Error 文案

`InlineErrorState` 现在是一个通用组件。调用处分两套 message：

- 经典：保持现有错误（直陈式 "请求失败：500"）
- AI：在 `app/page.tsx` 中包装错误消息，加一句友好前缀：
  ```
  AI 在路上遇到点意外：{原始 error}
  ```

实现：不改 InlineErrorState 本体，只改 page.tsx 中传给 `<InlineErrorState message={...}>` 的字符串。

## 2. AI 解读流式 fade-in

### `StreamingText.tsx` 改造

当前所有文字直接显示。改造为：

- 把 `text` 按句号 / 换行符切成段
- 每段渲染时按 `index` 加 CSS `animation: fadeIn 200ms ease-out forwards`，每段延迟 50ms
- 已经渲染过的段保持稳定（用 React `key` 防止重复动画）

实现细节：

- 在组件内 track 已渲染的段数
- 新增的段从 opacity:0 + translateY(4px) fade 到 opacity:1 + translateY(0)
- 旧的段不动画（避免每次 text 变化时旧文字闪烁）

```tsx
const segments = useMemo(() => splitIntoSegments(text), [text])
const [animatedCount, setAnimatedCount] = useState(0)

useEffect(() => {
  // mark newly added segments as "to animate"
  setAnimatedCount(segments.length)
}, [segments.length])

return (
  <div>
    {segments.map((seg, i) => (
      <span
        key={i}
        style={{
          opacity: 1,
          animation: i >= animatedCount - delta ? 'fadeIn 200ms ease-out both' : 'none',
          animationDelay: `${(i - (animatedCount - delta)) * 50}ms`,
        }}
      >
        {seg}
      </span>
    ))}
    {!done && <Cursor />}
  </div>
)
```

边界情况：

- text 为空时不渲染
- done=true 后，停止任何新动画
- 流式追加时只对新追加的段做动画

## 3. AI 模式 loader 柔和脉冲

`DivinationLoader.tsx` 当 `variant='ai'` 时：

- 六爻绘制速度从 350ms 放慢到 500ms（更"慢思考"感）
- 闪烁的爻色从 vermillion 改为 `#a89884` 暖灰（跟 PR-1 暖灰 accent 呼应）
- 主提示文字 `tracking-widest` 增加到 `tracking-[0.5em]`，更舒缓

## 4. AI 保存按钮 fade-in

`AiResultCard.tsx`（PR-1 创建）—— 在 `SaveConsultationButton` 外包一层：

```tsx
<div
  style={{
    animation: done ? 'fadeUp 600ms cubic-bezier(0.16,1,0.3,1) 200ms both' : 'none',
    opacity: done ? 1 : 0,
  }}
>
  <SaveConsultationButton ... />
</div>
```

效果：AI 解读完成（`done=true`）后，保存按钮在 200ms 后柔和渐出，避免突兀。

经典模式不动——用户在 YaoLocator 后保存，已经有"主动节奏"了。

## 5. 不做的事

- ❌ 不加"30 秒静思倒计时"（γ 级，PR-2 不做）
- ❌ 不加"AI 解读后 5 秒静观延迟"（γ 级，PR-2 不做）
- ❌ 不改信息架构（PR-1 做了）
- ❌ 不加 follow-up 问答（独立 feature，不属于 B2）

## 6. 测试

- DivinationLoader: variant prop 渲染分两套文案的 unit test
- StreamingText: 流式追加时新段才动画的 test（用 jest fake timers）
- Empty / Error: 文案断言更新

## 7. 估算

~250 行（DivinationLoader ~30 行 + StreamingText ~80 行 + page.tsx ~30 行 + AiResultCard fade-in ~10 行 + CSS keyframes ~10 行 + tests ~90 行）
