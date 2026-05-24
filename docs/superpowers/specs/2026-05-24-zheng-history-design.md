# 「征」模块（咨询历史 + 回访应验）— 设计

## 设计哲学

> 易经的最大价值不在「算」，而在「算完之后」——把决策记下来，过一段时间回头看应验没。  
> 这是项目 README 提到的"反馈闭环"的入口：用户对自己的判断有据可查，未来可以用应验/未应验数据反向校准 matcher。

延续整个产品的"祛魅但不取消"气质：

- **显式保存**：用户控制存什么，不监控、不日志化。
- **粒度有限**：三值应验标注（应验/部分/未应验），承认易经判断很少非黑即白。
- **本地优先 + 为账号体系预留**：v1 纯 localStorage，零运营成本、零账号体系、隐私零顾虑；同时数据模型与存储接口按"未来要接后端 + 账号"设计，迁移成本最小化（见 §未来迁移）。
- **不评判**：没有"成绩单"、没有"准确率"、没有 gamification。

## 用户画像与动机

用户已经做完一次咨询（提交情境 → 看 top 3 卦 → 可能用过 YaoLocator），心里有了"我打算这样办"的决定。他想：

> **"我把这次记下来——过几周/几月回来看看是不是这样"。**

后续某天回到 app，从主导航的「履」进入历史列表，找到当时那条，标"应验"或"部分"，可选写一段反思。

## 范围（In Scope，v1）

1. **保存按钮**：在用户主动决定记录时，点一下存入 localStorage。
2. **历史列表页 `/history`**：按时间倒序展示所有记录的卡片视图。
3. **历史详情页 `/history/[id]`**：展示完整快照 + 应验标注 UI + 反思笔记输入 + 删除按钮。
4. **自适应主导航**：当 `localStorage` 里 ≥ 1 条记录时，在顶部主导航 / 页脚显示「履」链接。
5. **数据模型**：`ConsultationRecord` TS 类型 + zod schema + storage helper（`lib/zheng-store.ts`）。
6. **TDD**：先测 storage 层（CRUD / schema / 边界），再测 UI 行为。

## 范围外（Out of Scope，留给未来 PR）

- ❌ **账号体系 + 云端存储**——v1 纯本地，但数据模型 & 存储接口为此**显式预留迁移路径**（见 §未来迁移）。
- ❌ **导出/导入**——降低 v1 复杂度（但 schema 已 zod 标准化，未来一个 `exportToJSON()` 即可加）。
- ❌ **搜索/过滤**——v1 数据量小（个位数到几十条），列表直接展示足够。
- ❌ **反馈回写到 matcher**——只采集数据，不影响算法（独立 PR）。
- ❌ **每条记录的统计/分析**（如"你的应验率"）——刻意不做，避免 gamification。
- ❌ **多种保存来源**——v1 只从 MatchCard 的 rank 1 保存按钮触发，不在卦详情页加。

## 数据模型

### TS 类型

```ts
// lib/zheng-types.ts
export type VerificationStatus = 'unverified' | 'fulfilled' | 'partial' | 'unfulfilled'

export type SavedYaoLocation = {
  topPosition: 1 | 2 | 3 | 4 | 5 | 6
  topYaoName: string // "九五" / "六四" / ...
  topRatio: number // 0..1
  crossYaoPosition?: 1 | 2 | 3 | 4 | 5 | 6
  crossYaoName?: string
}

export type ConsultationRecord = {
  id: string // crypto.randomUUID() — globally unique，迁移到后端时无需重新分配
  schemaVersion: 1 // 显式版本号，未来迁移时可以读到老条目并 in-place 升级
  createdAt: number // Date.now() epoch ms
  situation: string // 原始情境文本
  hexagramId: number // 1..64
  hexagramName: string // "乾" / "屯" / ...
  fitScore: number // matcher 给出的契合度
  yaoLocation?: SavedYaoLocation
  userNote?: string // 保存时可选填写"我打算怎么做"
  verification: VerificationStatus // 初始 "unverified"
  verificationNote?: string // 回访时可选写"为什么应验/未应验"
  verifiedAt?: number // 标注应验时的时间戳
  // ── 为账号体系预留（v1 全部为 undefined）──
  userId?: string // v2 由服务端写入
  syncedAt?: number // 上次成功同步到后端的时间戳
}
```

### Zod schema

```ts
// lib/zheng-store.ts
const RecordSchema = z.object({ ... })  // 与上面 TS 类型对应；用于读取时校验
```

## 存储层

### 接口抽象（**为账号体系预留**）

