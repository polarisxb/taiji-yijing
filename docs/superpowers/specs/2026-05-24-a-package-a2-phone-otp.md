# A 包 PR-2：手机号 OTP 登录 · Design

**Status:** Draft — pending user review
**Date:** 2026-05-24
**Scope:** A 包 A2（账号系统 v2：手机号 OTP 路径）
**Depends on:**

- A1 PR（邮箱 auth + Supabase + AuthProvider 基础设施已就绪）
- 短信服务审核（**外部依赖**，3-5 工作日，与 A1 实现可并行）

---

## 1. 用户拍板的设计决策

延续 A1 的决策；A2 只新增一条**身份方式**：手机号 + 6 位 OTP 验证码。

| 项              | A1 邮箱路径             | A2 手机号路径                                          |
| --------------- | ----------------------- | ------------------------------------------------------ |
| 身份方式        | 邮箱 + 密码             | 手机号 + 6 位短信 OTP                                  |
| 验证 / 凭证发送 | Supabase 内置 SMTP      | 阿里云 / 腾讯云短信（经 Supabase SMS Hook 自定义转发） |
| 后端 user 表    | `auth.users.email` 字段 | `auth.users.phone` 字段                                |
| Supabase 标识符 | `email`                 | `phone`（E.164 格式：+86138xxxxxxxx）                  |

> 同一 Supabase 项目下，邮箱用户和手机号用户**默认是两个不同账号**（不同 `auth.users.id`）。账号合并功能不在 A2 范围（用户体感 = 各登各的），如要做"绑定多种身份"是 A3 / A4 增量。

## 2. 约束

- **不动 A1 已有的邮箱 auth 流程**。
- **不动 zheng_records 表 / RLS / store 实现**——`auth.uid()` 对邮箱用户和手机号用户都生效，RLS 已天然适配。
- **不做 captcha / 人机验证**（v1 用 Supabase 内置的 rate limit 控刷）。
- **不做手机号绑定邮箱 / 多身份合并**——A4 议题。
- **不做账号注销 / 修改手机号**——A3 议题。

## 3. 外部审核流程（不在代码内，但是上线前置）

**整个 A2 PR 不能合入主分支，直到这一步完成。** 在 A1 开发期间并行推进：

### 3.1 阿里云短信（推荐）

或腾讯云短信，流程几乎相同。这里以阿里云为例。

1. 阿里云控制台 → 实名认证（身份证 + 人脸识别）→ 几小时
2. 短信服务 → 国内消息 → 签名管理 → 申请签名
   - 签名内容：**「太极易经」**（或你的产品名）
   - 类型：通用
   - 适用场景：APP / 网站
   - 审核：1-3 工作日
3. 短信服务 → 国内消息 → 模板管理 → 申请模板
   - 类型：**验证码**
   - 模板内容：**「您的验证码：${code}，5 分钟内有效，请勿泄露。」**
   - 审核：1-3 工作日
4. RAM 访问控制 → 创建子账号 + AccessKey
   - 权限：仅 `AliyunDysmsFullAccess`
   - 记录 `AccessKeyId` + `AccessKeySecret`（写入 Supabase Edge Function 环境变量，不进 git）

**腾讯云**同等流程，对应：实名 → 短信 → 应用 → 签名 → 模板。

### 3.2 成本估算

- 阿里云国内验证码短信：**¥0.045 / 条**
- 假设月 1000 用户登录，每人月平均 3 次 OTP → 3000 条 → **¥135 / 月**
- MVP 阶段月几十块到几百块

### 3.3 Supabase 配置

在 Supabase 项目 → Authentication → Providers → Phone：

- Enable Phone provider
- SMS Provider 选 **Twilio**（占位，实际通过 Hook 覆盖）
- 关键：**Send SMS Hook** 配置自定义 Edge Function URL（见第 5 节）

## 4. 数据层影响

**无 DB schema 变更。** `auth.users` 表 Supabase 自带 `phone` 字段，开启 Phone provider 后即可用。

`zheng_records` 表的 RLS 仍是 `auth.uid() = user_id`——对手机号注册的用户同样适用。

## 5. Supabase Edge Function（短信转发）

### 5.1 文件

新增 `supabase/functions/send-sms/index.ts`（Deno runtime）：

