# A 包 PR-1：邮箱 Auth + 云端存储 + 迁移 · Design

**Status:** Draft — pending user review
**Date:** 2026-05-24
**Scope:** A 包 A1（账号系统 + 云端同步 v1：邮箱路径）
**Depends on:**

- PR #3（zheng 数据层 + ZhengStore interface）
- PR #5（设置页 + 导出/导入 JSON，迁移弹窗将复用其样式）
- PR #6（数据模型预留 `userId` / `syncedAt`）

---

## 1. 用户拍板的设计决策

| #    | 问题             | 决策                                                                       |
| ---- | ---------------- | -------------------------------------------------------------------------- |
| Q1   | Auth provider    | **Supabase**（邮箱 + 手机号 OTP；本 PR 只做邮箱）                          |
| Q2   | 匿名 vs 登录关系 | **C 软上云**：未登录 = localStorage / 登录 = 云端，登出回到空白匿名态      |
| Q3.1 | 首次登录迁移     | **弹窗 3 选项**：合并到云端 / 仅使用云端（保留本机） / 先导出本机          |
| Q3.2 | 多设备并发       | **last-write-wins**（无冲突 UI）                                           |
| Q3.3 | 登录后断网       | **直接报错**，不做本机缓存                                                 |
| Q4   | PR 拆分          | **方案 Y**（3 PRs）：A1 邮箱云端（本 PR）/ A2 手机号 OTP / A3 账号管理治理 |
| Q5.4 | 自动 AI 对话历史 | **不进 A 包**，看反馈再单独做 opt-in 功能                                  |

## 2. 约束

- **C 软上云**：未登录的行为零回归（仍是 PR #3 的 localZhengStore）。
- **范围只搬层 1**（用户主动按"📜 记此一卦"保存的 `ConsultationRecord`）；流过的 AI 完整 reasoning / interpretation 文本仍**不存**。
- **schemaVersion 保持 1**：云端 schema 对齐现有 `ConsultationRecord` 类型，新增 `userId` 列由服务端在写时填入（已在 PR #6 数据模型中预留）。
- **不做注销 / 修改密码 / 全量导出增强**：留 A3 PR。
- **不做手机号 / SMS Hook / Edge Function**：留 A2 PR。
- **不动 AI 流式逻辑、卦象渲染、爻位定位**等业务代码。

## 3. 依赖

新增 npm packages：

```
@supabase/supabase-js  ^2
@supabase/ssr          ^0.5  (Next.js 15 App Router SSR cookies 支持)
```

环境变量（新增 `.env.local` + 更新 `.env.example`）：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 4. Supabase 项目设置

### 4.1 项目创建

- supabase.com 创建新项目，region 选 **Tokyo** 或 **Singapore**（国内访问较 us-east-1 稳定）
- 记录 `Project URL` + `anon public key` 写入 `.env.local`
- 启用 **Email Auth Provider**（默认）；关闭社交登录 provider；保持手机号 provider 关闭（A2 PR 启用）

### 4.2 DB Schema

**SQL migration**（保存在 `supabase/migrations/20260524_a1_zheng_records.sql`）：

```sql
create table public.zheng_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  schema_version smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  situation text not null,
  hexagram_id smallint not null,
  hexagram_name text not null,
  fit_score double precision not null,
  yao_location jsonb,
  ai_yao jsonb,
  consult_mode text,
  user_note text,
  verification text not null default 'unverified',
  verification_note text,
  verified_at timestamptz,
  deleted_at timestamptz
);

create index zheng_records_user_created_idx
  on public.zheng_records (user_id, created_at desc)
  where deleted_at is null;

-- updated_at 自动维护
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger zheng_records_touch_updated_at
  before update on public.zheng_records
  for each row execute function public.touch_updated_at();
```

### 4.3 RLS 策略

```sql
alter table public.zheng_records enable row level security;

create policy "users select own records" on public.zheng_records
  for select using (auth.uid() = user_id and deleted_at is null);

create policy "users insert own records" on public.zheng_records
  for insert with check (auth.uid() = user_id);

create policy "users update own records" on public.zheng_records
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users delete own records" on public.zheng_records
  for delete using (auth.uid() = user_id);
```

> A3 的 30 天软删用 `deleted_at` 列实现；A1 写入时永远 `deleted_at = null`。SELECT 策略已天然过滤软删记录。

