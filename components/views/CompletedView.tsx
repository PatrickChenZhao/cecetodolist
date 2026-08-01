"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  X,
} from "lucide-react";
import { isAfter, isSameDay, parseISO, startOfWeek, subDays } from "date-fns";
import { MODULE_ORDER } from "@/lib/constants";
import { displayCompletedAt } from "@/lib/dates/dateCalculations";
import type { ModuleType, TaskItem } from "@/types/tasks";
import { useLanguage } from "@/context/LanguageContext";
import { moduleMeta, stageLabel } from "@/lib/i18n";

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
  onRestore,
  onDelete,
}: {
  items: TaskItem[];
  onOpen: (item: TaskItem) => void;
  onRestore: (item: TaskItem) => void;
  onDelete: (item: TaskItem) => void;
}) {
  const { language, tr } = useLanguage();
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
          <span className="eyebrow">{tr("完成记录", "Completion History")}</span>
          <h1>{tr("已完成任务", "Completed Tasks")}</h1>
          <p>{tr("所有完成事项统一归档，按实际完成时间排序。", "Completed items are archived and sorted by their actual completion time.")}</p>
        </div>
        <div className="completed-total">
          <CheckCircle2 size={18} />
          <strong>{completed.length}</strong>
          <span>{tr("条记录", "records")}</span>
        </div>
      </header>

      <div className="filter-row" role="tablist" aria-label={tr("按模块筛选", "Filter by module")}>
        <button data-active={filter === "all"} onClick={() => setFilter("all")}>
          {tr("全部", "All")}
        </button>
        {MODULE_ORDER.map((module) => (
          <button
            key={module}
            data-active={filter === module}
            onClick={() => setFilter(module)}
          >
            {moduleMeta(module, language).label}
          </button>
        ))}
      </div>

      {completed.length === 0 ? (
        <div className="large-empty-state">
          <span><CheckCircle2 size={24} /></span>
          <h2>{tr("还没有完成记录", "No Completed Tasks Yet")}</h2>
          <p>{tr("完成任务后，它们会按时间整理在这里。", "Completed tasks will be organized here by time.")}</p>
        </div>
      ) : (
        <div className="completed-groups">
          {groups.filter((group) => group.items.length > 0).map((group) => (
            <section key={group.name}>
              <h2>{({
                "今天": tr("今天", "Today"),
                "昨天": tr("昨天", "Yesterday"),
                "本周": tr("本周", "This Week"),
                "更早": tr("更早", "Earlier"),
              })[group.name]}<span>{group.items.length}</span></h2>
              <div className="completed-list">
                {group.items.map((item) => {
                  const meta = moduleMeta(item.module, language);
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
                          {finalStage
                            ? tr(` · ${finalStage}完成于 `, ` · ${stageLabel(finalStage, language)} completed `)
                            : tr(" · 完成于 ", " · Completed ")}
                          {item.completedAt
                            ? displayCompletedAt(item.completedAt, new Date(), language)
                            : tr("未知时间", "Unknown time")}
                        </p>
                      </div>
                      <ChevronRight size={16} className="completed-chevron" />
                      <button
                        className="completed-restore"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRestore(item);
                        }}
                        aria-label={tr(`撤销完成${item.title}`, `Restore ${item.title}`)}
                        title={tr("撤销完成", "Restore task")}
                      >
                        <RotateCcw size={15} />
                      </button>
                      <button
                        className="completed-delete"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(item);
                        }}
                        aria-label={tr(`删除${item.title}`, `Delete ${item.title}`)}
                        title={tr("删除已完成事项", "Delete completed item")}
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
