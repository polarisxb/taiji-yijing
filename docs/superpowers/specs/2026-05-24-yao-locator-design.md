# 爻位定位问卷 — Yao Locator

## 设计哲学

> 爻位是流动的，不是命中注定的标签。  
> 工具的任务是把用户的「自我观察」与「卦的阶段刻度」对齐，而不是替用户拍板。

义理派立场延续到这里：

- 不引入随机性（同样勾选 → 同样输出）
- 透明可解释（每条 indicator 显示属于哪一爻；不藏算法）
- 鼓励「跨爻」诊断（卡在两阶段之间，本身就是有价值的信号）

## 用户画像与动机

用户已经匹配到一卦（如乾），点开 MatchCard 或进入卦详情页，想回答一个问题：

> **「这卦我懂了——但我具体在六阶段的哪一阶？」**

爻辞和 actionable 高度阶段相关：处在初九（潜龙勿用）的人若读到上九（亢龙有悔）的建议会用错药。

## 范围（In Scope）

1. 一个可复用的问卷组件，输入一卦的 `yao[]`，输出 6 爻的得分排名。
2. 显式分组：按爻名展示该爻的 `indicators`，用户多选。
3. 结果区：6 爻得分横向条形图 + Top 1 详读（modernReading / scenario / actionable）+ 跨爻提示（次高 ≥ Top 1 × 0.8 时触发）。
4. 在 `MatchCard` 顶卦（rank 1）里默认展示该问卷入口；在 `/hexagram/[id]` 详情页的 `YaoTimeline` 之前展示。
5. 纯客户端逻辑，无 API。
6. 测试覆盖：`scoreYao` 纯函数的 TDD 单元测试 + 组件渲染/交互测试（vitest）。

## 范围外（Out of Scope，留给后续 PR）

- ❌ 持久化（localStorage / 服务端）— 留给「征」模块统一做
- ❌ 跨卦的通用阶段定位器（不绑定具体卦）— 工程量大，独立 PR
- ❌ 「盲选模式」开关 — 默认透明版本先发布，看反馈再加
- ❌ 把问卷结果回写到 matcher（提升 phase 特征精度）— 独立 PR

## 算法

### 数据来源

每爻已有的 `indicators: string[]`（3-5 条）。无需修改 `Hexagram` 类型，无需新增内容。

### 评分函数

```ts
type YaoScore = {
  position: 1 | 2 | 3 | 4 | 5 | 6
  yaoName: string // "初九" / "九二" / ...
  hits: number // 用户勾选的数量
  total: number // 该爻 indicators 总数
  ratio: number // hits / total，0-1
}

type LocatorResult = {
  scores: YaoScore[] // 按 position 升序（1→6），便于按时间线渲染
  topPosition: 1 | 2 | 3 | 4 | 5 | 6
  topRatio: number
  crossYao:
    | false
    | {
        secondPosition: 1 | 2 | 3 | 4 | 5 | 6
        secondRatio: number
        narrative: string // "你也明显落在九四——这种『跨爻』通常意味着你正在过渡"
      }
}

function scoreYao(yao: Yao[], selectedIndicators: Set<string>): LocatorResult
```

**关键规则：**

1. `ratio = hits / total` —— 用比例而非绝对数，避免「indicator 多的爻不公平占优」。
2. **Top 1**：`ratio` 最高者；并列时取 `position` 较高者（因为后期的爻通常代表更明确的当下；可在测试里固化此约定）。
3. **Cross-yao**：仅当次高 `ratio ≥ topRatio × 0.8` 且次高 `ratio ≥ 0.3` 时触发（避免在所有人都只勾一两条时假阳性）。
4. **全 0 输入**：不应该发生（UI 禁用提交按钮），但函数必须容错——返回 `topPosition` = 1，所有 `ratio` = 0。
5. **完全平局**：UI 允许，逻辑按 (2) 规则破平局；Top 1 显示横幅「你在 N、M 爻势均力敌——重新审视你最近 1-2 周的具体行为」。

### 确定性

- `selectedIndicators` 用 `Set<string>` 输入，遍历 yao 时按 `position` 升序——避免 Set 迭代顺序泄漏。
- 不使用 `Math.random`、`Date.now`、`crypto`。

## 组件结构

```
components/yao-locator/
├── YaoLocator.tsx          # 容器：状态 + 提交 + 切换"问卷/结果"视图
├── IndicatorChecklist.tsx  # 显式分组的多选清单
└── LocatorResult.tsx       # 6 爻条形图 + Top 1 详读 + 跨爻提示
```

### `<YaoLocator yao={hexagram.yao} hexagramName={hexagram.name.chinese} />`

- 内部 state：`selected: Set<string>`、`submitted: boolean`
- 未提交 → 渲染 `IndicatorChecklist`；点「定位」按钮（`selected.size === 0` 时禁用）
- 已提交 → 渲染 `LocatorResult`（传入 `scoreYao` 的结果 + 完整 `yao[]` 供 Top 1 详读）；底部「重新选择」按钮回到未提交

### `<IndicatorChecklist yao={...} selected onToggle />`

- 6 个 `<fieldset>`，每个标题是 `爻名 + 爻辞（小字 italic）`
- 每条 indicator 是一个 `<label>` 包裹 `<input type="checkbox">` + 短文
- 顶部一行操作：「全清」「随机示例（仅在 dev 模式）」← 后者只作为测试便利

### `<LocatorResult result yao />`

