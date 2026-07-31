"use client";

import {
  Check,
  Circle,
  Clock3,
} from "lucide-react";
import {
  MODULE_META,
  PERSONAL_URGENCY_LABELS,
  WORK_PROCESS_STAGE_SHORT_LABELS,
} from "@/lib/constants";
import {
  displayDueDate,
  effectiveStageStatus,
  getCurrentStage,
  getItemDueDate,
  isWorkflowTask,
  isDateOverdue,
  overdueDays,
} from "@/lib/dates/dateCalculations";
import type { AnyWorkflowItem, TaskItem } from "@/types/tasks";

interface TaskCardProps {
  item: TaskItem;
  onOpen: (item: TaskItem) => void;
  onComplete: (item: TaskItem) => void;
}

function StageProgress({ item }: { item: AnyWorkflowItem }) {
  return (
    <div className="stage-progress" aria-label="阶段进度">
      {item.stages.map((stage, index) => {
        const status = effectiveStageStatus(stage);
        const shortName = item.module === "work"
          ? WORK_PROCESS_STAGE_SHORT_LABELS[stage.name] ?? stage.name
          : stage.name
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
  const workflow = isWorkflowTask(item) ? item : null;
  const event = item.module === "personal"
    || (item.module === "work" && item.workType === "event")
    ? item
    : null;
  const currentStage = workflow ? getCurrentStage(workflow) : null;

  const urgency = event ? PERSONAL_URGENCY_LABELS[event.urgency] : null;

  return (
    <article
      className={`task-card ${workflow ? "workflow-task-card" : ""} ${
        workflow?.module === "work" ? "work-process-card" : ""
      } ${event ? "event-task-card" : ""}`}
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
        {workflow ? (
          <div className="workflow-card-actions">
            <button
              className="task-complete-button"
              onClick={(event) => {
                event.stopPropagation();
                onComplete(item);
              }}
            >
              完成当前阶段
            </button>
            <span className="workflow-due-date">
              <Clock3 size={12} /> 截止 {displayDueDate(dueDate)}
            </span>
          </div>
        ) : event ? (
          <div className="event-card-actions">
            <button
              className="task-complete-button"
              onClick={(event) => {
                event.stopPropagation();
                onComplete(item);
              }}
            >
              完成
            </button>
            <span
              className="event-urgency"
              data-urgent={event.urgency === "urgent"}
            >
              {urgency}
            </span>
          </div>
        ) : null}
      </div>

      {workflow && currentStage ? (
        <>
          <div className="current-stage">
            <span>当前阶段</span>
            <strong>{currentStage.name}</strong>
          </div>
          {overdue && dueDate && (
            <p className="overdue-label">
              {workflow.module === "work" ? "任务" : "当前阶段"}已超时{
                " "
              }{overdueDays(dueDate)} 天
            </p>
          )}
          <StageProgress item={workflow} />
        </>
      ) : (
        <>
          <div className="task-meta-row">
            <span><Clock3 size={12} /> {displayDueDate(dueDate)}</span>
          </div>
          {overdue && dueDate && (
            <p className="overdue-label">已超时 {overdueDays(dueDate)} 天</p>
          )}
        </>
      )}
    </article>
  );
}
