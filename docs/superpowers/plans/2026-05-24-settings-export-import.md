# Settings 页 + 导出/导入 JSON · Implementation Plan

**Spec:** `docs/superpowers/specs/2026-05-24-settings-export-import-design.md`
**Branch:** `devin/1779605944-settings-export-import`
**Status:** Implemented + passing locally; PR pending

---

## Implementation Order (TDD)

### Phase 1 · 数据层 (red → green)

1. **写 red 测试**
   - `__tests__/zheng-export.test.ts` — 4 个 case 覆盖 `exportToJson` wrapper 结构 / 顺序保留 / round-trip / 空数组
   - `__tests__/zheng-import.test.ts` — 9 个 case 覆盖 source 错 / schemaVersion v2 / records 不合法 / 空数组 / round-trip / 非 JSON
   - `__tests__/zheng-store.test.ts` 扩展 — `clearAll` 3 case + `importRecords` 9 case（merge 5 + overwrite 3 + SSR 1）

2. **实现**
   - `lib/zheng/export-schema.ts` — zod schema `ZhengExportSchema` + 常量 `ZHENG_EXPORT_SOURCE`
   - `lib/zheng/export.ts` — `exportToJson(records)` + `exportFilename(at)`
   - `lib/zheng/import.ts` — `parseImport(text)` 返回 `{ ok: true, data } | { ok: false, reason }`，分四阶段校验（JSON / 顶层 object / source / schemaVersion / zod）
   - `lib/zheng/store-types.ts` 扩展 — 新增 `ImportMode` / `ImportResult` 类型 + `clearAll()` / `importRecords(records, mode)` 方法签名
   - `lib/zheng/store-local.ts` 实现 `clearAll`（reads count 后 removeItem）+ `importRecords`（merge 用 Map by id；overwrite 直接 writeAll）

3. **跑测：** `npx vitest run __tests__/zheng-export.test.ts __tests__/zheng-import.test.ts __tests__/zheng-store.test.ts` 全绿（45 tests）

### Phase 2 · UI 层

1. `components/zheng/settings/ImportConflictDialog.tsx` — 弹窗显示文件元信息 + 现有计数 + merge/overwrite 按钮 + overwrite 的二级 inline 确认
2. `components/zheng/settings/ClearAllDialog.tsx` — 两步弹窗（先建议导出 → 输入「清空」确认）
3. `components/zheng/settings/SettingsPanel.tsx` — 集成：导出 / 导入 / 清空 三块；统一 toast；handle 文件输入；orchestrate 子弹窗

### Phase 3 · 路由

1. `app/settings/page.tsx` — 服务端 wrapper（仅 Atmosphere + 标题 + 客户端 SettingsPanel + 回履 link）
2. `app/history/page.tsx` 修改 — header 右上角加「管理 ⚙」link → `/settings`

### Phase 4 · 质量门

- `npm run typecheck` ✓
- `npm run lint` ✓（无新增 warnings）
- `npm run test` ✓（146/146）
- `npm run build` ✓（/settings 5.32kB，/history 3.53kB）

---

## 路径 + 文件清单

```
新增:
  __tests__/zheng-export.test.ts
  __tests__/zheng-import.test.ts
  app/settings/page.tsx
  components/zheng/settings/ClearAllDialog.tsx
  components/zheng/settings/ImportConflictDialog.tsx
  components/zheng/settings/SettingsPanel.tsx
  docs/superpowers/plans/2026-05-24-settings-export-import.md
  docs/superpowers/specs/2026-05-24-settings-export-import-design.md
  lib/zheng/export-schema.ts
  lib/zheng/export.ts
  lib/zheng/import.ts

修改:
  __tests__/zheng-store.test.ts   ← 扩展 12 个新 case + 同步 PR #4 的 seed fix
  app/history/page.tsx            ← header 右上角加「管理 ⚙」link
  lib/zheng/store-local.ts        ← 实现 clearAll + importRecords
  lib/zheng/store-types.ts        ← 新增 ImportMode/ImportResult + 两个方法签名
```

---

## Risks · Mitigations

| Risk                                                  | Mitigation                                               |
| ----------------------------------------------------- | -------------------------------------------------------- |
| 用户误点清空                                          | 两步弹窗 + 输入「清空」短语作为最终防线                  |
| 导入非 taiji-yijing 文件                              | source / schemaVersion / zod 三层校验                    |
| 导入文件中有不合法 record                             | 整文件拒绝（不做部分导入），错误信息含 path              |
| localStorage quota 写入失败                           | 已有 try/catch 静默吞（v1 行为，未来 v1.5 surface）      |
| 导出大文件后 URL.createObjectURL 不 revoke            | a.click() 后立即 revokeObjectURL                         |
| 用户重复导入同一文件                                  | input value 在 onChange 后 reset，可重复选同一文件       |
| `/settings` SSR 期间 zhengStore.listRecords() 返回 [] | SettingsPanel 是 'use client'，useEffect 在 mount 后才查 |

---

## Out of Scope

- 账号 + 云端同步（v2，独立 PR）
- 多语言文案
- 导出 markdown / PDF
- 部分导入 / 按时段筛选
- AI 模式错误状态（D 包的 b 项，下一个 PR）
