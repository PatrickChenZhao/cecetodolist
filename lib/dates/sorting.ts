import { getItemDueDate, isDateOverdue } from "@/lib/dates/dateCalculations";
import type { TaskItem } from "@/types/tasks";

const urgencyRank: Record<string, number> = {
  today: 0,
  urgent: 0,
  week: 1,
  month: 2,
  notUrgent: 3,
};

export function sortTasks(items: TaskItem[], now = new Date()) {
  return [...items].sort((a, b) => {
    const aDue = getItemDueDate(a);
    const bDue = getItemDueDate(b);
    const aOverdue = isDateOverdue(aDue, now);
    const bOverdue = isDateOverdue(bDue, now);

    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    if (aDue === null && bDue !== null) return 1;
    if (aDue !== null && bDue === null) return -1;
    if (aDue && bDue && aDue !== bDue) return aDue.localeCompare(bDue);

    const aUrgency = "urgency" in a ? urgencyRank[a.urgency] ?? 9 : 9;
    const bUrgency = "urgency" in b ? urgencyRank[b.urgency] ?? 9 : 9;
    if (aUrgency !== bUrgency) return aUrgency - bUrgency;
    return a.createdAt.localeCompare(b.createdAt);
  });
}
