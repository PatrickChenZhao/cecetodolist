import { isValid, parseISO } from "date-fns";
import { z } from "zod";
import {
  AD_STAGE_NAMES,
  DATA_VERSION,
  SOCIAL_STAGE_NAMES,
  WORK_PROCESS_STAGE_NAMES,
} from "@/lib/constants";

const dateKey = z.string().refine(
  (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value)),
  "日期必须为有效的 YYYY-MM-DD",
);
const isoDate = z.string().refine(
  (value) => isValid(parseISO(value)),
  "时间必须为有效的 ISO 8601",
);
const nullableIsoDate = isoDate.nullable();

const base = {
  id: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(["active", "completed"]),
  createdAt: isoDate,
  updatedAt: isoDate,
  completedAt: nullableIsoDate,
};

const workEventItemSchema = z.object({
  ...base,
  module: z.literal("work"),
  workType: z.literal("event"),
  urgency: z.enum(["urgent", "week", "month", "notUrgent"]),
  dueDate: dateKey.nullable(),
});

const legacyWorkItemSchema = z.object({
  ...base,
  module: z.literal("work"),
  urgency: z.enum(["today", "week", "month"]),
  dueDate: dateKey,
}).transform((item) => ({
  ...item,
  workType: "event" as const,
  urgency: item.urgency === "today" ? "urgent" as const : item.urgency,
}));

const personalItemSchema = z.object({
  ...base,
  module: z.literal("personal"),
  urgency: z.enum(["urgent", "week", "month", "notUrgent"]),
  dueDate: dateKey.nullable(),
});

const stageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  dueDate: dateKey,
  dateSource: z.enum(["automatic", "manual"]),
  status: z.enum(["waiting", "active", "overdue", "completed"]),
  completedAt: nullableIsoDate,
});

const workProcessStageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(["waiting", "active", "overdue", "completed"]),
  completedAt: nullableIsoDate,
});

const workProcessItemSchema = z.object({
  ...base,
  module: z.literal("work"),
  workType: z.literal("process"),
  dueDate: dateKey,
  currentStageId: z.string().min(1),
  stages: z.array(workProcessStageSchema),
}).superRefine((item, context) => {
  if (item.stages.length !== WORK_PROCESS_STAGE_NAMES.length) {
    context.addIssue({
      code: "custom",
      message: `work process 阶段数量应为 ${WORK_PROCESS_STAGE_NAMES.length}`,
      path: ["stages"],
    });
  }
  if (!item.stages.some((stage) => stage.id === item.currentStageId)) {
    context.addIssue({
      code: "custom",
      message: "currentStageId 不存在",
      path: ["currentStageId"],
    });
  }
});

const workflowItemSchema = z.object({
  ...base,
  module: z.enum(["social", "advertising"]),
  currentStageId: z.string().min(1),
  stages: z.array(stageSchema),
}).superRefine((item, context) => {
  const expected = item.module === "social"
    ? SOCIAL_STAGE_NAMES.length
    : AD_STAGE_NAMES.length;
  if (item.stages.length !== expected) {
    context.addIssue({
      code: "custom",
      message: `${item.module} 阶段数量应为 ${expected}`,
      path: ["stages"],
    });
  }
  if (!item.stages.some((stage) => stage.id === item.currentStageId)) {
    context.addIssue({
      code: "custom",
      message: "currentStageId 不存在",
      path: ["currentStageId"],
    });
  }
});

export const taskItemSchema = z.union([
  workProcessItemSchema,
  workEventItemSchema,
  legacyWorkItemSchema,
  personalItemSchema,
  workflowItemSchema,
]);

export const settingsSchema = z.object({
  dashboardTitle: z.string().trim().min(1).max(50).default("你好 Cecilia"),
  interfaceTheme: z.enum(["blueBlack", "bright"]).default("blueBlack"),
  sidebarCollapsed: z.boolean(),
  remindersEnabled: z.boolean(),
  browserNotifications: z.boolean(),
  defaultReminder: z.enum(["dueDay", "dayBefore", "hourBefore", "none"]),
  overdueDaily: z.boolean(),
});

export const pendingActionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["complete", "stage", "delete"]),
  itemId: z.string().min(1),
  label: z.string().min(1),
  itemSnapshot: taskItemSchema,
  createdAt: isoDate,
  expiresAt: isoDate,
});

export const storedDataSchema = z.object({
  version: z.literal(DATA_VERSION),
  items: z.array(taskItemSchema),
}).superRefine((data, context) => {
  const ids = new Set<string>();
  data.items.forEach((item, index) => {
    if (ids.has(item.id)) {
      context.addIssue({
        code: "custom",
        message: `发现重复 ID：${item.id}`,
        path: ["items", index, "id"],
      });
    }
    ids.add(item.id);
  });
});

export const backupSchema = storedDataSchema.extend({
  exportedAt: isoDate,
  settings: settingsSchema,
  pendingActions: z.array(pendingActionSchema),
});
