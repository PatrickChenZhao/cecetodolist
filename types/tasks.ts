export type ModuleType = "work" | "social" | "advertising" | "personal";
export type ItemStatus = "active" | "completed";
export type StageStatus = "waiting" | "active" | "overdue" | "completed";
export type DateSource = "automatic" | "manual";
export type EventUrgency = "urgent" | "week" | "month" | "notUrgent";
export type InterfaceTheme = "blueBlack" | "bright";
export type ReminderMode = "custom" | "twoHourly" | "morningEvening";

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
  workType: "event";
  urgency: EventUrgency;
  dueDate: string | null;
}

export interface WorkProcessStage {
  id: string;
  name: string;
  dueDate: string | null;
  status: StageStatus;
  completedAt: string | null;
}

export interface WorkProcessItem extends BaseItem {
  module: "work";
  workType: "process";
  dueDate: string;
  currentStageId: string;
  stages: WorkProcessStage[];
}

export interface PersonalItem extends BaseItem {
  module: "personal";
  urgency: EventUrgency;
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

export type AnyWorkflowStage = WorkflowStage | WorkProcessStage;
export type AnyWorkflowItem = WorkflowItem | WorkProcessItem;
export type TaskItem = WorkItem | WorkProcessItem | PersonalItem | WorkflowItem;

export interface DeskSettings {
  dashboardTitle: string;
  interfaceTheme: InterfaceTheme;
  sidebarCollapsed: boolean;
  browserNotifications: boolean;
  reminderMode: ReminderMode;
  customReminderTimes: string[];
  morningEveningTimes: [string, string];
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
  | "deadlineCalendar"
  | ModuleType
  | "reminders"
  | "completed"
  | "backup";
