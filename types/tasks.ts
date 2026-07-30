export type ModuleType = "work" | "social" | "advertising" | "personal";
export type ItemStatus = "active" | "completed";
export type StageStatus = "waiting" | "active" | "overdue" | "completed";
export type DateSource = "automatic" | "manual";

export interface BaseItem {
  id: string;
  module: ModuleType;
  title: string;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface WorkItem extends BaseItem {
  module: "work";
  urgency: "today" | "week" | "month";
  dueDate: string;
}

export interface PersonalItem extends BaseItem {
  module: "personal";
  urgency: "urgent" | "week" | "month" | "notUrgent";
  dueDate: string | null;
}

export interface WorkflowStage {
  id: string;
  name: string;
  dueDate: string;
  dateSource: DateSource;
  status: StageStatus;
  completedAt: string | null;
}

export interface WorkflowItem extends BaseItem {
  module: "social" | "advertising";
  currentStageId: string;
  stages: WorkflowStage[];
}

export type TaskItem = WorkItem | PersonalItem | WorkflowItem;

export interface DeskSettings {
  sidebarCollapsed: boolean;
  remindersEnabled: boolean;
  browserNotifications: boolean;
  defaultReminder: "dueDay" | "dayBefore" | "hourBefore" | "none";
  overdueDaily: boolean;
}

export type PendingActionType = "complete" | "stage" | "delete";

export interface PendingAction {
  id: string;
  type: PendingActionType;
  itemId: string;
  label: string;
  itemSnapshot: TaskItem;
  createdAt: string;
  expiresAt: string;
}

export interface StoredData {
  version: "1.0.0";
  items: TaskItem[];
}

export interface BackupPayload extends StoredData {
  exportedAt: string;
  settings: DeskSettings;
  pendingActions: PendingAction[];
}

export type AppView =
  | "today"
  | ModuleType
  | "reminders"
  | "completed"
  | "backup";