```ts
// 伪代码骨架；具体阿里云签名计算见阿里云 SDK
import { serve } from 'https://deno.land/std/http/server.ts'

serve(async (req) => {
  // Supabase Send SMS Hook 调用本函数时会带 secret header 校验
  const secret = req.headers.get('x-supabase-webhook-secret')
  if (secret !== Deno.env.get('SUPABASE_WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { user, sms } = await req.json()
  // user.phone = '+86138xxxxxxxx'
  // sms.otp = '123456'

  const phone = user.phone.replace(/^\+86/, '') // 阿里云要求不带 +86
  const otp = sms.otp

  // 调用阿里云 dysmsapi.SendSms
  const aliyunResp = await callAliyunSendSms({
    PhoneNumbers: phone,
    SignName: '太极易经',
    TemplateCode: 'SMS_XXXXXXX', // 阿里云审核通过的模板 code
    TemplateParam: JSON.stringify({ code: otp }),
  })

  if (aliyunResp.Code !== 'OK') {
    return new Response(`Aliyun error: ${aliyunResp.Message}`, { status: 500 })
  }
  return new Response('ok')
})
```

### 5.2 环境变量（Supabase secrets）

```
ALIYUN_ACCESS_KEY_ID=xxx
ALIYUN_ACCESS_KEY_SECRET=xxx
ALIYUN_SMS_TEMPLATE_CODE=SMS_XXXXXXX
ALIYUN_SMS_SIGN_NAME=太极易经
SUPABASE_WEBHOOK_SECRET=自生成长字符串
```

通过 `supabase secrets set` CLI 设置。

### 5.3 部署

```
supabase functions deploy send-sms --no-verify-jwt
```

然后 Supabase Dashboard → Authentication → SMS Provider → Hook URL = `https://<project>.supabase.co/functions/v1/send-sms`，Webhook Secret 填同一个 `SUPABASE_WEBHOOK_SECRET`。

## 6. AuthProvider 接口扩展

`lib/auth/auth-provider.tsx` 加 3 个方法：

```ts
type AuthContextValue = {
  // ... A1 已有
  signInWithPhoneOtp: (phone: string) => Promise<{ error: AuthError | null }> // 发 OTP
  verifyPhoneOtp: (phone: string, otp: string) => Promise<{ error: AuthError | null }> // 验证 OTP
  signUpWithPhoneOtp: (phone: string) => Promise<{ error: AuthError | null }> // 注册时也是发 OTP
}
```

实现：

```ts
signInWithPhoneOtp: (phone) => supabase.auth.signInWithOtp({ phone })
verifyPhoneOtp: (phone, otp) => supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' })
signUpWithPhoneOtp: 注册 = 登录（Supabase 对手机号自动注册不存在的用户）
```

## 7. UI

### 7.1 路由复用 + Tab 切换

**不新增路由**。在已有的 `/login` 和 `/register` 上方加 Tab 切换：

```
┌──────────────────────────┐
│  [ 邮箱 ]  [ 手机号 ]    │
├──────────────────────────┤
│  ... 对应 form ...       │
└──────────────────────────┘
```

默认选**手机号**（国内用户更常用）。已有 URL `?method=email` / `?method=phone` 可深链。

### 7.2 手机号 OTP 表单

**步骤 1**：

```
+86 [____________]      [发送验证码]
                          ↓ 倒计时 60s 禁用
```

**步骤 2**（发送成功后）：

```
+86 138****1234  [换号]
验证码已发送，60s 后可重发

[ _ ][_ ][_ ][_ ][_ ][_ ]   [验证]
                            ↑ 6 位 OTP 输入
```

输入完成自动校验，或手动点"验证"。

### 7.3 输入校验

- 手机号格式：`/^1[3-9]\d{9}$/`（国内号段）
- OTP 格式：`/^\d{6}$/`
- 错误时显示在 input 下方
- API 错误 → 用 `authErrorToMessage` friendly 化（A1 的 `lib/auth/errors.ts` 扩展几条手机号相关 case）

### 7.4 文件

- `components/auth/PhoneAuthForm.tsx`（约 250 行 + tests ~180 行）
- `components/auth/EmailAuthForm.tsx`（从 A1 的 login/register 抽出，便于 Tab 复用，约 200 行）
- `components/auth/AuthMethodTabs.tsx`（约 60 行）

### 7.5 现有 `/login` `/register` 改造

`/login` 和 `/register` 内容收敛为：

```tsx
<AuthMethodTabs default="phone">
  <Tab name="phone">
    <PhoneAuthForm mode="login" /> {/* or "register" */}
  </Tab>
  <Tab name="email">
    <EmailAuthForm mode="login" />
  </Tab>
</AuthMethodTabs>
```

### 7.6 设置页"账号" section 扩展

显示用户身份：

- 邮箱用户：`📜 已登录：user@example.com`
- 手机号用户：`📜 已登录：+86 138****1234`

判断逻辑：`user.email ?? user.phone` 决定显示哪个。

## 8. 错误处理扩展

`lib/auth/errors.ts` 扩展手机号场景：

```ts
// 新增 case
if (err.message.includes('Phone number is invalid')) return '手机号格式不对'
if (err.message.includes('SMS rate limit')) return '发送太频繁，请稍后再试'
if (err.message.includes('Token has expired')) return '验证码已过期，请重新获取'
if (err.message.includes('Invalid token')) return '验证码错误'
if (err.message.includes('exceeded')) return '验证码错误次数过多，请稍后再试'
```

