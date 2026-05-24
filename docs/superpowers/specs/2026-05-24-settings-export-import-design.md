# Settings 页 + 导出/导入 JSON · Design

**Status:** Draft — pending user review
**Date:** 2026-05-24
**Scope:** D 包之 c+d（边角打磨第二弹）
**Depends on:** PR #3（zheng 数据层 + ZhengStore interface）

---

## 1. 用户拍板的设计决策

| #   | 问题              | 决策                                                                              |
| --- | ----------------- | --------------------------------------------------------------------------------- |
| Q1  | Settings 入口位置 | **只在 `/history` 顶部加「管理 ⚙」按钮** → 跳 `/settings`                         |
| Q2  | 导出 JSON 格式    | **包一层元数据**：`{ source, schemaVersion, exportedAt, recordCount, records }`   |
| Q3  | 导入冲突处理      | **上传后弹窗让用户选 merge / overwrite**，显示文件元信息 + 当前 localStorage 状态 |
| Q4  | 清空数据防呆      | **先建议导出 → 再要求输入「清空」二字确认**                                       |

---

## 2. 路由 + 入口

### 新增路由

- `/settings` —— Settings 页

### 入口

- `/history` 列表页顶部加一个低调的「管理 ⚙」按钮（链接到 `/settings`）
- **不**在主页 / 卦详情 / hexagrams 页加入口（YAGNI；当前 settings 内容全部跟「履」绑定）

---

## 3. 数据模型 · 导出 JSON 格式

### 文件名

```
taiji-yijing-zheng-YYYY-MM-DD.json
```

例：`taiji-yijing-zheng-2026-05-24.json`

### 文件内容

```ts
type ZhengExport = {
  /** 防止误导入其他 app 的 JSON */
  source: 'taiji-yijing.zheng'
  /** Wrapper 自身的版本号；当前 = 1 */
  schemaVersion: 1
  /** 导出时戳（ms） */
  exportedAt: number
  /** 记录数量（冗余但有用，预览时不用解析整个数组） */
  recordCount: number
  /** 实际数据，与 localStorage 内一致 */
  records: ConsultationRecord[]
}
```

### zod schema

新增 `lib/zheng/export-schema.ts`：

```ts
export const ZhengExportSchema = z.object({
  source: z.literal('taiji-yijing.zheng'),
  schemaVersion: z.literal(1),
  exportedAt: z.number().int().nonnegative(),
  recordCount: z.number().int().nonnegative(),
  records: z.array(ConsultationRecordSchema),
})
```

读入时 `safeParse` 校验失败 → 抛 friendly error message。

---

## 4. 业务逻辑

### 4.1 导出流程

1. 用户在 `/settings` 点「导出 JSON」按钮
2. 读取 `localZhengStore.listRecords()` → 包装成 `ZhengExport`
3. `JSON.stringify(export, null, 2)` 产生格式化 JSON
4. 创建 `Blob` + `URL.createObjectURL` → `<a download>` 触发下载
5. 完成后 `URL.revokeObjectURL` 释放内存
6. 显示「已导出 N 条记录」toast 1.5s

**边界**：

- 0 条记录时按钮 disable，附文案「暂无可导出的记录」
- 导出过程同步完成（数据少），不需要 loading 状态

### 4.2 导入流程

1. 用户在 `/settings` 点「导入 JSON」按钮 → 触发 `<input type="file" accept=".json,application/json">` 选文件
2. `FileReader.readAsText` 读为字符串 → `JSON.parse`
3. `ZhengExportSchema.safeParse` 校验
   - 失败 → 显示 friendly error：「文件不是有效的 taiji-yijing 导出文件」+ 详细原因（zod issues）
   - 成功 → 进入冲突解决 dialog
4. **冲突解决 dialog**（不用 `confirm()`，自建组件）展示：
   - 文件元信息：导出时间 + 记录数
   - 当前 localStorage 状态：现有记录数
   - 两个按钮 + 一个 cancel：
     - **「合并到当前」**（merge）—— 把文件里的 records 追加，按 UUID 去重（碰撞极低，碰撞时取 createdAt 较新者）
     - **「替换当前」**（overwrite）—— 显示 inline 二级确认：「将删除当前 X 条，此操作不可撤销」+「确定替换」按钮
     - **取消**
5. 执行完成显示 toast：「已合并 N 条记录」/ 「已替换为 N 条记录」
6. 成功后 `router.refresh()` 或直接重定向到 `/history` 让用户看到导入后的列表

**边界**：

- 文件大小限制：> 5MB 拒绝 + 提示（v1 不应有这种规模）
- 内容是合法 JSON 但不是导出格式（如其他 app 的导出）→ schema 校验失败 → 友好提示
- records 数组里某些条目 schema 不合法 → safeParse 失败时直接拒绝整个文件（不做部分导入，避免静默丢数据）；提示用户「文件中有 X 条记录格式不合法」

### 4.3 清空数据流程

1. 用户在 `/settings` 点「清空所有记录」按钮
2. **弹窗 1**（备份建议）：「即将清空 N 条记录。强烈建议先导出备份。」
   - 按钮：「先导出 → 」/ 「跳过备份继续」/ 取消
   - 点「先导出」→ 触发导出流程，导出后回到弹窗 1（关闭弹窗 1 不删）
3. **弹窗 2**（最终确认）：「请输入「清空」二字以确认操作」
   - 输入框 + 「确认清空」按钮（disabled until 输入完全匹配「清空」）
   - 取消按钮