- 顶部：6 条横向 bar，每条标注爻名 + 命中率 %（按 position 升序排列，对应「时间线」），最高那条朱砂高亮
- 跨爻提示行（如有）
- 下面：Top 1 详读 = `yao.modernReading` + `yao.scenario`（折叠/展开）+ `yao.actionable` 列表
- 底部：「重新选择」

## 集成

### 在 `components/MatchCard.tsx`

- 仅在 `rank === 1`（用户最关心的那一卦）默认渲染 `<YaoLocator>`，放在「六爻 · 事之六阶」Section 内部、`YaoRow` 列表上方
- rank 2/3 不展示，避免噪音

### 在 `app/hexagram/[id]/page.tsx`（详情页）

- 已有的 `YaoTimeline` 组件保持不变
- 在 `YaoTimeline` 之前插一个 Section「定位你的阶段」，渲染 `<YaoLocator>`
- 如 `YaoLocator` 提交后，可通过 prop callback 把 `topPosition` 传给 `YaoTimeline` 自动高亮对应爻——v1 不实现，留 TODO

## 视觉

- 复用现有 CSS 变量（`--color-ink-*`、`--color-vermillion`、`--color-gold`、`--color-paper`）
- 字体：UI chrome `font-sans`；爻名/爻辞 `font-serif`
- 不引入新动画；横向 bar 用纯 CSS width 过渡即可
- 兼容现有 `card-classical` 容器风格

## 数据模型变更

**无。** 复用 `Yao.indicators`、`Yao.name`、`Yao.text`、`Yao.modernReading`、`Yao.scenario`、`Yao.actionable`。

## 测试计划（TDD）

`__tests__/yao-locator.test.ts`（先写，红 → 绿 → 重构）：

1. `scoreYao` 基础：单一爻全勾 → 该爻 ratio = 1，其他 = 0，topPosition 正确
2. `scoreYao` 比例公平：A 爻有 5 条 indicators 勾中 3，B 爻有 3 条全勾——B 胜（ratio 1.0 > 0.6）
3. `scoreYao` 破平局：两爻 ratio 完全相等 → 取 position 较高者
4. `scoreYao` 跨爻触发：Top 1 ratio = 0.5，次高 = 0.45，次高 ≥ 0.5 × 0.8 = 0.4 → 触发
5. `scoreYao` 跨爻不触发：Top 1 = 1.0，次高 = 0.5（虽然 ≥ 0.5 × 0.8 = 0.4，但次高 < 0.3 阈值？修正：放弃次高门槛，仅用 0.8 比率门槛；测试调整）→ 触发
6. `scoreYao` 跨爻不触发：Top 1 = 0.2，次高 = 0.15（次高 < 0.3 → 不触发，避免"少量勾选"导致假阳性）
7. `scoreYao` 全 0：所有 ratio = 0，topPosition = 1，crossYao = false
8. `scoreYao` 确定性：同样输入（包括同样的 Set 内容但插入顺序不同）→ 同样输出
9. `scoreYao` indicator 字符串重复（理论上数据中不应出现，但要稳健）：去重不影响结果

组件测试（轻量，vitest + RTL 可选——如果项目未引入 RTL，则只测纯渲染快照 + props 透传，避免引新依赖）：

10. `YaoLocator` 渲染时显示 6 个 fieldset，每个标题是爻名
11. 未勾选任何条目时「定位」按钮 disabled
12. 勾选 → 点提交 → 显示 `LocatorResult`
13. 「重新选择」回到问卷视图，原选择仍保留（用户可微调）

## 文件清单

新增：

| 文件                                            | 说明              |
| ----------------------------------------------- | ----------------- |
| `lib/yao-locator.ts`                            | `scoreYao` 纯函数 |
| `components/yao-locator/YaoLocator.tsx`         | 容器组件          |
| `components/yao-locator/IndicatorChecklist.tsx` | 多选清单          |
| `components/yao-locator/LocatorResult.tsx`      | 结果展示          |
| `__tests__/yao-locator.test.ts`                 | TDD 测试          |

修改：

| 文件                         | 改动                                 |
| ---------------------------- | ------------------------------------ |
| `components/MatchCard.tsx`   | rank === 1 时插入 `<YaoLocator>`     |
| `app/hexagram/[id]/page.tsx` | `YaoTimeline` 之前插「定位你的阶段」 |

## 不做的事（YAGNI 显式列出）

- ❌ localStorage 持久化
- ❌ 提交结果回写到 matcher
- ❌ 把 Top 1 自动高亮到 `YaoTimeline`（留 TODO）
- ❌ 盲选模式开关
- ❌ 跨卦通用阶段定位器
- ❌ 「不太相符 / 非常相符」的多档权重（v1 用二值勾选；后续如有需求再加）
- ❌ A11y 全套（基础语义化 `<fieldset>/<legend>/<label>` 已够；不引入 ARIA 增强）

## 成功标准

1. 在乾卦（content 已完整）上跑通：勾选若干 indicators → 提交 → 看到 6 爻条形图 + Top 1 详读
2. `npm run test` 全绿，新增测试 ≥ 9 个
3. `npm run lint`、`npm run typecheck` 全绿
4. `npm run build` 成功
5. MatchCard 顶卦展开后，问卷出现在「六爻 · 事之六阶」上方
6. 卦详情页 `/hexagram/1` 在 `YaoTimeline` 之前出现「定位你的阶段」区块
7. 跨爻提示按 0.8 比率门槛 + 次高 ≥ 0.3 阈值正确触发