```ts
// lib/zheng/store-types.ts —— 纯接口，与实现解耦
export interface ZhengStore {
  listRecords(): Promise<ConsultationRecord[]>
  getRecord(id: string): Promise<ConsultationRecord | null>
  saveRecord(input: SaveRecordInput): Promise<ConsultationRecord>
  updateVerification(
    id: string,
    status: VerificationStatus,
    note?: string,
  ): Promise<ConsultationRecord | null>
  deleteRecord(id: string): Promise<boolean>
}
```

所有方法返回 Promise——v1 的 localStorage 同步实现包一层 `Promise.resolve()` 即可；未来换成 fetch-based 后端实现时**调用方代码零改动**。

### v1 实现：`lib/zheng/store-local.ts`

```ts
const STORAGE_KEY = 'taiji-yijing.zheng.v1'

export const localZhengStore: ZhengStore = {
  async listRecords() {
    /* 同步读 localStorage + zod 校验 */
  },
  async getRecord(id) {
    /* ... */
  },
  async saveRecord(input) {
    /* 生成 id + createdAt + schemaVersion: 1 */
  },
  async updateVerification(id, status, note) {
    /* ... */
  },
  async deleteRecord(id) {
    /* ... */
  },
}
```

### 上层入口：`lib/zheng/store.ts`

```ts
import { localZhengStore } from './store-local'
import type { ZhengStore } from './store-types'

// v1: 总是用 local
// v2: 根据登录态切换 — `useAuth().user ? remoteZhengStore : localZhengStore`
export const zhengStore: ZhengStore = localZhengStore
```

未来加账号时新增 `lib/zheng/store-remote.ts`（fetch-based 实现 ZhengStore），把 `store.ts` 改成基于登录态切换；所有 UI 代码（list / detail / save button）**完全不动**。

### 设计要点

- **SSR 安全**：`typeof window === "undefined"` 时返回安全默认值（空数组 / null / 失败）。
- **Schema 校验**：读取时用 zod 解析每条；解析失败的条目静默丢弃（防止脏数据破坏整个列表）。
- **localStorage 配额**：v1 不主动处理（一条 ~2KB，10MB 配额 ≈ 5000 条记录，远超 v1 需要）。未来若担心可以在写入时做容量检查。
- **版本前缀 + schemaVersion 字段**：key 用 `taiji-yijing.zheng.v1`，每条记录里也有 `schemaVersion: 1`——双重保护：可以基于 key 切换不同迁移流程，也可以读到老条目时按 `schemaVersion` 做 in-place 升级。

## 触发保存的 UI 入口

### MatchCard（rank 1）—— v1 唯一入口

在现有 MatchCard 的底部、紧邻 YaoLocator 后，加一个**保存控件**：

```
┌─────────────────────────────────────┐
│ ...匹配卦的 reasoning、scenario...   │
│ ...                                  │
│ [YaoLocator: 阶段定位] ←现有        │
│ ...                                  │
│ ─────────────────────────────────── │
│  ✎ 记此一卦                          │  ← 折叠按钮
│  └ 展开后：                          │
│    [textarea: 可选 — 我打算怎么做] │
│    [保存] [取消]                      │
└─────────────────────────────────────┘
```

- 默认折叠（只显示一行链接 `✎ 记此一卦`）——避免把首屏占满。
- 展开后显示一个可选 textarea + 「保存」「取消」按钮。
- 「保存」点击后：调用 `saveRecord`、显示一个 inline toast `已记。在「履」中可见。`、把控件状态变成 `已记 ↗︎` 链接（点击跳到 `/history/[id]`）。
- 保存按钮不依赖 YaoLocator 是否填写——locator 数据如果在内存里就一起带上，没填就不带。

### **rank 2/3 卡里不出现保存按钮**（v1 简化）

理由：用户实际上会基于 top 1 做决定；rank 2/3 主要是参考。后续如果数据显示用户经常选 rank 2，再加。

### **卦详情页 `/hexagram/[id]` 不出现保存按钮**（v1 简化）

理由：详情页是学习/查阅入口，不是咨询入口；保存意味着"这次咨询有具体情境"，单独看一卦没有情境。

## 路由结构

```
app/
  history/
    page.tsx              ← 列表页 /history
    [id]/
      page.tsx            ← 详情页 /history/[id]
```

两个页面均为 client component（依赖 localStorage）。

## 列表页 `/history` UX

```
┌─────────────────────────────────────┐
│ 第页·履                              │
│ 走过的路——回头看，是不是这条路   │
│                                      │
│ ┌─ 2026-05-24 ─ 乾 ────────────┐   │
│ │ "公司刚拿到种子轮…"            │   │
│ │ ◯ 未标注 · YaoLocator: 九五   │   │
│ └─ →                            ┘   │
│                                      │
│ ┌─ 2026-05-22 ─ 屯 ────────────┐   │
│ │ "团队意见不一致…"             │   │
│ │ ✓ 应验 · 标注于 2026-05-25   │   │
│ └─ →                            ┘   │
│                                      │
│ ...                                  │
└─────────────────────────────────────┘
```

