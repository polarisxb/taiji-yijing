# A 包 PR-3：账号管理 + 数据治理 · Design

**Status:** Draft — pending user review
**Date:** 2026-05-24
**Scope:** A 包 A3（账号管理 UI + 30 天软删注销 + JSON+Markdown 全量导出 + 隐私协议 + 服务条款）
**Depends on:**

- A1 PR（邮箱 auth + 云端存储 + AuthProvider 就绪）
- A2 PR（手机号 OTP 就绪，可选——A3 主体不依赖手机号，但部分 UI 文案适配）

---

## 1. 用户拍板的设计决策

| #    | 问题                | 决策                                                      |
| ---- | ------------------- | --------------------------------------------------------- |
| Q5.1 | 账号注销策略        | **30 天软删 + 可撤回**                                    |
| Q5.2 | 数据导出格式        | **JSON + Markdown 双导出**                                |
| Q5.3 | 隐私协议 / 服务条款 | **都要**，由 Devin 起草（A3 PR 内附）                     |
| Q5.4 | 自动 AI 对话历史    | **不进 A 包**，看反馈再单独做 opt-in 功能（不在 A3 范围） |

## 2. 约束

- **不动 A1 / A2 已有的 auth 流程**和 store 切换逻辑。
- **不动 `zheng_records` 表 schema**——`deleted_at` 列已在 A1 加好。
- **不动 RLS 策略**——A1 的 SELECT 策略已天然过滤软删记录。
- **删除单条记录**仍是硬删（A1 已实现）——只有"注销整个账号"走软删 30 天回收。
- **不做用户角色 / 权限**（没多用户协作场景）。
- **不做 Markdown 编辑器** —— 导出只读 Markdown，不做导入回写。

## 3. 工作清单总览

| 模块                     | 文件 / 路由                                          | 估算 |
| ------------------------ | ---------------------------------------------------- | ---- |
| 设置页"账号"section 扩展 | `app/settings/page.tsx` + 几个子组件                 | 200  |
| 注销流程                 | `components/auth/DeleteAccountFlow.tsx` + 服务端 RPC | 350  |
| 撤回注销                 | `app/auth/restore/page.tsx` + Edge Function          | 150  |
| 30 天清理 cron           | `supabase/functions/purge-deleted-accounts/`         | 120  |
| 全量导出 JSON            | 扩展 `lib/zheng/export.ts` 支持云端                  | 100  |
| Markdown 导出            | `lib/zheng/export-markdown.ts` + tests               | 220  |
| 隐私协议 / 服务条款页    | `app/privacy/page.tsx` + `app/terms/page.tsx` + 内容 | 300  |
| 注册时勾选同意           | `/register` 加 checkbox                              | 50   |
| 修改密码 / 修改邮箱      | 设置页扩展                                           | 200  |
| 测试                     | `__tests__/*.test.tsx`                               | 600  |

合计 **2300-2500 行**。

## 4. 设置页"账号" section 重构

A1 已有最简的 logout。A3 扩展为完整账号管理：

```
账号

📜 已登录：user@example.com  （或 +86 138****1234）
   注册时间：2026 年 5 月 24 日
   记录正在同步到云端

[修改密码]    （邮箱用户）
[修改邮箱]    （邮箱用户）
[修改手机号]  （手机号用户）
[退出登录]

—— 数据 ——

[导出所有数据 JSON]  [导出 Markdown 备份]
                     ↑ 含云端 + 本机所有记录

—— 危险区域 ——

[注销账号]
↑ 红边按钮，点击 → 走 4 步注销流程
```

文件：

- `components/settings/AccountSection.tsx`（约 200 行）
- `components/settings/ChangePasswordDialog.tsx`（约 120 行）
- `components/settings/ChangeEmailDialog.tsx`（约 100 行 + Supabase verify flow）
- `components/settings/ChangePhoneDialog.tsx`（约 100 行）

> 修改邮箱 / 手机号需要重新走 OTP / 验证邮件，Supabase SDK 内置 `supabase.auth.updateUser({ email })` 会自动发新验证邮件。

## 5. 30 天软删注销

### 5.1 用户流程（4 步）

