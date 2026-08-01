"use client";

import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock3,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  PERSONAL_URGENCY_LABELS,
} from "@/lib/constants";
import {
  displayCompletedAt,
  dueDateForPersonal,
  effectiveStageStatus,
  getCurrentStage,
  isWorkflowTask,
  recalculateWorkflowDates,
  rewindWorkflowToStage,
  todayKey,
} from "@/lib/dates/dateCalculations";
import type {
  AnyWorkflowStage,
  EventUrgency,
  TaskItem,
  WorkProcessStage,
  WorkflowStage,
} from "@/types/tasks";
import { useLanguage } from "@/context/LanguageContext";
import { moduleMeta, stageLabel, urgencyLabel } from "@/lib/i18n";

interface TaskDetailPanelProps {
  item: TaskItem;
  onClose: () => void;
  onSave: (item: TaskItem) => void;
  onComplete: (item: TaskItem) => void;
  onDelete: (item: TaskItem) => void;
}

export function TaskDetailPanel({
  item,
  onClose,
  onSave,
  onComplete,
  onDelete,
}: TaskDetailPanelProps) {
  const { language, tr } = useLanguage();
  const workEvent = item.module === "work" && item.workType === "event"
    ? item
    : null;
  const workProcess = item.module === "work" && item.workType === "process"
    ? item
    : null;
  const eventItem = item.module === "personal" ? item : workEvent;
  const workflow = isWorkflowTask(item) ? item : null;
  const initialWorkProcessStage = workProcess
    ? getCurrentStage(workProcess)
    : null;
  const [title, setTitle] = useState(item.title);
  const [eventUrgency, setEventUrgency] = useState<EventUrgency>(
    eventItem?.urgency ?? "week",
  );
  const [dueDate, setDueDate] = useState<string | null>(
    workProcess
      ? initialWorkProcessStage?.dueDate ?? null
      : "dueDate" in item
        ? item.dueDate
        : null,
  );
  const [stages, setStages] = useState<AnyWorkflowStage[]>(
    workflow
      ? workflow.stages.map((stage) => ({ ...stage }))
      : [],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [item, onClose]);

  const meta = moduleMeta(item.module, language);
  const currentStage = workflow ? getCurrentStage(workflow) : null;
  const completedCount = workflow
    ? workflow.stages.filter((stage) => stage.status === "completed").length
    : 0;

  function save() {
    if (!title.trim()) return;
    if (workEvent) {
      onSave({
        ...workEvent,
        title: title.trim(),
        urgency: eventUrgency,
        dueDate,
      });
    } else if (workProcess) {
      const nextStages = stages.map((stage) =>
        stage.id === workProcess.currentStageId
          ? { ...stage, dueDate }
          : stage
      ) as WorkProcessStage[];
      onSave({
        ...workProcess,
        title: title.trim(),
        dueDate: dueDate ?? todayKey(),
        stages: nextStages,
      });
    } else if (item.module === "personal") {
      onSave({
        ...item,
        title: title.trim(),
        urgency: eventUrgency,
        dueDate,
      });
    } else if (workflow) {
      onSave({
        ...workflow,
        title: title.trim(),
        stages: stages as WorkflowStage[],
      });
    }
  }

  function returnStageToIncomplete(stageId: string) {
    if (!workflow) return;

    const draft = workProcess
      ? {
          ...workProcess,
          title: title.trim() || workProcess.title,
          dueDate: dueDate ?? todayKey(),
          stages: stages as WorkProcessStage[],
        }
      : {
          ...workflow,
          title: title.trim() || workflow.title,
          stages: stages as WorkflowStage[],
        };
    const rewound = rewindWorkflowToStage(draft, stageId);
    setStages(rewound.stages.map((stage) => ({ ...stage })));
    if (rewound.module === "work") {
      setDueDate(getCurrentStage(rewound)?.dueDate ?? null);
    }
    onSave(rewound);
  }

  return (
    <div className="detail-layer" role="dialog" aria-modal="true">
      <button
        className="detail-backdrop"
        onClick={onClose}
        aria-label={tr("关闭任务详情", "Close task details")}
      />
      <aside
        className="detail-panel"
        style={{ "--module-color": meta.color } as React.CSSProperties}
      >
        <header className="detail-header">
          <div>
            <span className="module-kicker">
              <i style={{ background: meta.color }} />
              {meta.label}
            </span>
            <h2>{tr("任务详情", "Task Details")}</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label={tr("关闭详情", "Close details")}
          >
            <X size={19} />
          </button>
        </header>

        <div className="detail-content">
          <label className="detail-field">
            <span>{tr("标题", "Title")}</span>
            <textarea
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              rows={3}
            />
          </label>

          {eventItem && (
            <>
              <div className="detail-field">
                <span>{tr("紧急程度", "Urgency")}</span>
                <div className="segmented-control wrap">
                  {(Object.keys(PERSONAL_URGENCY_LABELS) as EventUrgency[])
                    .map((urgency) => (
                      <button
                        key={urgency}
                        data-active={eventUrgency === urgency}
                        onClick={() => {
                          setEventUrgency(urgency);
                          setDueDate(dueDateForPersonal(urgency));
                        }}
                      >
                        {urgencyLabel(urgency, language)}
                      </button>
                    ))}
                </div>
              </div>
              <label className="detail-field">
                <span>{tr("截止日期", "Due Date")}</span>
                <input
                  type="date"
                  disabled={eventUrgency === "notUrgent"}
                  value={dueDate ?? ""}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </label>
            </>
          )}

          {workProcess && (
            <label className="detail-field">
              <span>{tr("当前阶段截止日期", "Current Stage Due Date")}</span>
              <input
                type="date"
                value={dueDate ?? ""}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
          )}

          {workflow && (
            <section className="detail-stages">
              <header>
                <div>
                  <span>{tr("整体进度", "Overall Progress")}</span>
                  <strong>{completedCount} / {workflow.stages.length}</strong>
                </div>
                <div className="detail-progress-track">
                  <span
                    style={{
                      width: `${(completedCount / workflow.stages.length) * 100}%`,
                    }}
                  />
                </div>
              </header>
              {stages.map((stage, index) => {
                const status = effectiveStageStatus(stage);
                const isCurrent = stage.id === workflow.currentStageId
                  && item.status === "active";
                return (
                  <div
                    className="detail-stage"
                    data-status={status}
                    key={stage.id}
                  >
                    <span className="detail-stage-icon">
                      {status === "completed"
                        ? <Check size={13} />
                        : <span />}
                    </span>
                    <div className="detail-stage-body">
                      <div>
                        <strong>{stageLabel(stage.name, language)}</strong>
                        {isCurrent && <small>{tr("当前阶段", "Current Stage")}</small>}
                      </div>
                      {workflow.module !== "work" && "dateSource" in stage && (
                        <label>
                          {tr("截止", "Due")}
                          <input
                            type="date"
                            value={stage.dueDate}
                            disabled={stage.status === "completed"}
                            onChange={(event) =>
                              setStages(
                                recalculateWorkflowDates(
                                  workflow.module,
                                  stages as WorkflowStage[],
                                  index,
                                  event.target.value,
                                ),
                              )
                            }
                          />
                          {stage.status !== "completed" && index > 0 && (
                            <span>
                              {stage.dateSource === "automatic" ? tr("自动", "Auto") : tr("已调整", "Adjusted")}
                            </span>
                          )}
                        </label>
                      )}
                      {stage.completedAt && (
                        <p>
                          <CheckCircle2 size={12} />
                          {tr("完成于", "Completed")} {displayCompletedAt(stage.completedAt, new Date(), language)}
                        </p>
                      )}
                    </div>
                    <button
                      className="detail-stage-rewind"
                      type="button"
                      onClick={() => returnStageToIncomplete(stage.id)}
                      aria-label={tr(`${stage.name}回到未完成状态`, `Return ${stageLabel(stage.name, language)} to incomplete`)}
                    >
                      <RotateCcw size={11} />
                      {tr("回到未完成状态", "Mark Incomplete")}
                    </button>
                  </div>
                );
              })}
            </section>
          )}

          <div className="detail-audit">
            <span><Clock3 size={13} /> {tr("创建于", "Created")} {displayCompletedAt(item.createdAt, new Date(), language)}</span>
            {item.completedAt && (
              <span>
                <CheckCircle2 size={13} />
                {tr("完成于", "Completed")} {displayCompletedAt(item.completedAt, new Date(), language)}
              </span>
            )}
          </div>
        </div>

        <footer className="detail-footer">
          <button
            className="delete-button"
            onClick={() => {
              onDelete(item);
              onClose();
            }}
            title={tr("删除事项", "Delete item")}
          >
            <Trash2 size={15} /> {tr("删除", "Delete")}
          </button>
          <div>
            <button className="secondary-button" onClick={save}>
              {tr("保存修改", "Save Changes")}
            </button>
            {item.status === "active" && (
              <button
                className="primary-button"
                onClick={() => {
                  save();
                  onComplete(item);
                  onClose();
                }}
              >
                <Check size={15} />
                {currentStage ? tr("完成当前阶段", "Complete Stage") : tr("完成", "Complete")}
              </button>
            )}
          </div>
        </footer>
      </aside>
    </div>
  );
}
