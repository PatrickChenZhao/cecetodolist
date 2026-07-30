import { format } from "date-fns";
import { DATA_VERSION } from "@/lib/constants";
import { migrateStoredData } from "@/lib/storage/migrations";
import { backupSchema } from "@/lib/validation/backupSchema";
import type {
  BackupPayload,
  DeskSettings,
  PendingAction,
  TaskItem,
} from "@/types/tasks";

export function createBackup(
  items: TaskItem[],
  settings: DeskSettings,
  pendingActions: PendingAction[],
  now = new Date(),
): BackupPayload {
  return {
    version: DATA_VERSION,
    exportedAt: now.toISOString(),
    settings,
    items,
    pendingActions,
  };
}

export function backupFilename(now = new Date()) {
  return `personal-desk-backup-${format(now, "yyyy-MM-dd")}.json`;
}

export function parseBackup(text: string) {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("文件不是有效的 JSON。");
  }
  const result = backupSchema.safeParse(migrateStoredData(value));
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "备份结构不正确。";
    throw new Error(message);
  }
  return result.data;
}

export function mergeItems(current: TaskItem[], incoming: TaskItem[]) {
  const merged = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => {
    const existing = merged.get(item.id);
    if (!existing || item.updatedAt > existing.updatedAt) {
      merged.set(item.id, item);
    }
  });
  return [...merged.values()];
}

export function summarizeItems(items: TaskItem[]) {
  return {
    work: items.filter((item) => item.module === "work").length,
    social: items.filter((item) => item.module === "social").length,
    advertising: items.filter((item) => item.module === "advertising").length,
    personal: items.filter((item) => item.module === "personal").length,
  };
}
