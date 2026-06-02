# 问卦结果 URL 状态化 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现问卦结果的 URL 状态化，使「结果 → 深入此卦 → 返回结果」的流程自然顺畅，用户无需手动恢复，结果可通过浏览器返回、刷新、分享链接自然保留。MVP 仅覆盖 AI 模式。

**核心设计原则（来自 Spec）：**

- URL 作为 Primary Source of Truth
- 使用 `router.replace` 更新 URL
- 完整 `interpretation` 不进入 URL
- 采用「压缩 + Hash 降级」混合策略
- localStorage 仅作为降级 fallback

**Tech Stack:** Next.js 15 App Router, TypeScript, `useSearchParams` + `useRouter`, `lz-string`。

---

## File Map（细化版）

| Action  | Path                                      | 具体要完成的工作                                                                                                                                                                         |
| ------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install | `lz-string` (+ `@types`)                  | 新增依赖，供 `lib/result-url.ts` 压缩使用；验证 SSR/客户端均可用                                                                                                                         |
| Create  | `lib/result-url.ts`                       | 定义 `ResultUrlState` 类型；实现 `encode` / `decode` 函数；实现压缩 + hash 降级策略；提供清晰的公共 API                                                                                  |
| Create  | `__tests__/result-url.test.ts`            | 针对编解码、压缩、边界情况、错误容错写完整 TDD 测试（vitest 已配置）                                                                                                                     |
| Modify  | `app/page.tsx`                            | 在**现有 localStorage 恢复逻辑之上**叠加：从 URL 恢复结果、结果完成后 `router.replace` 更新 URL、新问卦清理 URL、URL 优先 + localStorage 降级的提示条判断、解码失败/非法参数的降级与提示 |
| Modify  | `hooks/useStreamingConsult.ts`            | `restoreResult(matchData + interpretation)` **已实现**；本任务仅确认签名够用，评估是否需暴露「当前可序列化结果」辅助方法                                                                 |
| Modify  | `components/AiResultCard.tsx`             | 修改「深入此卦」链接，拼接当前结果的 URL 状态参数                                                                                                                                        |
| Modify  | `app/hexagram/[id]/page.tsx`              | 添加「返回我的结果」按钮，实现返回带状态首页的逻辑                                                                                                                                       |
| Modify  | `components/hexagram/FloatingBackBar.tsx` | （可选）增强返回按钮，使其支持返回带结果的首页                                                                                                                                           |
| Modify  | `lib/persist-consult.ts`                  | 明确其 fallback 定位，调整保存/读取时机，增加与 URL 状态的协调逻辑                                                                                                                       |

---

## Task 1: 核心 URL 编解码工具

**Files:**

- Install: `lz-string`
- Create: `lib/result-url.ts`
- Create: `__tests__/result-url.test.ts`

- [ ] **Step 1.0: 安装依赖**
  - `npm i lz-string`（运行时压缩需要，当前 `package.json` 未包含）
  - 确认其 `compressToEncodedURIComponent` / `decompressFromEncodedURIComponent` 可用

- [ ] **Step 1.1: 定义数据模型**
  - 定义 `ResultUrlState` 类型（包含 situation、hexagramNumber、yaoPosition、confidence 等）
  - 定义内部使用的压缩/哈希相关类型

- [ ] **Step 1.2: 实现基础编解码函数**
  - `encodeResultToSearchParams(state: ResultUrlState): URLSearchParams`
  - `decodeResultFromSearchParams(params: URLSearchParams): ResultUrlState | null`

- [ ] **Step 1.3: 实现长文本压缩与降级策略**
  - 集成 `lz-string` 进行压缩
  - 定义长度阈值
  - 当超过阈值时，退化为 `situationHash` + 最小必要字段
  - 提供 `shouldUseHashFallback` 等辅助函数

- [ ] **Step 1.4: 编写完整单元测试（TDD）**
  - 正常编解码往返一致性
  - 超长 situation 触发 hash 降级
  - 特殊字符、emoji、换行、多语言
  - 缺失字段、非法参数的容错处理
  - 压缩前后大小对比测试（可选）

- [ ] **Step 1.5: 导出清晰的公共 API 并编写文档注释**

---

## Task 2: 首页支持 URL 状态驱动（最核心任务）

**Files:**

- Modify: `app/page.tsx`

- [ ] **Step 2.1: 页面加载时从 URL 恢复结果**
  - 使用 `useSearchParams` 获取参数
  - 调用 `decodeResultFromSearchParams`
  - 成功解析后，设置 `situation` 并调用 `ai.restoreResult`

- [ ] **Step 2.2: 结果完成后更新 URL**
  - 在 `ai.done && ai.matchData` 后构造状态
  - 调用 `router.replace` 更新 URL（使用 replace）

- [ ] **Step 2.3: 新问卦时清理 URL 状态**
  - 在 `handleSubmit` 开始时，移除 URL 中的结果相关参数