### 4.4 字段映射

| TS (`ConsultationRecord`) | DB (`zheng_records`) | 备注                           |
| ------------------------- | -------------------- | ------------------------------ |
| `id`                      | `id`                 | uuid                           |
| `userId`                  | `user_id`            | 服务端 RLS 强制 = auth.uid()   |
| `schemaVersion`           | `schema_version`     | 1                              |
| `createdAt` (epoch ms)    | `created_at`         | timestamptz → toMs() 在 client |
| `syncedAt` (epoch ms)     | `updated_at`         | trigger 维护                   |
| `situation`               | `situation`          |                                |
| `hexagramId`              | `hexagram_id`        |                                |
| `hexagramName`            | `hexagram_name`      |                                |
| `fitScore`                | `fit_score`          |                                |
| `yaoLocation`             | `yao_location`       | jsonb                          |
| `aiYao`                   | `ai_yao`             | jsonb                          |
| `consultMode`             | `consult_mode`       | 'classic' \| 'ai' \| null      |
| `userNote`                | `user_note`          |                                |
| `verification`            | `verification`       | text                           |
| `verificationNote`        | `verification_note`  |                                |
| `verifiedAt`              | `verified_at`        | timestamptz → toMs()           |
| —                         | `deleted_at`         | A3 使用，A1 永远 null          |

**新增**：`lib/zheng/store-remote-mappers.ts` 提供 `recordFromRow(row)` / `recordToRow(record)` 两个纯函数 + zod schema 校验 row 形状。

## 5. Supabase Client

### 5.1 文件

- `lib/supabase/client.ts`：browser 端 client（`createBrowserClient` from `@supabase/ssr`）
- `lib/supabase/server.ts`：server component / route handler 端 client（cookies-aware）

### 5.2 Auth callback route

- `app/auth/callback/route.ts`：处理 Supabase magic link / OAuth 回调，交换 code → session cookie，redirect 回原始路径

## 6. Auth Context

### 6.1 新增文件

- `lib/auth/auth-provider.tsx`：客户端 `<AuthProvider>` 组件
- `lib/auth/use-auth.ts`：`useAuth()` hook（返回 `AuthContextValue`）

### 6.2 接口

```ts
type AuthContextValue = {
  /** 当前用户；未登录为 null；初始化 loading 期间也是 null */
  user: User | null
  /** 完整 session（含 access_token 等） */
  session: Session | null
  /** 初始化是否完成（避免短暂的"未登录闪烁"） */
  loading: boolean
  signInWithPassword: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUpWithPassword: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>
  resetPasswordForEmail: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
}
```

### 6.3 挂载

`app/layout.tsx` 根部包裹整个 app：

```tsx
<AuthProvider>{children}</AuthProvider>
```

AuthProvider 内部调用 `supabase.auth.getSession()` + `supabase.auth.onAuthStateChange()` 维护 user/session/loading 状态。

## 7. RemoteZhengStore

### 7.1 文件

- `lib/zheng/store-remote.ts`：实现 `ZhengStore` interface
- `lib/zheng/store-remote-mappers.ts`：DB row ↔ `ConsultationRecord` 映射 + zod schema

### 7.2 行为

| ZhengStore 方法                        | Supabase 实现                                                                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `listRecords()`                        | `select * from zheng_records where deleted_at is null order by created_at desc`                                                     |
| `getRecord(id)`                        | `select * from zheng_records where id = $1` → 找不到返回 null                                                                       |
| `saveRecord(input)`                    | `insert into zheng_records (...) values (...) returning *`，client 不传 `user_id`，由 RLS / DB default 等价处理                     |
| `updateVerification(id, status, note)` | `update zheng_records set verification=$2, verification_note=$3, verified_at=$4 where id=$1 returning *`                            |
| `deleteRecord(id)`                     | `delete from zheng_records where id = $1`（A1 用硬删，A3 才接软删 UI）                                                              |
| `clearAll()`                           | `delete from zheng_records where user_id = auth.uid() returning id` → count                                                         |
| `importRecords(records, mode)`         | `mode='overwrite'`：先 `clearAll()` 再批量 insert；`mode='merge'`：批量 upsert by id（DB 端 last-write-wins via `created_at` 比较） |

### 7.3 错误处理

