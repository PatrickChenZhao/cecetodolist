"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  X,
} from "lucide-react";
import { isAfter, isSameDay, parseISO, startOfWeek, subDays } from "date-fns";
import { MODULE_META, MODULE_ORDER } from "@/lib/constants";
import { displayCompletedAt } from "@/lib/dates/dateCalculations";
import type { ModuleType, TaskItem } from "@/types/tasks";

type Filter = "all" | ModuleType;

function groupName(completedAt: string) {
  const date = parseISO(completedAt);
  const now = new Date();
  if (isSameDay(date, now)) return "今天";
  if (isSameDay(date, subDays(now, 1))) return "昨天";
  if (isAfter(date, startOfWeek(now, { weekStartsOn: 1 }))) return "本周";
  return "更早";
}

export function CompletedView({
  items,
  onOpen,
  onDelete,
}: {
  items: TaskItem[];
  onOpen: (item: TaskItem) => void;
  onDelete: (item: TaskItem) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const completed = items
    .filter((item) =>
      item.status === "completed"
      && item.completedAt
      && (filter === "all" || item.module === filter)
    )
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  const groups = ["今天", "昨天", "本周", "更早"].map((name) => ({
    name,
    items: completed.filter(
      (item) => item.completedAt && groupName(item.completedAt) === name,
    ),
  }));

  return (
    <section className="page-view">
      <header className="view-header">
        <div>
          <span className="eyebrow">完成记录</span>
          <h1>已完成任务</h1>
          <p>所有完成事项统一归档，按实际完成时间排序。</p>
        </div>
        <div className="completed-total">
          <CheckCircle2 size={18} />
          <strong>{completed.length}</strong>
          <span>条记录</span>
        </div>
      </header>

      <div className="filter-row" role="tablist" aria-label="按模块筛选">
        <button data-active={filter === "all"} onClick={() => setFilter("all")}>
          全部
        </button>
        {MODULE_ORDER.map((module) => (
          <button
            key={module}
            data-active={filter === module}
            onClick={() => setFilter(module)}
          >
            {MODULE_META[module].label}
          </button>
        ))}
      </div>

      {completed.length === 0 ? (
        <div className="large-empty-state">
          <span><CheckCircle2 size={24} /></span>
          <h2>还没有完成记录</h2>
          <p>完成任务后，它们会按时间整理在这里。</p>
        </div>
      ) : (
        <div className="completed-groups">
          {groups.filter((group) => group.items.length > 0).map((group) => (
            <section key={group.name}>
              <h2>{group.name}<span>{group.items.length}</span></h2>
              <div className="completed-list">
                {group.items.map((item) => {
                  const meta = MODULE_META[item.module];
                  const finalStage = "stages" in item
                    ? item.stages[item.stages.length - 1]?.name
                    : null;
                  return (
                    <article
                      className="completed-item"
                      key={item.id}
                      onClick={() => onOpen(item)}
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") onOpen(item);
                      }}
                    >
                      <span
                        className="completed-check"
                        style={{ color: meta.color, background: meta.soft }}
                      >
                        <CheckCircle2 size={17} />
                      </span>
                      <div>
                        <h3>{item.title}</h3>
                        <p>
                          <span style={{ color: meta.color }}>{meta.label}</span>
                          {finalStage ? ` · ${finalStage}完成于 ` : " · 完成于 "}
                          {item.completedAt
                            ? displayCompletedAt(item.completedAt)
                            : "未知时间"}
                        </p>
                      </div>
                      <ChevronRight size={16} className="completed-chevron" />
                      <button
                        className="completed-delete"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(item);
                        }}
                        aria-label={`删除${item.title}`}
                        title="删除已完成事项"
                      >
                        <X size={15} />
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
