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
import { NextStageDueDateDialog } from "@/components/tasks/NextStageDueDateDialog";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";
import { BackupView } from "@/components/views/BackupView";
import { CompletedView } from "@/components/views/CompletedView";
import { DeadlineCalendarView } from "@/components/views/DeadlineCalendarView";
import { RemindersView } from "@/components/views/RemindersView";
import { useTasks } from "@/context/TaskContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { downloadQuarantined } from "@/lib/storage/storage";
import { getCurrentStage, isWorkflowTask } from "@/lib/dates/dateCalculations";
import type { AppView, ModuleType, TaskItem } from "@/types/tasks";

export function PersonalDeskApp() {
  const tasks = useTasks();
  const language = tasks.settings.language;
  const tr = (chinese: string, english: string) =>
    language === "en" ? english : chinese;
  const warningMessage = tasks.storageError ?? tasks.warning;
  const localizedWarningMessage = language === "en"
    && warningMessage
    && /[\u3400-\u9fff]/.test(warningMessage)
    ? tasks.storageError
      ? "Browser storage could not save the latest changes."
      : "Some saved data could not be read and was safely isolated."
    : warningMessage;
  const [view, setView] = useState<AppView>("today");
  const [composerModule, setComposerModule] = useState<ModuleType>("work");
  const [composerCollapsed, setComposerCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingStageAdvance, setPendingStageAdvance] = useState<{
    itemId: string;
    currentStageName: string;
    nextStageName: string;
  } | null>(null);
  const selectedItem = useMemo(
    () => tasks.items.find((item) => item.id === selectedId) ?? null,
    [tasks.items, selectedId],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = tasks.settings.interfaceTheme;
  }, [tasks.settings.interfaceTheme]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

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
    setComposerCollapsed(false);
    window.setTimeout(() => {
      document.getElementById("composer-title")?.focus();
    }, 80);
  }, []);

  const complete = useCallback((item: TaskItem) => {
    if (isWorkflowTask(item)) {
      if (item.module === "work") {
        const current = getCurrentStage(item);
        const currentIndex = item.stages.findIndex(
          (stage) => stage.id === current?.id,
        );
        const nextStage = item.stages[currentIndex + 1];
        if (current && nextStage) {
          setPendingStageAdvance({
            itemId: item.id,
            currentStageName: current.name,
            nextStageName: nextStage.name,
          });
          return;
        }
      }
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
          <p>{tr("正在整理你的工作台…", "Getting your workspace ready…")}</p>
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
    <LanguageProvider language={language}>
    <div
      className={`app-root ${
        showComposer && composerCollapsed ? "composer-collapsed" : ""
      }`}
    >
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
        } ${showComposer ? "with-composer" : ""} ${
          showComposer && composerCollapsed ? "composer-is-collapsed" : ""
        }`}
      >
        <div className="content-frame">
          {(tasks.warning || tasks.storageError) && (
            <div className="warning-banner">
              <AlertTriangle size={17} />
              <div>
                <strong>{tasks.storageError
                  ? tr("保存遇到问题", "Unable to save")
                  : tr("已隔离问题数据", "Problem data isolated")}</strong>
                <p>{localizedWarningMessage}</p>
              </div>
              {tasks.quarantined.length > 0 && (
                <button onClick={() => downloadQuarantined(tasks.quarantined)}>
                  <Download size={14} /> {tr("导出问题数据", "Export problem data")}
                </button>
              )}
              <button
                className="icon-button"
                onClick={tasks.dismissWarning}
                aria-label={tr("忽略提示", "Dismiss message")}
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
              onRestore={(item) => tasks.restoreCompletedItem(item.id)}
              onDelete={(item) => tasks.deleteItem(item.id)}
            />
          )}

          {view === "deadlineCalendar" && (
            <DeadlineCalendarView
              items={tasks.items}
              onOpen={(item) => setSelectedId(item.id)}
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
            {tr("数据保存在此浏览器", "Data stored in this browser")} · {tasks.lastSavedAt
              ? tr("已自动保存", "Autosaved")
              : tr("正在保存", "Saving")}
          </div>
        )}
      </main>

      {showComposer && (
        <DynamicComposer
          module={composerModule}
          collapsed={composerCollapsed}
          onModuleChange={setComposerModule}
          onCreate={tasks.addItem}
          onCollapsedChange={setComposerCollapsed}
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

      {pendingStageAdvance && (
        <NextStageDueDateDialog
          currentStageName={pendingStageAdvance.currentStageName}
          nextStageName={pendingStageAdvance.nextStageName}
          onCancel={() => setPendingStageAdvance(null)}
          onConfirm={(dueDate) => {
            tasks.completeStage(pendingStageAdvance.itemId, dueDate);
            setPendingStageAdvance(null);
          }}
        />
      )}

      <ToastStack
        actions={tasks.pendingActions}
        onUndo={tasks.undoAction}
        onDismiss={tasks.dismissPendingAction}
        now={tasks.clockNow}
        avoidComposer={showComposer}
      />
    </div>
    </LanguageProvider>
  );
}