- 网络断 / fetch failed → throw `new Error('network')`，UI 层显示「网络断开，请检查后重试」
- 401 / 403 (RLS) → throw `new Error('auth')`，UI 引导重新登录
- 其他 → throw `new Error(supabaseError.message)`，UI 显示原始 message

## 8. store.ts 切换

`lib/zheng/store.ts` 改为按 auth 状态切换：

```ts
import { createBrowserClient } from '@/lib/supabase/client'
import { localZhengStore } from './store-local'
import { remoteZhengStore } from './store-remote'
import type { ZhengStore } from './store-types'

// 模块顶层订阅 auth 变化，缓存 currentUserId
// 避免每次方法调用都走异步 getSession()
let currentUserId: string | null = null

if (typeof window !== 'undefined') {
  const supabase = createBrowserClient()
  supabase.auth.getSession().then(({ data }) => {
    currentUserId = data.session?.user?.id ?? null
  })
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUserId = session?.user?.id ?? null
  })
}

function active(): ZhengStore {
  return currentUserId ? remoteZhengStore : localZhengStore
}

export const zhengStore: ZhengStore = {
  listRecords: () => active().listRecords(),
  getRecord: (id) => active().getRecord(id),
  saveRecord: (input) => active().saveRecord(input),
  updateVerification: (id, status, note) => active().updateVerification(id, status, note),
  deleteRecord: (id) => active().deleteRecord(id),
  clearAll: () => active().clearAll(),
  importRecords: (records, mode) => active().importRecords(records, mode),
}
```

> 此设计让所有现有 call-site（`components/zheng/*`、`app/history/*`）零改动。

## 9. 路由 + UI

### 9.1 新增路由

| 路由                    | 内容                                    |
| ----------------------- | --------------------------------------- |
| `/login`                | 邮箱 + 密码登录（含「忘记密码」link）   |
| `/register`             | 邮箱 + 密码注册（含同意条款占位）       |
| `/auth/forgot-password` | 输入邮箱 → 发送密码重置邮件             |
| `/auth/reset-password`  | Supabase 重置 link 落地页（输入新密码） |
| `/auth/verify`          | 邮箱验证成功 / 失败 landing             |
| `/auth/callback`        | Supabase code exchange route handler    |

### 9.2 设置页改造

`/settings` 顶部新增「账号」section（在现有「导入/导出」之上）：

**未登录态**：

```
账号

📜 登录后，你的记录会同步到云端，多设备可见。

[ 登录 ]  [ 注册 ]
```

**已登录态**：

```
账号

📜 已登录：user@example.com
   记录正在同步到云端

[ 退出登录 ]
```

A3 PR 再在此 section 加修改密码 / 注销账号 / 全量导出。

### 9.3 顶部 nav 改造

**保守做法**（推荐 A1）：

- 在 `/history` 列表页顶部「管理 ⚙」按钮旁加一个轻量的"账号"icon
- 未登录：icon 点击 → `/login`
- 已登录：icon 显示已登录态（小绿点），点击 → `/settings#账号`
- **不**全局 nav 改造（避免本 PR 范围爆炸）

A3 PR 再考虑全局 nav 统一化。

### 9.4 UI 样式约束

- **必须使用 CSS 变量**（`var(--color-*)`），不允许新硬编 hex
- 复用现有 button / input 样式（参考 `/settings` 页）
- 复用现有 dialog 容器（参考 `components/zheng/settings/ImportConflictDialog.tsx`）

## 10. 迁移流程

### 10.1 触发时机

`AuthProvider` 监听 auth 状态变化：

- 用户从未登录 → 登录成功
- 调用 `localZhengStore.listRecords()` 检查本机是否有 ≥ 1 条记录
- 若有 → 显示 `<MigrationDialog />`（全局 Portal）

### 10.2 Dialog 三选项

```
┌─────────────────────────────────────────────┐
│ 检测到本机有 12 条记录                       │
├─────────────────────────────────────────────┤
│                                             │
│ [ ] 合并到云端账号（推荐）                  │
│     上传所有本机记录到你的账号，本机数据将清空│
│                                             │
│ [ ] 仅使用云端账号                          │
│     本机数据保留但当前不可见，登出后又能看到 │
│                                             │
│ [ ] 先导出本机数据                          │
│     下载 JSON 备份，备份后回到此弹窗        │
│                                             │
│           [ 稍后再说 ]  [ 确认 ]            │
└─────────────────────────────────────────────┘
```