- 卡片显示：日期（YYYY-MM-DD）、卦名、情境前 60 字、应验状态徽章、YaoLocator 顶爻位（若有）。
- 卡片可点击进详情。
- 状态徽章配色（沿用现有 design tokens）：
  - 未标注：`--color-ink-300`（中性灰）
  - 应验：`--color-jade`（深绿）
  - 部分：`--color-amber`（琥珀）
  - 未应验：`--color-vermillion-400`（柔红，不刺眼）
- 顶部一段简短的开场白（不啰嗦）。
- 空状态：当列表为空时显示一段提示 `还没有记录。在匹配卦后点「记此一卦」即可存下。` + 回首页链接。

## 详情页 `/history/[id]` UX

```
┌─────────────────────────────────────┐
│ ← 履                                 │
│                                      │
│ 2026-05-24 · 乾                      │
│                                      │
│ 情境                                  │
│   公司刚拿到种子轮，正在考虑…       │
│                                      │
│ 当时匹配到 · 乾（契合度 0.82）       │
│   → 前往「乾」详情页                  │
│                                      │
│ YaoLocator 定位 · 九五（100%）       │
│   （若有 crossYao: + 也明显落在九四）│
│                                      │
│ 当时笔记                              │
│   "我打算先把核心团队 peer 网络…"   │
│                                      │
│ ─────────────────────────────────── │
│ 回访                                  │
│   ◯ 未标注  ○ 应验  ○ 部分  ○ 未应验 │
│   [反思笔记 textarea: 可选]          │
│   [保存标注] （只在有变更时启用）    │
│                                      │
│ ─────────────────────────────────── │
│ [删除这条记录]  ← 弱化按钮          │
└─────────────────────────────────────┘
```

- 三值用 radio group（含 `unverified` 共四选一，但 UI 上把 `unverified` 作为默认未选状态而非选项？todo 在 plan 时定）。
- 标注后页面下方多一行 `标注于 2026-05-25`。
- 删除：点一下出 confirm dialog，再点才真的删（避免误删）。

## 主导航 / 页脚的「履」入口（自适应显示）

新增 `components/HistoryNavLink.tsx`：

- 仅在 `listRecords().length > 0` 时渲染（SSR 时不渲染，hydration 后才显示）。
- 文字「履」，链接到 `/history`。
- 集成到现有页脚 `<footer>`（与 `览六十四卦` 同位置）。
- 在主页（`app/page.tsx`）的导航区域、所有卦详情页的页脚都展示。

## 未来迁移（账号体系 + 云端存储）

这一节是 v1 的**外部承诺**：spec 明确"v1 是迁移路径上的第一步"而不是终点。

### 迁移路径（按时间顺序）

1. **v1（本 PR）**：localStorage + 同步操作 + 同步接口包装成 async。完成「征」的完整 UX 闭环，验证用户行为。
2. **v1.5**：加导出/导入（download JSON / upload JSON），用户可手动备份。schema 已用 zod 标准化，几十行代码即可。
3. **v2 账号体系**：
   - 后端选型（建议 **Supabase** 或 **Cloudflare D1**——都与 Vercel 部署兼容好；Supabase 自带 auth 更省事，D1 更轻）。
   - 表结构 = `ConsultationRecord` 的直接映射（`id` 用作主键，新增 `user_id` FK，索引 `(user_id, created_at desc)`）。
   - 用户登录后，前端检测到 localStorage 里有数据 → 弹窗 `检测到本地有 N 条历史，是否合并到云端？` → 调用 `localZhengStore.listRecords()` + remote `bulkInsert` → 成功后清空 localStorage（或保留只读 backup）。
   - `lib/zheng/store.ts` 根据 `useAuth()` 状态切换 `localZhengStore | remoteZhengStore`；UI 零改动。
4. **v2.5+**：跨设备同步、搜索、统计、反馈回写到 matcher（基于云端聚合数据）。

### 为什么这样设计 v1

- **`id` 用 UUID v4**：从一开始就全局唯一，迁移到后端不需要重映射。
- **接口返回 Promise**：v1 浪费一点点性能（每次 `Promise.resolve`），换来 v2 调用代码零改动。
- **`schemaVersion` 字段**：未来 schema 升级时可以读到老数据并 in-place 升级。
- **预留 `userId` / `syncedAt`**：v1 全部 `undefined`，v2 由服务端填写；类型层面就支持云端字段，不需要重写类型。
- **Zod schema**：v1 用于本地脏数据过滤；v2 在前后端 API 边界（contract / validation）也直接复用。
- **文件组织 `lib/zheng/`**：所有「征」相关代码集中在一个目录，v2 加 `store-remote.ts` 不需要重新组织。

