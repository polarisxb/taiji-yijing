# AI 混合匹配系统设计文档

> Phase 2b — Embedding 粗筛 + LLM CoT 精判 + 个性化解读

## 一、目标

将现有的纯规则匹配引擎升级为 AI 混合架构，实现：

1. 语义级特征抽取（替代正则词典）
2. 高精度卦象匹配（Embedding + CoT 推理）
3. 精确爻位定位（先推断 + 可修正）
4. 个性化解读生成（分层约束）

## 二、架构总览

```
用户输入（自然语言）
    ↓
模块 ①  LLM 特征抽取
    │   DeepSeek + Structured Output (Zod schema)
    │   输出: SituationDimension（与现有类型对齐）
    ↓
模块 ②  Embedding 向量粗筛（卦 ≥ 20 时启用）
    │   DeepSeek Embedding
    │   64 卦描述预计算向量 → cosine similarity → top 5
    │   卦 < 20 时跳过，全量传给模块 ③
    ↓
模块 ③  LLM CoT 精判
    │   DeepSeek + Chain-of-Thought prompt
    │   从候选卦中推理选择最终匹配 + 输出推理过程
    ↓
模块 ④  LLM 爻位定位
    │   DeepSeek + Structured Output
    │   判断用户在第几爻 + 置信度
    │   用户可在前端手动修正
    ↓
模块 ⑤  LLM 个性化解读
    │   DeepSeek + 内容文件 context
    │   分层约束：义理部分严格引用、情境部分半开放
    ↓
流式输出到前端
```

## 三、技术选型

| 组件        | 选择               | 理由                                     |
| ----------- | ------------------ | ---------------------------------------- |
| AI 框架     | Vercel AI SDK 6    | 与 Next.js 无缝集成、TypeScript 类型安全 |
| LLM         | DeepSeek (chat)    | 中文最强之一、成本极低                   |
| Embedding   | DeepSeek Embedding | 统一 API Key、中文表现好                 |
| Schema 约束 | Zod                | AI SDK 原生支持、类型安全                |

### API Key 管理

- 环境变量 `DEEPSEEK_API_KEY`
- `.env.local` 存储（已在 .gitignore 中）
- 前端不暴露 Key，所有 LLM 调用走 Server-Side API Route

## 四、模块详细设计

### 模块 ① LLM 特征抽取

**输入**：用户自然语言描述
**输出**：`Partial<SituationDimension>`（与 lib/types.ts 对齐）

```typescript
// AI SDK Structured Output
const result = await generateObject({
  model: deepseek('deepseek-chat'),
  schema: situationDimensionSchema, // Zod schema
  prompt: userInput,
  system: `你是一位情境分析专家。请从用户的描述中提取以下维度...`,
})
```

**约束**：Zod schema 保证输出只含合法枚举值，不会出现自由文本。

### 模块 ② Embedding 向量粗筛

**预计算**（构建时或首次启动时）：

- 每卦生成一段摘要文本（judgment.modernReading + appliesWhen + 核心特征）
- 调用 DeepSeek Embedding API 得到向量
- 缓存为 JSON 文件

**查询时**：

- 用户输入 → embedding → cosine similarity → top 5

**开关**：`ALL_HEXAGRAMS.length < 20` 时跳过此模块，全量传给模块 ③。

### 模块 ③ LLM CoT 精判

**System Prompt 核心**：

```
你是一位义理派易经学者。不做占卜，只做情境模式匹配。

请按以下步骤分析：
1. 用户的核心困境是什么？（底层矛盾，非表面问题）
2. 这个困境的结构特征（阶段、力量对比、变化方向）
3. 逐一分析每个候选卦与用户情境的吻合度
4. 给出最终判断和推理理由
```

**输出格式**（Structured Output）：

```typescript
{
  selectedNumber: number        // 最终匹配的卦号
  reasoning: string            // 推理过程（可展开查看）
  confidence: 'high' | 'medium' | 'low'
  runners: number[]            // 次选卦号（备选）
}
```

### 模块 ④ 爻位定位

**输入**：匹配到的卦 + 用户原始描述 + 6 爻完整内容
**输出**：

```typescript
{
  yaoPosition: number // 1-6
  confidence: 'high' | 'medium' | 'low'
  brief: string // 一句话解释为什么是这一爻
}
```

**前端交互**：

- 默认高亮推断的爻位
- 显示置信度标签
- 用户点击其他爻 → 切换高亮（已有 YaoTimeline 组件支持）

### 模块 ⑤ 个性化解读

**分层约束策略**：

