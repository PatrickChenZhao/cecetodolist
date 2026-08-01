"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import {
  advanceWorkflow,
  getCurrentStage,
  isDueWithinNextDays,
  isWorkflowTask,
  reopenCompletedTask,
  todayKey,
} from "@/lib/dates/dateCalculations";
import { sortTasks } from "@/lib/dates/sorting";
import { getLatestReminderSlot } from "@/lib/reminders/reminderSchedule";
import { mergeItems } from "@/lib/storage/backup";
import {
  loadNotificationHistory,
  loadStoredState,
  saveNotificationHistory,
  saveStoredState,
} from "@/lib/storage/storage";
import {
  createPendingAction,
  restorePendingAction,
} from "@/lib/undo/actions";
import type {
  AnyWorkflowItem,
  BackupPayload,
  DeskSettings,
  PendingAction,
  TaskItem,
} from "@/types/tasks";

interface DeskState {
  items: TaskItem[];
  settings: DeskSettings;
  pendingActions: PendingAction[];
  hydrated: boolean;
  lastSavedAt: string | null;
  warning: string | null;
  quarantined: unknown[];
  storageError: string | null;
  notice: string | null;
  clockNow: number;
}

type Action =
  | {
      type: "hydrate";
      payload: ReturnType<typeof loadStoredState>;
    }
  | { type: "add"; item: TaskItem }
  | { type: "update"; item: TaskItem }
  | { type: "restoreCompleted"; item: TaskItem }
  | { type: "apply"; item: TaskItem; pending: PendingAction }
  | { type: "remove"; itemId: string; pending: PendingAction }
  | { type: "undo"; actionId: string }
  | { type: "purge"; now: number }
  | { type: "settings"; settings: DeskSettings }
  | {
      type: "import";
      payload: BackupPayload;
      mode: "replace" | "merge";
    }
  | { type: "saved"; at: string }
  | { type: "storageError"; message: string }
  | { type: "dismissWarning" }
  | { type: "notice"; message: string | null };

const initialState: DeskState = {
  items: [],
  settings: DEFAULT_SETTINGS,
  pendingActions: [],
  hydrated: false,
  lastSavedAt: null,
  warning: null,
  quarantined: [],
  storageError: null,
  notice: null,
  clockNow: 0,
};

function stateText(state: DeskState, chinese: string, english: string) {
  return state.settings.language === "en" ? english : chinese;
}

function reducer(state: DeskState, action: Action): DeskState {
  switch (action.type) {
    case "hydrate":
      return {
        ...state,
        ...action.payload,
        pendingActions: action.payload.pendingActions.filter(
          (pending) => new Date(pending.expiresAt).getTime() > Date.now(),
        ),
        hydrated: true,
      };
    case "add":
      return {
        ...state,
        items: [...state.items, action.item],
        notice: stateText(state, "已创建并自动保存", "Created and autosaved"),
      };
    case "update":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.item.id ? action.item : item
        ),
        notice: stateText(state, "修改已保存", "Changes saved"),
      };
    case "restoreCompleted":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.item.id ? action.item : item
        ),
        notice: stateText(state, `已撤销完成“${action.item.title}”`, `Restored “${action.item.title}”`),
      };
    case "apply":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.item.id ? action.item : item
        ),
        pendingActions: [...state.pendingActions, action.pending],
      };
    case "remove":
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.itemId),
        pendingActions: [...state.pendingActions, action.pending],
      };
    case "undo": {
      const pending = state.pendingActions.find(
        (entry) => entry.id === action.actionId,
      );
      if (!pending) return state;
      return {
        ...state,
        items: restorePendingAction(state.items, pending),
        pendingActions: state.pendingActions.filter(
          (entry) => entry.id !== action.actionId,
        ),
        notice: stateText(state, "已恢复", "Restored"),
      };
    }
    case "purge":
      return {
        ...state,
        clockNow: action.now,
        pendingActions: state.pendingActions.filter(
          (entry) => new Date(entry.expiresAt).getTime() > action.now,
        ),
      };
    case "settings":
      return {
        ...state,
        settings: action.settings,
        notice: action.settings.language === "en" ? "Settings saved" : "设置已保存",
      };
    case "import":
      return {
        ...state,
        items: action.mode === "replace"
          ? action.payload.items
          : mergeItems(state.items, action.payload.items),
        settings: action.mode === "replace"
          ? action.payload.settings
          : { ...state.settings, ...action.payload.settings },
        pendingActions: action.mode === "replace"
          ? action.payload.pendingActions
          : [
              ...state.pendingActions.filter(
                (current) =>
                  !action.payload.pendingActions.some(
                    (incoming) => incoming.id === current.id,
                  ),
              ),
              ...action.payload.pendingActions,
            ],
        notice: (action.mode === "replace"
          ? action.payload.settings.language
          : state.settings.language) === "en"
          ? "Data imported successfully"
          : "数据导入成功",
      };
    case "saved":
      return { ...state, lastSavedAt: action.at, storageError: null };
    case "storageError":
      return { ...state, storageError: action.message };
    case "dismissWarning":
      return { ...state, warning: null };
    case "notice":
      return { ...state, notice: action.message };
    default:
      return state;
  }
}