### v2 前置工作（不在本 PR 范围）

本 PR 不选后端、不写后端代码、不加 auth library。但**完成本 PR 后**，加账号 + 云端的 PR 应该**只动 storage 层 + auth 包装**，UI 层完全不动。

## 与既有代码的接口

需修改：

1. **`components/MatchCard.tsx`**：在 rank 1 卡里添加保存控件区域（紧邻 YaoLocator 之后）。需要从父组件获取情境文本（目前 MatchCard 通过 props 已能拿到匹配的 hexagram；situation 需要新增 prop）。
2. **`app/page.tsx`** 或 `app/_components/...`：把 situation 文本传给 MatchCard。
3. **`app/layout.tsx`** 或共享 footer：插入 `HistoryNavLink`。

新增（按 `lib/zheng/` 目录集中组织，方便 v2 加 `store-remote.ts`）：

4. `lib/zheng/types.ts` — TS 类型
5. `lib/zheng/schema.ts` — zod schema
6. `lib/zheng/store-types.ts` — `ZhengStore` interface
7. `lib/zheng/store-local.ts` — localStorage 实现
8. `lib/zheng/store.ts` — 上层入口（v1 直接 export local，v2 切换）
9. `components/zheng/SaveConsultationButton.tsx` — MatchCard 里的保存控件
10. `components/zheng/HistoryNavLink.tsx` — 自适应导航链接
11. `components/zheng/RecordCard.tsx` — 列表页的卡片
12. `components/zheng/VerificationControl.tsx` — 详情页的应验标注 UI
13. `app/history/page.tsx` — 列表页
14. `app/history/[id]/page.tsx` — 详情页
15. `__tests__/zheng-store.test.ts` — storage 层测试

## TDD 用例骨架

`__tests__/zheng-store.test.ts`：

1. **saveRecord 写入并返回带 id/timestamp 的完整记录**
2. **listRecords 返回时间倒序（新的在前）**
3. **getRecord 找到时返回记录，找不到返回 null**
4. **updateVerification 修改 status 并写入 verifiedAt；status 改回 unverified 时清空 verifiedAt**
5. **deleteRecord 移除指定 id；返回 true；列表里少一条**
6. **schema 校验失败的脏数据条目被静默丢弃，其他条目仍可读**
7. **localStorage 为空时 listRecords 返回 `[]`，getRecord 返回 `null`**
8. **SSR 环境（`typeof window === "undefined"`）下所有读操作返回安全默认值，写操作 no-op**
9. **保存 100 条数据后顺序仍正确**

UI 组件测试（vitest + @testing-library）：

10. `SaveConsultationButton` 默认折叠；点击 `✎ 记此一卦` 展开 textarea + 按钮；点保存调用 storage、状态变为「已记」
11. `HistoryNavLink` 在 mount 时调用 `listRecords()`，无记录时不渲染，≥1 条时渲染链接
12. `RecordCard` 渲染日期/卦名/情境片段/状态徽章；状态对应配色正确
13. `VerificationControl` radio 切换调用 `updateVerification`；写笔记后保存

## 风险与权衡

- **localStorage 不跨设备**：v1 接受这个限制——「征」是个人反思工具；产品**上线前会加账号体系 + 云存储**（见 §未来迁移）。空状态文案里提一句 `暂存本地——后续会同步到账号`，避免用户误解为永久本地。
- **保存控件可能被忽视**：MatchCard 底部内容很多，「记此一卦」可能被滚到看不见。v1 接受——如果数据显示保存率低，再考虑提升入口可见性。
- **应验粒度三选一可能不够**：用户可能想说"九五对了，九四没对"等更细粒度。v1 接受——粒度可以靠笔记字段补充；将来再迭代细分。
- **YaoLocator 状态可能在保存时为空**：用户没用 locator 直接保存是合法的。`yaoLocation?` 是 optional。
- **删除记录是物理删除**：不做"回收站"——简化模型。详情页用 confirm dialog 避免误删。

## 验收 checklist

- [ ] TS 类型 + zod schema 定义在 `lib/zheng-types.ts`
- [ ] `lib/zheng-store.ts` 实现 9 个 TDD 用例
- [ ] `SaveConsultationButton` 集成进 MatchCard（仅 rank 1）
- [ ] `/history` 列表页可访问，无记录时显示空状态
- [ ] `/history/[id]` 详情页可标注应验 + 删除
- [ ] `HistoryNavLink` 在有记录时出现在页脚
- [ ] `npm run lint / typecheck / test / build` 全部通过
- [ ] PR #2 开出来等 CI 跑绿
