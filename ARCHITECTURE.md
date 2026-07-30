# 架构说明

## 技术结构

Personal Desk 使用 Next.js App Router、React、TypeScript 和 vinext 构建。界面样式集中在 `app/globals.css`，图标来自 Lucide React，日期计算使用 date-fns，导入校验使用 Zod。

网站没有登录、业务 API 或数据库。`.openai/hosting.json` 中的 D1 与 R2 均保持 `null`。

## 页面与组件

`app/page.tsx` 只负责挂载 `TaskProvider` 与 `PersonalDeskApp`。`PersonalDeskApp` 维护当前导航视图、编辑面板和输入模块，具体界面继续拆分：

- `components/layout/Sidebar.tsx`：桌面收起导航与手机抽屉。
- `components/dashboard/Dashboard.tsx`：今日四列和单模块视图。
- `components/composer/DynamicComposer.tsx`：四种输入方式和草稿。
- `components/tasks/*`：单任务卡、工作流进度和详情面板。
- `components/views/*`：完成记录、提醒和数据备份。
- `components/feedback/ToastStack.tsx`：多个独立撤销倒计时。

导航采用单页视图切换，避免任务操作时产生不必要的页面跳转。任务详情使用右侧面板。

## 状态管理

`context/TaskContext.tsx` 使用 `useReducer` 作为唯一业务状态入口。组件只能调用 Context 暴露的添加、修改、完成、阶段推进、删除、撤销、设置和导入函数，不直接修改任务对象。

Reducer 操作始终创建新数组和新对象，保证状态变化可追踪。

## 本地存储服务

`lib/storage/storage.ts` 是唯一的 localStorage 读写层。Provider 完成首次 hydrate 后，每次任务、设置或待撤销操作变化都会立即保存。

加载流程：

1. 解析 JSON。
2. 运行数据迁移。
3. 用 Zod 校验完整结构。
4. 完整结构失败时逐条恢复有效任务。
5. 隔离损坏项和重复 ID，避免一条错误数据阻塞整个应用。

## 日期与排序

所有日期规则集中在 `lib/dates`。

- `dateCalculations.ts`：本周星期日、本月末、阶段日期链、超时、显示格式和阶段推进。
- `sorting.ts`：超时、截止日期、紧急程度和创建时间排序。

阶段日期修改采用“锚点”算法：手动日期不会被上游改动覆盖，后续自动日期从最近的最终日期继续推算。

## 阶段推进

自媒体和广告项目保存 `currentStageId`。到期只会在显示层成为 `overdue`，不会写入自动完成或改变当前阶段。

只有 `advanceWorkflow` 收到当前阶段 ID 时才会：

1. 将当前阶段标为完成并写入实际完成时间。
2. 激活下一个阶段。
3. 更新 `currentStageId`。
4. 在最后阶段完成时将整个项目标为完成。

等待中或已完成的阶段不能被再次推进。

## 撤销机制

`lib/undo/actions.ts` 为完成、阶段推进和删除创建完整任务快照。每条 `PendingAction` 保存创建时间与固定过期时间。

- 撤销时用快照替换当前任务，或把已删除任务重新加入。
- 刷新后从 localStorage 恢复原 `expiresAt`，不会重新开始 15 秒。
- 到期后 Provider 清除待撤销记录；删除任务此时永久消失。
- Toast 同时显示最近三条，更多操作以汇总方式保留。

## JSON 与迁移

`lib/validation/backupSchema.ts` 定义运行时校验。

`lib/storage/migrations.ts` 是版本迁移的唯一入口。未来新增字段时，应在此加入从旧版本到新版本的逐级迁移，再提升 `DATA_VERSION`，不能在组件中补字段。

导入合并由 `lib/storage/backup.ts` 处理，同 ID 按 `updatedAt` 选择较新版本。

## 错误边界

`app/error.tsx` 提供页面级恢复界面。数据层分别处理 JSON 损坏、局部任务无效、重复 ID 和 localStorage 写入失败。

## 修改原则

新增业务字段时必须同步更新 TypeScript 类型、Zod schema、迁移、导出结构、测试、`DATA_SCHEMA.md` 和 `CHANGELOG.md`。日期规则放在 `lib/dates`，存储规则放在 `lib/storage`，不要让展示组件直接读写 localStorage。
