import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  AD_STAGE_NAMES,
  SOCIAL_STAGE_NAMES,
  WORK_PROCESS_STAGE_NAMES,
} from "@/lib/constants";
import type {
  AnyWorkflowItem,
  AnyWorkflowStage,
  PersonalItem,
  TaskItem,
  WorkProcessStage,
  WorkflowItem,
  WorkflowStage,
} from "@/types/tasks";

const SOCIAL_OFFSETS = [7, 5, 3];
const AD_OFFSETS = [3, 6, 3, 2];

export function todayKey(now = new Date()) {
  return format(now, "yyyy-MM-dd");
}

export function localDateLabel(now = new Date()) {
  return format(now, "yyyy年M月d日，EEEE", { locale: zhCN });
}

export function dueDateForWork(
  urgency: "today" | "week" | "month",
  now = new Date(),
) {
  if (urgency === "today") return todayKey(now);
  if (urgency === "week") {
    return format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  }
  return format(endOfMonth(now), "yyyy-MM-dd");
}

export function createWorkProcessStages(): WorkProcessStage[] {
  return WORK_PROCESS_STAGE_NAMES.map((name, index) => ({
    id: crypto.randomUUID(),
    name,
    status: index === 0 ? "active" : "waiting",
    completedAt: null,
  }));
}

export function dueDateForPersonal(
  urgency: PersonalItem["urgency"],
  now = new Date(),
) {
  if (urgency === "notUrgent") return null;
  if (urgency === "urgent") return todayKey(now);
  if (urgency === "week") {
    return format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  }
  return format(endOfMonth(now), "yyyy-MM-dd");
}

export function createWorkflowStages(
  module: WorkflowItem["module"],
  firstDate: string,
): WorkflowStage[] {
  const names = module === "social" ? SOCIAL_STAGE_NAMES : AD_STAGE_NAMES;
  const offsets = module === "social" ? SOCIAL_OFFSETS : AD_OFFSETS;
  let cursor = parseISO(firstDate);

  return names.map((name, index) => {
    if (index > 0) cursor = addDays(cursor, offsets[index - 1]);
    return {
      id: crypto.randomUUID(),
      name,
      dueDate: format(cursor, "yyyy-MM-dd"),
      dateSource: index === 0 ? "manual" : "automatic",
      status: index === 0 ? "active" : "waiting",
      completedAt: null,
    };
  });
}

export function recalculateWorkflowDates(
  module: WorkflowItem["module"],
  stages: WorkflowStage[],
  changedIndex: number,
  changedDate: string,
) {
  const offsets = module === "social" ? SOCIAL_OFFSETS : AD_OFFSETS;
  const next = stages.map((stage) => ({ ...stage }));
  next[changedIndex] = {
    ...next[changedIndex],
    dueDate: changedDate,
    dateSource: "manual",
  };

  let anchor = parseISO(changedDate);
  for (let index = changedIndex + 1; index < next.length; index += 1) {
    if (next[index].dateSource === "manual") {
      anchor = parseISO(next[index].dueDate);
      continue;
    }
    anchor = addDays(anchor, offsets[index - 1]);
    next[index] = {
      ...next[index],
      dueDate: format(anchor, "yyyy-MM-dd"),
    };
  }
  return next;
}

export function isWorkflowTask(item: TaskItem): item is AnyWorkflowItem {
  return "stages" in item;
}

export function getCurrentStage(item: AnyWorkflowItem) {
  return item.stages.find((stage) => stage.id === item.currentStageId)
    ?? item.stages.find((stage) => stage.status === "active")
    ?? item.stages[0];
}

export function getItemDueDate(item: TaskItem) {
  if (item.module === "social" || item.module === "advertising") {
    const currentStage = item.stages.find(
      (stage) => stage.id === item.currentStageId,
    ) ?? item.stages.find((stage) => stage.status === "active")
      ?? item.stages[0];
    return currentStage?.dueDate ?? null;
  }
  if (item.module === "work" && item.workType === "process") {
    return item.dueDate;
  }
  return "dueDate" in item ? item.dueDate : null;
}

export function isDateOverdue(date: string | null, now = new Date()) {
  if (!date) return false;
  return isBefore(startOfDay(parseISO(date)), startOfDay(now));
}

export function isDateToday(date: string | null, now = new Date()) {
  return Boolean(date && isSameDay(parseISO(date), now));
}

export function overdueDays(date: string, now = new Date()) {
  const due = startOfDay(parseISO(date));
  const current = startOfDay(now);
  return Math.max(
    0,
    Math.round((current.getTime() - due.getTime()) / 86_400_000),
  );
}

export function displayDueDate(date: string | null, now = new Date()) {
  if (!date) return "无截止日期";
  if (isSameDay(parseISO(date), now)) return "今天";
  return format(parseISO(date), "M月d日");
}

export function displayCompletedAt(value: string, now = new Date()) {
  const date = parseISO(value);
  if (isSameDay(date, now)) return `今天 ${format(date, "HH:mm")}`;
  if (isSameDay(date, addDays(now, -1))) return `昨天 ${format(date, "HH:mm")}`;
  return format(date, "M月d日 HH:mm");
}

export function effectiveStageStatus(
  stage: AnyWorkflowStage,
  now = new Date(),
) {
  if (
    stage.status === "active"
    && "dueDate" in stage
    && isDateOverdue(stage.dueDate, now)
  ) {
    return "overdue" as const;
  }
  return stage.status;
}

export function advanceWorkflow<T extends AnyWorkflowItem>(
  item: T,
  stageId: string,
  now = new Date(),
) {
  const currentIndex = item.stages.findIndex(
    (stage) => stage.id === item.currentStageId,
  );
  if (currentIndex < 0 || item.stages[currentIndex].id !== stageId) return item;
  if (
    item.stages[currentIndex].status === "waiting"
    || item.stages[currentIndex].status === "completed"
  ) {
    return item;
  }

  const completedAt = now.toISOString();
  const stages = item.stages.map((stage, index) => {
    if (index === currentIndex) {
      return { ...stage, status: "completed" as const, completedAt };
    }
    if (index === currentIndex + 1) {
      return { ...stage, status: "active" as const };
    }
    return { ...stage };
  });
  const isFinal = currentIndex === stages.length - 1;

  return {
    ...item,
    stages,
    currentStageId: isFinal ? item.currentStageId : stages[currentIndex + 1].id,
    status: isFinal ? "completed" as const : item.status,
    completedAt: isFinal ? completedAt : item.completedAt,
    updatedAt: completedAt,
  } as T;
}

export function isDueForAttention(item: TaskItem, now = new Date()) {
  const dueDate = getItemDueDate(item);
  return item.status === "active"
    && Boolean(dueDate)
    && !isAfter(startOfDay(parseISO(dueDate!)), startOfDay(now));
}
