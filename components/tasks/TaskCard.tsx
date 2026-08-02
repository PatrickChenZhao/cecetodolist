"use client";

import {
  Check,
  Circle,
  Clock3,
} from "lucide-react";
import { WORK_PROCESS_STAGE_SHORT_LABELS } from "@/lib/constants";
import {
  displayTaskCardDueDate,
  effectiveStageStatus,
  getCurrentStage,
  getItemDueDate,
  isWorkflowTask,
  isDateOverdue,
  overdueDays,
} from "@/lib/dates/dateCalculations";
import type { AnyWorkflowItem, TaskItem } from "@/types/tasks";
import { useLanguage } from "@/context/LanguageContext";
import { moduleMeta, stageLabel, urgencyLabel } from "@/lib/i18n";

interface TaskCardProps {
  item: TaskItem;
  onOpen: (item: TaskItem) => void;
  onComplete: (item: TaskItem) => void;
}

function StageProgress({ item }: { item: AnyWorkflowItem }) {
  const { language, tr } = useLanguage();
  return (
    <div className="stage-progress" aria-label={tr("阶段进度", "Stage progress")}>
      {item.stages.map((stage, index) => {
        const status = effectiveStageStatus(stage);
        const shortName = item.module === "work"
          ? WORK_PROCESS_STAGE_SHORT_LABELS[stage.name] ?? stage.name
          : stageLabel(stage.name, language)
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
  const { language, tr } = useLanguage();
  const meta = moduleMeta(item.module, language);
  const dueDate = getItemDueDate(item);
  const overdue = isDateOverdue(dueDate);
  const workflow = isWorkflowTask(item) ? item : null;
  const event = isWorkflowTask(item) ? null : item;
  const currentStage = workflow ? getCurrentStage(workflow) : null;

  const urgency = event ? urgencyLabel(event.urgency, language) : null;

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
      aria-label={tr(`查看任务：${item.title}`, `View task: ${item.title}`)}
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
              {tr("完成当前阶段", "Complete Stage")}
            </button>
            <span className="workflow-due-date">
              <Clock3 size={12} /> {displayTaskCardDueDate(dueDate, new Date(), language)}
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
              {tr("完成", "Complete")}
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
            <span>{tr("当前阶段", "Current Stage")}</span>
            <strong>{stageLabel(currentStage.name, language)}</strong>
          </div>
          {overdue && dueDate && (
            <p className="overdue-label">
              {tr(
                `${workflow.module === "work" ? "任务" : "当前阶段"}已超时 ${overdueDays(dueDate)} 天`,
                `${workflow.module === "work" ? "Task" : "Current stage"} is ${overdueDays(dueDate)} days overdue`,
              )}
            </p>
          )}
          <StageProgress item={workflow} />
        </>
      ) : (
        <>
          <div className="task-meta-row">
            <span><Clock3 size={12} /> {displayTaskCardDueDate(dueDate, new Date(), language)}</span>
          </div>
          {overdue && dueDate && (
            <p className="overdue-label">{tr(`已超时 ${overdueDays(dueDate)} 天`, `${overdueDays(dueDate)} days overdue`)}</p>
          )}
        </>
      )}
    </article>
  );
}
