"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CloudOff,
  Download,
  X,
} from "lucide-react";
import { DynamicComposer } from "@/components/composer/DynamicComposer";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { ToastStack } from "@/components/feedback/ToastStack";
import { Sidebar } from "@/components/layout/Sidebar";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";
import { BackupView } from "@/components/views/BackupView";
import { CompletedView } from "@/components/views/CompletedView";
import { RemindersView } from "@/components/views/RemindersView";
import { useTasks } from "@/context/TaskContext";
import { downloadQuarantined } from "@/lib/storage/storage";
import type { AppView, ModuleType, TaskItem } from "@/types/tasks";

export function PersonalDeskApp() {
  const tasks = useTasks();
  const [view, setView] = useState<AppView>("today");
  const [composerModule, setComposerModule] = useState<ModuleType>("work");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedItem = useMemo(
    () => tasks.items.find((item) => item.id === selectedId) ?? null,
    [tasks.items, selectedId],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = tasks.settings.interfaceTheme;
  }, [tasks.settings.interfaceTheme]);

  const navigate = useCallback((next: AppView) => {
    setView(next);
    if (
      next === "work"
      || next === "social"
      || next === "advertising"
      || next === "personal"
    ) {
      setComposerModule(next);
    }
  }, []);

  const focusComposer = useCallback((module: ModuleType) => {
    setComposerModule(module);
    window.setTimeout(() => {
      document.getElementById("composer-title")?.focus();
    }, 80);
  }, []);

  const complete = useCallback((item: TaskItem) => {
    if ("stages" in item) {
      tasks.completeStage(item.id);
    } else {
      tasks.completeItem(item.id);
    }
  }, [tasks]);

  if (!tasks.hydrated) {
    return (
      <div className="app-loading" role="status">
        <span className="loading-mark" />
        <div>
          <strong>Personal Desk</strong>
          <p>正在整理你的工作台…</p>
        </div>
      </div>
    );
  }

  const showComposer = view === "today"
    || view === "work"
    || view === "social"
    || view === "advertising"
    || view === "personal";

  return (
    <div className="app-root">
      <Sidebar
        view={view}
        collapsed={tasks.settings.sidebarCollapsed}
        mobileOpen={mobileOpen}
        onNavigate={navigate}
        onToggle={() =>
          tasks.updateSettings({
            sidebarCollapsed: !tasks.settings.sidebarCollapsed,
          })
        }
        onMobileClose={() => setMobileOpen(false)}
        onMobileOpen={() => setMobileOpen(true)}
      />

      <main
        className={`main-content ${
          tasks.settings.sidebarCollapsed ? "sidebar-is-collapsed" : ""
        } ${showComposer ? "with-composer" : ""}`}
      >
        <div className="content-frame">
          {(tasks.warning || tasks.storageError) && (
            <div className="warning-banner">
              <AlertTriangle size={17} />
              <div>
                <strong>{tasks.storageError ? "保存遇到问题" : "已隔离问题数据"}</strong>
                <p>{tasks.storageError ?? tasks.warning}</p>
              </div>
              {tasks.quarantined.length > 0 && (
                <button onClick={() => downloadQuarantined(tasks.quarantined)}>
                  <Download size={14} /> 导出问题数据
                </button>
              )}
              <button
                className="icon-button"
                onClick={tasks.dismissWarning}
                aria-label="忽略提示"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {tasks.notice && (
            <div className="save-notice">
              <Check size={13} /> {tasks.notice}
            </div>
          )}

          {view === "today" && (
            <Dashboard
              items={tasks.items}
              dashboardTitle={tasks.settings.dashboardTitle}
              onOpen={(item) => setSelectedId(item.id)}
              onComplete={complete}
              onAdd={focusComposer}
              onDashboardTitleChange={(dashboardTitle) =>
                tasks.updateSettings({ dashboardTitle })
              }
            />
          )}

          {(view === "work"
            || view === "social"
            || view === "advertising"
            || view === "personal") && (
            <Dashboard
              items={tasks.items}
              module={view}
              dashboardTitle={tasks.settings.dashboardTitle}
              onOpen={(item) => setSelectedId(item.id)}
              onComplete={complete}
              onAdd={focusComposer}
              onDashboardTitleChange={(dashboardTitle) =>
                tasks.updateSettings({ dashboardTitle })
              }
            />
          )}

          {view === "completed" && (
            <CompletedView
              items={tasks.items}
              onOpen={(item) => setSelectedId(item.id)}
              onDelete={(item) => tasks.deleteItem(item.id)}
            />
          )}

          {view === "reminders" && (
            <RemindersView
              items={tasks.items}
              settings={tasks.settings}
              onSettingsChange={tasks.updateSettings}
              onOpen={(item) => setSelectedId(item.id)}
            />
          )}

          {view === "backup" && (
            <BackupView
              items={tasks.items}
              settings={tasks.settings}
              pendingActions={tasks.pendingActions}
              onImport={tasks.importBackup}
              lastSavedAt={tasks.lastSavedAt}
            />
          )}
        </div>

        {!showComposer && (
          <div className="page-save-state">
            <CloudOff size={13} />
            数据保存在此浏览器 · {tasks.lastSavedAt ? "已自动保存" : "正在保存"}
          </div>
        )}
      </main>

      {showComposer && (
        <DynamicComposer
          module={composerModule}
          onModuleChange={setComposerModule}
          onCreate={tasks.addItem}
        />
      )}

      {selectedItem && (
        <TaskDetailPanel
          key={selectedItem.id}
          item={selectedItem}
          onClose={() => setSelectedId(null)}
          onSave={tasks.updateItem}
          onComplete={complete}
          onDelete={(item) => tasks.deleteItem(item.id)}
        />
      )}

      <ToastStack
        actions={tasks.pendingActions}
        onUndo={tasks.undoAction}
        now={tasks.clockNow}
        avoidComposer={showComposer}
      />
    </div>
  );
}
