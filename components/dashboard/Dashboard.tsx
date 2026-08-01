"use client";

import {
  BriefcaseBusiness,
  Leaf,
  Megaphone,
  Plus,
  Video,
} from "lucide-react";
import { isSameDay, parseISO } from "date-fns";
import {
  DEFAULT_DASHBOARD_TITLE,
  MODULE_ORDER,
} from "@/lib/constants";
import { localDateLabel, todayKey } from "@/lib/dates/dateCalculations";
import { sortTasks } from "@/lib/dates/sorting";
import { TaskCard } from "@/components/tasks/TaskCard";
import { useLanguage } from "@/context/LanguageContext";
import { moduleMeta } from "@/lib/i18n";
import type { ModuleType, TaskItem } from "@/types/tasks";

const icons = {
  work: BriefcaseBusiness,
  social: Video,
  advertising: Megaphone,
  personal: Leaf,
};

interface ModuleColumnProps {
  module: ModuleType;
  items: TaskItem[];
  onOpen: (item: TaskItem) => void;
  onComplete: (item: TaskItem) => void;
  onAdd: (module: ModuleType) => void;
  expanded?: boolean;
}

function ModuleColumn({
  module,
  items,
  onOpen,
  onComplete,
  onAdd,
  expanded = false,
}: ModuleColumnProps) {
  const { language, tr } = useLanguage();
  const meta = moduleMeta(module, language);
  const Icon = icons[module];
  const sorted = sortTasks(items);
  const visible = expanded ? sorted : sorted.slice(0, 8);
  const remaining = sorted.length - visible.length;

  return (
    <section
      className={`module-column ${expanded ? "module-column-expanded" : ""}`}
      style={{
        "--module-color": meta.color,
        "--module-soft": meta.soft,
      } as React.CSSProperties}
    >
      <header className="module-column-header">
        <span className="module-icon"><Icon size={17} /></span>
        <h2>{meta.label}</h2>
        <span className="module-count">{items.length}</span>
      </header>

      <div className="module-task-list">
        {visible.map((item) => (
          <TaskCard
            key={item.id}
            item={item}
            onOpen={onOpen}
            onComplete={onComplete}
          />
        ))}
        {visible.length === 0 && (
          <div className="empty-state">
            <span className="empty-orbit"><Plus size={18} /></span>
            <p>{meta.empty}</p>
            <button onClick={() => onAdd(module)}>{meta.emptyAction}</button>
          </div>
        )}
        {remaining > 0 && (
          <div className="remaining-items">
            <span>{tr(`还有 ${remaining} 个事项`, `${remaining} more items`)}</span>
            <button onClick={() => onAdd(module)}>{tr("继续添加", "Add More")}</button>
          </div>
        )}
      </div>
    </section>
  );
}

interface DashboardProps {
  items: TaskItem[];
  module?: ModuleType;
  dashboardTitle: string;
  onOpen: (item: TaskItem) => void;
  onComplete: (item: TaskItem) => void;
  onAdd: (module: ModuleType) => void;
  onDashboardTitleChange: (title: string) => void;
}

export function Dashboard({
  items,
  module,
  dashboardTitle,
  onOpen,
  onComplete,
  onAdd,
  onDashboardTitleChange,
}: DashboardProps) {
  const { language, tr } = useLanguage();
  const localizedDefaultTitle = tr(DEFAULT_DASHBOARD_TITLE, "Hello Cecilia");
  const displayedTitle = dashboardTitle === DEFAULT_DASHBOARD_TITLE
    ? localizedDefaultTitle
    : dashboardTitle;
  const saveDashboardTitle = (input: HTMLInputElement) => {
    const enteredTitle = input.value.trim();
    const nextTitle = !enteredTitle || enteredTitle === localizedDefaultTitle
      ? DEFAULT_DASHBOARD_TITLE
      : enteredTitle;
    input.value = nextTitle === DEFAULT_DASHBOARD_TITLE
      ? localizedDefaultTitle
      : nextTitle;
    if (nextTitle !== dashboardTitle) {
      onDashboardTitleChange(nextTitle);
    }
  };

  const activeItems = items.filter((item) => item.status === "active");
  const completedToday = items.filter((item) =>
    (!module || item.module === module)
    && item.status === "completed"
    && item.completedAt
    && isSameDay(parseISO(item.completedAt), parseISO(todayKey()))
  ).length;
  const scope = module ? moduleMeta(module, language).label : tr("今日", "Today");
  const scopedItems = module
    ? activeItems.filter((item) => item.module === module)
    : activeItems;
  const progressTotal = scopedItems.length + completedToday;
  const percent = progressTotal
    ? Math.round((completedToday / progressTotal) * 100)
    : 0;

  return (
    <>
      <header className="dashboard-header">
        <div>
          <span className="eyebrow">{module ? tr("模块视图", "Module View") : tr("每日工作台", "Daily Workspace")}</span>
          {module ? (
            <h1>{scope}</h1>
          ) : (
            <input
              key={`${language}:${dashboardTitle}`}
              className="dashboard-title-input"
              defaultValue={displayedTitle}
              onBlur={(event) => saveDashboardTitle(event.currentTarget)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
              aria-label={tr("编辑首页标题", "Edit dashboard title")}
              maxLength={50}
            />
          )}
          <p>{localDateLabel(new Date(), language)}</p>
        </div>
        <div className="today-progress" aria-label={tr("今日完成进度", "Today's progress")}>
          <div>
            <span>{tr("今日完成", "Completed Today")}</span>
            <strong>{completedToday} <small>/ {progressTotal}</small></strong>
          </div>
          <span
            className="progress-ring"
            style={{ "--progress": `${percent * 3.6}deg` } as React.CSSProperties}
          >
            <span>{percent}%</span>
          </span>
        </div>
      </header>

      {module ? (
        <div className="single-module-grid">
          <ModuleColumn
            module={module}
            items={scopedItems}
            onOpen={onOpen}
            onComplete={onComplete}
            onAdd={onAdd}
            expanded
          />
        </div>
      ) : (
        <div className="dashboard-grid">
          {MODULE_ORDER.map((moduleId) => (
            <ModuleColumn
              key={moduleId}
              module={moduleId}
              items={activeItems.filter((item) => item.module === moduleId)}
              onOpen={onOpen}
              onComplete={onComplete}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}
    </>
  );
}
