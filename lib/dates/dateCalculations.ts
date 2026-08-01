import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
} from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
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
  InterfaceLanguage,
} from "@/types/tasks";

const SOCIAL_OFFSETS = [7, 5, 3];
const AD_OFFSETS = [3, 6, 3, 2];

export function todayKey(now = new Date()) {
  return format(now, "yyyy-MM-dd");
}

export function localDateLabel(now = new Date(), language: InterfaceLanguage = "zh-CN") {
  return language === "en"
    ? format(now, "EEEE, MMMM d, yyyy", { locale: enUS })
    : format(now, "yyyy年M月d日，EEEE", { locale: zhCN });
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

export function createWorkProcessStages(
  briefDueDate: string | null = null,
): WorkProcessStage[] {
  return WORK_PROCESS_STAGE_NAMES.map((name, index) => ({
    id: crypto.randomUUID(),
    name,
    dueDate: index === 0 ? briefDueDate : null,
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
    return getCurrentStage(item)?.dueDate ?? null;
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

export function displayDueDate(date: string | null, now = new Date(), language: InterfaceLanguage = "zh-CN") {
  if (!date) return language === "en" ? "No due date" : "无截止日期";
  if (isSameDay(parseISO(date), now)) return language === "en" ? "Today" : "今天";
  return language === "en"
    ? format(parseISO(date), "MMM d", { locale: enUS })
    : format(parseISO(date), "M月d日");
}

export function displayTaskCardDueDate(date: string | null, now = new Date(), language: InterfaceLanguage = "zh-CN") {
  if (!date) return language === "en" ? "No due date" : "无截止日期";
  if (isSameDay(parseISO(date), now)) return language === "en" ? "Today" : "今天";
  return `Due ${format(parseISO(date), "M/d")}`;
}

export function displayCompletedAt(value: string, now = new Date(), language: InterfaceLanguage = "zh-CN") {
  const date = parseISO(value);
  if (isSameDay(date, now)) return `${language === "en" ? "Today" : "今天"} ${format(date, "HH:mm")}`;
  if (isSameDay(date, addDays(now, -1))) return `${language === "en" ? "Yesterday" : "昨天"} ${format(date, "HH:mm")}`;
  return language === "en"
    ? format(date, "MMM d, HH:mm", { locale: enUS })
    : format(date, "M月d日 HH:mm");
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
  nextStageDueDate?: string,
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
  const isFinal = currentIndex === item.stages.length - 1;
  if (item.module === "work" && !isFinal && !nextStageDueDate) return item;

  const stages = item.stages.map((stage, index) => {
    if (index === currentIndex) {
      return { ...stage, status: "completed" as const, completedAt };
    }
    if (index === currentIndex + 1) {
      return {
        ...stage,
        status: "active" as const,
        ...(item.module === "work" ? { dueDate: nextStageDueDate! } : {}),
      };
    }
    return { ...stage };
  });

  return {
    ...item,
    ...(item.module === "work" && !isFinal
      ? { dueDate: nextStageDueDate! }
      : {}),
    stages,
    currentStageId: isFinal ? item.currentStageId : stages[currentIndex + 1].id,
    status: isFinal ? "completed" as const : item.status,
    completedAt: isFinal ? completedAt : item.completedAt,
    updatedAt: completedAt,
  } as T;
}

export function rewindWorkflowToStage<T extends AnyWorkflowItem>(
  item: T,
  stageId: string,
  now = new Date(),
) {
  const targetIndex = item.stages.findIndex((stage) => stage.id === stageId);
  if (targetIndex < 0) return item;

  const updatedAt = now.toISOString();
  const stages = item.stages.map((stage, index) => {
    if (index < targetIndex) {
      return {
        ...stage,
        status: "completed" as const,
        completedAt: stage.completedAt ?? updatedAt,
      };
    }
    if (index === targetIndex) {
      return { ...stage, status: "active" as const, completedAt: null };
    }
    return { ...stage, status: "waiting" as const, completedAt: null };
  });

  return {
    ...item,
    ...(item.module === "work"
      ? { dueDate: item.stages[targetIndex].dueDate ?? item.dueDate }
      : {}),
    status: "active" as const,
    completedAt: null,
    currentStageId: stageId,
    stages,
    updatedAt,
  } as T;
}

export function reopenCompletedTask<T extends TaskItem>(
  item: T,
  now = new Date(),
) {
  if (item.status !== "completed") return item;
  const updatedAt = now.toISOString();

  if (!isWorkflowTask(item)) {
    return {
      ...item,
      status: "active" as const,
      completedAt: null,
      updatedAt,
    } as T;
  }

  let reopenIndex = -1;
  for (let index = item.stages.length - 1; index >= 0; index -= 1) {
    if (item.stages[index].status === "completed") {
      reopenIndex = index;
      break;
    }
  }
  if (reopenIndex < 0) reopenIndex = Math.max(0, item.stages.length - 1);

  const stages = item.stages.map((stage, index) =>
    index === reopenIndex
      ? { ...stage, status: "active" as const, completedAt: null }
      : { ...stage }
  );

  return {
    ...item,
    status: "active" as const,
    completedAt: null,
    currentStageId: stages[reopenIndex]?.id ?? item.currentStageId,
    stages,
    updatedAt,
  } as T;
}

export function isDueWithinNextDays(
  item: TaskItem,
  days = 3,
  now = new Date(),
) {
  const dueDate = getItemDueDate(item);
  if (item.status !== "active" || !dueDate || days < 1) return false;
  const due = startOfDay(parseISO(dueDate));
  const start = startOfDay(now);
  const end = addDays(start, days);
  return !isBefore(due, start) && isBefore(due, end);
}
