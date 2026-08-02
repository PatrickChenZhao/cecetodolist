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
  notes: z.string().default(""),
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
  table: z.array(z.array(z.string()).min(1)).min(1).nullable().default(null),
  tableColumnWidths: z.array(z.number().min(80).max(360)).min(1).nullable().default(null),
}).superRefine((item, context) => {
  if (!item.table) return;
  const columnCount = item.table[0].length;
  item.table.forEach((row, index) => {
    if (row.length !== columnCount) {
      context.addIssue({
        code: "custom",
        message: "表格每行的列数必须一致",
        path: ["table", index],
      });
    }
  });
  if (item.tableColumnWidths && item.tableColumnWidths.length !== columnCount) {
    context.addIssue({
      code: "custom",
      message: "表格列宽数量必须与列数一致",
      path: ["tableColumnWidths"],
    });
  }
});

const projectEventItemSchema = z.object({
  ...base,
  module: z.enum(["social", "advertising"]),
  taskType: z.literal("event"),
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
  dueDate: dateKey.nullable(),
  status: z.enum(["waiting", "active", "overdue", "completed"]),
  completedAt: nullableIsoDate,
});

const workProcessItemSchema = z.preprocess((value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const item = value as Record<string, unknown>;
  if (!Array.isArray(item.stages)) return value;
  return {
    ...item,
    stages: item.stages.map((stage) => {
      if (!stage || typeof stage !== "object" || Array.isArray(stage)) {
        return stage;
      }
      const stageRecord = stage as Record<string, unknown>;
      return {
        ...stageRecord,
        dueDate: "dueDate" in stageRecord
          ? stageRecord.dueDate
          : stageRecord.id === item.currentStageId
            ? item.dueDate
            : null,
      };
    }),
  };
}, z.object({
  ...base,
  module: z.literal("work"),
  workType: z.literal("process"),
  dueDate: dateKey,
  currentStageId: z.string().min(1),
  stages: z.array(workProcessStageSchema),
})).superRefine((item, context) => {
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
  taskType: z.literal("process").default("process"),
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
  projectEventItemSchema,
  workflowItemSchema,
]);

const reminderTime = z.string().regex(
  /^([01]\d|2[0-3]):[0-5]\d$/,
  "提醒时间格式不正确",
);

export const settingsSchema = z.object({
  dashboardTitle: z.string().trim().min(1).max(50).default("你好 Cecilia"),
  interfaceTheme: z.enum(["blueBlack", "bright"]).default("blueBlack"),
  language: z.enum(["zh-CN", "en"]).default("zh-CN"),
  sidebarCollapsed: z.boolean().default(false),
  browserNotifications: z.boolean().default(false),
  reminderMode: z.enum(["custom", "twoHourly", "morningEvening"])
    .default("morningEvening"),
  customReminderTimes: z.array(reminderTime).min(1).max(6)
    .default(["09:00"]),
  morningEveningTimes: z.tuple([reminderTime, reminderTime])
    .default(["10:30", "16:30"]),
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
