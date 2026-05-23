# C 模块：卦象详情页 — 决策纵深体验

## 设计哲学

> 用户来治病，走时带着对中医的敬意。

以用户决策为主线，以文化浸润为暗线。不是易经百科，而是「决策旅程的纵深空间」。叙事结构采用传统注疏体：**经 → 传 → 按 → 行**。

## 用户画像与动机

- 用户已在首页输入情境，得到匹配结果
- 点击某卦想深入了解：**「我在哪一步？下一步是什么？」**
- 想要具体的行动参照：**「有没有类似的真实案例？」**
- 不是来学易经的，但会在过程中被文化浸润

## 页面架构

### 1. 入口

**从匹配结果进入（主入口）：**

- `MatchCard` 组件新增「深入此卦 →」链接
- 跳转到 `/hexagram/[id]`
- 可携带 query param `?from=consult&phase=emerging` 用于自动高亮爻位

**从全览页进入（辅助入口）：**

- `/hexagrams` 页面，8×8 网格
- 简约入口，不是重点

### 2. 详情页 `/hexagram/[id]` — 六层卷轴叙事

整个页面是纵向叙事卷轴，每一层滚动进入时淡入。

#### 第一层：卦首（Hero）

```
组件: HexagramHero

内容:
- 卦序 + 卦名（中/拼音/英）
- 上下卦标注（如 ☵ 坎上 · 震下 ☳）
- 交互式卦象图（hover 某爻高亮，点击跳到该爻段落）
- 返回动线：浮动顶栏「← 回到你的问卦结果」（仅从 consult 页跳转时显示）
```

视觉：居中排版，大字卦名，卦象图有呼吸光晕。

#### 第二层：经

```
组件: ClassicalText

内容:
- 卦辞原文（judgment.text）
- 大象传原文（image.text）
```

视觉：

- 大号宋体居中
- 标点用朱砂色
- 字间有留白（letter-spacing: 0.15em）
- 上下大量留白，营造「展卷」感

#### 第三层：传

```
组件: InterpretationSection

内容:
- judgment.modernReading
- image.modernReading
- classicalCommentary（程颐/朱熹/王弼注释，如有）
```

视觉：

- 字号略小于「经」
- 行间距大（line-height: 2.2）
- 义理派注释用古典引用样式（.classical-quote）
- 节奏慢，像老先生讲课

#### 第四层：按（情境映射）

```
组件: SituationMapping

内容:
- appliesWhen 列表 — 用户能对号入座的现代情境
- parallels.modernCases — 真实案例（标注成/败/杂）
- parallels.westernPhilosophy — 西方哲学共鸣点
- parallels.literature — 文学影视参照
```

视觉：

- 情境列表用圆点标记
- 案例用卡片式排列（域名 + 结局标签）
- 哲学引用用金色左边框

#### 第五层：六爻阶段图（核心交互）

```
组件: YaoTimeline

内容:
- 纵向时间线，从初爻（底）到上爻（顶）
- 每一爻 = 一个阶段节点
- 每个节点可展开，展开后显示该爻的「经→传→按→行」：
  - 经: yao.text（爻辞原文）
  - 传: yao.modernReading（义理释读）
  - 按: yao.scenario（典型现代场景）
  - 行: yao.actionable（可执行建议列表）

交互:
- 点击爻节点 → 展开该爻详情，其他爻收起（手风琴）
- 如果 URL 含 ?phase=emerging，自动高亮 + 展开最匹配的爻
- 展开时有 SmoothExpand 动画（复用现有组件）
- 时间线左侧标注爻名（初九、六二...），右侧标注阶段关键词
```

视觉：

- 纵向线用墨色渐变
- 当前展开的爻节点用朱砂高亮
- 未展开的节点用金色小圆点
- 整体像一条河流从上游到下游

**爻位自动定位逻辑：**

```
phase → yao 映射规则：
  germinal  → 初爻（第1爻）
  emerging  → 第2爻
  developing → 第3爻
  peak      → 第4-5爻
  declining → 第5爻
  ending    → 上爻（第6爻）
```

#### 第六层：行（可执行建议汇总）

```
组件: ActionSummary

内容:
- 基于当前卦 + 爻的 actionable 字段
- 按时间尺度分组：今天 / 本周 / 本月
- antiPatterns 作为「避免」清单
```

视觉：

- 建议用勾选框样式（但不可交互，纯视觉）
- 反模式用淡红色背景 + 删除线暗示「不要这样做」