- 默认选中"合并到云端账号"
- "稍后再说"关闭弹窗但下次登录还会出现（直到本机数据被处理）
- 选"先导出本机数据" → 触发现有 export flow → 完成后回到此弹窗（不自动选其他项）

### 10.3 合并实现

```ts
async function migrateLocalToRemote() {
  const localRecords = await localZhengStore.listRecords()
  if (localRecords.length === 0) return { migrated: 0 }
  // 批量上传，使用 importRecords 'merge' 模式（去重 by id）
  const result = await remoteZhengStore.importRecords(localRecords, 'merge')
  // 成功后清空本机
  await localZhengStore.clearAll()
  return { migrated: result.imported }
}
```

错误处理：

- 部分成功（网络中断）→ 不清本机，UI 提示「上传了 X / Y 条，请重试」
- 全失败 → 不清本机，UI 提示「上传失败，请检查网络后重试」

### 10.4 文件

- `components/auth/MigrationDialog.tsx`（约 220 行 + tests ~150 行）
- `lib/auth/migrate.ts`：纯函数 `migrateLocalToRemote(local, remote)` 可独立测试

## 11. 错误处理统一

新增 `lib/auth/errors.ts`：

```ts
export function authErrorToMessage(err: AuthError | Error | null): string {
  if (!err) return ''
  if (err.message.includes('Invalid login credentials')) return '邮箱或密码错误'
  if (err.message.includes('User already registered')) return '该邮箱已注册，去登录吧'
  if (err.message.includes('Email not confirmed')) return '请先点击邮箱里的验证 link'
  if (err.message.includes('Password should be')) return '密码至少 6 位'
  if (err.message === 'network') return '网络断开，请检查后重试'
  if (err.message === 'auth') return '登录已过期，请重新登录'
  return `出错了：${err.message}`
}
```

## 12. 测试（TDD）

### 12.1 单元测试（lib 层）

`__tests__/zheng-store-remote.test.ts`（新建，约 200 行）：

- mock `@supabase/supabase-js` client（`vi.mock`）
- 每个 ZhengStore 方法对应 ≥ 1 个测试：成功 / 网络错误 / 401
- 字段 mapping 校验（snake_case ↔ camelCase）

`__tests__/zheng-store-remote-mappers.test.ts`（新建，约 100 行）：

- `recordToRow` 把 epoch ms 转 ISO 字符串
- `recordFromRow` 把 ISO 字符串转 epoch ms
- jsonb 字段（yao_location / ai_yao）双向 mapping
- 缺字段 / 多字段 时的兼容性

`__tests__/auth-migrate.test.ts`（新建，约 80 行）：

- `migrateLocalToRemote` 空 → 0
- 12 条全成功 → 清本机
- 部分失败 → 不清本机
- 全失败 → throw + 不清本机

`__tests__/auth-errors.test.ts`（新建，约 60 行）：

- `authErrorToMessage` 覆盖所有已知 message + fallback

### 12.2 组件 / 集成测试

`__tests__/auth-provider.test.tsx`（新建，约 150 行）：

- 初始 loading 状态
- getSession 返回 user → user 同步到 context
- onAuthStateChange 事件 → context 更新
- signInWithPassword 成功 / 失败
- signOut 清 user

`__tests__/migration-dialog.test.tsx`（新建，约 180 行）：

- 默认选"合并到云端"
- 点"先导出" → 触发 export
- 点"确认（合并）" → 调用 migrate function
- 错误时显示 retry CTA

`__tests__/login-page.test.tsx` / `register-page.test.tsx`（新建，每个约 100 行）：

- form 校验（邮箱格式、密码长度）
- submit 调用 useAuth hooks
- error 显示 friendly message
- 成功后 redirect

### 12.3 防回归

- `__tests__/zheng-store.test.ts`（扩展）：模块顶层 currentUserId 切换时 zhengStore 路由到对的实现
- `__tests__/no-hex-in-styles.test.ts`（如有）：检查新增组件不含硬编 hex（沿用 B2 PR-1 的 anti-regression 模式）

### 12.4 工程量预计

约 1100 行测试代码 + 1500-1700 行实现代码 = **2600-2800 行**。