interface TaskContextValue extends DeskState {
  addItem: (item: TaskItem) => void;
  updateItem: (item: TaskItem) => void;
  completeItem: (itemId: string) => void;
  completeStage: (itemId: string, nextStageDueDate?: string) => void;
  restoreCompletedItem: (itemId: string) => void;
  deleteItem: (itemId: string) => void;
  undoAction: (actionId: string) => void;
  updateSettings: (patch: Partial<DeskSettings>) => void;
  importBackup: (
    payload: BackupPayload,
    mode: "replace" | "merge",
  ) => void;
  dismissWarning: () => void;
  clearNotice: () => void;
}

const TaskContext = createContext<TaskContextValue | null>(null);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    dispatch({ type: "hydrate", payload: loadStoredState() });
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      saveStoredState(state.items, state.settings, state.pendingActions);
      const now = new Date().toISOString();
      if (state.lastSavedAt !== now) dispatch({ type: "saved", at: now });
    } catch {
      dispatch({
        type: "storageError",
        message: state.settings.language === "en"
          ? "Browser storage is full. Recent changes may not have been saved."
          : "浏览器存储空间不足，最近的修改可能尚未保存。",
      });
    }
    // lastSavedAt intentionally excluded to avoid a persistence loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.items, state.settings, state.pendingActions, state.hydrated]);

  useEffect(() => {
    const timer = window.setInterval(
      () => dispatch({ type: "purge", now: Date.now() }),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (
      !state.hydrated
      || !state.settings.browserNotifications
      || typeof Notification === "undefined"
      || Notification.permission !== "granted"
    ) {
      return;
    }

    function checkScheduledReminder() {
      const now = new Date();
      const slot = getLatestReminderSlot(state.settings, now);
      if (!slot) return;

      const dayKey = todayKey(now);
      const historyKey = `scheduled:${dayKey}:${slot}`;
      const history = loadNotificationHistory();
      if (history[historyKey] === dayKey) return;

      const dueItems = sortTasks(
        state.items.filter((item) => isDueWithinNextDays(item, 3, now)),
        now,
      );
      if (dueItems.length === 0) return;

      const first = dueItems[0];
      const extra = dueItems.length - 1;
      new Notification("Personal Desk", {
        body: state.settings.language === "en"
          ? extra > 0
            ? `${first.title}, plus ${extra} more items, are due in the next three days.`
            : `${first.title} is due in the next three days.`
          : extra > 0
            ? `${first.title}，另有 ${extra} 个事项将在近三天内截止。`
            : `${first.title} 将在近三天内截止。`,
      });
      history[historyKey] = dayKey;
      saveNotificationHistory(history);
    }

    checkScheduledReminder();
    const timer = window.setInterval(checkScheduledReminder, 30_000);
    return () => window.clearInterval(timer);
  }, [
    state.hydrated,
    state.items,
    state.settings,
  ]);

  useEffect(() => {
    if (!state.notice) return;
    const timer = window.setTimeout(
      () => dispatch({ type: "notice", message: null }),
      2600,
    );
    return () => window.clearTimeout(timer);
  }, [state.notice]);

  const addItem = useCallback((item: TaskItem) => {
    dispatch({ type: "add", item });
  }, []);

  const updateItem = useCallback((item: TaskItem) => {
    dispatch({
      type: "update",
      item: { ...item, updatedAt: new Date().toISOString() },
    });
  }, []);

  const completeItem = useCallback((itemId: string) => {
    const item = stateRef.current.items.find((entry) => entry.id === itemId);
    if (!item || item.status === "completed") return;
    const now = new Date();
    const completed: TaskItem = {
      ...item,
      status: "completed",
      completedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    dispatch({
      type: "apply",
      item: completed,
      pending: createPendingAction(
        "complete",
        item,
        stateRef.current.settings.language === "en"
          ? `Completed “${item.title}”`
          : `已完成“${item.title}”`,
        now,
      ),
    });
  }, []);

  const completeStage = useCallback((
    itemId: string,
    nextStageDueDate?: string,
  ) => {
    const item = stateRef.current.items.find(
      (entry): entry is AnyWorkflowItem =>
        entry.id === itemId && isWorkflowTask(entry),
    );
    if (!item || item.status === "completed") return;
    const current = getCurrentStage(item);
    if (!current || current.status === "waiting") return;
    const now = new Date();
    const advanced = advanceWorkflow(item, current.id, now, nextStageDueDate);
    if (advanced === item) return;
    const final = advanced.status === "completed";
    dispatch({
      type: "apply",
      item: advanced,
      pending: createPendingAction(
        final ? "complete" : "stage",
        item,
        stateRef.current.settings.language === "en"
          ? final
            ? `Completed “${item.title}”`
            : `Completed the “${current.name}” stage`
          : final
            ? `已完成“${item.title}”`
            : `已完成“${current.name}”阶段`,
        now,
      ),
    });
  }, []);

  const deleteItem = useCallback((itemId: string) => {
    const item = stateRef.current.items.find((entry) => entry.id === itemId);
    if (!item) return;
    const now = new Date();
    dispatch({
      type: "remove",
      itemId,
      pending: createPendingAction(
        "delete",
        item,
        stateRef.current.settings.language === "en"
          ? `Deleted “${item.title}”`
          : `已删除“${item.title}”`,
        now,
      ),
    });
  }, []);

  const restoreCompletedItem = useCallback((itemId: string) => {
    const item = stateRef.current.items.find((entry) => entry.id === itemId);
    if (!item || item.status !== "completed") return;
    dispatch({
      type: "restoreCompleted",
      item: reopenCompletedTask(item),
    });
  }, []);

  const undoAction = useCallback((actionId: string) => {
    dispatch({ type: "undo", actionId });
  }, []);

  const updateSettings = useCallback((patch: Partial<DeskSettings>) => {
    dispatch({
      type: "settings",
      settings: { ...stateRef.current.settings, ...patch },
    });
  }, []);

  const importBackup = useCallback((
    payload: BackupPayload,
    mode: "replace" | "merge",
  ) => {
    dispatch({ type: "import", payload, mode });
  }, []);

  const value = useMemo<TaskContextValue>(() => ({
    ...state,
    addItem,
    updateItem,
    completeItem,
    completeStage,
    restoreCompletedItem,
    deleteItem,
    undoAction,
    updateSettings,
    importBackup,
    dismissWarning: () => dispatch({ type: "dismissWarning" }),
    clearNotice: () => dispatch({ type: "notice", message: null }),
  }), [
    state,
    addItem,
    updateItem,
    completeItem,
    completeStage,
    restoreCompletedItem,
    deleteItem,
    undoAction,
    updateSettings,
    importBackup,
  ]);

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) throw new Error("useTasks must be used inside TaskProvider");
  return context;
}
