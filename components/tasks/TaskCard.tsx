"use client";

import {
  ArrowRight,
  Check,
  Circle,
  Clock3,
} from "lucide-react";
import {
  MODULE_META,
  PERSONAL_URGENCY_LABELS,
  WORK_URGENCY_LABELS,
} from "@/lib/constants";
import {
  displayDueDate,
  effectiveStageStatus,
  getCurrentStage,
  getItemDueDate,
  isDateOverdue,
  overdueDays,
} from "@/lib/dates/dateCalculations";
import type { TaskItem, WorkflowItem } from "@/types/tasks";

interface TaskCardProps {
  item: TaskItem;
  onOpen: (item: TaskItem) => void;
  onComplete: (item: TaskItem) => void;
}

function StageProgress({ item }: { item: WorkflowItem }) {
  return (
    <div className="stage-progress" aria-label="阶段进度">
      {item.stages.map((stage, index) => {
        const status = effectiveStageStatus(stage);
        const shortName = stage.name
          .replace("完成", "")
          .replace("剪完视频", "剪辑");
        return (
          <div
            className="stage-step"
            data-status={status}
            key={stage.id}
          >
            <span className="stage-node">
              {status === "completed" ? <Check size={10} /> : null}
            </span>
            <small>{shortName}</small>
            {index < item.stages.length - 1 && (
              <span className="stage-line" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function TaskCard({ item, onOpen, onComplete }: TaskCardProps) {
  const meta = MODULE_META[item.module];
  const dueDate = getItemDueDate(item);
  const overdue = isDateOverdue(dueDate);
  const workflow = item.module === "social" || item.module === "advertising"
    ? item
    : null;
  const currentStage = workflow ? getCurrentStage(workflow) : null;
  const completedStages = workflow
    ? workflow.stages.filter((stage) => stage.status === "completed").length
    : 0;

  const urgency = item.module === "work"
    ? WORK_URGENCY_LABELS[item.urgency]
    : item.module === "personal"
      ? PERSONAL_URGENCY_LABELS[item.urgency]
      : null;

  return (
    <article
      className="task-card"
      style={{ "--module-color": meta.color } as React.CSSProperties}
      onClick={() => onOpen(item)}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen(item);
      }}
      aria-label={`查看任务：${item.title}`}
    >
      <div className="task-title-row">
        <Circle size={15} className="task-circle" />
        <h3>{item.title}</h3>
        <ArrowRight size={14} className="task-arrow" aria-hidden="true" />
      </div>

      {workflow && currentStage ? (
        <>
          <div className="current-stage">
            <span>当前阶段</span>
            <strong>{currentStage.name}</strong>
          </div>
          <div className="task-meta-row">
            <span><Clock3 size={12} /> 截止 {displayDueDate(dueDate)}</span>
            <span>{completedStages} / {workflow.stages.length}</span>
          </div>
          {overdue && dueDate && (
            <p className="overdue-label">
              当前阶段已超时 {overdueDays(dueDate)} 天
            </p>
          )}
          <StageProgress item={workflow} />
        </>
      ) : (
        <>
          <div className="task-meta-row">
            <span>{meta.label}{urgency ? ` · ${urgency}` : ""}</span>
          </div>
          <div className="task-meta-row">
            <span><Clock3 size={12} /> {displayDueDate(dueDate)}</span>
          </div>
          {overdue && dueDate && (
            <p className="overdue-label">已超时 {overdueDays(dueDate)} 天</p>
          )}
        </>
      )}

      <button
        className="task-complete-button"
        onClick={(event) => {
          event.stopPropagation();
          onComplete(item);
        }}
      >
        {workflow ? "完成当前阶段" : "完成"}
      </button>
    </article>
  );
}
