import { DATA_VERSION, DEFAULT_SETTINGS, STORAGE_KEYS } from "@/lib/constants";
import { migrateStoredData } from "@/lib/storage/migrations";
import {
  pendingActionSchema,
  settingsSchema,
  storedDataSchema,
  taskItemSchema,
} from "@/lib/validation/backupSchema";
import type {
  DeskSettings,
  PendingAction,
  TaskItem,
} from "@/types/tasks";

export interface LoadedState {
  items: TaskItem[];
  settings: DeskSettings;
  pendingActions: PendingAction[];
  warning: string | null;
  quarantined: unknown[];
}

function safeJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function loadStoredState(): LoadedState {
  if (typeof window === "undefined") {
    return {
      items: [],
      settings: DEFAULT_SETTINGS,
      pendingActions: [],
      warning: null,
      quarantined: [],
    };
  }

  const rawData = migrateStoredData(
    safeJson(window.localStorage.getItem(STORAGE_KEYS.data)),
  );
  const rawSettings = safeJson(
    window.localStorage.getItem(STORAGE_KEYS.settings),
  );
  const rawPending = safeJson(
    window.localStorage.getItem(STORAGE_KEYS.pendingActions),
  );

  const parsedData = storedDataSchema.safeParse(
    rawData ?? { version: DATA_VERSION, items: [] },
  );
  const parsedSettings = settingsSchema.safeParse(
    rawSettings ?? DEFAULT_SETTINGS,
  );
  const pendingValues = Array.isArray(rawPending) ? rawPending : [];
  const pendingActions = pendingValues.flatMap((value) => {
    const parsed = pendingActionSchema.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  });

  if (parsedData.success) {
    return {
      items: parsedData.data.items,
      settings: parsedSettings.success
        ? parsedSettings.data
        : DEFAULT_SETTINGS,
      pendingActions,
      warning: parsedSettings.success ? null : "部分设置无法读取，已恢复默认值。",
      quarantined: [],
    };
  }

  const candidateItems = rawData && typeof rawData === "object"
    && "items" in rawData && Array.isArray(rawData.items)
    ? rawData.items
    : [];
  const validItems: TaskItem[] = [];
  const quarantined: unknown[] = [];
  const seenIds = new Set<string>();
  candidateItems.forEach((value) => {
    const parsed = taskItemSchema.safeParse(value);
    if (parsed.success && !seenIds.has(parsed.data.id)) {
      seenIds.add(parsed.data.id);
      validItems.push(parsed.data);
    } else {
      quarantined.push(value);
    }
  });

  return {
    items: validItems,
    settings: parsedSettings.success ? parsedSettings.data : DEFAULT_SETTINGS,
    pendingActions,
    warning: "发现无法读取的数据，已将其隔离。",
    quarantined,
  };
}

export function saveStoredState(
  items: TaskItem[],
  settings: DeskSettings,
  pendingActions: PendingAction[],
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEYS.data,
    JSON.stringify({ version: DATA_VERSION, items }),
  );
  window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  window.localStorage.setItem(
    STORAGE_KEYS.pendingActions,
    JSON.stringify(pendingActions),
  );
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadQuarantined(data: unknown[]) {
  downloadJson(data, `personal-desk-problem-data-${Date.now()}.json`);
}

export function loadNotificationHistory() {
  if (typeof window === "undefined") return {} as Record<string, string>;
  const value = safeJson(
    window.localStorage.getItem(STORAGE_KEYS.notificationHistory),
  );
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, string>;
}

export function saveNotificationHistory(history: Record<string, string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEYS.notificationHistory,
    JSON.stringify(history),
  );
}