**步骤 1：警告**

```
⚠️ 注销账号

你将删除：
• N 条云端记录
• 你的账号信息（邮箱 / 手机号）

注销后 30 天内可登录撤回；30 天后所有数据永久删除。

[ 我再想想 ]  [ 继续 → ]
```

**步骤 2：建议导出**

```
建议先备份你的数据

如果注销后又改主意，30 天内可登录撤回。
但保险起见，先导出一份吧。

[ 导出 JSON ]  [ 导出 Markdown ]
[ 已备份，继续 → ]
```

点导出 → 触发下载 → 完成后回到此步（不自动跳下一步）。

**步骤 3：最终确认**

```
请输入"注销账号"四个字确认：
[                          ]
[ ↓ 输入匹配后启用 ↓ ]
[ 确认注销 ]  [ 取消 ]
```

**步骤 4：完成**

```
账号已注销。30 天内仍可用同样的邮箱/手机号登录撤回。
30 天后所有数据将永久删除。

[ 返回主页（匿名态）]
```

自动 `signOut()` + redirect 到 `/`。

### 5.2 后端实现

**服务端 RPC**（Supabase Postgres function）：

```sql
create or replace function public.request_account_deletion()
returns void
language plpgsql
security definer
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- 软删所有 zheng_records
  update public.zheng_records
    set deleted_at = now()
    where user_id = uid
      and deleted_at is null;

  -- 软删账号本体：在 auth.users 表加 deleted_at（Supabase 自定义 metadata）
  update auth.users
    set raw_user_meta_data = raw_user_meta_data || jsonb_build_object('deleted_at', extract(epoch from now()))
    where id = uid;
end;
$$;

grant execute on function public.request_account_deletion to authenticated;
```

> 不能直接 `delete from auth.users`——会触发 cascade 删 zheng_records。我们要"30 天可撤回"，所以走 `raw_user_meta_data.deleted_at` 标记。

### 5.3 撤回流程

用户在注销后 30 天内再次登录：

- AuthProvider 检测 `user.user_metadata.deleted_at` 非空
- 显示「账号已注销，30 天内可恢复」的全局 banner + [恢复账号] 按钮
- 点恢复 → 调用 `public.restore_account()` RPC：

```sql
create or replace function public.restore_account()
returns void
language plpgsql
security definer
as $$
declare
  uid uuid := auth.uid();
  deleted_epoch bigint;
begin
  select (raw_user_meta_data->>'deleted_at')::bigint into deleted_epoch
    from auth.users where id = uid;

  if deleted_epoch is null then
    raise exception 'account not deleted';
  end if;
  if extract(epoch from now()) - deleted_epoch > 30 * 86400 then
    raise exception 'restore window expired';
  end if;

  -- 撤回 zheng_records 软删
  update public.zheng_records
    set deleted_at = null
    where user_id = uid
      and deleted_at >= to_timestamp(deleted_epoch);

  -- 清账号本体的 deleted_at 标记
  update auth.users
    set raw_user_meta_data = raw_user_meta_data - 'deleted_at'
    where id = uid;
end;
$$;

grant execute on function public.restore_account to authenticated;
```

### 5.4 30 天后定时清理

新增 Supabase Edge Function `supabase/functions/purge-deleted-accounts/index.ts`，schedule 每日跑：

```ts
// 1. 查所有 deleted_at < now - 30d 的账号
// 2. 硬删 zheng_records（已经 soft-deleted）
// 3. 删 auth.users 行（service role 权限）
```

Supabase Edge Functions 用 `pg_cron` 定时调用：

```sql
select cron.schedule(
  'purge-deleted-accounts-daily',
  '0 3 * * *',  -- 每天 UTC 03:00
  $$ select net.http_post(
    url := 'https://<project>.supabase.co/functions/v1/purge-deleted-accounts',
    headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_token')),
    body := '{}'::jsonb
  ); $$
);
```

> Edge Function 用 service_role key 才能删 `auth.users`，须严格保护 webhook secret。

### 5.5 文件

