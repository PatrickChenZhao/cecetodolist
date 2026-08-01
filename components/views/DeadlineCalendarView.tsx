"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  X,
} from "lucide-react";
import {
  addMonths,
  format,
  isAfter,
  isBefore,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { MODULE_META } from "@/lib/constants";
import {
  calendarMonthDays,
  collectDeadlineEntries,
  earliestDeadlineMonth,
  type DeadlineEntry,
} from "@/lib/dates/deadlineCalendar";
import type { TaskItem } from "@/types/tasks";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const CELL_ENTRY_LIMIT = 3;

function DeadlineLabel({ entry }: { entry: DeadlineEntry }) {
  const meta = MODULE_META[entry.module];
  return (
    <span
      className="calendar-deadline-entry"
      style={{ "--deadline-color": meta.color } as React.CSSProperties}
    >
      <i aria-hidden="true" />
      <span>
        <strong>{entry.title}</strong>
        {entry.workflowName && <small>{entry.workflowName}</small>}
      </span>
    </span>
  );
}

function DayDeadlineDialog({
  date,
  entries,
  onClose,
  onOpen,
}: {
  date: string;
  entries: DeadlineEntry[];
  onClose: () => void;
  onOpen: (item: TaskItem) => void;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="deadline-day-layer" role="dialog" aria-modal="true">
      <button
        className="deadline-day-backdrop"
        onClick={onClose}
        aria-label="关闭当日 deadline 详情"
      />
      <section className="deadline-day-dialog">
        <header>
          <div>
            <span>当日 deadline</span>
            <h2>{format(parseISO(date), "M月d日 EEEE", { locale: zhCN })}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>
        <div className="deadline-day-list">
          {entries.map((entry) => {
            const meta = MODULE_META[entry.module];
            return (
              <button
                key={entry.id}
                className="deadline-day-item"
                style={{ "--deadline-color": meta.color } as React.CSSProperties}
                onClick={() => onOpen(entry.item)}
              >
                <span className="deadline-day-type-dot" aria-hidden="true" />
                <span>
                  <strong>{entry.title}</strong>
                  <small>
                    {meta.label}
                    {entry.workflowName ? ` · 流程：${entry.workflowName}` : ""}
                  </small>
                </span>
                <ChevronRight size={16} />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function DeadlineCalendarView({
  items,
  onOpen,
}: {
  items: TaskItem[];
  onOpen: (item: TaskItem) => void;
}) {
  const entries = useMemo(() => collectDeadlineEntries(items), [items]);
  const firstMonth = useMemo(() => earliestDeadlineMonth(entries), [entries]);
  const [month, setMonth] = useState(firstMonth);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const visibleMonth = isBefore(month, firstMonth) ? firstMonth : month;
  const days = useMemo(() => calendarMonthDays(visibleMonth), [visibleMonth]);
  const entriesByDate = useMemo(() => {
    const grouped = new Map<string, DeadlineEntry[]>();
    entries.forEach((entry) => {
      grouped.set(entry.date, [...(grouped.get(entry.date) ?? []), entry]);
    });
    return grouped;
  }, [entries]);
  const selectedEntries = selectedDate
    ? entriesByDate.get(selectedDate) ?? []
    : [];
  const canGoPrevious = isAfter(startOfMonth(visibleMonth), firstMonth);

  return (
    <section className="deadline-calendar-view">
      <header className="deadline-calendar-header">
        <div>
          <span className="eyebrow">Deadline 规划</span>
          <h1>Deadline 日历</h1>
          <p>按日期查看任务与流程阶段，点击日期可展开当日详情。</p>
        </div>
        <div className="deadline-calendar-summary">
          <ListTodo size={17} />
          <strong>{entries.length}</strong>
          <span>个待完成 deadline</span>
        </div>
      </header>

      <div className="deadline-calendar-shell">
        <div className="deadline-month-toolbar">
          <div>
            <CalendarRange size={18} />
            <h2>{format(visibleMonth, "yyyy年 M月")}</h2>
          </div>
          <div className="deadline-month-actions">
            <button
              onClick={() => setMonth(subMonths(visibleMonth, 1))}
              disabled={!canGoPrevious}
              aria-label="上一个月"
              title={canGoPrevious ? "上一个月" : "已经是最早的 deadline 月份"}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setMonth(addMonths(visibleMonth, 1))}
              aria-label="下一个月"
              title="下一个月"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="deadline-calendar-scroll">
          <div className="deadline-calendar-grid" role="grid">
            {WEEKDAYS.map((weekday, index) => (
              <div
                className="deadline-weekday"
                data-weekend={index > 4}
                role="columnheader"
                key={weekday}
              >
                周{weekday}
              </div>
            ))}
            {days.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayEntries = entriesByDate.get(dateKey) ?? [];
              const inMonth = isSameMonth(day, visibleMonth);
              const content = (
                <>
                  <span className="deadline-date-number">{format(day, "d")}</span>
                  <span className="deadline-cell-items">
                    {dayEntries.slice(0, CELL_ENTRY_LIMIT).map((entry) => (
                      <DeadlineLabel key={entry.id} entry={entry} />
                    ))}
                    {dayEntries.length > CELL_ENTRY_LIMIT && (
                      <span
                        className="deadline-calendar-more"
                        aria-label={`另有 ${dayEntries.length - CELL_ENTRY_LIMIT} 个 deadline`}
                      >
                        ……
                      </span>
                    )}
                  </span>
                </>
              );

              if (!inMonth) {
                return <div className="deadline-date-cell is-outside" key={dateKey} />;
              }

              return dayEntries.length > 0 ? (
                <button
                  className="deadline-date-cell has-deadlines"
                  data-today={isToday(day)}
                  key={dateKey}
                  onClick={() => setSelectedDate(dateKey)}
                  aria-label={`${format(day, "M月d日")}，${dayEntries.length} 个 deadline`}
                  role="gridcell"
                >
                  {content}
                </button>
              ) : (
                <div
                  className="deadline-date-cell"
                  data-today={isToday(day)}
                  key={dateKey}
                  role="gridcell"
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedDate && selectedEntries.length > 0 && (
        <DayDeadlineDialog
          date={selectedDate}
          entries={selectedEntries}
          onClose={() => setSelectedDate(null)}
          onOpen={(item) => {
            setSelectedDate(null);
            onOpen(item);
          }}
        />
      )}
    </section>
  );
}