| 内容层         | 约束级别  | 规则                                         |
| -------------- | --------- | -------------------------------------------- |
| 卦辞、象传原文 | 🔒 不生成 | 直接引用内容文件，LLM 不参与                 |
| 义理解读       | 🔒 严格   | LLM 只能基于 classicalCommentary 内容润色    |
| 情境映射       | 🔓 半开放 | LLM 可结合用户具体场景做类比延伸             |
| 爻位建议       | 🔓 半开放 | 基于 yao.actionable + 用户情境生成个性化建议 |

**System Prompt 关键约束**：

```
你是义理派易经学者。以下是这一卦的完整内容（由编辑团队审核）。

规则：
1. 卦辞和象传原文必须逐字引用，不得修改
2. 义理解读只能基于以下注释内容润色，不得添加原文没有的解读
3. 情境映射可以结合用户的具体场景做类比，但核心观点必须来自内容文件
4. 绝不做预测、占卜、算命
5. 不使用感叹号，语气克制
```

**输出**：流式文本，前端用打字机效果渲染。

## 五、API 设计

### 新增 `/api/consult-ai` (POST)

与现有 `/api/consult` 并行，不替换。

**Request**：

```typescript
{
  situation: string
}
```

**Response**（流式 SSE）：

```typescript
// 第一段：匹配结果（快速返回）
{ type: 'match', data: { hexagram, reasoning, confidence, yaoPosition } }

// 第二段：个性化解读（流式）
{ type: 'interpretation', delta: '你正处于...' }

// 结束
{ type: 'done' }
```

### 降级策略

DeepSeek API 不可用时 → 返回 `{ type: 'error', message: '服务暂时不可用，请稍后重试' }`

不回退到规则引擎，不给不准确的结果。

## 六、前端改动

### 新增组件

- `ConsultAI` — 替代当前的提交逻辑，调用 `/api/consult-ai`
- `ReasoningPanel` — 可折叠的推理过程展示（「为什么是这一卦？」）
- `StreamingInterpretation` — 流式打字机渲染个性化解读

### 修改组件

- `YaoTimeline` — 接收 AI 推断的 yaoPosition + confidence，显示置信度标签
- `MatchCard` — 新增推理折叠区 + 个性化解读区

## 七、数据流文件映射

| 文件                                  | 变更                                  |
| ------------------------------------- | ------------------------------------- |
| `lib/ai/deepseek.ts`                  | 新增：DeepSeek provider 配置          |
| `lib/ai/schemas.ts`                   | 新增：Zod schemas（特征、精判、爻位） |
| `lib/ai/prompts.ts`                   | 新增：System prompts（5 个模块）      |
| `lib/ai/embedding.ts`                 | 新增：Embedding 预计算 + 查询         |
| `lib/ai/consult-agent.ts`             | 新增：Agent 主流程编排                |
| `app/api/consult-ai/route.ts`         | 新增：流式 API 端点                   |
| `components/ConsultAI.tsx`            | 新增：AI 问卦前端组件                 |
| `components/ReasoningPanel.tsx`       | 新增：推理折叠面板                    |
| `components/StreamingText.tsx`        | 新增：流式文本渲染                    |
| `hooks/useStreamingConsult.ts`        | 新增：SSE 流式 hook                   |
| `components/hexagram/YaoTimeline.tsx` | 修改：加置信度标签                    |
| `components/MatchCard.tsx`            | 修改：加推理区 + 解读区               |

## 八、升级路径

当前架构（③ 混合）→ 未来升级（④ 多 Agent 辩论）：

```
现在：Embedding → 1 个 LLM 精判 → 结果
未来：Embedding → Agent A（阶段派）
                → Agent B（关系派）  → 辩论 → 共识 → 结果
                → Agent C（仲裁者）
```

只需修改 `consult-agent.ts` 中的精判逻辑，其余模块不变。

## 九、成本估算

| 模块         | 每次调用 tokens | 成本（DeepSeek） |
| ------------ | --------------- | ---------------- |
| ① 特征抽取   | ~500            | ¥0.0005          |
| ② Embedding  | ~200            | ¥0.0001          |
| ③ CoT 精判   | ~2000           | ¥0.002           |
| ④ 爻位定位   | ~1000           | ¥0.001           |
| ⑤ 个性化解读 | ~1500           | ¥0.0015          |
| **合计**     | **~5200**       | **¥0.005/次**    |

每次问卦约 5 厘钱。1000 次问卦 = ¥5。

## 十、前置条件

- [ ] DeepSeek API Key（用户需注册 platform.deepseek.com）
- [ ] 安装依赖：`ai`, `@ai-sdk/deepseek`, `zod`