4. 确认后 `localZhengStore` 新增 `clearAll()` 方法 → 清空 localStorage 那一个 key
5. 显示 toast：「已清空 N 条记录」
6. 重定向到 `/history`（自然显示空状态）

**边界**：

- 0 条记录时按钮 disable

---

## 5. 实现拆分

### lib/ 新增

- `lib/zheng/export.ts` — 纯函数 `exportToJson(records: ConsultationRecord[]): ZhengExport`
- `lib/zheng/import.ts` — 纯函数 `parseImport(text: string): { ok: true; data: ZhengExport } | { ok: false; reason: string }`
- `lib/zheng/export-schema.ts` — zod schema

### lib/zheng/store-types.ts 扩展

新增 1 个方法：

```ts
interface ZhengStore {
  // ... existing
  clearAll(): Promise<number> // returns count cleared
  importRecords(
    records: ConsultationRecord[],
    mode: 'merge' | 'overwrite',
  ): Promise<{
    imported: number
    skipped: number // for merge: duplicate UUIDs taken from newer one
    total: number
  }>
}
```

### lib/zheng/store-local.ts 实现

- `clearAll()`: `localStorage.removeItem(STORAGE_KEY)`，返回清空前的 count
- `importRecords(records, 'merge')`: 读现有 → 用 Map by id 合并（取 createdAt 较新者） → 写回
- `importRecords(records, 'overwrite')`: 直接 `writeAll(records)`

### components/zheng/settings/ 新增

- `SettingsPage.tsx` — 客户端组件，挂 `app/settings/page.tsx`
- `ExportButton.tsx` — 触发导出流程
- `ImportButton.tsx` — 触发文件选择 + 解析
- `ImportConflictDialog.tsx` — merge/overwrite 选择 dialog
- `ClearAllButton.tsx` — 两步弹窗 + 输入短语确认
- `ConfirmDialog.tsx` — 通用 dialog 容器（可选，先 inline 写）

### app/ 新增

- `app/settings/page.tsx` — Settings 页路由

### app/history/page.tsx 修改

- 在标题旁加「管理 ⚙」按钮 → 链到 `/settings`

---

## 6. 测试

### Unit tests (lib 层)

`__tests__/zheng-export.test.ts`（新建）：

- `exportToJson` 产生符合 schema 的 wrapper
- recordCount === records.length
- exportedAt 是 number
- 0 条记录时也产生合法 wrapper

`__tests__/zheng-import.test.ts`（新建）：

- 合法 JSON + 合法 wrapper → ok=true
- 不是 JSON → ok=false + friendly reason
- JSON 但缺 source → ok=false
- source 不是 taiji-yijing.zheng → ok=false
- schemaVersion 不是 1 → ok=false（v1 不向后兼容，v2 加 logic）
- records 数组里有不合法条目 → ok=false（整个拒绝）

`__tests__/zheng-store.test.ts`（扩展）：

- `clearAll()` 清空所有记录并返回数量
- `clearAll()` 在空 storage 时返回 0
- `importRecords([...], 'merge')` 追加新记录
- `importRecords([...], 'merge')` UUID 碰撞时取 createdAt 较新的
- `importRecords([...], 'overwrite')` 替换所有现有记录
- `importRecords([], 'overwrite')` 清空（边界）

### Manual / E2E（PR 后）

- 导出文件 → 读出来 → 内容正确 / 文件名正确
- 导入合法文件 → merge 看到记录 += / overwrite 看到记录 =
- 导入非法文件 → 友好错误
- 清空 → 两步弹窗 → 输入「清空」→ /history 显示空状态

---

## 7. 不在这个 PR 里

- **账号 + 云端同步**（v2 计划，独立大 PR）
- **导入历史记录列表**（追踪导入了哪些文件，不必要）
- **导入时按时间段筛选 / 选择性导入**（v2+ 才考虑）
- **导出 markdown / PDF**（不同需求，未来独立 feature）
- **多语言文案**（C 选项做语言切换时一并）
- **AI 模式相关错误处理**（D 包的 b 项，下一个 PR）

---

## 8. 风险 + 缓解

| 风险                                              | 缓解                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------- |
| 用户误点清空                                      | C 级防呆（先建议导出 → 输入短语确认）                                        |
| 导入文件 records 中有恶意大字符串                 | localStorage 写入会抛 QuotaExceededError，try/catch 提示「记录太大无法导入」 |
| 导入文件 schema 版本与代码不匹配（未来 v2）       | schemaVersion 校验 + 友好错误「请升级到最新版本以导入此文件」                |
| 用户在浏览器隐私模式下导入 → localStorage 不持久  | v1 不处理（用户责任）；UI 上不做特殊提示                                     |
| Settings 页只有 zheng 相关 → 未来加全局设置时凌乱 | 把 settings 页分成「数据」与未来的「界面」section；当前只填「数据」section   |

---

## 9. 文案

- 「管理 ⚙」（/history 顶部按钮）
- 「设置」（/settings 页标题）
- 「数据」（section heading）
- 「导出 JSON」/「正在导出...」/「已导出 N 条记录」
- 「导入 JSON」/「选择文件...」
- 「清空所有记录」
- 「即将清空 N 条记录，建议先导出备份。」
- 「请输入「清空」二字以确认操作」
- 「已合并 N 条记录」/ 「已替换为 N 条记录」/「已清空 N 条记录」

---

## 10. 后续 (out of scope, but noted)

- 把 settings 页的「数据」section 升级为对 v2 账号体系的同步 UI：登录态 + 上次同步时间 + 「立即同步」按钮
- 多设备同步冲突解决（v2）
- 导出/导入 yao-locator 的 prefill state（如果它将来也持久化）
