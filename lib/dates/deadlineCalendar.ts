import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { MODULE_ORDER } from "@/lib/constants";
import type { ModuleType, TaskItem } from "@/types/tasks";

export interface DeadlineEntry {
  id: string;
  date: string;
  module: ModuleType;
  title: string;
  workflowName: string | null;
  item: TaskItem;
}

export function collectDeadlineEntries(items: TaskItem[]): DeadlineEntry[] {
  const entries = items.flatMap((item): DeadlineEntry[] => {
    if (item.status !== "active") return [];

    if (item.module === "social" || item.module === "advertising") {
      return item.stages
        .filter((stage) => stage.status !== "completed")
        .map((stage) => ({
          id: `${item.id}:${stage.id}`,
          date: stage.dueDate,
          module: item.module,
          title: stage.name,
          workflowName: item.title,
          item,
        }));
    }

    if (item.module === "work" && item.workType === "process") {
      const currentStage = item.stages.find(
        (stage) => stage.id === item.currentStageId,
      );
      if (!currentStage?.dueDate) return [];
      return [{
        id: `${item.id}:${currentStage.id}`,
        date: currentStage.dueDate,
        module: item.module,
        title: currentStage.name,
        workflowName: item.title,
        item,
      }];
    }

    if (!("dueDate" in item) || !item.dueDate) return [];
    return [{
      id: `${item.id}:task`,
      date: item.dueDate,
      module: item.module,
      title: item.title,
      workflowName: null,
      item,
    }];
  });

  return entries.sort((a, b) =>
    a.date.localeCompare(b.date)
    || MODULE_ORDER.indexOf(a.module) - MODULE_ORDER.indexOf(b.module)
    || a.title.localeCompare(b.title, "zh-CN")
  );
}

export function earliestDeadlineMonth(
  entries: DeadlineEntry[],
  fallback = new Date(),
) {
  return startOfMonth(entries[0] ? parseISO(entries[0].date) : fallback);
}

export function calendarMonthDays(month: Date) {
  const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const last = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  return eachDayOfInterval({ start: first, end: last });
}
