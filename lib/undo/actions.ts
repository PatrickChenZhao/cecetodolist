import { UNDO_WINDOW_MS } from "@/lib/constants";
import type { PendingAction, TaskItem } from "@/types/tasks";

export function createPendingAction(
  type: PendingAction["type"],
  item: TaskItem,
  label: string,
  now = new Date(),
): PendingAction {
  return {
    id: crypto.randomUUID(),
    type,
    itemId: item.id,
    label,
    itemSnapshot: item,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + UNDO_WINDOW_MS).toISOString(),
  };
}

export function isPendingExpired(
  action: PendingAction,
  now = new Date(),
) {
  return new Date(action.expiresAt).getTime() <= now.getTime();
}

export function restorePendingAction(
  items: TaskItem[],
  action: PendingAction,
) {
  const exists = items.some((item) => item.id === action.itemId);
  return exists
    ? items.map((item) =>
        item.id === action.itemId ? action.itemSnapshot : item
      )
    : [...items, action.itemSnapshot];
}

export function purgeExpiredActions(
  actions: PendingAction[],
  now = new Date(),
) {
  return actions.filter((action) => !isPendingExpired(action, now));
}