## 9. 测试（TDD）

### 9.1 单元测试

`__tests__/auth-provider.test.tsx`（扩展 A1，约 +100 行）：

- `signInWithPhoneOtp` 调用 supabase.auth.signInWithOtp with phone
- `verifyPhoneOtp` 成功 → user 同步到 context
- 错误传递（rate limit / invalid token）

`__tests__/auth-errors.test.ts`（扩展 A1，约 +40 行）：

- 5 个手机号相关 message → friendly 中文

### 9.2 组件测试

`__tests__/phone-auth-form.test.tsx`（新建，约 220 行）：

- 手机号格式校验（11 位 + 1 开头）
- 发送 OTP → 倒计时 UI 出现 + 禁用按钮
- 6 位 OTP 输入 → 自动提交
- 验证成功 → redirect / 同步 user
- 各错误显示对应 friendly message
- 「换号」按钮回到步骤 1

`__tests__/auth-method-tabs.test.tsx`（新建，约 80 行）：

- 默认 tab = phone
- 点击 email tab → 显示 EmailAuthForm
- URL 同步：`?method=email` → 默认 email

### 9.3 Edge Function 测试（手动）

Edge Function 在 Deno runtime 内，本仓库测试基础设施跑不到。

**做法**：

- `supabase/functions/send-sms/index.ts` 旁边写 `index.test.ts`，可独立用 `deno test` 跑（README 说明）
- CI 不强制跑 Deno 测试（避免装额外依赖），但 PR 描述里附手动 `deno test` 截图
- 手动验证：上线前用 Supabase Dashboard → Function 测试发一条到自己手机号

### 9.4 工程量预计

测试约 **620 行**，实现约 **800 行**，合计 **1400-1500 行**。

## 10. 任务拆分（TDD 顺序）

外部审核（短信签名 / 模板）**与代码并行**，按以下顺序写代码：

| #   | 任务                                                               | 行数估算 |
| --- | ------------------------------------------------------------------ | -------- |
| T1  | `supabase/functions/send-sms/index.ts` + Aliyun SDK 集成           | 200      |
| T2  | Edge Function 本地 Deno 测试                                       | 80       |
| T3  | AuthProvider 加 3 个手机号方法 + tests（RED → GREEN）              | 180      |
| T4  | `lib/auth/errors.ts` 扩展手机号 case + tests                       | 50       |
| T5  | `components/auth/PhoneAuthForm.tsx` + tests                        | 400      |
| T6  | `components/auth/EmailAuthForm.tsx` 抽出 A1 内联表单               | 200      |
| T7  | `components/auth/AuthMethodTabs.tsx` + tests                       | 140      |
| T8  | 改 `/login` `/register` 用 Tabs                                    | 80       |
| T9  | 改设置页 "账号" section 适配手机号显示                             | 30       |
| T10 | 短信审核通过 → 阿里云 / 腾讯云 secrets 配置 → Supabase secrets set | -        |
| T11 | Supabase 项目启用 Phone provider + SMS Hook 配置                   | -        |
| T12 | E2E：自己手机号注册 / 登录走通                                     | -        |
| T13 | typecheck / lint / build / vitest 全过 → 推 PR                     | -        |

## 11. 验收标准

- [ ] 短信签名 + 模板已审核通过
- [ ] 阿里云 / 腾讯云 AccessKey 配置到 Supabase Edge Function secrets
- [ ] Edge Function 部署 + Supabase SMS Hook 指向 Edge Function URL
- [ ] 测试号码（自己手机）能收到 OTP 短信，5 分钟内验证通过
- [ ] `/login` 默认显示手机号 Tab，可切换到邮箱
- [ ] 错误 case 文案 friendly（rate limit / invalid token / expired token）
- [ ] 邮箱用户登录路径不回归
- [ ] vitest 全部通过（A1 + A2 共约 400+ tests）
- [ ] typecheck / lint / build 全过
- [ ] 不出现硬编 hex
- [ ] CI 绿

## 12. 风险 + 未决项

1. **阿里云短信审核被驳回**：备选用腾讯云（流程相同）；同时上传两家审核也可（双 vendor 冗余）。
2. **国际号码**（A 包 v1 不支持）：默认 `+86` 写死，UI 不显示国家代码选择器；国际号码用户走邮箱路径。
3. **SMS 成本超预算**：监控月发送量；如超 ¥500/月，考虑加 captcha 防刷。
4. **Edge Function cold start 延迟**：Supabase Edge Function 冷启动 200-500ms，叠加阿里云 API 200-400ms，用户体感 < 1s，可接受。
5. **同一用户用手机号注册过又用邮箱注册**：当前是两个独立账号；A4 可做账号合并 UI。