- `components/auth/DeleteAccountFlow.tsx`（约 350 行，4 步组件）
- `components/auth/RestoreAccountBanner.tsx`（约 80 行）
- `app/auth/restore/page.tsx`（约 70 行，撤回详情页）
- `supabase/migrations/20260524_a3_account_deletion.sql`（RPC + cron）
- `supabase/functions/purge-deleted-accounts/index.ts`（约 120 行）

## 6. 全量导出（JSON + Markdown）

### 6.1 JSON（已有，扩展）

PR #5 的 `lib/zheng/export.ts` 当前只导本机。A3 扩展：

```ts
export async function exportToJson(store: ZhengStore): Promise<ZhengExport> {
  // store 自动按 auth 状态切到 local / remote
  const records = await store.listRecords()
  return {
    source: 'taiji-yijing.zheng',
    schemaVersion: 1,
    exportedAt: Date.now(),
    recordCount: records.length,
    records,
  }
}
```

> 因为 `zhengStore` 已经在 A1 切换好，无须改 export.ts 逻辑——只需文件名带身份后缀（`taiji-yijing-zheng-CLOUD-2026-05-24.json` vs `taiji-yijing-zheng-LOCAL-2026-05-24.json`）防止用户混淆。

### 6.2 Markdown（新增）

新增 `lib/zheng/export-markdown.ts`：

```ts
export function exportToMarkdown(records: ConsultationRecord[]): string {
  // 按 createdAt 倒序排列
  // 输出格式见下
}
```

**输出格式**：

```markdown
# 太极易经 · 我的决策档案

导出于 2026-05-24，共 23 条记录

---

## 屯 · 2026-05-20 14:32

**情境**

> 我要不要换工作

**取象** (AI · 确信 定见)

- 卦：屯（第 3 卦）
- 爻位：上九「乘马班如，泣血涟如」

**AI 解读**
_（未保存 AI 解读全文；A 包不存 layer 2 数据）_

**我的笔记**

> 下周给老板打电话

**应验**
✅ 已应验（2026-05-23）：实际谈话比预期顺利，下周交接

---

## 蒙 · 2026-05-15 09:20

...
```

**实现要点**：

- 按月分组（`## 2026 年 5 月`）增加可读性
- ai 记录显示 `(AI · 确信 定见/待审/审慎)`，classic 记录显示 `(经典 · 契合 85%)`
- 引用块（`>`）包裹 situation 和 userNote
- verification 状态用 emoji：`✅ 已应验` / `🟡 部分应验` / `❌ 未应验` / `⚪ 未回访`

### 6.3 文件

- `lib/zheng/export-markdown.ts`（约 180 行）
- `lib/zheng/export.ts`（扩展约 40 行）
- `__tests__/zheng-export-markdown.test.ts`（约 200 行）

## 7. 注册时勾选同意协议

`/register`（A1）加 checkbox：

```
[ ] 我已阅读并同意《用户服务条款》和《隐私政策》
```

未勾选时"注册"按钮 disabled。

A2 的手机号注册同样要勾。

## 8. 隐私协议（/privacy）

新增 `app/privacy/page.tsx`（静态 markdown 渲染或 JSX）。

**内容大纲**（Devin 起草，约 250 行 markdown）：

```markdown
# 隐私政策

最后更新：2026 年 5 月 24 日

## 1. 我们是谁

太极易经决策框架，由 [Jennifer Fields] 个人维护。

## 2. 我们收集什么数据

未登录时：

- localStorage 中的咨询记录（仅在你的浏览器，不传任何服务器）

登录后：

- 邮箱 / 手机号（用于身份验证）
- 你保存的咨询记录（situation 文本、卦象元数据、笔记、应验状态）
- 服务器 access log（IP、时间戳，30 天自动清理）

**我们不收集**：

- AI 对话过程文本（流过即丢，不存）
- 浏览器指纹、设备 ID
- 第三方追踪数据（无 Google Analytics、无 Pixel）

## 3. 数据存放在哪

Supabase Tokyo 服务器（或 Singapore，取决于实际配置）。
HTTPS 加密传输。Postgres at-rest 加密（Supabase 平台保证）。

## 4. 谁能看到你的数据

- 你本人（通过登录）
- 我（产品维护者）：理论上能通过数据库后台访问，仅在调试 / 客服场景才看
- Supabase 平台（基础设施提供者）

**我们不会**：

- 售卖数据
- 向第三方分享
- 用你的数据训练 AI 模型

## 5. 你的权利

- **查看**：登录后即可查看所有数据
- **导出**：设置页 → 导出 JSON / Markdown
- **删除单条**：在记录详情页删除
- **注销账号**：设置页 → 注销账号（30 天内可撤回）

## 6. 数据保留期

- 活跃账号：你登录期间永久保留
- 注销账号：30 天软删，之后永久删除
- 服务器日志：30 天自动清理

## 7. Cookies

- 必要 cookies（auth session）：用于保持登录
- 不使用追踪 cookies

## 8. 未成年人

本产品不为 14 岁以下未成年人提供服务。

## 9. 变更

本政策可能更新。重大变更会在登录后提示。

## 10. 联系

邮件：[联系邮箱]
```

