"use client";

import {
  BriefcaseBusiness,
  Leaf,
  Megaphone,
  Plus,
  Video,
} from "lucide-react";
import { isSameDay, parseISO } from "date-fns";
import { MODULE_META, MODULE_ORDER } from "@/lib/constants";
import { localDateLabel, todayKey } from "@/lib/dates/dateCalculations";
import { sortTasks } from "@/lib/dates/sorting";
import { TaskCard } from "@/components/tasks/TaskCard";
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
  const meta = MODULE_META[module];
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
            <span>还有 {remaining} 个事项</span>
            <button onClick={() => onAdd(module)}>继续添加</button>
          </div>
        )}
      </div>
    </section>
  );
}

interface DashboardProps {
  items: TaskItem[];
  module?: ModuleType;
  onOpen: (item: TaskItem) => void;
  onComplete: (item: TaskItem) => void;
  onAdd: (module: ModuleType) => void;
}

export function Dashboard({
  items,
  module,
  onOpen,
  onComplete,
  onAdd,
}: DashboardProps) {
  const activeItems = items.filter((item) => item.status === "active");
  const completedToday = items.filter((item) =>
    (!module || item.module === module)
    && item.status === "completed"
    && item.completedAt
    && isSameDay(parseISO(item.completedAt), parseISO(todayKey()))
  ).length;
  const scope = module ? MODULE_META[module].label : "今日";
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
          <span className="eyebrow">{module ? "模块视图" : "每日工作台"}</span>
          <h1>{scope}</h1>
          <p>{localDateLabel()}</p>
        </div>
        <div className="today-progress" aria-label="今日完成进度">
          <div>
            <span>今日完成</span>
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