#### 第七层：卦象关系（文化暗线）

```
组件: RelatedHexagrams

内容:
- 叙事式引导，不是百科式罗列
- 综卦（翻转）："屯极则蒙 — 困难过后是蒙昧初开"
- 错卦（取反）
- 互卦（内卦）
- 以「如果你的情境发展下去...」为叙事线索连接相关卦

注意: 只链接已完成的卦，骨架卦不展示关系
```

视觉：

- 每个相关卦用小卡片 + 一句话叙事
- 点击可跳转到对应卦的详情页

### 3. 全览页 `/hexagrams`

简约入口页，非重点。

```
组件: HexagramGrid

内容:
- 8×8 网格，每格：卦象符号 + 卦名
- hover 显示 appliesWhen 第一句
- 已完成卦 = 正常显示
- 骨架卦 = 淡化 + 「即将到来」
- 顶部可按情境类型筛选（archetype tag 栏）
```

## 组件清单

| 组件                  | 路径                                            | 职责                   |
| --------------------- | ----------------------------------------------- | ---------------------- |
| HexagramHero          | `components/hexagram/HexagramHero.tsx`          | 卦首展示（名/象/卦图） |
| ClassicalText         | `components/hexagram/ClassicalText.tsx`         | 经文大字排版           |
| InterpretationSection | `components/hexagram/InterpretationSection.tsx` | 传 — 义理解读          |
| SituationMapping      | `components/hexagram/SituationMapping.tsx`      | 按 — 情境映射 + 跨文化 |
| YaoTimeline           | `components/hexagram/YaoTimeline.tsx`           | 六爻阶段图（核心交互） |
| ActionSummary         | `components/hexagram/ActionSummary.tsx`         | 行 — 可执行建议        |
| RelatedHexagrams      | `components/hexagram/RelatedHexagrams.tsx`      | 卦象关系（暗线）       |
| HexagramGrid          | `components/hexagram/HexagramGrid.tsx`          | 64 卦全览网格          |
| FloatingBackBar       | `components/hexagram/FloatingBackBar.tsx`       | 浮动返回栏             |

## 路由

| 路由             | 文件                         | 渲染方式                   |
| ---------------- | ---------------------------- | -------------------------- |
| `/hexagram/[id]` | `app/hexagram/[id]/page.tsx` | SSG (generateStaticParams) |
| `/hexagrams`     | `app/hexagrams/page.tsx`     | SSG                        |

## 数据流

```
content/hexagrams/*.ts
        ↓
  ALL_HEXAGRAMS（已有）
        ↓
  generateStaticParams() → 为每个已有卦生成静态页
        ↓
  page.tsx 接收 params.id → 查找对应 Hexagram → 传入组件
```

不需要新的数据源、API 或数据库。

## 类型扩展

```typescript
// lib/types.ts 新增（用于卦象关系）
export type HexagramRelation = {
  type: 'complementary' | 'inverse' | 'nuclear' | 'sequence'
  targetNumber: number
  narrative: string // 叙事性描述，如「屯极则蒙」
}
```

在 Hexagram 类型中新增可选字段：

```typescript
relations?: HexagramRelation[]
```

## CSS 新增

| 样式               | 用途                     |
| ------------------ | ------------------------ |
| `.classical-large` | 经文大字居中排版         |
| `.yao-timeline`    | 纵向时间线容器           |
| `.yao-node`        | 爻节点（未展开）         |
| `.yao-node-active` | 爻节点（展开，朱砂高亮） |
| `.phase-indicator` | 阶段自动高亮提示         |

## 不做的事（YAGNI）

- ❌ 内容管理后台 — 直接改 TS 文件
- ❌ 评论/社交功能
- ❌ 交互式卦象生成器（偏离决策主线）
- ❌ 搜索功能（3 卦不需要，64 卦时再加）
- ❌ 打印/PDF 导出
- ❌ 动态 OG image（后续 Phase 做）

## 成功标准

1. 从匹配结果点击卦名 → 进入详情页 → 完整阅读体验流畅
2. 六爻阶段图可展开/收起，自动定位用户所处阶段
3. 页面叙事节奏为「经→传→按→行」，文化感自然渗透
4. 骨架卦（无完整内容）优雅降级，不报错不显示空白
5. Lighthouse 性能 > 90（SSG 静态页）
6. 所有新组件有对应测试
