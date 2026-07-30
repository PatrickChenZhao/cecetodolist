# 数据结构

当前数据版本：`1.0.0`

## 公共规则

- 日期：`YYYY-MM-DD`，按用户本地时区解释。
- 时间：ISO 8601，例如 `2026-07-31T02:30:00.000Z`。
- ID：非空字符串；新数据使用 `crypto.randomUUID()`。
- 导入时不允许重复任务 ID。

## 枚举

```ts
type ModuleType = "work" | "social" | "advertising" | "personal";
type ItemStatus = "active" | "completed";
type StageStatus = "waiting" | "active" | "overdue" | "completed";
type DateSource = "automatic" | "manual";
```

`overdue` 主要是运行时显示状态。正常操作不会因到期自动推进或自动完成阶段。

## BaseItem

```ts
interface BaseItem {
  id: string;
  module: ModuleType;
  title: string;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}
```

## WorkItem

```ts
interface WorkItem extends BaseItem {
  module: "work";
  urgency: "today" | "week" | "month";
  dueDate: string;
}
```

`today` 为今天，`week` 为本周星期日，`month` 为本月最后一天。

## PersonalItem

```ts
interface PersonalItem extends BaseItem {
  module: "personal";
  urgency: "urgent" | "week" | "month" | "notUrgent";
  dueDate: string | null;
}
```

`notUrgent` 的 `dueDate` 必须为 `null`。

## WorkflowStage

```ts
interface WorkflowStage {
  id: string;
  name: string;
  dueDate: string;
  dateSource: "automatic" | "manual";
  status: StageStatus;
  completedAt: string | null;
}
```

自媒体固定四阶段：脚本、完成拍摄、剪完视频、发布。

广告固定五阶段：大纲、脚本、完成拍摄、初稿、发布。

## WorkflowItem

```ts
interface WorkflowItem extends BaseItem {
  module: "social" | "advertising";
  currentStageId: string;
  stages: WorkflowStage[];
}
```

`currentStageId` 必须引用 `stages` 内真实存在的 ID。

## TaskItem

```ts
type TaskItem = WorkItem | PersonalItem | WorkflowItem;
```

## DeskSettings

```ts
interface DeskSettings {
  sidebarCollapsed: boolean;
  remindersEnabled: boolean;
  browserNotifications: boolean;
  defaultReminder: "dueDay" | "dayBefore" | "hourBefore" | "none";
  overdueDaily: boolean;
}
```

## PendingAction

```ts
interface PendingAction {
  id: string;
  type: "complete" | "stage" | "delete";
  itemId: string;
  label: string;
  itemSnapshot: TaskItem;
  createdAt: string;
  expiresAt: string;
}
```

`itemSnapshot` 是撤销所需的完整操作前数据。`expiresAt` 固定为创建后的 15 秒。

## 本地数据

`personal-desk:data`：

```json
{
  "version": "1.0.0",
  "items": []
}
```

设置与待撤销操作使用独立 localStorage 键，降低局部损坏影响。

## 导出文件

```json
{
  "version": "1.0.0",
  "exportedAt": "2026-07-31T02:30:00.000Z",
  "settings": {},
  "items": [],
  "pendingActions": []
}
```

## 迁移规则

所有迁移从 `lib/storage/migrations.ts` 进入。迁移必须可重复执行、不能删除尚未替代的旧数据，并在迁移完成后输出当前版本。版本升级必须增加测试用例。