> ⚠️ Devin 起草的协议**不是法律意见**。如有商业 / 法律需求，建议找律师 review。

## 9. 服务条款（/terms）

新增 `app/terms/page.tsx`，内容大纲（约 200 行 markdown）：

```markdown
# 用户服务条款

## 1. 服务性质

太极易经决策框架是一款**辅助思考工具**，基于《周易》义理派传统，
帮助用户从 64 卦原型角度看待自己的情境。

**重要声明**：

- 本工具**不是占卜服务**——我们不预测未来。
- 本工具**不是心理咨询**——情绪困扰请寻求专业帮助。
- 本工具**不替代专业意见**（法律、医疗、财务、心理等）。
- 决策结果由你自己负责。

## 2. 使用规则

不得用本服务做：

- 违法情境（毒品、暴力、政治敏感）
- 骚扰他人（用真实姓名诋毁）
- 学术不端（用 AI 解读冒充自己思考）
- 自动化抓取（限速 + 验证码触发）

## 3. AI 内容

- AI 解读由 DeepSeek 模型生成，可能出错或不准
- 我们不对 AI 输出的准确性 / 完整性负责
- 你应当用自己的判断过滤 AI 输出

## 4. 知识产权

- 你保存的内容（situation、笔记）归你
- 你授予我们储存、显示这些内容的权利
- 系统的 64 卦解读、UI、代码归产品方所有

## 5. 服务变更 / 终止

- 我们可能更新功能 / 停止维护
- 终止前我们会提前 30 天通知
- 终止后你有 90 天导出数据

## 6. 免责

本服务"按现状"（AS IS）提供。不对：

- 服务可用性 / 连续性
- 数据完整性（注销 / 故障等场景）
- 任何决策结果

承担责任。最大赔偿不超过你支付给我们的费用（当前为 0）。

## 7. 适用法律

中华人民共和国法律。

## 8. 联系

[同上]
```

### 9.1 文件

- `app/privacy/page.tsx`（直接 JSX 或用 `<Markdown>` 组件渲染 `.md` 文件）
- `app/terms/page.tsx`
- `components/legal/MarkdownRenderer.tsx`（简单纯文本渲染，不引入新依赖）

> 不引入 react-markdown 等库，用最朴素的 `<pre className="whitespace-pre-wrap">` 或自己写段落分割即可（内容是我们自己写的，可控）。

## 10. 错误处理扩展

`lib/auth/errors.ts`：

```ts
if (err.message === 'restore window expired') return '注销已超过 30 天，账号无法恢复'
if (err.message === 'account not deleted') return '账号未处于注销状态'
```

## 11. 测试（TDD）

### 11.1 单元测试

`__tests__/zheng-export-markdown.test.ts`（约 200 行）：

- 空 records → 输出标题 + "共 0 条" + 空内容区
- 单条 classic → 输出格式正确
- 单条 ai with confidence → 输出 `(AI · 确信 定见)`
- 多条按月分组
- userNote / verification / aiYao 字段在 / 不在 都正常
- emoji 映射 verification 状态

### 11.2 组件测试

`__tests__/delete-account-flow.test.tsx`（约 250 行）：