> **超出我之前估算（1500-2000 行）**——测试比预期多。可接受。

## 13. 任务拆分（TDD 顺序）

按"先写测试 → RED → 实现 → GREEN"严格执行：

| #   | 任务                                                                | 行数估算 |
| --- | ------------------------------------------------------------------- | -------- |
| T1  | npm install @supabase/supabase-js @supabase/ssr                     | 0        |
| T2  | 加 `.env.example` 模板 + 更新 README 设置说明                       | 30       |
| T3  | `lib/supabase/client.ts` + `server.ts`                              | 80       |
| T4  | `__tests__/zheng-store-remote-mappers.test.ts`（RED）→ 实现 mappers | 250      |
| T5  | `__tests__/zheng-store-remote.test.ts`（RED）→ 实现 store-remote    | 480      |
| T6  | `__tests__/auth-errors.test.ts` + `lib/auth/errors.ts`              | 90       |
| T7  | `__tests__/auth-provider.test.tsx`（RED）→ 实现 AuthProvider        | 280      |
| T8  | `app/layout.tsx` 包裹 AuthProvider                                  | 20       |
| T9  | `__tests__/zheng-store.test.ts` 扩展切换 → 改 store.ts              | 150      |
| T10 | `__tests__/auth-migrate.test.ts` → 实现 lib/auth/migrate.ts         | 130      |
| T11 | `__tests__/migration-dialog.test.tsx` → 实现 MigrationDialog        | 380      |
| T12 | `__tests__/login-page.test.tsx` → 实现 /login                       | 200      |
| T13 | `__tests__/register-page.test.tsx` → 实现 /register                 | 200      |
| T14 | /auth/forgot-password + /auth/reset-password + /auth/verify         | 250      |
| T15 | /auth/callback route handler                                        | 60       |
| T16 | /settings 加账号 section + /history 加账号 icon                     | 150      |
| T17 | typecheck / lint / build / vitest 全过                              | -        |
| T18 | 推 PR + CI 验证                                                     | -        |

总计：约 **2750 行**（实现 + 测试）。

## 14. 验收标准

- [ ] 新建 Supabase 项目，DB schema + RLS 已 apply
- [ ] `.env.local` 配好，本地能 `next dev`
- [ ] 未登录用户行为零回归（所有 PR #3-#8 现有功能正常）
- [ ] 邮箱注册：邮件验证 → 登录成功
- [ ] 登录后保存一条记录 → DB 中能查到（带 user_id = auth.uid）
- [ ] 退出登录 → 切回 localStorage 视图
- [ ] 多设备：A 设备登录写入 → B 设备登录读到
- [ ] 首次登录有本机数据 → 出现迁移弹窗 → 3 选项都能工作
- [ ] 网络断开时合理报错（不是白屏）
- [ ] vitest 全部通过（new + existing 共约 280+ tests）
- [ ] typecheck / lint / build 全过
- [ ] 不出现硬编 hex
- [ ] CI 绿

## 15. 风险 + 未决项

1. **Supabase 邮件每小时限 4 封免费**：MVP 阶段够用；上量后需要换 SMTP（SendGrid / 腾讯企业邮）。**A1 不处理**，A 包上线后视用户量而定。
2. **Supabase 项目 region 选择**：Tokyo / Singapore，国内访问延迟差异 50-200ms。**默认 Tokyo**，上线后用真实国内用户测了再说。
3. **`auth/callback` 路由的 CSRF / state 校验**：Supabase SDK 已内置，但需要在 PR 中明确测试一次。
4. **`crypto.randomUUID()` 在 Edge runtime / SSR 兼容性**：localZhengStore 已用，remoteZhengStore 让 DB 端 `gen_random_uuid()` 生成更稳。
5. **测试时是否用真实 Supabase 实例 vs mock**：A1 全部用 mock，省 CI 时间 + 避免外部依赖；A 包上线前手动跑一次完整 E2E。

## 16. 后续 PR 接力

- **A2**：手机号 OTP（阿里云 / 腾讯云短信 + Supabase SMS Hook + Edge Function）。等短信审核 3-5 工作日，可与 A1 实现并行。
- **A3**：账号管理 + 数据治理（30 天软删注销 / JSON+MD 导出 / 隐私协议 / 服务条款）。A1 合后开始。