- [ ] **Step 2.4: 实现用户修改 situation 后的行为**
  - 明确规则：仅在用户主动提交新问卦时才更新 URL
  - 用户仅编辑输入框时不触碰 URL

- [ ] **Step 2.5: URL 优先 + localStorage 降级的恢复提示条（改造现有逻辑）**
  - 当前 `app/page.tsx` 已有基于 localStorage 的 `showRestoreBanner`
  - 改造为：URL 能恢复有效结果时**直接恢复且不显示提示条**；仅当 URL 无有效结果时才回退到现有 localStorage 提示条
  - 保留现有「清除」入口，必要时增加“清除 URL 状态”

- [ ] **Step 2.6: 处理 URL 解码失败场景**
  - 捕获 `decodeResultFromSearchParams` 异常 / 返回 null
  - 降级尝试现有 localStorage 恢复
  - 跨设备无 localStorage 命中时走降级视图（见 Spec §4），不报错白屏

- [ ] **Step 2.7: 考虑性能与重复渲染优化**
  - 避免每次渲染都重复 decode

---

## Task 3: 卦象详情页「返回我的结果」能力

**Files:**

- Modify: `app/hexagram/[id]/page.tsx`
- Modify: `components/hexagram/FloatingBackBar.tsx`（可选）

- [ ] **Step 3.1: 设计「返回我的结果」按钮**
  - 确定位置（顶部固定 / FloatingBackBar / 内容区）
  - 确定文案和视觉样式

- [ ] **Step 3.2: 实现返回逻辑**
  - 优先 `router.back()`（如果来源是结果页）
  - 兜底跳转到首页（带当前 URL 状态或依赖 localStorage）

- [ ] **Step 3.3: 处理从详情页直接访问的情况**
  - 如果用户直接访问详情页，点击返回时仍应尽量恢复最近结果

- [ ] **Step 3.4: 按钮状态处理**
  - 没有可返回结果时是否隐藏或禁用按钮

---

## Task 4: 结果卡片链接改造

**Files:**

- Modify: `components/AiResultCard.tsx`

- [ ] **Step 4.1: 修改「深入此卦」链接**
  - 将 href 改为包含当前结果状态的完整 URL
  - 确保跳转时状态是最新的

- [ ] **Step 4.2: 增加必要的注释说明状态传递机制**

---

## Task 5: Hook 增强

**Files:**

- Modify: `hooks/useStreamingConsult.ts`

- [ ] **Step 5.1: 确认 `restoreResult` 现有签名（已实现）**
  - `restoreResult({ matchData, interpretation })` 已存在并被首页调用，可一次性恢复
  - 确认无需改动；若 URL 流程需要额外传入 `situation`，再评估扩展签名

- [ ] **Step 5.2: 评估是否需要暴露「当前可序列化结果」方法**
  - 若页面层能直接从 `ai.matchData` + `situation` 组装编码输入，则无需新增方法（倾向不加）

---

## Task 6: 渐进式落地、测试与收尾

- [ ] **Step 6.1: 明确 MVP 范围文档**
  - 仅 AI 模式
  - 不处理 interpretation 进 URL
  - 经典模式暂不改造

- [ ] **Step 6.2: 单元测试补充**
  - `result-url.ts` 必须有完整测试覆盖

- [ ] **Step 6.3: 手动测试 Checklist（必须执行）**
  - 正常问卦 → 深入此卦 → 返回
  - 刷新详情页后返回
  - 直接访问带状态的首页 URL
  - 超长 situation 场景（触发 hash 降级）
  - 用户恢复结果后修改 situation 再问卦
  - 从详情页点击「返回我的结果」
  - URL 参数被篡改/非法时的降级行为
  - 保存到「履」后返回首页的行为

- [ ] **Step 6.4: 与现有 localStorage 机制的共存验证**
  - 验证 URL 优先、localStorage 降级的完整行为

- [ ] **Step 6.5: 文档更新**
  - 更新 README（如有必要）
  - 在相关组件中增加必要注释

---

## 关键风险与注意事项

- **URL 长度控制** 是最大技术风险，必须在 Task 1 充分验证。
- **用户修改 situation 后的行为** 必须在 Task 2 中定义得非常清晰。
- **浏览器历史记录体验** 需要重点测试（大量 `replace` 可能影响前进/后退预期）。
- **与未来账号系统的兼容性** 应在实现时预留设计空间。

---

**建议执行顺序（推荐）：**

1. Task 1（核心工具，必须先完成）
2. Task 5（Hook 增强）
3. Task 2（首页核心逻辑）
4. Task 4（链接改造）
5. Task 3（详情页返回按钮）
6. Task 6（测试与收尾）

---

**依赖**：

- 已有的 `lib/persist-consult.ts`
- `useStreamingConsult` hook

这个计划的目标是让「深入此卦」真正成为用户研究义理的自然动作，而不是一次会丢失上下文的冒险。