- 步骤 1 → 2 → 3 → 4 切换
- 步骤 3 必须输入"注销账号"才启用按钮
- 步骤 4 自动 signOut
- 取消可在任意步骤回到设置页

`__tests__/restore-account-banner.test.tsx`（约 100 行）：

- user_metadata.deleted_at 存在 → banner 显示
- 点击恢复 → 调用 RPC
- 成功后 banner 消失

`__tests__/account-section.test.tsx`（约 120 行）：

- 未登录 → 不渲染（设置页另一段处理）
- 邮箱用户 → 显示邮箱 + [修改邮箱/密码]
- 手机号用户 → 显示手机号 + [修改手机号]

### 11.3 防回归

- `__tests__/no-hex-in-styles.test.ts`：A3 新组件不能引入硬编 hex
- A1 / A2 已有测试不能 fail

### 11.4 工程量

测试约 **750 行**，实现约 **1500 行**，合计 **2250 行**。

## 12. 任务拆分（TDD 顺序）

| #   | 任务                                                   | 行数估算 |
| --- | ------------------------------------------------------ | -------- |
| T1  | Markdown 导出 lib + tests                              | 380      |
| T2  | export.ts 扩展支持 cloud / local 文件名后缀            | 60       |
| T3  | `request_account_deletion` + `restore_account` RPC SQL | 80       |
| T4  | `purge-deleted-accounts` Edge Function                 | 150      |
| T5  | pg_cron schedule SQL                                   | 30       |
| T6  | DeleteAccountFlow 组件 + tests                         | 600      |
| T7  | RestoreAccountBanner + tests                           | 180      |
| T8  | /auth/restore/page.tsx                                 | 80       |
| T9  | AccountSection + 3 个修改 dialog + tests               | 540      |
| T10 | /register 加 checkbox + tests                          | 80       |
| T11 | /privacy 页 + 内容                                     | 250      |
| T12 | /terms 页 + 内容                                       | 200      |
| T13 | MarkdownRenderer（朴素版）                             | 50       |
| T14 | typecheck / lint / build / vitest 全过 → 推 PR         | -        |

## 13. 验收标准

- [ ] 设置页"账号" section 完整：身份、注册时间、修改密码 / 邮箱 / 手机号 / 退出登录 / 导出 / 注销
- [ ] 注销流程 4 步全部走通
- [ ] 注销后 1 分钟内重新登录 → 看到 banner → 点恢复 → 数据回来
- [ ] 模拟 30 天后（手动改 DB 中 `deleted_at`）→ 撤回 RPC 拒绝
- [ ] purge Edge Function 手动触发：删 1 个 31 天前的测试账号 + 其 records
- [ ] Markdown 导出：含云端记录，按月分组，emoji 正确
- [ ] JSON 导出：文件名带 `CLOUD-` / `LOCAL-` 前缀
- [ ] /privacy + /terms 页可访问，内容显示正常
- [ ] /register 不勾选 checkbox 时按钮 disabled
- [ ] vitest 全部通过（A1 + A2 + A3 共约 500+ tests）
- [ ] typecheck / lint / build 全过
- [ ] 不出现硬编 hex
- [ ] CI 绿

## 14. 风险 + 未决项

1. **Edge Function 用 service_role 权限删 auth.users**：service_role key 泄露 = 全用户数据被删风险。**必须用 Supabase secrets vault**，不能写进代码 / git。
2. **pg_cron 在 Supabase 免费 tier 默认开启**：但要确认；如不可用，备选方案是 GitHub Actions 定时 ping Edge Function URL。
3. **30 天的精确性**：用 epoch 比较，避免时区问题；可考虑加缓冲（31 天 / 32 天）以防边缘 case。
4. **协议起草非法律意见**：建议商业上量后找律师 review；起草版本明确标 disclaimer。
5. **注销后用户再注册同邮箱**：Supabase 默认禁止（auth.users 唯一约束）；我们的撤回机制不允许，但 30 天后清理掉就能再注册——这是 by design，建议向用户说明。
6. **Markdown 导出体积**：100 条记录约 30-50KB，浏览器内直接下载没问题。如未来 layer 2 加入对话历史，体积可能 10-100x，需要 streaming download。
